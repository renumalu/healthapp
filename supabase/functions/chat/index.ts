import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_MESSAGE_LENGTH = 5000;
const MAX_MESSAGES = 50;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT] ${step}${detailsStr}`);
};

function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > MAX_MESSAGES) return false;
  
  return messages.every((msg) => {
    if (typeof msg !== "object" || msg === null) return false;
    const { role, content } = msg as { role?: unknown; content?: unknown };
    if (typeof role !== "string" || !["user", "assistant", "system"].includes(role)) return false;
    if (typeof content !== "string" || content.length > MAX_MESSAGE_LENGTH) return false;
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check - extract token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("ERROR: No valid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized - Please log in to use the AI assistant" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Use service role key for reliable auth validation
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Validate user using the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("Auth error", { error: userError.message });
      return new Response(JSON.stringify({ error: "Unauthorized - Session expired, please log in again" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      logStep("No user found");
      return new Response(JSON.stringify({ error: "Unauthorized - No user found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { messages, userContext } = body;

    // Input validation
    if (!validateMessages(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format or too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize user context
    const sanitizedContext = userContext ? {
      energy: typeof userContext.energy === "number" ? Math.min(Math.max(userContext.energy, 0), 10) : undefined,
      mood: typeof userContext.mood === "string" ? userContext.mood.slice(0, 50) : undefined,
      burnoutRisk: typeof userContext.burnoutRisk === "string" ? userContext.burnoutRisk.slice(0, 50) : undefined,
    } : null;

    const systemPrompt = `You are HumanOS AI 🧠, a calm, supportive personal wellness assistant that helps users optimize their energy, focus, and well-being. You treat human energy, mood, and attention as system resources.

IMPORTANT FORMATTING RULES:
- NEVER use asterisks (*) or markdown formatting like **bold** or *italic*
- NEVER use slashes (/) in your responses
- Use emojis to add warmth and visual appeal (like 🌟 ⚡ 💪 🧘 😊 💡 🎯 ✨ 🌙 ☀️ 💚)
- Use plain text with natural emphasis
- Keep paragraphs short and readable
- Use line breaks for clarity

Core principles:
⚡ Energy-first decision making (not time-based)
💚 Non-judgmental and supportive tone
💡 Always explain the "why" behind your recommendations
🔒 Privacy-first mindset
🎯 Personalized advice based on user's current state

${sanitizedContext ? `User's current context:
⚡ Energy Level: ${sanitizedContext.energy || 'Unknown'} out of 100
😊 Current Mood: ${sanitizedContext.mood || 'Unknown'}
🔥 Burnout Risk: ${sanitizedContext.burnoutRisk || 'Unknown'}%
` : ''}

Keep responses concise, actionable, and warm. Use a calm, friendly tone with appropriate emojis. When giving advice, always consider the user's current energy and mood state. Be encouraging and supportive!`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
