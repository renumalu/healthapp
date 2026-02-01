import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Star, TrendingUp, Flame } from "lucide-react";
import { useEffect } from "react";

interface UserGamification {
  id: string;
  total_points: number;
  current_level: number;
  current_xp: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
}

export const PointsDisplay = () => {
  const queryClient = useQueryClient();

  const { data: gamification, refetch } = useQuery({
    queryKey: ["user-gamification"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserGamification | null;
    },
  });

  // Initialize gamification if not exists
  const initMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_gamification")
        .insert({
          user_id: user.id,
          total_points: 0,
          current_level: 1,
          current_xp: 0,
          xp_to_next_level: 100,
          current_streak: 0,
          longest_streak: 0,
        });

      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    if (gamification === null) {
      initMutation.mutate();
    }
  }, [gamification]);

  const level = gamification?.current_level || 1;
  const xp = gamification?.current_xp || 0;
  const xpNeeded = gamification?.xp_to_next_level || 100;
  const totalPoints = gamification?.total_points || 0;
  const streak = gamification?.current_streak || 0;
  const xpProgress = (xp / xpNeeded) * 100;

  const getLevelTitle = (level: number) => {
    if (level >= 50) return "Grandmaster";
    if (level >= 30) return "Master";
    if (level >= 20) return "Expert";
    if (level >= 10) return "Adept";
    if (level >= 5) return "Apprentice";
    return "Novice";
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Star className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Level {level}</p>
              <p className="text-xs text-muted-foreground">{getLevelTitle(level)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">{totalPoints}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">XP to next level</span>
            <span className="text-foreground">{xp}/{xpNeeded}</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-foreground">{streak} day streak</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            Best: {gamification?.longest_streak || 0}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
