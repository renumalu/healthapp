import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyStats {
  totalEnergyLogs: number;
  averageEnergy: number;
  totalFocusMinutes: number;
  totalMeals: number;
  totalWorkouts: number;
  currentStreak: number;
  totalPoints: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - user must be authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create a client with the user's auth token to verify their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !authUser) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use the authenticated user's ID - ignore any user_id in request body
    const user_id = authUser.id;
    const userEmail = authUser.email;
    
    if (!userEmail) {
      throw new Error("User has no email");
    }
    
    // Create admin client for fetching data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Sending weekly digest for authenticated user:", user_id);

    // Get profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    const userName = profile?.full_name || "there";

    // Calculate date range for last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch weekly data
    const [energyLogs, focusSessions, meals, workouts, gamification] = await Promise.all([
      supabase
        .from("energy_logs")
        .select("energy_level")
        .eq("user_id", user_id)
        .gte("logged_at", weekAgo.toISOString()),
      supabase
        .from("focus_sessions")
        .select("duration_minutes")
        .eq("user_id", user_id)
        .gte("started_at", weekAgo.toISOString()),
      supabase
        .from("meals")
        .select("id")
        .eq("user_id", user_id)
        .gte("logged_at", weekAgo.toISOString()),
      supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user_id)
        .gte("completed_at", weekAgo.toISOString()),
      supabase
        .from("user_gamification")
        .select("current_streak, total_points, current_level")
        .eq("user_id", user_id)
        .maybeSingle(),
    ]);

    const stats: WeeklyStats = {
      totalEnergyLogs: energyLogs.data?.length || 0,
      averageEnergy: energyLogs.data?.length
        ? Math.round(energyLogs.data.reduce((sum, e) => sum + e.energy_level, 0) / energyLogs.data.length)
        : 0,
      totalFocusMinutes: focusSessions.data?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0,
      totalMeals: meals.data?.length || 0,
      totalWorkouts: workouts.data?.length || 0,
      currentStreak: gamification.data?.current_streak || 0,
      totalPoints: gamification.data?.total_points || 0,
    };

    // Generate motivational message based on stats
    let motivation = "";
    if (stats.currentStreak >= 7) {
      motivation = `🔥 Amazing! You've maintained a ${stats.currentStreak}-day streak! Keep that momentum going!`;
    } else if (stats.averageEnergy >= 70) {
      motivation = `⚡ Your energy levels have been great this week! You're doing awesome!`;
    } else if (stats.totalWorkouts >= 3) {
      motivation = `💪 ${stats.totalWorkouts} workouts this week! You're crushing your fitness goals!`;
    } else {
      motivation = `🌟 Every step counts! Keep tracking and building healthy habits.`;
    }

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Progress Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Weekly Progress Digest</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Hey ${userName}, here's your week in review!</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 16px;">${motivation}</p>
      </div>

      <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">📊 Your Stats This Week</h2>
      
      <div style="display: grid; gap: 12px;">
        <div style="background: #faf5ff; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #6b21a8; font-weight: 500;">🔥 Current Streak</span>
          <span style="color: #1e293b; font-size: 20px; font-weight: 700;">${stats.currentStreak} days</span>
        </div>
        
        <div style="background: #fef3c7; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #92400e; font-weight: 500;">⚡ Avg Energy Level</span>
          <span style="color: #1e293b; font-size: 20px; font-weight: 700;">${stats.averageEnergy}%</span>
        </div>
        
        <div style="background: #dbeafe; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #1e40af; font-weight: 500;">🎯 Focus Time</span>
          <span style="color: #1e293b; font-size: 20px; font-weight: 700;">${Math.round(stats.totalFocusMinutes / 60)}h ${stats.totalFocusMinutes % 60}m</span>
        </div>
        
        <div style="background: #dcfce7; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #166534; font-weight: 500;">🥗 Meals Logged</span>
          <span style="color: #1e293b; font-size: 20px; font-weight: 700;">${stats.totalMeals}</span>
        </div>
        
        <div style="background: #fee2e2; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #991b1b; font-weight: 500;">💪 Workouts</span>
          <span style="color: #1e293b; font-size: 20px; font-weight: 700;">${stats.totalWorkouts}</span>
        </div>
        
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: white; font-weight: 500;">🏆 Total Points</span>
          <span style="color: white; font-size: 20px; font-weight: 700;">${stats.totalPoints.toLocaleString()}</span>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <a href="https://humanos.app" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          View Full Dashboard →
        </a>
      </div>

      <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Keep up the great work! Small daily improvements lead to stunning results. 💪
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@humanos.app";
    
    const { error: emailError } = await resend.emails.send({
      from: `HumanOS <${resendFromEmail}>`,
      to: [userEmail],
      subject: `🎯 Your Weekly Progress: ${stats.currentStreak}-day streak!`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Weekly digest sent to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Weekly digest sent successfully", email: userEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-digest:", error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send weekly digest" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
