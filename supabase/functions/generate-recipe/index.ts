import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_INGREDIENTS_LENGTH = 1000;
const MAX_PREFERENCES_LENGTH = 500;
const MIN_CALORIES = 100;
const MAX_CALORIES = 3000;
const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "dessert"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { ingredients, dietaryPreferences, mealType, targetCalories } = body;

    // Input validation and sanitization
    ingredients = typeof ingredients === "string" 
      ? ingredients.slice(0, MAX_INGREDIENTS_LENGTH).replace(/[<>]/g, "") 
      : "";
    
    dietaryPreferences = typeof dietaryPreferences === "string" 
      ? dietaryPreferences.slice(0, MAX_PREFERENCES_LENGTH).replace(/[<>]/g, "") 
      : "";
    
    mealType = typeof mealType === "string" && VALID_MEAL_TYPES.includes(mealType.toLowerCase())
      ? mealType.toLowerCase()
      : "";
    
    targetCalories = typeof targetCalories === "number"
      ? Math.min(Math.max(targetCalories, MIN_CALORIES), MAX_CALORIES)
      : undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating recipe for user:", user.id, { mealType });

    const prompt = `Generate a healthy recipe based on these criteria:
${ingredients ? `- Available ingredients: ${ingredients}` : ""}
${dietaryPreferences ? `- Dietary preferences: ${dietaryPreferences}` : ""}
${mealType ? `- Meal type: ${mealType}` : ""}
${targetCalories ? `- Target calories: ${targetCalories}` : ""}

Please provide a complete recipe with nutritional information.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional chef and nutritionist. Generate healthy, delicious recipes with accurate nutritional information.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Create a complete recipe with all details",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Recipe name" },
                  description: { type: "string", description: "Brief description of the dish" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "string" },
                        unit: { type: "string" },
                      },
                      required: ["name", "amount"],
                    },
                  },
                  instructions: { type: "string", description: "Step-by-step cooking instructions" },
                  prep_time_minutes: { type: "number" },
                  cook_time_minutes: { type: "number" },
                  servings: { type: "number" },
                  calories_per_serving: { type: "number" },
                  protein_per_serving: { type: "number" },
                  carbs_per_serving: { type: "number" },
                  fat_per_serving: { type: "number" },
                  category: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack", "dessert"] },
                  tips: { type: "string", description: "Cooking tips or variations" },
                },
                required: ["name", "description", "ingredients", "instructions", "servings", "calories_per_serving"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI gateway error:", error);
      throw new Error("Failed to generate recipe");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const recipe = JSON.parse(toolCall.function.arguments);
      console.log("Generated recipe:", recipe.name, "for user:", user.id);
      return new Response(JSON.stringify({ recipe }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to parse recipe response");
  } catch (error) {
    console.error("Recipe generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
