import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, 
  Pause, 
  Square, 
  Target, 
  Clock, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  Brain,
  Sparkles,
  RotateCcw,
  Coffee,
  Timer
} from "lucide-react";

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

const POMODORO_TIMES = {
  focus: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
};

const Focus = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(POMODORO_TIMES.focus);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [interruptions, setInterruptions] = useState(0);

  // Fetch today's stats
  const { data: todayStats, refetch: refetchStats } = useQuery({
    queryKey: ['todayFocusStats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', today.toISOString());

      const totalMinutes = sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;
      const totalInterruptions = sessions?.reduce((acc, s) => acc + (s.interruptions || 0), 0) || 0;
      const avgSession = sessions && sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

      return {
        sessionsCompleted: sessions?.length || 0,
        totalFocusTime: totalMinutes,
        averageSession: avgSession,
        interruptions: totalInterruptions
      };
    }
  });

  // Fetch weekly focus debt
  const { data: focusDebt } = useQuery({
    queryKey: ['focusDebt'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('started_at', weekStart.toISOString());

      const totalHours = (sessions?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0) / 60;
      const targetHours = 20; // Weekly target
      return Math.max(0, targetHours - totalHours);
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !isPaused && time > 0) {
      interval = setInterval(() => {
        setTime((t) => t - 1);
      }, 1000);
    } else if (time === 0 && isActive) {
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, time]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    
    if (mode === 'focus') {
      // Save focus session to database
      await saveFocusSession();
      setCompletedPomodoros(prev => prev + 1);
      
      // Play notification sound (using Web Audio API)
      playNotificationSound();
      
      toast({
        title: "🎉 Focus session complete!",
        description: "Great work! Time for a break.",
      });
      
      // Auto-switch to break
      if ((completedPomodoros + 1) % 4 === 0) {
        setMode('longBreak');
        setTime(POMODORO_TIMES.longBreak);
      } else {
        setMode('shortBreak');
        setTime(POMODORO_TIMES.shortBreak);
      }
    } else {
      playNotificationSound();
      toast({
        title: "☕ Break over!",
        description: "Ready for another focus session?",
      });
      setMode('focus');
      setTime(POMODORO_TIMES.focus);
    }
    
    refetchStats();
  };

  const saveFocusSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !sessionStartTime) return;

    const durationMinutes = Math.round((POMODORO_TIMES.focus - time) / 60);
    
    const { error } = await supabase.from('focus_sessions').insert({
      user_id: user.id,
      started_at: sessionStartTime.toISOString(),
      ended_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      interruptions: interruptions,
      focus_type: 'pomodoro'
    });

    if (error) {
      console.error('Error saving session:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = async () => {
    if (mode === 'focus' && time < POMODORO_TIMES.focus - 60) {
      // Save partial session if more than 1 minute passed
      await saveFocusSession();
      refetchStats();
    }
    setIsActive(false);
    setIsPaused(false);
    setTime(POMODORO_TIMES[mode]);
    setSessionStartTime(null);
    setInterruptions(0);
  };

  const handleModeChange = (newMode: PomodoroMode) => {
    if (isActive) return;
    setMode(newMode);
    setTime(POMODORO_TIMES[newMode]);
  };

  const handleReset = () => {
    setTime(POMODORO_TIMES[mode]);
    setSessionStartTime(null);
    setInterruptions(0);
  };

  const handleInterruption = () => {
    if (isActive && mode === 'focus') {
      setInterruptions(prev => prev + 1);
      toast({
        title: "Interruption logged",
        description: "Stay focused! You can do this.",
        variant: "destructive"
      });
    }
  };

  const progress = ((POMODORO_TIMES[mode] - time) / POMODORO_TIMES[mode]) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Focus Mode</h1>
          <p className="text-muted-foreground mt-1">Pomodoro timer with automatic session logging</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Timer */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="glass-card p-8">
              {/* Mode Selector */}
              <div className="flex justify-center gap-2 mb-8">
                {[
                  { mode: 'focus' as const, label: 'Focus', icon: Target },
                  { mode: 'shortBreak' as const, label: 'Short Break', icon: Coffee },
                  { mode: 'longBreak' as const, label: 'Long Break', icon: Timer },
                ].map(({ mode: m, label, icon: Icon }) => (
                  <Button
                    key={m}
                    variant={mode === m ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleModeChange(m)}
                    disabled={isActive}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>

              <div className="text-center space-y-8">
                {/* Timer Display */}
                <div className="relative">
                  <div className={cn(
                    "w-64 h-64 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-500 relative overflow-hidden",
                    mode === 'focus' 
                      ? isActive && !isPaused 
                        ? "border-primary animate-pulse-glow" 
                        : "border-primary/50"
                      : isActive && !isPaused 
                        ? "border-energy-high animate-pulse" 
                        : "border-energy-high/50"
                  )}>
                    {/* Progress ring background */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className={cn(
                          "opacity-20",
                          mode === 'focus' ? "text-primary" : "text-energy-high"
                        )}
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 120}
                        strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                        className={cn(
                          "transition-all duration-1000",
                          mode === 'focus' ? "text-primary" : "text-energy-high"
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="z-10">
                      <p className="text-6xl font-mono font-bold text-foreground">
                        {formatTime(time)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 capitalize">
                        {isActive ? (isPaused ? "Paused" : mode === 'focus' ? "In Deep Focus" : "Break Time") : "Ready to start"}
                      </p>
                    </div>
                  </div>

                  {/* Completed pomodoros indicator */}
                  <div className="flex justify-center gap-2 mt-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          i < (completedPomodoros % 4) 
                            ? "bg-primary" 
                            : "bg-muted"
                        )}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {completedPomodoros} completed today
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isActive ? (
                    <>
                      <Button size="lg" variant="ghost" onClick={handleReset}>
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                      <Button size="xl" variant="glow" onClick={handleStart} className="min-w-40">
                        <Play className="w-5 h-5" />
                        Start {mode === 'focus' ? 'Focus' : 'Break'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="lg" variant="secondary" onClick={handlePause}>
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                        {isPaused ? "Resume" : "Pause"}
                      </Button>
                      <Button size="lg" variant="destructive" onClick={handleStop}>
                        <Square className="w-5 h-5" />
                        End
                      </Button>
                    </>
                  )}
                </div>

                {/* Session Info */}
                {isActive && mode === 'focus' && (
                  <div className="flex items-center justify-center gap-8 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span>Pomodoro #{completedPomodoros + 1}</span>
                    </div>
                    <button
                      onClick={handleInterruption}
                      className="flex items-center gap-2 text-muted-foreground hover:text-warning transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      <span>{interruptions} interruptions</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Context Switch Warning */}
            {isActive && mode === 'focus' && (
              <div className="glass-card p-4 border-warning/30 bg-warning/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Stay Focused!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Switching tasks now would cost approximately 23 minutes of refocus time. 
                      Tap the interruption counter if you get distracted.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Focus Debt */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Focus Debt</h3>
              </div>
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-warning">
                  {(focusDebt ?? 0).toFixed(1)}h
                </p>
                <p className="text-sm text-muted-foreground mt-1">remaining this week</p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: `${Math.max(0, 100 - ((focusDebt ?? 0) / 20) * 100)}%` }} 
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Target: 20 hours per week
              </p>
            </div>

            {/* AI Suggestions */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">AI Focus Tips</h3>
              </div>
              <div className="space-y-3">
                {[
                  "The Pomodoro Technique: 25 min focus, 5 min break",
                  "After 4 pomodoros, take a longer 15-min break",
                  "Log interruptions to identify patterns"
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Stats */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Today's Focus</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sessions completed</span>
                  <span className="font-semibold text-foreground">
                    {todayStats?.sessionsCompleted ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total focus time</span>
                  <span className="font-semibold text-foreground">
                    {formatTotalTime(todayStats?.totalFocusTime ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average session</span>
                  <span className="font-semibold text-foreground">
                    {todayStats?.averageSession ?? 0} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Interruptions</span>
                  <span className={cn(
                    "font-semibold",
                    (todayStats?.interruptions ?? 0) > 5 ? "text-destructive" : "text-energy-high"
                  )}>
                    {todayStats?.interruptions ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Focus;
