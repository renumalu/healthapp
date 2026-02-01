import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Dumbbell, 
  Target, 
  TrendingUp, 
  Flame, 
  Timer, 
  Trash2, 
  Sparkles,
  Heart,
  Zap,
  Activity,
  Calendar,
  Save,
  BookTemplate,
  Play
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import AIChatbot from "@/components/AIChatbot";

interface Workout {
  id: string;
  name: string;
  workout_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  exercises: unknown;
  notes: string | null;
  completed_at: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  workout_type: string;
  duration_minutes: number | null;
  exercises: unknown;
  notes: string | null;
}

interface ExercisePlan {
  id: string;
  name: string;
  goal: string | null;
  days_per_week: number | null;
  focus_areas: string[] | null;
  is_active: boolean;
}

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
}

const workoutTypeColors: Record<string, string> = {
  strength: "bg-red-500",
  cardio: "bg-blue-500",
  flexibility: "bg-green-500",
  hiit: "bg-orange-500",
};

const workoutTypeIcons: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="w-4 h-4" />,
  cardio: <Heart className="w-4 h-4" />,
  flexibility: <Activity className="w-4 h-4" />,
  hiit: <Zap className="w-4 h-4" />,
};

const ExercisePlanner = () => {
  const queryClient = useQueryClient();
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", sets: "", reps: "", weight: "" }]);
  const [newWorkout, setNewWorkout] = useState({
    name: "",
    workout_type: "strength",
    duration_minutes: "",
    calories_burned: "",
    notes: "",
  });
  const [newPlan, setNewPlan] = useState({
    name: "",
    goal: "",
    days_per_week: "3",
    focus_areas: [] as string[],
    duration_months: "1",
  });
  const [templateName, setTemplateName] = useState("");

  // Fetch active exercise plan
  const { data: activePlan } = useQuery({
    queryKey: ["activeExercisePlan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("exercise_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as ExercisePlan | null;
    },
  });

  // Fetch workout templates
  const { data: templates = [] } = useQuery({
    queryKey: ["workoutTemplates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WorkoutTemplate[];
    },
  });

  // Fetch this week's workouts
  const { data: weekWorkouts = [] } = useQuery({
    queryKey: ["weekWorkouts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date();
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", startOfWeek(today).toISOString())
        .lte("completed_at", endOfWeek(today).toISOString())
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data as Workout[];
    },
  });

  // Fetch today's workouts
  const { data: todayWorkouts = [] } = useQuery({
    queryKey: ["todayWorkouts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date();
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_at", startOfDay(today).toISOString())
        .lte("completed_at", endOfDay(today).toISOString())
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data as Workout[];
    },
  });

  // Calculate weekly stats
  const weeklyStats = {
    totalWorkouts: weekWorkouts.length,
    totalMinutes: weekWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0),
    totalCalories: weekWorkouts.reduce((acc, w) => acc + (w.calories_burned || 0), 0),
    workoutTypes: weekWorkouts.reduce((acc, w) => {
      acc[w.workout_type] = (acc[w.workout_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Add exercise to list
  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: "", reps: "", weight: "" }]);
  };

  // Remove exercise from list
  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  // Update exercise
  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  // Load template into form
  const loadTemplate = (template: WorkoutTemplate) => {
    setNewWorkout({
      name: template.name,
      workout_type: template.workout_type,
      duration_minutes: template.duration_minutes?.toString() || "",
      calories_burned: "",
      notes: template.notes || "",
    });
    const templateExercises = template.exercises as Exercise[] | null;
    setExercises(templateExercises && templateExercises.length > 0 ? templateExercises : [{ name: "", sets: "", reps: "", weight: "" }]);
    setIsAddingWorkout(true);
    toast.success(`Loaded template: ${template.name}`);
  };

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filteredExercises = exercises.filter(e => e.name.trim() !== "");

      const { error } = await supabase.from("workout_templates").insert({
        user_id: user.id,
        name: templateName || newWorkout.name,
        workout_type: newWorkout.workout_type,
        duration_minutes: newWorkout.duration_minutes ? parseInt(newWorkout.duration_minutes) : null,
        exercises: filteredExercises.length > 0 ? JSON.parse(JSON.stringify(filteredExercises)) : null,
        notes: newWorkout.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutTemplates"] });
      setIsSavingTemplate(false);
      setTemplateName("");
      toast.success("Template saved!");
    },
    onError: (error) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutTemplates"] });
      toast.success("Template deleted");
    },
  });

  // Add workout mutation
  const addWorkoutMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filteredExercises = exercises.filter(e => e.name.trim() !== "");

      const { error } = await supabase.from("workouts").insert([{
        user_id: user.id,
        exercise_plan_id: activePlan?.id || null,
        name: newWorkout.name,
        workout_type: newWorkout.workout_type,
        duration_minutes: newWorkout.duration_minutes ? parseInt(newWorkout.duration_minutes) : null,
        calories_burned: newWorkout.calories_burned ? parseInt(newWorkout.calories_burned) : null,
        exercises: filteredExercises.length > 0 ? JSON.parse(JSON.stringify(filteredExercises)) : null,
        notes: newWorkout.notes || null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekWorkouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayWorkouts"] });
      setIsAddingWorkout(false);
      setNewWorkout({
        name: "",
        workout_type: "strength",
        duration_minutes: "",
        calories_burned: "",
        notes: "",
      });
      setExercises([{ name: "", sets: "", reps: "", weight: "" }]);
      toast.success("Workout logged successfully!");
    },
    onError: (error) => {
      toast.error("Failed to log workout: " + error.message);
    },
  });

  // Create exercise plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Deactivate other plans
      await supabase
        .from("exercise_plans")
        .update({ is_active: false })
        .eq("user_id", user.id);

      const { error } = await supabase.from("exercise_plans").insert({
        user_id: user.id,
        name: newPlan.name,
        goal: newPlan.goal || null,
        days_per_week: parseInt(newPlan.days_per_week),
        focus_areas: newPlan.focus_areas.length > 0 ? newPlan.focus_areas : null,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeExercisePlan"] });
      setIsCreatingPlan(false);
      setNewPlan({
        name: "",
        goal: "",
        days_per_week: "3",
        focus_areas: [],
        duration_months: "1",
      });
      toast.success("Exercise plan created!");
    },
    onError: (error) => {
      toast.error("Failed to create plan: " + error.message);
    },
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekWorkouts"] });
      queryClient.invalidateQueries({ queryKey: ["todayWorkouts"] });
      toast.success("Workout deleted");
    },
  });

  const toggleFocusArea = (area: string) => {
    if (newPlan.focus_areas.includes(area)) {
      setNewPlan({ ...newPlan, focus_areas: newPlan.focus_areas.filter(a => a !== area) });
    } else {
      setNewPlan({ ...newPlan, focus_areas: [...newPlan.focus_areas, area] });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-primary" />
              Exercise Planner
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your workouts and build consistent exercise habits
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreatingPlan} onOpenChange={setIsCreatingPlan}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  {activePlan ? "Update Plan" : "Set Goals"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Exercise Plan</DialogTitle>
                  <DialogDescription>
                    Set your workout goals and focus areas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input
                      placeholder="e.g., Strength Building"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Goal</Label>
                    <Input
                      placeholder="e.g., Build muscle and improve endurance"
                      value={newPlan.goal}
                      onChange={(e) => setNewPlan({ ...newPlan, goal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Workouts per Week</Label>
                    <Select
                      value={newPlan.days_per_week}
                      onValueChange={(value) => setNewPlan({ ...newPlan, days_per_week: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} {n === 1 ? "day" : "days"} per week
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Plan Duration</Label>
                    <Select
                      value={newPlan.duration_months}
                      onValueChange={(value) => setNewPlan({ ...newPlan, duration_months: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month</SelectItem>
                        <SelectItem value="2">2 Months</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Your plan will be active for this duration
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Focus Areas</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Upper Body", "Lower Body", "Core", "Cardio", "Flexibility", "Full Body"].map((area) => (
                        <Badge
                          key={area}
                          variant={newPlan.focus_areas.includes(area) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleFocusArea(area)}
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createPlanMutation.mutate()}
                    disabled={!newPlan.name || createPlanMutation.isPending}
                  >
                    Create Plan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingWorkout} onOpenChange={setIsAddingWorkout}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Workout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Log a Workout</DialogTitle>
                  <DialogDescription>
                    Record your exercise session
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Workout Name</Label>
                      <Input
                        placeholder="e.g., Leg Day"
                        value={newWorkout.name}
                        onChange={(e) => setNewWorkout({ ...newWorkout, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newWorkout.workout_type}
                        onValueChange={(value) => setNewWorkout({ ...newWorkout, workout_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strength">💪 Strength</SelectItem>
                          <SelectItem value="cardio">❤️ Cardio</SelectItem>
                          <SelectItem value="flexibility">🧘 Flexibility</SelectItem>
                          <SelectItem value="hiit">⚡ HIIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="45"
                        value={newWorkout.duration_minutes}
                        onChange={(e) => setNewWorkout({ ...newWorkout, duration_minutes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Calories Burned</Label>
                      <Input
                        type="number"
                        placeholder="300"
                        value={newWorkout.calories_burned}
                        onChange={(e) => setNewWorkout({ ...newWorkout, calories_burned: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Exercises (optional)</Label>
                      <Button variant="ghost" size="sm" onClick={addExercise}>
                        <Plus className="w-4 h-4 mr-1" /> Add Exercise
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {exercises.map((exercise, index) => (
                        <div key={index} className="grid grid-cols-5 gap-2 items-center">
                          <Input
                            placeholder="Exercise name"
                            className="col-span-2"
                            value={exercise.name}
                            onChange={(e) => updateExercise(index, "name", e.target.value)}
                          />
                          <Input
                            placeholder="Sets"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(index, "sets", e.target.value)}
                          />
                          <Input
                            placeholder="Reps"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(index, "reps", e.target.value)}
                          />
                          <div className="flex gap-1">
                            <Input
                              placeholder="Weight"
                              value={exercise.weight}
                              onChange={(e) => updateExercise(index, "weight", e.target.value)}
                            />
                            {exercises.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={() => removeExercise(index)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="How was your workout?"
                      value={newWorkout.notes}
                      onChange={(e) => setNewWorkout({ ...newWorkout, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => addWorkoutMutation.mutate()}
                      disabled={!newWorkout.name || addWorkoutMutation.isPending}
                    >
                      Log Workout
                    </Button>
                    <Dialog open={isSavingTemplate} onOpenChange={setIsSavingTemplate}>
                      <DialogTrigger asChild>
                        <Button variant="outline" disabled={!newWorkout.name}>
                          <Save className="w-4 h-4 mr-2" />
                          Save as Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save as Template</DialogTitle>
                          <DialogDescription>
                            Save this workout as a reusable template
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Template Name</Label>
                            <Input
                              placeholder={newWorkout.name || "e.g., Full Body Workout"}
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => saveTemplateMutation.mutate()}
                            disabled={saveTemplateMutation.isPending}
                          >
                            Save Template
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Workout Templates */}
        {templates.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookTemplate className="w-5 h-5 text-primary" />
                Workout Templates
              </CardTitle>
              <CardDescription>Quick start from your saved templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={workoutTypeColors[template.workout_type]}>
                            {template.workout_type}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{template.name}</h4>
                        {template.duration_minutes && (
                          <p className="text-sm text-muted-foreground">
                            ~{template.duration_minutes} min
                          </p>
                        )}
                        {template.exercises && Array.isArray(template.exercises) && (template.exercises as Exercise[]).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(template.exercises as Exercise[]).length} exercises
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => loadTemplate(template)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Plan */}
        {activePlan && (
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {activePlan.name}
                  </CardTitle>
                  {activePlan.goal && (
                    <CardDescription>{activePlan.goal}</CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {weeklyStats.totalWorkouts}/{activePlan.days_per_week || 3}
                  </p>
                  <p className="text-xs text-muted-foreground">workouts this week</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={(weeklyStats.totalWorkouts / (activePlan.days_per_week || 3)) * 100} 
                className="h-2"
              />
              {activePlan.focus_areas && activePlan.focus_areas.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {activePlan.focus_areas.map((area) => (
                    <Badge key={area} variant="outline">{area}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.totalWorkouts}</div>
              <p className="text-xs text-muted-foreground">this week</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Total Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.totalMinutes}</div>
              <p className="text-xs text-muted-foreground">minutes</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weeklyStats.totalCalories}</div>
              <p className="text-xs text-muted-foreground">burned</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayWorkouts.length > 0 ? "🔥" : "—"}</div>
              <p className="text-xs text-muted-foreground">
                {todayWorkouts.length > 0 ? "Active today!" : "No workout today"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workout Type Breakdown */}
        {Object.keys(weeklyStats.workoutTypes).length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Workout Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(weeklyStats.workoutTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${workoutTypeColors[type]}`} />
                    <span className="capitalize">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Workouts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No workouts logged today</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setIsAddingWorkout(true)}
                >
                  Log your first workout
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${workoutTypeColors[workout.workout_type]} flex items-center justify-center text-white`}>
                        {workoutTypeIcons[workout.workout_type]}
                      </div>
                      <div>
                        <h4 className="font-medium">{workout.name}</h4>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          {workout.duration_minutes && (
                            <span>{workout.duration_minutes} min</span>
                          )}
                          {workout.calories_burned && (
                            <span>{workout.calories_burned} cal</span>
                          )}
                          {workout.exercises && (
                            <span>{(workout.exercises as Exercise[]).length} exercises</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWorkoutMutation.mutate(workout.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week's Workouts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {weekWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No workouts this week yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weekWorkouts.slice(0, 10).map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={workoutTypeColors[workout.workout_type]}>
                        {workout.workout_type}
                      </Badge>
                      <span className="font-medium">{workout.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(workout.completed_at), "EEE, MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AIChatbot />
    </DashboardLayout>
  );
};

export default ExercisePlanner;
