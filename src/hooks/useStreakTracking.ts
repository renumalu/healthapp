import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365];

const getStreakMessage = (streak: number): { title: string; description: string; emoji: string } => {
  if (streak >= 365) return { title: "LEGENDARY!", emoji: "🏆", description: `${streak} days! You're absolutely unstoppable!` };
  if (streak >= 200) return { title: "INCREDIBLE!", emoji: "💎", description: `${streak} days! Diamond-level dedication!` };
  if (streak >= 100) return { title: "CENTURY CLUB!", emoji: "🌟", description: `${streak} days! You've hit triple digits!` };
  if (streak >= 50) return { title: "HALF CENTURY!", emoji: "🔥", description: `${streak} days! On fire!` };
  if (streak >= 30) return { title: "ONE MONTH!", emoji: "🎉", description: "30 days of consistency! Amazing!" };
  if (streak >= 21) return { title: "HABIT FORMED!", emoji: "🧠", description: "21 days! This is now part of who you are!" };
  if (streak >= 14) return { title: "TWO WEEKS!", emoji: "⚡", description: "14 days strong! You're building momentum!" };
  if (streak >= 7) return { title: "ONE WEEK!", emoji: "🔥", description: "7 days! You're on a roll!" };
  if (streak >= 3) return { title: "STREAK STARTED!", emoji: "✨", description: "3 days! Keep it going!" };
  return { title: "NICE!", emoji: "👏", description: "Day logged! Keep showing up!" };
};

export const useStreakTracking = () => {
  const queryClient = useQueryClient();
  const previousStreak = useRef<number | null>(null);
  const previousLevel = useRef<number | null>(null);

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get current gamification data
      const { data: gamification, error: fetchError } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const today = format(new Date(), "yyyy-MM-dd");

      // Store previous values for comparison
      if (gamification) {
        previousStreak.current = gamification.current_streak;
        previousLevel.current = gamification.current_level;
      }

      // Check if already updated today
      if (gamification?.last_activity_date === today) {
        return gamification;
      }

      // Check if user has any activity today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [energyLogs, focusSessions, meals, workouts] = await Promise.all([
        supabase
          .from("energy_logs")
          .select("id")
          .eq("user_id", user.id)
          .gte("logged_at", todayStart.toISOString())
          .limit(1),
        supabase
          .from("focus_sessions")
          .select("id")
          .eq("user_id", user.id)
          .gte("started_at", todayStart.toISOString())
          .limit(1),
        supabase
          .from("meals")
          .select("id")
          .eq("user_id", user.id)
          .gte("logged_at", todayStart.toISOString())
          .limit(1),
        supabase
          .from("workouts")
          .select("id")
          .eq("user_id", user.id)
          .gte("completed_at", todayStart.toISOString())
          .limit(1),
      ]);

      const hasActivityToday =
        (energyLogs.data?.length ?? 0) > 0 ||
        (focusSessions.data?.length ?? 0) > 0 ||
        (meals.data?.length ?? 0) > 0 ||
        (workouts.data?.length ?? 0) > 0;

      if (!hasActivityToday) {
        return gamification;
      }

      // Calculate new streak
      let newStreak = 1;
      let xpEarned = 10; // Base XP for daily activity

      if (gamification?.last_activity_date) {
        const lastActivity = parseISO(gamification.last_activity_date);
        const daysDiff = differenceInDays(new Date(), lastActivity);

        if (daysDiff === 1) {
          // Consecutive day - increase streak
          newStreak = (gamification.current_streak || 0) + 1;
          xpEarned += newStreak * 5; // Bonus XP for streaks
        } else if (daysDiff === 0) {
          // Same day - keep streak
          newStreak = gamification.current_streak || 1;
          xpEarned = 0; // No additional XP for same day
        }
        // If daysDiff > 1, streak resets to 1 (already set above)
      }

      // Bonus XP for hitting milestones
      if (STREAK_MILESTONES.includes(newStreak)) {
        xpEarned += newStreak * 10;
      }

      const currentXp = (gamification?.current_xp || 0) + xpEarned;
      const xpToNext = gamification?.xp_to_next_level || 100;
      let newLevel = gamification?.current_level || 1;
      let remainingXp = currentXp;

      // Level up if XP exceeds threshold
      if (currentXp >= xpToNext) {
        newLevel += 1;
        remainingXp = currentXp - xpToNext;
      }

      const updateData = {
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, gamification?.longest_streak || 0),
        last_activity_date: today,
        total_points: (gamification?.total_points || 0) + xpEarned,
        current_xp: remainingXp,
        current_level: newLevel,
        xp_to_next_level: newLevel * 100, // XP needed increases with level
        updated_at: new Date().toISOString(),
      };

      if (gamification) {
        const { error: updateError } = await supabase
          .from("user_gamification")
          .update(updateData)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("user_gamification")
          .insert({
            user_id: user.id,
            ...updateData,
          });

        if (insertError) throw insertError;
      }

      return { ...gamification, ...updateData, xpEarned };
    },
    onSuccess: (data) => {
      if (!data) return;

      queryClient.invalidateQueries({ queryKey: ["user-gamification"] });

      const newStreak = data.current_streak || 0;
      const newLevel = data.current_level || 1;
      const xpEarned = (data as any).xpEarned || 0;

      // Show level up celebration
      if (previousLevel.current !== null && newLevel > previousLevel.current) {
        toast.success(`🎊 LEVEL UP! You're now Level ${newLevel}!`, {
          description: "Unlocked new achievements! Keep going!",
          duration: 5000,
        });
      }

      // Show streak milestone celebration
      if (STREAK_MILESTONES.includes(newStreak) && 
          (previousStreak.current === null || newStreak > previousStreak.current)) {
        const message = getStreakMessage(newStreak);
        toast.success(`${message.emoji} ${message.title}`, {
          description: message.description,
          duration: 5000,
        });
      } else if (xpEarned > 0 && previousStreak.current !== null && newStreak > previousStreak.current) {
        // Regular streak increase toast
        toast.success(`🔥 ${newStreak}-day streak!`, {
          description: `+${xpEarned} XP earned!`,
          duration: 3000,
        });
      }
    },
  });

  useEffect(() => {
    // Update streak on mount
    updateStreakMutation.mutate();
  }, []);

  return {
    updateStreak: () => updateStreakMutation.mutate(),
    isUpdating: updateStreakMutation.isPending,
  };
};
