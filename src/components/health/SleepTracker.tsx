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
import { Moon, Plus, Star, TrendingUp, Loader2, Bed, Sun } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, differenceInHours, differenceInMinutes, subDays, parseISO } from "date-fns";

interface SleepLog {
  id: string;
  sleep_start: string;
  sleep_end: string;
  quality_rating: number | null;
  deep_sleep_hours: number | null;
  notes: string | null;
  created_at: string;
}

export const SleepTracker = () => {
  const queryClient = useQueryClient();
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLog, setNewLog] = useState({
    sleep_start: "",
    sleep_end: "",
    quality_rating: 3,
    deep_sleep_hours: "",
    notes: "",
  });

  const { data: sleepLogs = [], isLoading } = useQuery({
    queryKey: ["sleepLogs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sleep_end", { ascending: false })
        .limit(14);

      if (error) throw error;
      return data as SleepLog[];
    },
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("sleep_logs").insert({
        user_id: user.id,
        sleep_start: newLog.sleep_start,
        sleep_end: newLog.sleep_end,
        quality_rating: newLog.quality_rating,
        deep_sleep_hours: newLog.deep_sleep_hours ? parseFloat(newLog.deep_sleep_hours) : null,
        notes: newLog.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleepLogs"] });
      setIsAddingLog(false);
      setNewLog({
        sleep_start: "",
        sleep_end: "",
        quality_rating: 3,
        deep_sleep_hours: "",
        notes: "",
      });
      toast.success("Sleep logged!");
    },
    onError: (error) => {
      toast.error("Failed to log sleep: " + error.message);
    },
  });

  const calculateDuration = (start: string, end: string) => {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const hours = differenceInHours(endDate, startDate);
    const minutes = differenceInMinutes(endDate, startDate) % 60;
    return { hours, minutes, total: hours + minutes / 60 };
  };

  // Calculate averages
  const getAverages = () => {
    if (sleepLogs.length === 0) return { avgDuration: 0, avgQuality: 0 };

    const totalDuration = sleepLogs.reduce((acc, log) => {
      const { total } = calculateDuration(log.sleep_start, log.sleep_end);
      return acc + total;
    }, 0);

    const qualityLogs = sleepLogs.filter(l => l.quality_rating !== null);
    const totalQuality = qualityLogs.reduce((acc, log) => acc + (log.quality_rating || 0), 0);

    return {
      avgDuration: totalDuration / sleepLogs.length,
      avgQuality: qualityLogs.length > 0 ? totalQuality / qualityLogs.length : 0,
    };
  };

  const averages = getAverages();
  const lastSleep = sleepLogs[0];

  // Chart data
  const chartData = [...sleepLogs]
    .reverse()
    .slice(-7)
    .map(log => {
      const { total } = calculateDuration(log.sleep_start, log.sleep_end);
      return {
        date: format(parseISO(log.sleep_end), "EEE"),
        hours: Number(total.toFixed(1)),
        quality: log.quality_rating || 0,
      };
    });

  const getSleepQualityLabel = (rating: number) => {
    const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
    return labels[rating] || "";
  };

  const getSleepQualityColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              Sleep Tracker
            </CardTitle>
            <CardDescription>Monitor your rest for better recovery</CardDescription>
          </div>
          <Dialog open={isAddingLog} onOpenChange={setIsAddingLog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Log Sleep
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Sleep</DialogTitle>
                <DialogDescription>Record last night's sleep</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Went to bed</Label>
                    <Input
                      type="datetime-local"
                      value={newLog.sleep_start}
                      onChange={(e) => setNewLog({ ...newLog, sleep_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Woke up</Label>
                    <Input
                      type="datetime-local"
                      value={newLog.sleep_end}
                      onChange={(e) => setNewLog({ ...newLog, sleep_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sleep Quality</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={newLog.quality_rating === rating ? "default" : "outline"}
                        size="icon"
                        onClick={() => setNewLog({ ...newLog, quality_rating: rating })}
                        className="w-10 h-10"
                      >
                        <Star className={`w-4 h-4 ${newLog.quality_rating >= rating ? "fill-current" : ""}`} />
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSleepQualityLabel(newLog.quality_rating)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Deep Sleep Hours (optional)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="2.5"
                    value={newLog.deep_sleep_hours}
                    onChange={(e) => setNewLog({ ...newLog, deep_sleep_hours: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Woke up once, vivid dreams..."
                    value={newLog.notes}
                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => addLogMutation.mutate()}
                  disabled={!newLog.sleep_start || !newLog.sleep_end || addLogMutation.isPending}
                >
                  Log Sleep
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
        ) : sleepLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Moon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sleep logs yet</p>
            <p className="text-sm">Start tracking to optimize your rest</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Bed className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                <p className="text-xl font-bold">{averages.avgDuration.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-xl font-bold">{averages.avgQuality.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Quality</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Sun className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <p className="text-xl font-bold">{sleepLogs.length}</p>
                <p className="text-xs text-muted-foreground">Nights Logged</p>
              </div>
            </div>

            {/* Last Night */}
            {lastSleep && (
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Last Night</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {calculateDuration(lastSleep.sleep_start, lastSleep.sleep_end).hours}h{" "}
                      {calculateDuration(lastSleep.sleep_start, lastSleep.sleep_end).minutes}m
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(lastSleep.sleep_start), "h:mm a")} -{" "}
                      {format(parseISO(lastSleep.sleep_end), "h:mm a")}
                    </p>
                  </div>
                  {lastSleep.quality_rating && (
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < lastSleep.quality_rating! ? "fill-yellow-500 text-yellow-500" : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-sm ${getSleepQualityColor(lastSleep.quality_rating)}`}>
                        {getSleepQualityLabel(lastSleep.quality_rating)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sleep Chart */}
            {chartData.length > 1 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 12]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}h`, "Sleep"]}
                    />
                    <Bar
                      dataKey="hours"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
