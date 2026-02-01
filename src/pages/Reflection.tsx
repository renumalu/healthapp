import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmotionMeter } from "@/components/EmotionMeter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Save,
  Loader2,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callSupabaseFunctionStreaming } from "@/lib/apiClient";
import { toast } from "sonner";

interface EmotionData {
  primary_emotion: string;
  confidence: number;
  summary: string;
  wellbeing_score: number;
  suggestions?: string[];
}

interface PreviousReflection {
  week: string;
  aiSummary: string;
  lessonsLearned: string;
  whatWorked: string;
  whatDidntWork: string;
}

const Reflection = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidntWork, setWhatDidntWork] = useState("");
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [selectedReflection, setSelectedReflection] = useState<PreviousReflection | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const getWeekStart = useCallback((date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start.toISOString().split('T')[0];
  }, []);

  // Load reflection data when week changes
  useEffect(() => {
    const loadReflection = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const weekStart = getWeekStart(currentWeek);
        
        const { data, error } = await supabase
          .from("reflections")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_start", weekStart)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setLessonsLearned(data.lessons_learned || "");
          setWhatWorked(data.what_worked || "");
          setWhatDidntWork(data.what_didnt_work || "");
          setAiSummary(data.ai_summary || "");
          if (data.detected_emotion) {
            setDetectedEmotion({
              primary_emotion: data.detected_emotion,
              confidence: data.emotion_confidence || 0,
              summary: "",
              wellbeing_score: 0
            });
          } else {
            setDetectedEmotion(null);
          }
        } else {
          // Clear form for new week
          setLessonsLearned("");
          setWhatWorked("");
          setWhatDidntWork("");
          setAiSummary("");
          setDetectedEmotion(null);
        }
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReflection();
  }, [currentWeek, getWeekStart]);

  const formatWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleSaveReflection = async () => {
    if (!lessonsLearned && !whatWorked && !whatDidntWork) {
      toast.error("Please fill in at least one field");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save");
        return;
      }

      const weekStart = getWeekStart(currentWeek);

      const { error } = await supabase
        .from("reflections")
        .upsert({
          user_id: user.id,
          week_start: weekStart,
          lessons_learned: lessonsLearned,
          what_worked: whatWorked,
          what_didnt_work: whatDidntWork,
          detected_emotion: detectedEmotion?.primary_emotion,
          emotion_confidence: detectedEmotion?.confidence,
          ai_summary: aiSummary || null,
        }, { onConflict: 'user_id,week_start' });

      if (error) throw error;
      toast.success("Reflection saved!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save reflection");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!lessonsLearned && !whatWorked && !whatDidntWork) {
      toast.error("Please add some content first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in");
        return;
      }

      const content = `
        Lessons Learned: ${lessonsLearned}
        What Worked: ${whatWorked}
        What Didn't Work: ${whatDidntWork}
      `;

      // Use secure API client for Supabase Edge Function
      const reader = await callSupabaseFunctionStreaming('chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a wellness coach. Provide a brief, insightful summary (2-3 sentences) of the user\'s weekly reflection, highlighting key patterns and actionable suggestions for next week. Do not use markdown formatting.'
            },
            {
              role: 'user',
              content: `Please summarize this weekly reflection:\n${content}`
            }
          ]
        }
      });

      // Parse streaming response
      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      if (fullContent) {
        setAiSummary(fullContent);
        toast.success("AI summary generated!");
      } else {
        throw new Error("No summary received");
      }
    } catch (error) {
      console.error("AI summary error:", error);
      toast.error("Failed to generate summary");
    } finally {
      setIsGenerating(false);
    }
  };

  const previousReflections: PreviousReflection[] = [
    {
      week: "Dec 9 - Dec 15, 2024",
      aiSummary: "Strong week with consistent morning routines. Energy dipped mid-week due to back-to-back meetings. Consider adding buffer time.",
      lessonsLearned: "Morning deep work sessions are my superpower",
      whatWorked: "Blocking calendar for focused work",
      whatDidntWork: "Trying to multitask during meetings"
    },
    {
      week: "Dec 2 - Dec 8, 2024", 
      aiSummary: "Recovery week after intense project sprint. Good use of weekend for genuine rest.",
      lessonsLearned: "I need more recovery time than I think",
      whatWorked: "Taking actual breaks instead of just switching tasks",
      whatDidntWork: "Checking emails during dinner"
    }
  ];

  const handleViewReflection = (reflection: PreviousReflection) => {
    setSelectedReflection(reflection);
    setIsViewDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Weekly Reflection</h1>
            <p className="text-muted-foreground mt-1">Review your week and capture insights for growth</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() - 7);
              setCurrentWeek(newDate);
            }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{formatWeekRange(currentWeek)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              const newDate = new Date(currentWeek);
              newDate.setDate(newDate.getDate() + 7);
              setCurrentWeek(newDate);
            }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Current Week Reflection */}
          <div className="col-span-8 space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">This Week's Reflection</h3>
                  <p className="text-sm text-muted-foreground">Take a moment to review and learn</p>
                </div>
              </div>
              
              {/* Emotion Detection Display */}
              {detectedEmotion && (
                <div className="mb-6">
                  <EmotionMeter 
                    emotion={detectedEmotion.primary_emotion}
                    confidence={detectedEmotion.confidence}
                    wellbeingScore={detectedEmotion.wellbeing_score}
                    summary={detectedEmotion.summary}
                  />
                </div>
              )}

              <div className="space-y-6">
                {/* Lessons Learned */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Key Lessons Learned
                  </label>
                  <Textarea
                    placeholder="What important insights did you gain this week?"
                    className="bg-secondary/50 border-border min-h-24"
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                  />
                </div>

                {/* What Worked */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <ThumbsUp className="w-4 h-4 text-energy-high" />
                    What Worked Well
                  </label>
                  <Textarea
                    placeholder="What strategies or habits helped you this week?"
                    className="bg-secondary/50 border-border min-h-24"
                    value={whatWorked}
                    onChange={(e) => setWhatWorked(e.target.value)}
                  />
                </div>

                {/* What Didn't Work */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <ThumbsDown className="w-4 h-4 text-energy-low" />
                    What Didn't Work
                  </label>
                  <Textarea
                    placeholder="What would you do differently next time?"
                    className="bg-secondary/50 border-border min-h-24"
                    value={whatDidntWork}
                    onChange={(e) => setWhatDidntWork(e.target.value)}
                  />
                </div>

                {/* AI Summary Display */}
                {aiSummary && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">AI Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{aiSummary}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button size="lg" onClick={handleSaveReflection} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Reflection
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleGenerateAISummary} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    Generate AI Summary
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="col-span-4 space-y-6">
            {/* AI Insights */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">AI Insights</h3>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-foreground leading-relaxed">
                  Based on your energy patterns this week, you performed best 
                  when you started with creative work before 10 AM. Consider 
                  protecting this time slot consistently.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-energy-high" />
                  <span className="text-muted-foreground">Average energy: 74%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Focus sessions: 18</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-mood-good" />
                  <span className="text-muted-foreground">Mood trend: Improving</span>
                </div>
              </div>
            </div>

            {/* Previous Reflections */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Previous Reflections</h3>
              <div className="space-y-4">
                {previousReflections.map((reflection, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">{reflection.week}</p>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {reflection.aiSummary}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-primary"
                      onClick={() => handleViewReflection(reflection)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Full Reflection
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        {/* View Full Reflection Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Reflection: {selectedReflection?.week}
              </DialogTitle>
            </DialogHeader>
            {selectedReflection && (
              <div className="space-y-6 mt-4">
                {/* AI Summary */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReflection.aiSummary}</p>
                </div>

                {/* Lessons Learned */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Key Lessons Learned</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                    {selectedReflection.lessonsLearned}
                  </p>
                </div>

                {/* What Worked */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-4 h-4 text-energy-high" />
                    <span className="text-sm font-medium text-foreground">What Worked Well</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                    {selectedReflection.whatWorked}
                  </p>
                </div>

                {/* What Didn't Work */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsDown className="w-4 h-4 text-energy-low" />
                    <span className="text-sm font-medium text-foreground">What Didn't Work</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                    {selectedReflection.whatDidntWork}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reflection;
