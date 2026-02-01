import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bug, 
  MessageCircle, 
  Sparkles, 
  Target, 
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lightbulb,
  History,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FixStep {
  step: number;
  action: string;
  status: "pending" | "done";
}

interface DebugSessionRaw {
  id: string;
  problem_description: string;
  status: string | null;
  clarifying_questions: unknown;
  root_causes: unknown;
  fix_plan: unknown;
  created_at: string | null;
}

const LifeDebugger = () => {
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState("");
  const [stage, setStage] = useState<"input" | "clarifying" | "analysis" | "plan">("input");
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [fixPlan, setFixPlan] = useState<FixStep[]>([]);

  const clarifyingQuestions = [
    "How often does this problem occur?",
    "What have you tried so far to solve it?",
    "How does this affect your daily energy levels?",
    "Is there a specific trigger you've noticed?"
  ];

  const rootCauses = [
    "Unclear boundaries between work and rest",
    "Insufficient recovery time after high-intensity tasks",
    "Reactive rather than proactive scheduling"
  ];

  // Fetch previous sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["lifeDebuggerSessions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("life_debugger_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as DebugSessionRaw[];
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (problemDesc: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("life_debugger_sessions")
        .insert({
          user_id: user.id,
          problem_description: problemDesc,
          status: "clarifying",
          clarifying_questions: clarifyingQuestions,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      setStage("clarifying");
      queryClient.invalidateQueries({ queryKey: ["lifeDebuggerSessions"] });
    },
    onError: () => {
      toast.error("Failed to start debugging session");
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("life_debugger_sessions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifeDebuggerSessions"] });
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("life_debugger_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifeDebuggerSessions"] });
      toast.success("Session deleted");
    },
  });

  const handleSubmit = () => {
    if (!problem.trim()) return;
    setLoading(true);
    createSessionMutation.mutate(problem);
    setLoading(false);
  };

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (stage === "clarifying") {
        if (currentSessionId) {
          updateSessionMutation.mutate({
            id: currentSessionId,
            updates: { status: "analysis", root_causes: rootCauses }
          });
        }
        setStage("analysis");
      } else if (stage === "analysis") {
        const newFixPlan: FixStep[] = [
          { step: 1, action: "Set a hard stop time for work each day", status: "pending" },
          { step: 2, action: "Add 15-min buffer between meetings", status: "pending" },
          { step: 3, action: "Create morning routine for proactive planning", status: "pending" },
          { step: 4, action: "Track energy before/after implementing changes", status: "pending" }
        ];
        setFixPlan(newFixPlan);
        if (currentSessionId) {
          updateSessionMutation.mutate({
            id: currentSessionId,
            updates: { status: "plan", fix_plan: newFixPlan as unknown as FixStep[] }
          });
        }
        setStage("plan");
      }
    }, 1500);
  };

  const handleMarkDone = (stepIndex: number) => {
    const updatedPlan = fixPlan.map((step, i) => 
      i === stepIndex ? { ...step, status: "done" as const } : step
    );
    setFixPlan(updatedPlan);
    
    if (currentSessionId) {
      updateSessionMutation.mutate({
        id: currentSessionId,
        updates: { fix_plan: updatedPlan as unknown as FixStep[] }
      });
    }
    toast.success("Step marked as done!");
  };

  const handleStartTracking = () => {
    if (currentSessionId) {
      updateSessionMutation.mutate({
        id: currentSessionId,
        updates: { status: "tracking" }
      });
      toast.success("Now tracking your progress! Check back regularly to update your progress.");
    }
  };

  const handleLoadSession = (session: DebugSessionRaw) => {
    setCurrentSessionId(session.id);
    setProblem(session.problem_description);
    
    if (session.fix_plan && Array.isArray(session.fix_plan)) {
      setFixPlan(session.fix_plan as FixStep[]);
    }
    
    if (session.status === "tracking" || session.status === "plan") {
      setStage("plan");
    } else if (session.status === "analysis") {
      setStage("analysis");
    } else if (session.status === "clarifying") {
      setStage("clarifying");
    } else {
      setStage("input");
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setProblem("");
    setStage("input");
    setAnswers(["", "", "", ""]);
    setFixPlan([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              Life Debugger
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered root cause analysis for recurring life problems</p>
          </div>
          {stage !== "input" && (
            <Button variant="outline" onClick={handleNewSession}>
              <Bug className="w-4 h-4 mr-2" />
              New Session
            </Button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {["Describe", "Clarify", "Analyze", "Fix"].map((step, i) => {
            const stages = ["input", "clarifying", "analysis", "plan"];
            const currentIndex = stages.indexOf(stage);
            const isActive = i <= currentIndex;
            const isCurrent = i === currentIndex;
            
            return (
              <div key={step} className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                  isActive ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground",
                  isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}>
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </div>
                {i < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            {/* Input Stage */}
            {stage === "input" && (
              <div className="glass-card p-8 animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Bug className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Describe your recurring problem</h3>
                    <p className="text-sm text-muted-foreground">Be as specific as possible</p>
                  </div>
                </div>
                
                <Textarea
                  placeholder="Example: I always feel exhausted by Thursday even when I think I've had a productive week. I can't seem to maintain consistent energy levels throughout the week..."
                  className="min-h-40 bg-secondary/50 border-border mb-6"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
                
                <Button onClick={handleSubmit} disabled={!problem.trim() || loading || createSessionMutation.isPending} size="lg">
                  {loading || createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Debugging
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Clarifying Questions Stage */}
            {stage === "clarifying" && (
              <div className="glass-card p-8 animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-mood-good/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-mood-good" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Clarifying Questions</h3>
                    <p className="text-sm text-muted-foreground">Help me understand better</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {clarifyingQuestions.map((q, i) => (
                    <div key={i} className="bg-secondary/30 rounded-lg p-4">
                      <p className="text-foreground mb-2">{q}</p>
                      <Textarea 
                        placeholder="Your answer..." 
                        className="bg-secondary/50 border-border min-h-20"
                        value={answers[i]}
                        onChange={(e) => {
                          const newAnswers = [...answers];
                          newAnswers[i] = e.target.value;
                          setAnswers(newAnswers);
                        }}
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={handleContinue} disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Continue to Analysis
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Analysis Stage */}
            {stage === "analysis" && (
              <div className="glass-card p-8 animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Root Cause Analysis</h3>
                    <p className="text-sm text-muted-foreground">Based on your responses</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {rootCauses.map((cause, i) => (
                    <div key={i} className="bg-warning/5 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-warning">{i + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cause}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This contributes approximately {30 - i * 5}% to your problem
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleContinue} disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating plan...
                    </>
                  ) : (
                    <>
                      Generate Fix Plan
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Fix Plan Stage */}
            {stage === "plan" && (
              <div className="glass-card p-8 animate-scale-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-energy-high/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-energy-high" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Your Fix Plan</h3>
                    <p className="text-sm text-muted-foreground">Step-by-step actions to resolve the issue</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {fixPlan.map((step, index) => (
                    <div 
                      key={step.step} 
                      className={cn(
                        "rounded-lg p-4 flex items-center gap-4",
                        step.status === "done" 
                          ? "bg-energy-high/10 border border-energy-high/30" 
                          : "bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        step.status === "done" ? "bg-energy-high/30" : "bg-energy-high/20"
                      )}>
                        {step.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-energy-high" />
                        ) : (
                          <span className="text-sm font-bold text-energy-high">{step.step}</span>
                        )}
                      </div>
                      <p className={cn(
                        "flex-1 text-foreground",
                        step.status === "done" && "line-through opacity-70"
                      )}>
                        {step.action}
                      </p>
                      {step.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkDone(index)}>
                          Mark Done
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <CheckCircle2 className="w-4 h-4 text-energy-high" />
                  <span>{fixPlan.filter(s => s.status === "done").length} of {fixPlan.length} steps completed</span>
                </div>

                <Button size="lg" onClick={handleStartTracking}>
                  <Sparkles className="w-5 h-5" />
                  Start Tracking Progress
                </Button>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="col-span-4 space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">How It Works</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Life Debugger uses advanced AI reasoning to identify patterns 
                and root causes that you might miss.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-energy-high" />
                  <span>Unlimited debugging sessions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-energy-high" />
                  <span>Progress tracking over time</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-energy-high" />
                  <span>AI-powered follow-ups</span>
                </li>
              </ul>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Sessions
                </h3>
              </div>
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sessions yet. Start debugging!
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div 
                      key={session.id} 
                      className={cn(
                        "bg-secondary/30 rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors group",
                        currentSessionId === session.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleLoadSession(session)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{session.problem_description}</p>
                          <span className={cn(
                            "text-xs",
                            session.status === "tracking" ? "text-energy-high" : "text-warning"
                          )}>
                            {session.status === "tracking" ? "Tracking" : 
                             session.status === "plan" ? "Plan Ready" :
                             session.status === "analysis" ? "Analyzing" : "In Progress"}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSessionMutation.mutate(session.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LifeDebugger;
