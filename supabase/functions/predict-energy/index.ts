import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Explicitly pass the token to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Fetch last 30 days of data for analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [energyLogs, sleepLogs, focusSessions, workouts] = await Promise.all([
      supabaseClient
        .from('energy_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', thirtyDaysAgo.toISOString())
        .order('logged_at', { ascending: true }),
      supabaseClient
        .from('sleep_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),
      supabaseClient
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseClient
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
    ]);

    // Prepare data summary for AI
    const dataSummary = {
      energyLogs: energyLogs.data?.map(log => ({
        date: log.logged_at,
        level: log.energy_level,
        mood: log.mood,
        dayOfWeek: new Date(log.logged_at).getDay()
      })) || [],
      sleepLogs: sleepLogs.data?.map(log => ({
        date: log.created_at,
        duration: log.sleep_end && log.sleep_start ? 
          (new Date(log.sleep_end).getTime() - new Date(log.sleep_start).getTime()) / 3600000 : 0,
        quality: log.quality_rating
      })) || [],
      focusSessions: focusSessions.data?.length || 0,
      workouts: workouts.data?.length || 0
    };

    // Call AI for predictions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an energy prediction AI. Analyze the user's historical data and predict their energy levels for the next 7 days.
            
Return a JSON object with this exact structure:
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predicted_energy": 1-10,
      "confidence": 0.0-1.0,
      "factors": ["factor1", "factor2"],
      "recommendation": "brief recommendation"
    }
  ],
  "patterns": ["pattern1", "pattern2"],
  "insights": "overall insight about user's energy patterns"
}

Consider:
- Day of week patterns (weekdays vs weekends)
- Sleep quality correlation
- Exercise impact on next-day energy
- Mood trends
- Time of day patterns`
          },
          {
            role: 'user',
            content: `Analyze this data and predict energy for the next 7 days starting from today (${new Date().toISOString().split('T')[0]}):

${JSON.stringify(dataSummary, null, 2)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_predictions",
              description: "Generate 7-day energy predictions",
              parameters: {
                type: "object",
                properties: {
                  predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        predicted_energy: { type: "number" },
                        confidence: { type: "number" },
                        factors: { type: "array", items: { type: "string" } },
                        recommendation: { type: "string" }
                      },
                      required: ["date", "predicted_energy", "confidence", "factors", "recommendation"]
                    }
                  },
                  patterns: { type: "array", items: { type: "string" } },
                  insights: { type: "string" }
                },
                required: ["predictions", "patterns", "insights"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_predictions" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate predictions');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No predictions generated');
    }

    const predictions = JSON.parse(toolCall.function.arguments);

    // Store predictions in database
    for (const pred of predictions.predictions) {
      await supabaseClient
        .from('energy_predictions')
        .upsert({
          user_id: user.id,
          prediction_date: pred.date,
          predicted_energy: pred.predicted_energy,
          confidence_score: pred.confidence,
          factors: pred.factors
        }, { onConflict: 'user_id,prediction_date' });
    }

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
