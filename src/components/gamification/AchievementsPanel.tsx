import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Zap, 
  Utensils, 
  Target, 
  Dumbbell, 
  Flame, 
  Star, 
  Crown,
  Battery,
  Medal,
  Rocket,
  Brain,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  zap: Zap,
  utensils: Utensils,
  target: Target,
  dumbbell: Dumbbell,
  flame: Flame,
  star: Star,
  crown: Crown,
  battery: Battery,
  "battery-full": Battery,
  medal: Medal,
  rocket: Rocket,
  brain: Brain,
  salad: Utensils,
  fire: Flame,
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
}

export const AchievementsPanel = () => {
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("points", { ascending: true });
      if (error) throw error;
      return data as Achievement[];
    },
  });

  const { data: userAchievements = [] } = useQuery({
    queryKey: ["user-achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserAchievement[];
    },
  });

  const { data: userCounts } = useQuery({
    queryKey: ["user-achievement-counts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { energy_logs: 0, meals: 0, focus_sessions: 0, workouts: 0 };

      const [energyLogs, meals, focusSessions, workouts] = await Promise.all([
        supabase.from("energy_logs").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("meals").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("focus_sessions").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("workouts").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      return {
        energy_logs: energyLogs.count || 0,
        meals: meals.count || 0,
        focus_sessions: focusSessions.count || 0,
        workouts: workouts.count || 0,
      };
    },
  });

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  const getProgress = (achievement: Achievement) => {
    const counts: Record<string, number> = userCounts || { energy_logs: 0, meals: 0, focus_sessions: 0, workouts: 0 };
    const current = counts[achievement.requirement_type] || 0;
    return Math.min((current / achievement.requirement_value) * 100, 100);
  };

  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          Achievements
          <Badge variant="secondary" className="ml-auto">
            {userAchievements.length}/{achievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {category}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {achievements
                .filter(a => a.category === category)
                .map(achievement => {
                  const IconComponent = iconMap[achievement.icon] || Trophy;
                  const isEarned = earnedIds.has(achievement.id);
                  const progress = getProgress(achievement);

                  return (
                    <div
                      key={achievement.id}
                      className={cn(
                        "relative p-3 rounded-lg border transition-all",
                        isEarned
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/30 border-border/50 opacity-70"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isEarned ? "bg-primary/20" : "bg-muted/50"
                        )}>
                          {isEarned ? (
                            <IconComponent className="w-4 h-4 text-primary" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-medium truncate",
                            isEarned ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {achievement.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {achievement.description}
                          </p>
                          {!isEarned && (
                            <Progress value={progress} className="h-1 mt-1" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          +{achievement.points}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
