import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_TEXT_LENGTH = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Explicitly pass the token to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { text, audioTranscript } = body;
    
    const contentToAnalyze = audioTranscript || text;
    
    // Input validation
    if (!contentToAnalyze || typeof contentToAnalyze !== "string") {
      return new Response(JSON.stringify({ error: "No content to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contentToAnalyze.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: "Text too long, maximum 10000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log("Analyzing emotion for user:", user.id, "text length:", contentToAnalyze.length);

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
            content: `You are an emotion detection AI. Analyze the text and detect the emotional state.

Return emotions in this format using the tool provided. Detect:
- Primary emotion (joy, sadness, anger, fear, surprise, disgust, neutral, anxious, hopeful, frustrated, content, overwhelmed)
- Intensity (0-1)
- Secondary emotions
- Emotional summary`
          },
          {
            role: 'user',
            content: `Analyze the emotional content of this journal entry:\n\n"${contentToAnalyze.slice(0, MAX_TEXT_LENGTH)}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_emotion",
              description: "Detect emotions from text",
              parameters: {
                type: "object",
                properties: {
                  primary_emotion: { 
                    type: "string",
                    enum: ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral", "anxious", "hopeful", "frustrated", "content", "overwhelmed"]
                  },
                  confidence: { type: "number" },
                  secondary_emotions: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        emotion: { type: "string" },
                        intensity: { type: "number" }
                      }
                    }
                  },
                  summary: { type: "string" },
                  wellbeing_score: { type: "number" },
                  suggestions: { type: "array", items: { type: "string" } }
                },
                required: ["primary_emotion", "confidence", "summary", "wellbeing_score"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "detect_emotion" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to analyze emotion');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No emotion analysis generated');
    }

    const emotionData = JSON.parse(toolCall.function.arguments);
    console.log("Detected emotion for user:", user.id, "emotion:", emotionData.primary_emotion);

    return new Response(JSON.stringify(emotionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Emotion analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
