import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Crown, Medal, Star, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  current_level: number;
  isCurrentUser: boolean;
  rank: number;
}

export function LeaderboardCard() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch leaderboard data from accountability partners
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      // Get accepted partnerships
      const { data: partnerships } = await supabase
        .from("accountability_partners")
        .select("*")
        .or(`user_id.eq.${currentUser.id},partner_id.eq.${currentUser.id}`)
        .eq("status", "accepted");

      if (!partnerships?.length) return [];

      // Get all partner user IDs including current user
      const partnerIds = new Set<string>([currentUser.id]);
      partnerships.forEach((p) => {
        partnerIds.add(p.user_id);
        partnerIds.add(p.partner_id);
      });

      const userIds = Array.from(partnerIds);

      // Fetch gamification data for all partners
      const { data: gamificationData } = await supabase
        .from("user_gamification")
        .select("*")
        .in("user_id", userIds);

      // Fetch profile names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = userIds.map((userId) => {
        const gam = gamificationData?.find((g) => g.user_id === userId);
        const profile = profiles?.find((p) => p.user_id === userId);

        return {
          user_id: userId,
          display_name: profile?.full_name || (userId === currentUser.id ? "You" : "Partner"),
          current_streak: gam?.current_streak || 0,
          longest_streak: gam?.longest_streak || 0,
          total_points: gam?.total_points || 0,
          current_level: gam?.current_level || 1,
          isCurrentUser: userId === currentUser.id,
          rank: 0,
        };
      });

      // Sort by total points descending
      entries.sort((a, b) => b.total_points - a.total_points);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    enabled: !!currentUser,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary/10 border-primary/30";
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 border-yellow-500/30";
      case 2:
        return "bg-gray-400/10 border-gray-400/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "bg-background/50 border-border/30";
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary/30 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard
          </CardTitle>
          <CardDescription>Compare progress with accountability partners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No partners yet</p>
            <p className="text-sm">Add accountability partners to see the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Leaderboard
        </CardTitle>
        <CardDescription>Compare progress with accountability partners</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry) => (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              getRankBg(entry.rank, entry.isCurrentUser),
              entry.isCurrentUser && "ring-1 ring-primary/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar className="w-10 h-10">
                <AvatarFallback className={cn(
                  "font-semibold",
                  entry.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  {entry.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className={cn(
                  "font-medium",
                  entry.isCurrentUser && "text-primary"
                )}>
                  {entry.isCurrentUser ? "You" : entry.display_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs py-0 px-1.5">
                    <Star className="w-3 h-3 mr-0.5" />
                    Lv.{entry.current_level}
                  </Badge>
                  <Badge variant="outline" className="text-xs py-0 px-1.5">
                    <Flame className="w-3 h-3 mr-0.5 text-orange-500" />
                    {entry.current_streak}d
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">
                {entry.total_points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" />
                points
              </p>
            </div>
          </div>
        ))}

        {/* Top streak highlight */}
        {leaderboard.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-foreground">Longest Streak:</span>
              <span className="text-muted-foreground">
                {Math.max(...leaderboard.map((e) => e.longest_streak))} days by{" "}
                {leaderboard.find(
                  (e) => e.longest_streak === Math.max(...leaderboard.map((x) => x.longest_streak))
                )?.display_name || "Partner"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
