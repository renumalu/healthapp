import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (either scheduled or manual trigger)
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;

    // If specific user, generate digest for them only
    if (userId) {
      const digest = await generateUserDigest(supabase, userId, lovableApiKey);
      return new Response(JSON.stringify(digest), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Otherwise, generate for all users (scheduled job)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id');

    if (profilesError) throw profilesError;

    const digests = [];
    for (const profile of profiles || []) {
      try {
        const digest = await generateUserDigest(supabase, profile.user_id, lovableApiKey);
        digests.push(digest);
      } catch (e) {
        console.error(`Error generating digest for user ${profile.user_id}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed: digests.length, digests }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Weekly digest error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateUserDigest(supabase: any, userId: string, lovableApiKey: string | undefined) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // Fetch user's data from the past week
  const [energyResult, focusResult, insightsResult, profileResult] = await Promise.all([
    supabase
      .from('energy_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', weekStart.toISOString())
      .order('logged_at', { ascending: true }),
    supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', weekStart.toISOString())
      .order('started_at', { ascending: true }),
    supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString()),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single()
  ]);

  const energyLogs = energyResult.data || [];
  const focusSessions = focusResult.data || [];
  const insights = insightsResult.data || [];
  const profile = profileResult.data;

  // Calculate statistics
  const stats = calculateStats(energyLogs, focusSessions);

  // Generate AI summary
  let aiSummary = '';
  if (lovableApiKey) {
    aiSummary = await generateAISummary(stats, energyLogs, focusSessions, lovableApiKey);
  } else {
    aiSummary = generateBasicSummary(stats);
  }

  const digest = {
    userId,
    userName: profile?.full_name || 'User',
    generatedAt: new Date().toISOString(),
    stats,
    aiSummary,
    weeklyHighlights: generateHighlights(stats, energyLogs, focusSessions),
  };

  // Store the digest as a reflection
  await supabase.from('reflections').upsert({
    user_id: userId,
    week_start: weekStart.toISOString().split('T')[0],
    ai_summary: aiSummary,
    insights: JSON.stringify(stats),
  }, { onConflict: 'user_id,week_start' });

  return digest;
}

function calculateStats(energyLogs: any[], focusSessions: any[]) {
  // Energy stats
  const avgEnergy = energyLogs.length > 0
    ? Math.round(energyLogs.reduce((acc, log) => acc + log.energy_level, 0) / energyLogs.length)
    : 0;

  const moodCounts: Record<string, number> = {};
  energyLogs.forEach(log => {
    if (log.mood) {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    }
  });
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  // Focus stats
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const totalInterruptions = focusSessions.reduce((acc, s) => acc + (s.interruptions || 0), 0);
  const avgSessionLength = focusSessions.length > 0
    ? Math.round(totalFocusMinutes / focusSessions.length)
    : 0;

  // Peak hours analysis
  const hourCounts: Record<number, number> = {};
  energyLogs.forEach(log => {
    const hour = new Date(log.logged_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + log.energy_level;
  });
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '10';

  // Day analysis
  const dayStats: Record<string, { energy: number; count: number }> = {};
  energyLogs.forEach(log => {
    const day = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayStats[day]) dayStats[day] = { energy: 0, count: 0 };
    dayStats[day].energy += log.energy_level;
    dayStats[day].count += 1;
  });

  const bestDay = Object.entries(dayStats)
    .map(([day, data]) => ({ day, avg: data.energy / data.count }))
    .sort((a, b) => b.avg - a.avg)[0]?.day || 'Monday';

  return {
    avgEnergy,
    dominantMood,
    totalFocusHours: Math.round(totalFocusMinutes / 60 * 10) / 10,
    focusSessions: focusSessions.length,
    totalInterruptions,
    avgSessionLength,
    peakHour: parseInt(peakHour),
    bestDay,
    energyLogsCount: energyLogs.length,
  };
}

async function generateAISummary(stats: any, energyLogs: any[], focusSessions: any[], apiKey: string) {
  try {
    const prompt = `You are a wellness and productivity coach. Based on the following weekly data, write a personalized, encouraging 2-3 paragraph summary for the user. Focus on achievements, patterns, and 2-3 specific actionable tips for next week.

Weekly Stats:
- Average Energy Level: ${stats.avgEnergy}/100
- Dominant Mood: ${stats.dominantMood}
- Total Focus Time: ${stats.totalFocusHours} hours across ${stats.focusSessions} sessions
- Average Session Length: ${stats.avgSessionLength} minutes
- Total Interruptions: ${stats.totalInterruptions}
- Peak Energy Hour: ${stats.peakHour}:00
- Best Day: ${stats.bestDay}
- Energy logs recorded: ${stats.energyLogsCount}

Write in a warm, supportive tone. Be specific about the data. Keep it under 200 words.`;

    // Try Lovable AI API first
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      }
    } catch (e) {
      console.warn('Lovable AI API unavailable:', e);
    }

    // Fallback to basic summary if API fails
    return generateBasicSummary(stats);
  } catch (e) {
    console.error('Error generating AI summary:', e);
    return generateBasicSummary(stats);
  }
}

function generateBasicSummary(stats: any) {
  return `This week you logged ${stats.energyLogsCount} energy check-ins and completed ${stats.focusSessions} focus sessions totaling ${stats.totalFocusHours} hours. Your average energy was ${stats.avgEnergy}/100 with ${stats.dominantMood} being your dominant mood. Your peak energy hour appears to be around ${stats.peakHour}:00, and ${stats.bestDay} was your most productive day. Consider scheduling important tasks during these times next week!`;
}

function generateHighlights(stats: any, energyLogs: any[], focusSessions: any[]) {
  const highlights = [];

  if (stats.totalFocusHours >= 10) {
    highlights.push({ type: 'achievement', message: `🎯 Amazing! ${stats.totalFocusHours}+ hours of focused work this week!` });
  }

  if (stats.avgEnergy >= 70) {
    highlights.push({ type: 'achievement', message: `⚡ High energy week! Average of ${stats.avgEnergy}/100` });
  }

  if (stats.totalInterruptions <= 5) {
    highlights.push({ type: 'achievement', message: `🔕 Minimal distractions - only ${stats.totalInterruptions} interruptions!` });
  }

  if (stats.energyLogsCount >= 7) {
    highlights.push({ type: 'consistency', message: `📊 Great tracking consistency with ${stats.energyLogsCount} check-ins!` });
  }

  return highlights;
}
