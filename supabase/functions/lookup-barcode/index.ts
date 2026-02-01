import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation - barcode should be numeric and reasonable length
const BARCODE_PATTERN = /^\d{8,14}$/;

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
    const { barcode } = body;

    // Input validation
    if (!barcode || typeof barcode !== "string") {
      return new Response(JSON.stringify({ found: false, error: "No barcode provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize and validate barcode format
    const sanitizedBarcode = barcode.trim().replace(/\s/g, "");
    if (!BARCODE_PATTERN.test(sanitizedBarcode)) {
      return new Response(JSON.stringify({ found: false, error: "Invalid barcode format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Looking up barcode for user:", user.id, "barcode:", sanitizedBarcode);

    // Use Open Food Facts API (free, no API key required)
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(sanitizedBarcode)}.json`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch product data");
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return new Response(
        JSON.stringify({
          found: false,
          message: "Product not found in database",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    const nutritionInfo = {
      found: true,
      name: product.product_name || product.generic_name || "Unknown Product",
      brand: product.brands || "",
      image_url: product.image_url || product.image_front_url || "",
      serving_size: product.serving_size || "100g",
      calories: Math.round(nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0),
      protein: Math.round(nutriments.proteins_100g || nutriments.proteins || 0),
      carbs: Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0),
      fat: Math.round(nutriments.fat_100g || nutriments.fat || 0),
      fiber: Math.round(nutriments.fiber_100g || nutriments.fiber || 0),
      sugar: Math.round(nutriments.sugars_100g || nutriments.sugars || 0),
      sodium: Math.round(nutriments.sodium_100g || nutriments.sodium || 0),
      ingredients: product.ingredients_text || "",
      nutriscore: product.nutriscore_grade || null,
      categories: product.categories || "",
    };

    console.log("Product found for user:", user.id, "product:", nutritionInfo.name);

    return new Response(JSON.stringify(nutritionInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ found: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
