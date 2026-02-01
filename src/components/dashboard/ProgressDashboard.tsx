import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Flame, 
  Scale, 
  Utensils, 
  Dumbbell,
  Trophy,
  Calendar,
  Minus
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";

export function ProgressDashboard() {
  // Fetch weight logs for trend
  const { data: weightLogs = [] } = useQuery({
    queryKey: ["weightLogsProgress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", thirtyDaysAgo.toISOString())
        .order("logged_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch meals for calorie tracking
  const { data: meals = [] } = useQuery({
    queryKey: ["mealsProgress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", thirtyDaysAgo.toISOString())
        .order("logged_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch workouts
  const { data: workouts = [] } = useQuery({
    queryKey: ["workoutsProgress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", thirtyDaysAgo.toISOString())
        .order("completed_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch active diet plan
  const { data: activePlan } = useQuery({
    queryKey: ["activeDietPlanProgress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate weight trend
  const weightTrend = weightLogs.length >= 2
    ? Number(weightLogs[weightLogs.length - 1].weight_kg) - Number(weightLogs[0].weight_kg)
    : 0;

  // Calculate daily averages
  const dailyCalories: Record<string, number> = {};
  meals.forEach((meal) => {
    const day = format(new Date(meal.logged_at), "yyyy-MM-dd");
    dailyCalories[day] = (dailyCalories[day] || 0) + (meal.calories || 0);
  });

  const avgDailyCalories = Object.values(dailyCalories).length > 0
    ? Math.round(Object.values(dailyCalories).reduce((a, b) => a + b, 0) / Object.values(dailyCalories).length)
    : 0;

  // Calculate goal adherence
  const targetCalories = activePlan?.daily_calories || 2000;
  const daysOnTarget = Object.values(dailyCalories).filter(
    (cal) => cal >= targetCalories * 0.9 && cal <= targetCalories * 1.1
  ).length;
  const goalAdherence = Object.values(dailyCalories).length > 0
    ? Math.round((daysOnTarget / Object.values(dailyCalories).length) * 100)
    : 0;

  // Prepare chart data
  const weightChartData = weightLogs.map((log) => ({
    date: format(new Date(log.logged_at), "MMM d"),
    weight: Number(log.weight_kg),
  }));

  const calorieChartData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const calories = dailyCalories[dateStr] || 0;
    return {
      date: format(date, "MMM d"),
      calories,
      target: targetCalories,
    };
  });

  // Weekly workout data
  const weeklyWorkouts: Record<string, number> = {};
  workouts.forEach((workout) => {
    const week = format(new Date(workout.completed_at), "wo");
    weeklyWorkouts[week] = (weeklyWorkouts[week] || 0) + 1;
  });

  const stats = [
    {
      label: "Weight Change",
      value: weightTrend > 0 ? `+${weightTrend.toFixed(1)} kg` : `${weightTrend.toFixed(1)} kg`,
      icon: Scale,
      trend: weightTrend > 0 ? "up" : weightTrend < 0 ? "down" : "neutral",
      color: "text-blue-500",
    },
    {
      label: "Avg Daily Calories",
      value: `${avgDailyCalories} cal`,
      icon: Flame,
      trend: avgDailyCalories > targetCalories ? "up" : "down",
      color: "text-orange-500",
    },
    {
      label: "Goal Adherence",
      value: `${goalAdherence}%`,
      icon: Target,
      trend: goalAdherence >= 70 ? "up" : "down",
      color: "text-green-500",
    },
    {
      label: "Workouts Completed",
      value: workouts.length.toString(),
      icon: Dumbbell,
      trend: workouts.length >= 12 ? "up" : "neutral",
      color: "text-purple-500",
    },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Progress Dashboard
        </CardTitle>
        <CardDescription>
          Track your health journey over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-lg bg-background/50 border border-border/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{stat.value}</span>
                {stat.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                {stat.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                {stat.trend === "neutral" && <Minus className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>

        {/* Weight Trend Chart */}
        {weightChartData.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Weight Trend
            </h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis 
                    domain={['dataMin - 2', 'dataMax + 2']} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    fill="url(#weightGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Calorie Tracking Chart */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Calorie Tracking (Last 14 Days)
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calorieChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="calories" fill="hsl(var(--primary))" name="Calories" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" name="Target" strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="p-4 rounded-lg bg-background/50 border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              Monthly Goal Progress
            </h4>
            <Badge variant={goalAdherence >= 70 ? "default" : "secondary"}>
              {goalAdherence >= 70 ? "On Track" : "Needs Work"}
            </Badge>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Calorie Goal Adherence</span>
                <span className="font-medium">{goalAdherence}%</span>
              </div>
              <Progress value={goalAdherence} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Workout Consistency</span>
                <span className="font-medium">{Math.min(Math.round((workouts.length / 12) * 100), 100)}%</span>
              </div>
              <Progress value={Math.min((workouts.length / 12) * 100, 100)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Meals Logged</span>
                <span className="font-medium">{meals.length} meals</span>
              </div>
              <Progress value={Math.min((meals.length / 90) * 100, 100)} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
