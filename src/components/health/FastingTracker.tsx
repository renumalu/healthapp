import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Timer, Play, Square, Flame, Trophy, Loader2 } from "lucide-react";
import { format, differenceInMinutes, differenceInHours, addHours } from "date-fns";

interface FastingSession {
  id: string;
  fasting_type: string;
  started_at: string;
  target_hours: number;
  ended_at: string | null;
  completed: boolean;
  notes: string | null;
}

const fastingTypes = [
  { value: "16:8", label: "16:8", hours: 16, description: "16h fast, 8h eating window" },
  { value: "18:6", label: "18:6", hours: 18, description: "18h fast, 6h eating window" },
  { value: "20:4", label: "20:4", hours: 20, description: "20h fast, 4h eating window" },
  { value: "OMAD", label: "OMAD", hours: 23, description: "One Meal A Day" },
  { value: "24h", label: "24 Hour", hours: 24, description: "Full day fast" },
  { value: "36h", label: "36 Hour", hours: 36, description: "Extended fast" },
];

export const FastingTracker = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("16:8");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: activeFast, isLoading } = useQuery({
    queryKey: ["activeFasting"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("fasting_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as FastingSession | null;
    },
  });

  const { data: completedFasts = [] } = useQuery({
    queryKey: ["completedFasts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("fasting_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("ended_at", { ascending: false })
        .limit(7);

      if (error) throw error;
      return data as FastingSession[];
    },
  });

  const startFastMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fastType = fastingTypes.find(t => t.value === selectedType)!;

      const { error } = await supabase.from("fasting_sessions").insert({
        user_id: user.id,
        fasting_type: selectedType,
        target_hours: fastType.hours,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeFasting"] });
      toast.success("Fasting started! Stay strong 💪");
    },
    onError: (error) => {
      toast.error("Failed to start fast: " + error.message);
    },
  });

  const endFastMutation = useMutation({
    mutationFn: async () => {
      if (!activeFast) return;

      const elapsed = differenceInHours(new Date(), new Date(activeFast.started_at));
      const completed = elapsed >= activeFast.target_hours;

      const { error } = await supabase
        .from("fasting_sessions")
        .update({
          ended_at: new Date().toISOString(),
          completed,
        })
        .eq("id", activeFast.id);

      if (error) throw error;
      return completed;
    },
    onSuccess: (completed) => {
      queryClient.invalidateQueries({ queryKey: ["activeFasting"] });
      queryClient.invalidateQueries({ queryKey: ["completedFasts"] });
      if (completed) {
        toast.success("🎉 Congratulations! Fast completed successfully!");
      } else {
        toast.success("Fast ended. Keep trying!");
      }
    },
  });

  // Calculate progress
  const getProgress = () => {
    if (!activeFast) return { percent: 0, elapsed: 0, remaining: 0 };

    const startTime = new Date(activeFast.started_at);
    const elapsedMinutes = differenceInMinutes(currentTime, startTime);
    const targetMinutes = activeFast.target_hours * 60;
    const percent = Math.min((elapsedMinutes / targetMinutes) * 100, 100);
    const remaining = Math.max(targetMinutes - elapsedMinutes, 0);

    return { percent, elapsed: elapsedMinutes, remaining };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const progress = getProgress();
  const currentStreak = completedFasts.length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          Intermittent Fasting
        </CardTitle>
        <CardDescription>Track your fasting windows and build consistency</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeFast ? (
          <div className="space-y-6">
            {/* Active Fast Timer */}
            <div className="text-center">
              <Badge variant="secondary" className="mb-3">
                <Flame className="w-3 h-3 mr-1 text-orange-500" />
                {activeFast.fasting_type} Fast Active
              </Badge>
              
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress.percent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{formatDuration(progress.elapsed)}</span>
                  <span className="text-sm text-muted-foreground">elapsed</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold">{formatDuration(progress.remaining)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ends at</p>
                  <p className="text-lg font-semibold">
                    {format(addHours(new Date(activeFast.started_at), activeFast.target_hours), "h:mm a")}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => endFastMutation.mutate()}
              disabled={endFastMutation.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              End Fast
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fasting Type Selection */}
            <div className="space-y-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fastingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-sm text-muted-foreground ml-2">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => startFastMutation.mutate()}
              disabled={startFastMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Fasting
            </Button>

            {/* Streak */}
            {currentStreak > 0 && (
              <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-medium">{currentStreak} fasts completed this week!</span>
              </div>
            )}

            {/* Recent Fasts */}
            {completedFasts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Fasts</h4>
                <div className="space-y-2">
                  {completedFasts.slice(0, 3).map((fast) => (
                    <div key={fast.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{fast.fasting_type}</Badge>
                        <span className="text-sm">{fast.target_hours}h</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(fast.ended_at!), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
