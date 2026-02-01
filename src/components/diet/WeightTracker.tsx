import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scale, Plus, TrendingUp, TrendingDown, Target, Sparkles, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format, subDays } from "date-fns";

interface WeightLog {
  id: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  notes: string | null;
  logged_at: string;
}

interface GoalSuggestion {
  type: "increase" | "decrease" | "maintain";
  calorieAdjustment: number;
  proteinAdjustment: number;
  reason: string;
}

export const WeightTracker = () => {
  const queryClient = useQueryClient();
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLog, setNewLog] = useState({ weight_kg: "", body_fat_percentage: "", notes: "" });

  const { data: weightLogs = [], isLoading } = useQuery({
    queryKey: ["weightLogs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as WeightLog[];
    },
  });

  const { data: activePlan } = useQuery({
    queryKey: ["activeDietPlan"],
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

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: parseFloat(newLog.weight_kg),
        body_fat_percentage: newLog.body_fat_percentage ? parseFloat(newLog.body_fat_percentage) : null,
        notes: newLog.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weightLogs"] });
      setIsAddingLog(false);
      setNewLog({ weight_kg: "", body_fat_percentage: "", notes: "" });
      toast.success("Weight logged!");
    },
    onError: (error) => {
      toast.error("Failed to log weight: " + error.message);
    },
  });

  // Calculate progress and suggestions
  const getProgressAnalysis = (): GoalSuggestion | null => {
    if (weightLogs.length < 2) return null;

    const recentLogs = weightLogs.slice(0, 7);
    const olderLogs = weightLogs.slice(7, 14);

    if (olderLogs.length === 0) return null;

    const recentAvg = recentLogs.reduce((acc, l) => acc + Number(l.weight_kg), 0) / recentLogs.length;
    const olderAvg = olderLogs.reduce((acc, l) => acc + Number(l.weight_kg), 0) / olderLogs.length;
    const weeklyChange = recentAvg - olderAvg;

    const goal = activePlan?.goal?.toLowerCase() || "";
    const isWeightLoss = goal.includes("lose") || goal.includes("loss") || goal.includes("cut");
    const isWeightGain = goal.includes("gain") || goal.includes("bulk") || goal.includes("muscle");

    if (isWeightLoss) {
      if (weeklyChange > 0.2) {
        return {
          type: "decrease",
          calorieAdjustment: -200,
          proteinAdjustment: 10,
          reason: `You've gained ${weeklyChange.toFixed(1)}kg this week. Consider reducing calories by 200 and increasing protein to preserve muscle.`
        };
      } else if (weeklyChange < -1) {
        return {
          type: "increase",
          calorieAdjustment: 150,
          proteinAdjustment: 0,
          reason: `You're losing weight quickly (${Math.abs(weeklyChange).toFixed(1)}kg/week). Slow down to preserve muscle mass.`
        };
      }
    } else if (isWeightGain) {
      if (weeklyChange < 0.1) {
        return {
          type: "increase",
          calorieAdjustment: 250,
          proteinAdjustment: 15,
          reason: `Weight gain is slow (${weeklyChange.toFixed(1)}kg). Increase calories by 250 and add more protein for muscle growth.`
        };
      } else if (weeklyChange > 0.5) {
        return {
          type: "decrease",
          calorieAdjustment: -100,
          proteinAdjustment: 0,
          reason: `Gaining too fast (${weeklyChange.toFixed(1)}kg/week). Reduce surplus to minimize fat gain.`
        };
      }
    }

    return {
      type: "maintain",
      calorieAdjustment: 0,
      proteinAdjustment: 0,
      reason: "Your current progress is on track! Keep up the great work."
    };
  };

  const suggestion = getProgressAnalysis();

  // Chart data
  const chartData = [...weightLogs]
    .reverse()
    .slice(-14)
    .map(log => ({
      date: format(new Date(log.logged_at), "MMM d"),
      weight: Number(log.weight_kg),
      bodyFat: log.body_fat_percentage ? Number(log.body_fat_percentage) : null,
    }));

  const latestWeight = weightLogs[0]?.weight_kg;
  const previousWeight = weightLogs[1]?.weight_kg;
  const weightChange = latestWeight && previousWeight ? Number(latestWeight) - Number(previousWeight) : null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Weight & Body Composition
            </CardTitle>
            <CardDescription>Track your progress and get AI-powered goal adjustments</CardDescription>
          </div>
          <Dialog open={isAddingLog} onOpenChange={setIsAddingLog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Log Weight
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Weight</DialogTitle>
                <DialogDescription>Record your current weight and body composition</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    value={newLog.weight_kg}
                    onChange={(e) => setNewLog({ ...newLog, weight_kg: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body Fat % (optional)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15.0"
                    value={newLog.body_fat_percentage}
                    onChange={(e) => setNewLog({ ...newLog, body_fat_percentage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="After breakfast, morning weigh-in..."
                    value={newLog.notes}
                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addLogMutation.mutate()}
                  disabled={!newLog.weight_kg || addLogMutation.isPending}
                >
                  Log Weight
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : weightLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No weight logs yet</p>
            <p className="text-sm">Start tracking to get personalized suggestions</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl font-bold">{Number(latestWeight).toFixed(1)} kg</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Change</p>
                <div className="flex items-center justify-center gap-1">
                  {weightChange !== null && (
                    <>
                      {weightChange > 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : weightChange < 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-500" />
                      ) : null}
                      <p className={`text-2xl font-bold ${weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : ''}`}>
                        {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Body Fat</p>
                <p className="text-2xl font-bold">
                  {weightLogs[0]?.body_fat_percentage ? `${Number(weightLogs[0].body_fat_percentage).toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>

            {/* AI Suggestion */}
            {suggestion && (
              <div className={`p-4 rounded-lg border ${
                suggestion.type === 'decrease' ? 'border-orange-500/30 bg-orange-500/5' :
                suggestion.type === 'increase' ? 'border-blue-500/30 bg-blue-500/5' :
                'border-green-500/30 bg-green-500/5'
              }`}>
                <div className="flex items-start gap-3">
                  <Sparkles className={`w-5 h-5 mt-0.5 ${
                    suggestion.type === 'decrease' ? 'text-orange-500' :
                    suggestion.type === 'increase' ? 'text-blue-500' :
                    'text-green-500'
                  }`} />
                  <div>
                    <p className="font-medium mb-1">AI Goal Suggestion</p>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    {suggestion.calorieAdjustment !== 0 && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                          {suggestion.calorieAdjustment > 0 ? '+' : ''}{suggestion.calorieAdjustment} cal
                        </Badge>
                        {suggestion.proteinAdjustment !== 0 && (
                          <Badge variant="outline">
                            +{suggestion.proteinAdjustment}g protein
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Weight Chart */}
            {chartData.length > 1 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
