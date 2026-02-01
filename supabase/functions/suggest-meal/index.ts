import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MAX_PREFERENCES_LENGTH = 500;
const MAX_DIET_GOAL_LENGTH = 200;
const MIN_CALORIES = 0;
const MAX_CALORIES = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No authorization header or invalid format");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // IMPORTANT: In Edge/Server environments, pass the JWT explicitly.
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError) {
      console.log("Auth error:", userError.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      console.log("No user found in session");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { mealType, dietGoal, currentCalories, targetCalories, preferences } = body;
    
    // Input validation and sanitization
    mealType = typeof mealType === "string" && VALID_MEAL_TYPES.includes(mealType.toLowerCase())
      ? mealType.toLowerCase()
      : "lunch";
    
    dietGoal = typeof dietGoal === "string" 
      ? dietGoal.slice(0, MAX_DIET_GOAL_LENGTH).replace(/[<>]/g, "") 
      : "";
    
    currentCalories = typeof currentCalories === "number"
      ? Math.min(Math.max(currentCalories, MIN_CALORIES), MAX_CALORIES)
      : 0;
    
    targetCalories = typeof targetCalories === "number"
      ? Math.min(Math.max(targetCalories, MIN_CALORIES), MAX_CALORIES)
      : undefined;
    
    preferences = typeof preferences === "string" 
      ? preferences.slice(0, MAX_PREFERENCES_LENGTH).replace(/[<>]/g, "") 
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Suggesting meal for user:", user.id, { mealType });

    const remainingCalories = targetCalories ? targetCalories - currentCalories : null;
    
    const prompt = `You are a nutritionist AI. Suggest 3 healthy meal ideas for ${mealType}.
${dietGoal ? `Diet Goal: ${dietGoal}` : ''}
${remainingCalories ? `Remaining calories for today: ${remainingCalories} kcal` : ''}
${preferences ? `User preferences: ${preferences}` : ''}

For each meal, provide:
- Name
- Estimated calories
- Protein (g)
- Carbs (g)
- Fat (g)
- Brief description

Format your response as JSON array with objects containing: name, calories, protein, carbs, fat, description`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful nutritionist AI. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log("Meal suggestions generated for user:", user.id);
    
    // Parse JSON from response
    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      suggestions = [
        { name: "Grilled Chicken Salad", calories: 350, protein: 35, carbs: 15, fat: 18, description: "Fresh mixed greens with grilled chicken breast" },
        { name: "Quinoa Buddha Bowl", calories: 420, protein: 18, carbs: 55, fat: 16, description: "Nutritious bowl with quinoa, roasted vegetables, and tahini" },
        { name: "Salmon with Vegetables", calories: 380, protein: 32, carbs: 20, fat: 20, description: "Baked salmon with steamed broccoli and sweet potato" }
      ];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in suggest-meal function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
