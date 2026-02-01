import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MIN_CALORIES = 1000;
const MAX_CALORIES = 5000;
const MAX_RESTRICTIONS_LENGTH = 500;
const VALID_DIET_TYPES = ["balanced", "low-carb", "high-protein", "vegetarian", "vegan", "keto", "mediterranean"];
const VALID_MEALS_PER_DAY = [3, 4, 5];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    // Extract the JWT token from the Authorization header
    const jwt = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pass the JWT explicitly to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { calorieTarget, dietType, restrictions, mealsPerDay } = body;
    
    // Input validation and sanitization
    calorieTarget = typeof calorieTarget === "number" 
      ? Math.min(Math.max(calorieTarget, MIN_CALORIES), MAX_CALORIES) 
      : 2000;
    
    dietType = typeof dietType === "string" && VALID_DIET_TYPES.includes(dietType.toLowerCase())
      ? dietType.toLowerCase()
      : "balanced";
    
    restrictions = typeof restrictions === "string" 
      ? restrictions.slice(0, MAX_RESTRICTIONS_LENGTH).replace(/[<>]/g, "") 
      : "";
    
    mealsPerDay = typeof mealsPerDay === "number" && VALID_MEALS_PER_DAY.includes(mealsPerDay)
      ? mealsPerDay
      : 3;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating meal plan for user:", user.id);

    const mealTypes = mealsPerDay === 3 
      ? ["Breakfast", "Lunch", "Dinner"]
      : mealsPerDay === 4
        ? ["Breakfast", "Lunch", "Snack", "Dinner"]
        : ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"];

    const prompt = `You are a professional nutritionist. Create a complete 7-day meal plan.

Requirements:
- Daily calorie target: ${calorieTarget} kcal
- Diet type: ${dietType}
- Dietary restrictions: ${restrictions || "None"}
- Meals per day: ${mealsPerDay} (${mealTypes.join(", ")})

For EACH of the 7 days (Monday through Sunday), provide exactly ${mealsPerDay} meals.

For each meal include:
- type: The meal type (${mealTypes.join(", ")})
- name: The meal name
- calories: Estimated calories (number)
- protein: Protein in grams (number)
- carbs: Carbs in grams (number)
- fat: Fat in grams (number)
- description: Brief 1-sentence description

Distribute calories appropriately across meals. Make meals varied and practical.

Response format - ONLY return valid JSON array:
[
  {
    "day": "Monday",
    "meals": [
      { "type": "Breakfast", "name": "...", "calories": 400, "protein": 20, "carbs": 45, "fat": 15, "description": "..." },
      ...
    ]
  },
  ...
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional nutritionist. Always respond with valid JSON only, no markdown or extra text." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log("Meal plan generated for user:", user.id);

    let plan;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Return fallback plan
      plan = generateFallbackPlan(calorieTarget, mealsPerDay);
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-meal-plan function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackPlan(calorieTarget: number, mealsPerDay: number) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const mealCalories = Math.round(calorieTarget / mealsPerDay);
  
  const breakfasts = [
    { name: "Oatmeal with Berries", description: "Warm oatmeal topped with fresh berries and honey" },
    { name: "Greek Yogurt Parfait", description: "Creamy yogurt with granola and mixed fruits" },
    { name: "Avocado Toast", description: "Whole grain toast with smashed avocado and eggs" },
    { name: "Smoothie Bowl", description: "Blended fruits with nuts and seeds topping" },
    { name: "Scrambled Eggs", description: "Fluffy eggs with vegetables and whole wheat toast" },
    { name: "Pancakes", description: "Whole grain pancakes with maple syrup and fruit" },
    { name: "Breakfast Burrito", description: "Eggs, beans, and vegetables in a whole wheat wrap" },
  ];

  const lunches = [
    { name: "Grilled Chicken Salad", description: "Mixed greens with grilled chicken and vinaigrette" },
    { name: "Quinoa Buddha Bowl", description: "Quinoa with roasted vegetables and tahini dressing" },
    { name: "Turkey Sandwich", description: "Whole grain bread with turkey, lettuce, and tomato" },
    { name: "Vegetable Soup", description: "Hearty vegetable soup with whole grain bread" },
    { name: "Tuna Wrap", description: "Tuna salad in a whole wheat wrap with vegetables" },
    { name: "Mediterranean Plate", description: "Hummus, falafel, and fresh vegetables with pita" },
    { name: "Asian Noodle Bowl", description: "Rice noodles with vegetables and tofu in broth" },
  ];

  const dinners = [
    { name: "Grilled Salmon", description: "Salmon fillet with roasted vegetables and rice" },
    { name: "Chicken Stir Fry", description: "Chicken with mixed vegetables over brown rice" },
    { name: "Pasta Primavera", description: "Whole wheat pasta with seasonal vegetables" },
    { name: "Beef Tacos", description: "Lean beef tacos with fresh salsa and guacamole" },
    { name: "Baked Cod", description: "Herb-crusted cod with quinoa and steamed broccoli" },
    { name: "Vegetable Curry", description: "Creamy vegetable curry with basmati rice" },
    { name: "Turkey Meatballs", description: "Turkey meatballs with marinara and zucchini noodles" },
  ];

  return days.map((day, i) => ({
    day,
    meals: [
      {
        type: "Breakfast",
        name: breakfasts[i].name,
        calories: mealCalories,
        protein: Math.round(mealCalories * 0.2 / 4),
        carbs: Math.round(mealCalories * 0.5 / 4),
        fat: Math.round(mealCalories * 0.3 / 9),
        description: breakfasts[i].description,
      },
      {
        type: "Lunch",
        name: lunches[i].name,
        calories: mealCalories,
        protein: Math.round(mealCalories * 0.25 / 4),
        carbs: Math.round(mealCalories * 0.45 / 4),
        fat: Math.round(mealCalories * 0.3 / 9),
        description: lunches[i].description,
      },
      {
        type: "Dinner",
        name: dinners[i].name,
        calories: mealCalories,
        protein: Math.round(mealCalories * 0.3 / 4),
        carbs: Math.round(mealCalories * 0.4 / 4),
        fat: Math.round(mealCalories * 0.3 / 9),
        description: dinners[i].description,
      },
    ].slice(0, mealsPerDay),
  }));
}
