import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnergyGauge } from "@/components/dashboard/EnergyGauge";
import { MoodIndicator } from "@/components/dashboard/MoodIndicator";
import { BurnoutMeter } from "@/components/dashboard/BurnoutMeter";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { ProgressDashboard } from "@/components/dashboard/ProgressDashboard";
import { SocialFeed } from "@/components/social/SocialFeed";
import { AccountabilityPartners } from "@/components/social/AccountabilityPartners";
import { AchievementsPanel } from "@/components/gamification/AchievementsPanel";
import { PointsDisplay } from "@/components/gamification/PointsDisplay";
import { LeaderboardCard } from "@/components/social/LeaderboardCard";
import { ExportProgressModal } from "@/components/reports/ExportProgressModal";
import AIChatbot from "@/components/AIChatbot";
import { Calendar, Clock, TrendingUp, Zap, Plus, Download } from "lucide-react";
import { useState } from "react";
import { UserGreeting } from "@/components/UserGreeting";
import { EnergyLogModal } from "@/components/EnergyLogModal";
import { OnboardingFlow, useOnboarding } from "@/components/OnboardingFlow";
import { WalkthroughTour, useWalkthroughTour } from "@/components/WalkthroughTour";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MoodType = "great" | "good" | "neutral" | "low" | "exhausted";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { showOnboarding, setShowOnboarding } = useOnboarding();
  const { showTour, startTour, completeTour, shouldShowTour } = useWalkthroughTour();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMood, setCurrentMood] = useState<MoodType>("good");

  // Fetch latest energy log for display
  const { data: latestEnergy, refetch: refetchEnergy } = useQuery({
    queryKey: ['latest-energy', refreshKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('energy_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    },
  });

  // Fetch today's focus sessions
  const { data: todayStats } = useQuery({
    queryKey: ['today-stats', refreshKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { focusMinutes: 0, sessions: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('started_at', today.toISOString());

      const focusMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      
      return {
        focusMinutes,
        sessions: sessions?.length || 0,
      };
    },
  });

  // Mutation to save mood
  const moodMutation = useMutation({
    mutationFn: async (newMood: MoodType) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log a new energy entry with the mood
      const { error } = await supabase.from('energy_logs').insert({
        user_id: user.id,
        energy_level: latestEnergy?.energy_level || 70,
        mood: newMood,
        logged_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      return newMood;
    },
    onSuccess: (newMood) => {
      setCurrentMood(newMood);
      queryClient.invalidateQueries({ queryKey: ['latest-energy'] });
      toast.success(`Mood updated to ${newMood}`);
    },
    onError: (error) => {
      toast.error("Failed to update mood: " + error.message);
    },
  });

  const handleMoodChange = (newMood: MoodType) => {
    moodMutation.mutate(newMood);
  };

  // Demo state for chatbot context
  const userContext = {
    energy: latestEnergy?.energy_level || 72,
    mood: currentMood,
    burnoutRisk: 32,
  };

  const handleLogComplete = () => {
    setRefreshKey(prev => prev + 1);
    refetchEnergy();
  };

  const formatFocusTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}.${Math.round(mins / 6)}h`;
    }
    return `${mins}m`;
  };

  return (
    <DashboardLayout>
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow onComplete={() => {
          setShowOnboarding(false);
          // Start walkthrough tour after onboarding
          if (shouldShowTour()) {
            setTimeout(() => startTour(), 500);
          }
        }} />
      )}

      {/* Walkthrough Tour */}
      {showTour && <WalkthroughTour onComplete={completeTour} />}

      <div className="space-y-6">
        {/* Header with User Greeting and Quick Actions */}
        <div className="flex items-center justify-between animate-slide-up">
          <UserGreeting />
          <div className="flex items-center gap-3">
            <EnergyLogModal 
              onLogComplete={handleLogComplete}
              trigger={
                <Button variant="default" size="sm" className="gap-2" data-tour="log-energy-btn">
                  <Plus className="w-4 h-4" />
                  Log Energy
                </Button>
              }
            />
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Compact */}
        <div className="grid grid-cols-3 gap-3 animate-stagger-2" data-tour="quick-stats">
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-energy-high/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-energy-high" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {formatFocusTime(todayStats?.focusMinutes || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Focus today</p>
            </div>
          </div>
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{todayStats?.sessions || 0}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>
          <EnergyLogModal 
            onLogComplete={handleLogComplete}
            trigger={
              <div className="glass-card p-3 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {latestEnergy ? (
                    <>
                      <p className="text-lg font-bold text-foreground">{latestEnergy.energy_level}%</p>
                      <p className="text-xs text-muted-foreground">Energy</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">Log energy</p>
                      <p className="text-xs text-muted-foreground">Click to track</p>
                    </>
                  )}
                </div>
              </div>
            }
          />
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full animate-stagger-3">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in">
            {/* Main Grid - Simplified 2 column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4" data-tour="energy-gauge">
                <EnergyGauge value={latestEnergy?.energy_level || 72} trend="up" />
                <MoodIndicator 
                  mood={(latestEnergy?.mood as MoodType) || currentMood} 
                  onMoodChange={handleMoodChange} 
                />
              </div>

              {/* Right Column */}
              <div className="space-y-4" data-tour="burnout-meter">
                <BurnoutMeter risk={32} />
                <AIInsightCard
                  title="Energy Pattern"
                  content="Morning routines this week correlate with 23% higher afternoon productivity."
                  confidence={92}
                  type="insight"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="animate-fade-in">
            <div className="space-y-4">
              <div className="flex justify-end">
                <ExportProgressModal 
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  }
                />
              </div>
              <ProgressDashboard />
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <PointsDisplay />
              </div>
              <div className="lg:col-span-2">
                <AchievementsPanel />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <LeaderboardCard />
              <div className="lg:col-span-2 space-y-4">
                <AccountabilityPartners />
                <SocialFeed />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Chatbot */}
      <div data-tour="ai-chatbot">
        <AIChatbot userContext={userContext} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;