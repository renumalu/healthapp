import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Calendar, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MealPlanDay {
  day: string;
  meals: {
    type: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    description: string;
  }[];
}

export const AIMealPlanGenerator = () => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<MealPlanDay[] | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    calorieTarget: "2000",
    dietType: "balanced",
    restrictions: "",
    mealsPerDay: "3",
    planDuration: "1", // months
  });

  const generatePlan = async () => {
    setIsGenerating(true);
    setGeneratedPlan(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          calorieTarget: parseInt(preferences.calorieTarget),
          dietType: preferences.dietType,
          restrictions: preferences.restrictions,
          mealsPerDay: parseInt(preferences.mealsPerDay),
        },
      });

      if (error) throw error;

      if (data?.plan) {
        setGeneratedPlan(data.plan);
        toast.success("Meal plan generated!");
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error("Failed to generate meal plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      if (!generatedPlan) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      const mealPlans = generatedPlan.flatMap((day) => {
        const dayIndex = dayMap.indexOf(day.day);
        return day.meals.map((meal) => ({
          user_id: user.id,
          day_of_week: dayIndex >= 0 ? dayIndex : 0,
          meal_type: meal.type.toLowerCase(),
          meal_name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        }));
      });

      const { error } = await supabase.from("meal_plans").insert(mealPlans);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyMealPlans"] });
      toast.success("Meal plan saved!");
      setGeneratedPlan(null);
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Meal Plan Generator
        </CardTitle>
        <CardDescription>
          Generate a personalized weekly meal plan with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!generatedPlan ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Daily Calorie Target</Label>
                <Input
                  type="number"
                  value={preferences.calorieTarget}
                  onChange={(e) => setPreferences(p => ({ ...p, calorieTarget: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Meals Per Day</Label>
                <Select
                  value={preferences.mealsPerDay}
                  onValueChange={(v) => setPreferences(p => ({ ...p, mealsPerDay: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meals</SelectItem>
                    <SelectItem value="4">4 meals</SelectItem>
                    <SelectItem value="5">5 meals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Plan Duration</Label>
              <Select
                value={preferences.planDuration}
                onValueChange={(v) => setPreferences(p => ({ ...p, planDuration: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="2">2 Months</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Weekly plan will repeat for the selected duration
              </p>
            </div>

            <div>
              <Label>Diet Type</Label>
              <Select
                value={preferences.dietType}
                onValueChange={(v) => setPreferences(p => ({ ...p, dietType: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="high-protein">High Protein</SelectItem>
                  <SelectItem value="low-carb">Low Carb</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dietary Restrictions / Preferences</Label>
              <Textarea
                value={preferences.restrictions}
                onChange={(e) => setPreferences(p => ({ ...p, restrictions: e.target.value }))}
                placeholder="e.g., No nuts, gluten-free, prefer chicken over red meat..."
                className="mt-1"
              />
            </div>

            <Button
              onClick={generatePlan}
              disabled={isGenerating}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate 7-Day Plan
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Your Weekly Plan
              </h4>
              <Button
                size="sm"
                onClick={() => savePlanMutation.mutate()}
                disabled={savePlanMutation.isPending}
                className="gap-1"
              >
                <Check className="w-4 h-4" />
                Save Plan
              </Button>
            </div>

            {generatedPlan.map((day) => (
              <div key={day.day} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                  className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
                >
                  <span className="font-medium text-foreground">{day.day}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {day.meals.reduce((sum, m) => sum + m.calories, 0)} kcal
                    </Badge>
                    {expandedDay === day.day ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedDay === day.day && (
                  <div className="border-t border-border/50 p-3 space-y-2 bg-secondary/10">
                    {day.meals.map((meal, idx) => (
                      <div key={idx} className="flex items-start justify-between p-2 rounded bg-background/50">
                        <div>
                          <p className="text-xs font-medium text-primary uppercase">
                            {meal.type}
                          </p>
                          <p className="text-sm font-medium text-foreground">{meal.name}</p>
                          <p className="text-xs text-muted-foreground">{meal.description}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{meal.calories} kcal</p>
                          <p>P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() => setGeneratedPlan(null)}
              className="w-full"
            >
              Generate New Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
