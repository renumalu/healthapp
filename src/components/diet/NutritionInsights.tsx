import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays, differenceInDays } from "date-fns";

interface Meal {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  logged_at: string;
}

interface NutritionInsightsProps {
  targetCalories?: number | null;
  targetProtein?: number | null;
}

export const NutritionInsights = ({ targetCalories, targetProtein }: NutritionInsightsProps) => {
  const { data: weekMeals = [] } = useQuery({
    queryKey: ["weekMealsInsights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const today = new Date();
      const weekAgo = subDays(today, 6);

      const { data, error } = await supabase
        .from("meals")
        .select("calories, protein, carbs, fat, logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay(weekAgo).toISOString())
        .lte("logged_at", endOfDay(today).toISOString())
        .order("logged_at", { ascending: true });

      if (error) throw error;
      return data as Meal[];
    },
  });

  const { data: streakData } = useQuery({
    queryKey: ["nutritionStreak"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("nutrition_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Calculate daily averages
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayMeals = weekMeals.filter(
      (m) => format(new Date(m.logged_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
    return {
      date,
      calories: dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: dayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fat: dayMeals.reduce((sum, m) => sum + (m.fat || 0), 0),
      mealCount: dayMeals.length,
    };
  });

  const avgCalories = Math.round(
    dailyData.reduce((sum, d) => sum + d.calories, 0) / 7
  );
  const avgProtein = Math.round(
    dailyData.reduce((sum, d) => sum + d.protein, 0) / 7
  );
  const daysLogged = dailyData.filter((d) => d.mealCount > 0).length;

  // Calculate streak
  let currentStreak = 0;
  for (let i = dailyData.length - 1; i >= 0; i--) {
    if (dailyData[i].mealCount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Insights
  const insights = [];

  // Calorie trend
  const firstHalfAvg = dailyData.slice(0, 3).reduce((sum, d) => sum + d.calories, 0) / 3;
  const secondHalfAvg = dailyData.slice(4).reduce((sum, d) => sum + d.calories, 0) / 3;
  const calorieTrend = secondHalfAvg > firstHalfAvg ? "up" : "down";
  const trendPercent = Math.abs(Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)) || 0;

  if (targetCalories) {
    const diff = avgCalories - targetCalories;
    if (Math.abs(diff) < 100) {
      insights.push({
        type: "success",
        icon: CheckCircle2,
        text: "Great job! You're hitting your calorie target consistently.",
      });
    } else if (diff > 200) {
      insights.push({
        type: "warning",
        icon: AlertTriangle,
        text: `You're averaging ${diff} calories over your target.`,
      });
    } else if (diff < -200) {
      insights.push({
        type: "info",
        icon: Target,
        text: `You're ${Math.abs(diff)} calories under target. Make sure you're eating enough!`,
      });
    }
  }

  if (avgProtein > 0 && targetProtein) {
    const proteinPercent = (avgProtein / targetProtein) * 100;
    if (proteinPercent >= 90) {
      insights.push({
        type: "success",
        icon: Zap,
        text: "Excellent protein intake! Muscle recovery will thank you.",
      });
    } else if (proteinPercent < 70) {
      insights.push({
        type: "warning",
        icon: AlertTriangle,
        text: `Consider adding more protein. You're at ${Math.round(proteinPercent)}% of your goal.`,
      });
    }
  }

  if (currentStreak >= 7) {
    insights.push({
      type: "success",
      icon: Trophy,
      text: `Amazing! ${currentStreak} day streak! Keep the momentum going!`,
    });
  } else if (currentStreak >= 3) {
    insights.push({
      type: "info",
      icon: Flame,
      text: `${currentStreak} day streak! You're building great habits.`,
    });
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Nutrition Insights
        </CardTitle>
        <CardDescription>AI-powered analysis of your eating habits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Flame className="w-4 h-4" />
              Avg Daily
            </div>
            <div className="text-2xl font-bold">{avgCalories}</div>
            <div className="text-xs text-muted-foreground">calories</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              {calorieTrend === "up" ? (
                <TrendingUp className="w-4 h-4 text-orange-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-500" />
              )}
              Trend
            </div>
            <div className="text-2xl font-bold">
              {trendPercent > 0 ? `${calorieTrend === "up" ? "+" : "-"}${trendPercent}%` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">this week</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Streak
            </div>
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-xs text-muted-foreground">days</div>
          </div>
        </div>

        {/* Logging Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Days logged this week</span>
            <span className="font-medium">{daysLogged}/7</span>
          </div>
          <Progress value={(daysLogged / 7) * 100} className="h-2" />
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  insight.type === "success"
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : insight.type === "warning"
                    ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}
              >
                <insight.icon className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm">{insight.text}</span>
              </div>
            ))}
          </div>
        )}

        {insights.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Keep logging meals to get personalized insights!
          </div>
        )}
      </CardContent>
    </Card>
  );
};
