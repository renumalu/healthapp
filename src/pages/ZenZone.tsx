import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wind, Pause, Play, RotateCcw, Heart, Sparkles, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type GameMode = "breathing" | "focus" | "reaction";
type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

const ZenZone = () => {
  const [activeGame, setActiveGame] = useState<GameMode | null>(null);
  
  // Breathing Game State
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("inhale");
  const [breathTimer, setBreathTimer] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  
  // Focus Game State
  const [focusScore, setFocusScore] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{ x: number; y: number } | null>(null);
  const [focusStarted, setFocusStarted] = useState(false);
  const [focusTimeLeft, setFocusTimeLeft] = useState(30);
  
  // Reaction Game State
  const [reactionState, setReactionState] = useState<"waiting" | "ready" | "go" | "done">("waiting");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [reactionStart, setReactionStart] = useState<number>(0);
  const [bestReaction, setBestReaction] = useState<number | null>(null);

  // Breathing Game Logic
  useEffect(() => {
    if (!isBreathing) return;

    const phases: { phase: BreathPhase; duration: number }[] = [
      { phase: "inhale", duration: 4 },
      { phase: "hold", duration: 7 },
      { phase: "exhale", duration: 8 },
      { phase: "rest", duration: 2 },
    ];

    let phaseIndex = phases.findIndex(p => p.phase === breathPhase);
    
    const interval = setInterval(() => {
      setBreathTimer(prev => {
        if (prev <= 1) {
          phaseIndex = (phaseIndex + 1) % phases.length;
          const nextPhase = phases[phaseIndex];
          setBreathPhase(nextPhase.phase);
          if (nextPhase.phase === "inhale") {
            setBreathCycles(c => c + 1);
          }
          return nextPhase.duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathing, breathPhase]);

  // Focus Game Logic
  useEffect(() => {
    if (!focusStarted || focusTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setFocusTimeLeft(prev => {
        if (prev <= 1) {
          setFocusStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [focusStarted, focusTimeLeft]);

  useEffect(() => {
    if (!focusStarted || focusTimeLeft <= 0) return;

    const spawnTarget = () => {
      const x = Math.random() * 280 + 20;
      const y = Math.random() * 180 + 20;
      setFocusTarget({ x, y });
    };

    spawnTarget();
    const interval = setInterval(spawnTarget, 2000);
    return () => clearInterval(interval);
  }, [focusStarted]);

  const handleFocusClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!focusTarget || !focusStarted) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const distance = Math.sqrt(
      Math.pow(clickX - focusTarget.x, 2) + Math.pow(clickY - focusTarget.y, 2)
    );
    
    if (distance < 30) {
      setFocusScore(prev => prev + 10);
      setFocusTarget(null);
    }
  }, [focusTarget, focusStarted]);

  // Reaction Game Logic
  const startReactionGame = () => {
    setReactionState("ready");
    setReactionTime(null);
    
    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
    setTimeout(() => {
      setReactionState("go");
      setReactionStart(Date.now());
    }, delay);
  };

  const handleReactionClick = () => {
    if (reactionState === "go") {
      const time = Date.now() - reactionStart;
      setReactionTime(time);
      setReactionState("done");
      if (!bestReaction || time < bestReaction) {
        setBestReaction(time);
      }
    } else if (reactionState === "ready") {
      setReactionState("waiting");
      setReactionTime(-1); // Too early
    }
  };

  const resetBreathing = () => {
    setIsBreathing(false);
    setBreathPhase("inhale");
    setBreathTimer(4);
    setBreathCycles(0);
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case "inhale": return "Breathe In";
      case "hold": return "Hold";
      case "exhale": return "Breathe Out";
      case "rest": return "Rest";
    }
  };

  const getBreathCircleScale = () => {
    switch (breathPhase) {
      case "inhale": return "scale-100";
      case "hold": return "scale-100";
      case "exhale": return "scale-50";
      case "rest": return "scale-50";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Zen Zone
          </h1>
          <p className="text-muted-foreground mt-1">
            Take a break, recharge your mind with fun mini-games
          </p>
        </div>

        {/* Game Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Breathing Game */}
          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:border-primary/50",
              activeGame === "breathing" && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setActiveGame("breathing")}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
                <Wind className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle>4-7-8 Breathing</CardTitle>
              <CardDescription>
                Calm your nervous system with guided breathing exercises
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Focus Game */}
          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:border-primary/50",
              activeGame === "focus" && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setActiveGame("focus")}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-2">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle>Focus Clicker</CardTitle>
              <CardDescription>
                Train your attention by clicking targets as they appear
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Reaction Game */}
          <Card 
            className={cn(
              "cursor-pointer transition-all duration-300 hover:border-primary/50",
              activeGame === "reaction" && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setActiveGame("reaction")}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <CardTitle>Reaction Time</CardTitle>
              <CardDescription>
                Test how fast you can react when the screen turns green
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Game Area */}
        {activeGame === "breathing" && (
          <Card className="p-8">
            <div className="flex flex-col items-center">
              <div className="relative mb-8">
                <div 
                  className={cn(
                    "w-48 h-48 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 flex items-center justify-center transition-all duration-1000",
                    getBreathCircleScale(),
                    isBreathing && "animate-pulse"
                  )}
                >
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{breathTimer}</p>
                    <p className="text-lg text-muted-foreground">{getBreathInstruction()}</p>
                  </div>
                </div>
                {breathCycles > 0 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                    {breathCycles} cycles
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => setIsBreathing(!isBreathing)}
                  className="gap-2"
                >
                  {isBreathing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isBreathing ? "Pause" : "Start"}
                </Button>
                <Button size="lg" variant="outline" onClick={resetBreathing}>
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6 text-center max-w-md">
                The 4-7-8 technique helps reduce anxiety and promote relaxation. 
                Inhale for 4 seconds, hold for 7, exhale for 8.
              </p>
            </div>
          </Card>
        )}

        {activeGame === "focus" && (
          <Card className="p-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-8 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{focusScore}</p>
                  <p className="text-sm text-muted-foreground">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">{focusTimeLeft}s</p>
                  <p className="text-sm text-muted-foreground">Time Left</p>
                </div>
              </div>
              
              <div 
                className="w-80 h-56 bg-muted/30 rounded-xl relative cursor-crosshair border-2 border-dashed border-muted-foreground/30 mb-6"
                onClick={handleFocusClick}
              >
                {focusTarget && focusStarted && (
                  <div 
                    className="absolute w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"
                    style={{ 
                      left: focusTarget.x - 24, 
                      top: focusTarget.y - 24,
                    }}
                  />
                )}
                {!focusStarted && focusTimeLeft === 30 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">Click Start to begin!</p>
                  </div>
                )}
                {!focusStarted && focusTimeLeft === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                      <p className="text-xl font-bold">Game Over!</p>
                      <p className="text-muted-foreground">Score: {focusScore}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                size="lg"
                onClick={() => {
                  setFocusScore(0);
                  setFocusTimeLeft(30);
                  setFocusStarted(true);
                }}
                disabled={focusStarted}
              >
                {focusTimeLeft === 0 ? "Play Again" : "Start Game"}
              </Button>
            </div>
          </Card>
        )}

        {activeGame === "reaction" && (
          <Card className="p-8">
            <div className="flex flex-col items-center">
              {bestReaction && (
                <div className="mb-4 text-center">
                  <p className="text-sm text-muted-foreground">Best Time</p>
                  <p className="text-2xl font-bold text-yellow-400">{bestReaction}ms</p>
                </div>
              )}
              
              <div 
                className={cn(
                  "w-80 h-56 rounded-xl flex items-center justify-center cursor-pointer transition-colors duration-200 mb-6",
                  reactionState === "waiting" && "bg-blue-500/30 border-2 border-blue-500/50",
                  reactionState === "ready" && "bg-red-500/30 border-2 border-red-500/50",
                  reactionState === "go" && "bg-green-500/50 border-2 border-green-500",
                  reactionState === "done" && "bg-muted/30 border-2 border-muted"
                )}
                onClick={handleReactionClick}
              >
                <div className="text-center">
                  {reactionState === "waiting" && (
                    <>
                      <Heart className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                      <p className="text-lg font-semibold">Click to Start</p>
                    </>
                  )}
                  {reactionState === "ready" && (
                    <>
                      <p className="text-2xl font-bold text-red-400">Wait for green...</p>
                      <p className="text-sm text-muted-foreground mt-2">Don't click yet!</p>
                    </>
                  )}
                  {reactionState === "go" && (
                    <p className="text-4xl font-bold text-green-400">CLICK NOW!</p>
                  )}
                  {reactionState === "done" && (
                    <>
                      {reactionTime && reactionTime > 0 ? (
                        <>
                          <p className="text-4xl font-bold text-foreground">{reactionTime}ms</p>
                          <p className="text-muted-foreground mt-2">
                            {reactionTime < 200 ? "Lightning fast! ⚡" : 
                             reactionTime < 300 ? "Great reflexes! 🎯" : 
                             "Good job! Keep practicing 💪"}
                          </p>
                        </>
                      ) : (
                        <p className="text-xl text-red-400">Too early! Try again</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {reactionState === "done" && (
                <Button size="lg" onClick={startReactionGame}>
                  Try Again
                </Button>
              )}
              {reactionState === "waiting" && (
                <Button size="lg" onClick={startReactionGame}>
                  Start
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ZenZone;
