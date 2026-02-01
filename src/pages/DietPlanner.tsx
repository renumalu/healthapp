import { useState, useRef } from "react";
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
  Utensils, 
  Target, 
  TrendingUp, 
  Apple, 
  Coffee, 
  Sun, 
  Moon, 
  Trash2, 
  Sparkles,
  Droplets,
  GlassWater,
  Loader2,
  Check,
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Mic
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import AIChatbot from "@/components/AIChatbot";
import { VoiceInput } from "@/components/diet/VoiceInput";
import { BarcodeScanner } from "@/components/diet/BarcodeScanner";
import { RecipeDatabase } from "@/components/diet/RecipeDatabase";
import { NutritionInsights } from "@/components/diet/NutritionInsights";
import { GroceryList } from "@/components/diet/GroceryList";
import { MealReminders } from "@/components/diet/MealReminders";
import { WeightTracker } from "@/components/diet/WeightTracker";
import { MealPrepPlanner } from "@/components/diet/MealPrepPlanner";
import { WaterReminders } from "@/components/diet/WaterReminders";
import { FastingTracker } from "@/components/health/FastingTracker";
import { SleepTracker } from "@/components/health/SleepTracker";
import { FoodDatabase } from "@/components/diet/FoodDatabase";
import { AIMealPlanGenerator } from "@/components/diet/AIMealPlanGenerator";

interface Meal {
  id: string;
  meal_type: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
  logged_at: string;
}

interface DietPlan {
  id: string;
  name: string;
  goal: string | null;
  daily_calories: number | null;
  daily_protein: number | null;
  daily_carbs: number | null;
  daily_fat: number | null;
  is_active: boolean;
}

interface WaterIntake {
  id: string;
  amount_ml: number;
  logged_at: string;
}

interface MealPlan {
  id: string;
  day_of_week: number;
  meal_type: string;
  meal_name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MealSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

const mealTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-4 h-4" />,
  lunch: <Sun className="w-4 h-4" />,
  dinner: <Moon className="w-4 h-4" />,
  snack: <Apple className="w-4 h-4" />,
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WATER_GOAL = 2500;

const DietPlanner = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isAddingToWeeklyPlan, setIsAddingToWeeklyPlan] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestionMealType, setSuggestionMealType] = useState("lunch");
  const [selectedWeeklyDay, setSelectedWeeklyDay] = useState(0);
  const [newMeal, setNewMeal] = useState({
    meal_type: "breakfast",
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
  });
  const [newPlan, setNewPlan] = useState({
    name: "",
    goal: "",
    daily_calories: "",
    daily_protein: "",
    daily_carbs: "",
    daily_fat: "",
  });
  const [newWeeklyMeal, setNewWeeklyMeal] = useState({
    meal_type: "breakfast",
    meal_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // Fetch active diet plan
  const { data: activePlan } = useQuery({
    queryKey: ["activeDietPlan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data as DietPlan | null;
    },
  });

  // Fetch today's meals
  const { data: todayMeals = [] } = useQuery({
    queryKey: ["todayMeals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date();
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay(today).toISOString())
        .lte("logged_at", endOfDay(today).toISOString())
        .order("logged_at", { ascending: true });
      
      if (error) throw error;
      return data as Meal[];
    },
  });

  // Fetch last 7 days of meals for progress chart
  const { data: weekMeals = [] } = useQuery({
    queryKey: ["weekMeals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date();
      const weekAgo = subDays(today, 6);
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay(weekAgo).toISOString())
        .lte("logged_at", endOfDay(today).toISOString())
        .order("logged_at", { ascending: true });
      
      if (error) throw error;
      return data as Meal[];
    },
  });

  // Fetch today's water intake
  const { data: todayWater = [] } = useQuery({
    queryKey: ["todayWater"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const today = new Date();
      const { data, error } = await supabase
        .from("water_intake")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay(today).toISOString())
        .lte("logged_at", endOfDay(today).toISOString())
        .order("logged_at", { ascending: false });
      
      if (error) throw error;
      return data as WaterIntake[];
    },
  });

  // Fetch weekly meal plans
  const { data: weeklyMealPlans = [] } = useQuery({
    queryKey: ["weeklyMealPlans"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true });
      
      if (error) throw error;
      return data as MealPlan[];
    },
  });

  // Calculate today's totals
  const todayTotals = todayMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fat: acc.fat + (meal.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const totalWater = todayWater.reduce((acc, w) => acc + w.amount_ml, 0);
  const waterProgress = Math.min((totalWater / WATER_GOAL) * 100, 100);

  // Prepare chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayMeals = weekMeals.filter(m => 
      format(new Date(m.logged_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    const totals = dayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return {
      date: format(date, 'EEE'),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      target: activePlan?.daily_calories || 2000,
    };
  });

  // Add water mutation
  const addWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("water_intake").insert({
        user_id: user.id,
        amount_ml: amount,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayWater"] });
      toast.success("Water logged!");
    },
    onError: (error) => {
      toast.error("Failed to log water: " + error.message);
    },
  });

  // Analyze food photo
  const analyzePhoto = async (file: File) => {
    setIsAnalyzingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke("analyze-food", {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        
        if (data?.analysis) {
          setNewMeal({
            meal_type: suggestionMealType,
            name: data.analysis.name,
            calories: data.analysis.calories?.toString() || "",
            protein: data.analysis.protein?.toString() || "",
            carbs: data.analysis.carbs?.toString() || "",
            fat: data.analysis.fat?.toString() || "",
            notes: data.analysis.description || "",
          });
          setIsAddingMeal(true);
          toast.success("Food analyzed! Review and save your meal.");
        }
        setIsAnalyzingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error analyzing photo:", error);
      toast.error("Failed to analyze food photo");
      setIsAnalyzingPhoto(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzePhoto(file);
    }
  };

  // Get AI meal suggestions
  const getMealSuggestions = async () => {
    setIsGettingSuggestions(true);
    setMealSuggestions([]);
    
    try {
      // Refresh session to ensure valid auth token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        // Try to get existing session as fallback
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          toast.error("Please log in to get meal suggestions");
          setIsGettingSuggestions(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("suggest-meal", {
        body: {
          mealType: suggestionMealType,
          dietGoal: activePlan?.goal,
          currentCalories: todayTotals.calories,
          targetCalories: activePlan?.daily_calories,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }
      if (data?.suggestions) {
        setMealSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error("Error getting suggestions:", error);
      toast.error("Failed to get meal suggestions");
    } finally {
      setIsGettingSuggestions(false);
    }
  };

  // Apply suggestion to meal form
  const applySuggestion = (suggestion: MealSuggestion) => {
    setNewMeal({
      meal_type: suggestionMealType,
      name: suggestion.name,
      calories: suggestion.calories.toString(),
      protein: suggestion.protein.toString(),
      carbs: suggestion.carbs.toString(),
      fat: suggestion.fat.toString(),
      notes: suggestion.description,
    });
    setMealSuggestions([]);
    setIsAddingMeal(true);
    toast.success(`Selected: ${suggestion.name}`);
  };

  // Add meal mutation
  const addMealMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meals").insert({
        user_id: user.id,
        diet_plan_id: activePlan?.id || null,
        meal_type: newMeal.meal_type,
        name: newMeal.name,
        calories: newMeal.calories ? parseInt(newMeal.calories) : null,
        protein: newMeal.protein ? parseInt(newMeal.protein) : null,
        carbs: newMeal.carbs ? parseInt(newMeal.carbs) : null,
        fat: newMeal.fat ? parseInt(newMeal.fat) : null,
        notes: newMeal.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayMeals"] });
      queryClient.invalidateQueries({ queryKey: ["weekMeals"] });
      setIsAddingMeal(false);
      setNewMeal({
        meal_type: "breakfast",
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        notes: "",
      });
      toast.success("Meal logged successfully!");
    },
    onError: (error) => {
      toast.error("Failed to log meal: " + error.message);
    },
  });

  // Add weekly meal plan mutation
  const addWeeklyMealMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meal_plans").insert({
        user_id: user.id,
        day_of_week: selectedWeeklyDay,
        meal_type: newWeeklyMeal.meal_type,
        meal_name: newWeeklyMeal.meal_name,
        calories: newWeeklyMeal.calories ? parseInt(newWeeklyMeal.calories) : null,
        protein: newWeeklyMeal.protein ? parseInt(newWeeklyMeal.protein) : null,
        carbs: newWeeklyMeal.carbs ? parseInt(newWeeklyMeal.carbs) : null,
        fat: newWeeklyMeal.fat ? parseInt(newWeeklyMeal.fat) : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyMealPlans"] });
      setIsAddingToWeeklyPlan(false);
      setNewWeeklyMeal({
        meal_type: "breakfast",
        meal_name: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
      });
      toast.success("Added to weekly plan!");
    },
    onError: (error) => {
      toast.error("Failed to add to plan: " + error.message);
    },
  });

  // Delete weekly meal mutation
  const deleteWeeklyMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from("meal_plans").delete().eq("id", mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyMealPlans"] });
      toast.success("Removed from plan");
    },
  });

  // Create diet plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("diet_plans")
        .update({ is_active: false })
        .eq("user_id", user.id);

      const { error } = await supabase.from("diet_plans").insert({
        user_id: user.id,
        name: newPlan.name,
        goal: newPlan.goal || null,
        daily_calories: newPlan.daily_calories ? parseInt(newPlan.daily_calories) : null,
        daily_protein: newPlan.daily_protein ? parseInt(newPlan.daily_protein) : null,
        daily_carbs: newPlan.daily_carbs ? parseInt(newPlan.daily_carbs) : null,
        daily_fat: newPlan.daily_fat ? parseInt(newPlan.daily_fat) : null,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeDietPlan"] });
      setIsCreatingPlan(false);
      setNewPlan({ name: "", goal: "", daily_calories: "", daily_protein: "", daily_carbs: "", daily_fat: "" });
      toast.success("Diet plan created!");
    },
    onError: (error) => {
      toast.error("Failed to create plan: " + error.message);
    },
  });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from("meals").delete().eq("id", mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayMeals"] });
      queryClient.invalidateQueries({ queryKey: ["weekMeals"] });
      toast.success("Meal deleted");
    },
  });

  const getProgressPercentage = (current: number, target: number | null) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Utensils className="w-8 h-8 text-primary" />
              Diet Planner
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your nutrition and reach your health goals
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button 
              variant="outline" 
              onClick={() => setIsBarcodeOpen(true)}
            >
              <Barcode className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzingPhoto}
            >
              {isAnalyzingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Scan Food
                </>
              )}
            </Button>
            
            <Dialog open={isCreatingPlan} onOpenChange={setIsCreatingPlan}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  {activePlan ? "Update Plan" : "Set Goals"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Diet Plan</DialogTitle>
                  <DialogDescription>Set your daily nutrition targets</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input
                      placeholder="e.g., Weight Loss Plan"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Goal</Label>
                    <Input
                      placeholder="e.g., Lose 5kg in 3 months"
                      value={newPlan.goal}
                      onChange={(e) => setNewPlan({ ...newPlan, goal: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Daily Calories</Label>
                      <Input
                        type="number"
                        placeholder="2000"
                        value={newPlan.daily_calories}
                        onChange={(e) => setNewPlan({ ...newPlan, daily_calories: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        placeholder="150"
                        value={newPlan.daily_protein}
                        onChange={(e) => setNewPlan({ ...newPlan, daily_protein: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        placeholder="200"
                        value={newPlan.daily_carbs}
                        onChange={(e) => setNewPlan({ ...newPlan, daily_carbs: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fat (g)</Label>
                      <Input
                        type="number"
                        placeholder="65"
                        value={newPlan.daily_fat}
                        onChange={(e) => setNewPlan({ ...newPlan, daily_fat: e.target.value })}
                      />
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

            <Dialog open={isAddingMeal} onOpenChange={setIsAddingMeal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Meal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log a Meal</DialogTitle>
                  <DialogDescription>Record what you ate</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Meal Type</Label>
                    <Select
                      value={newMeal.meal_type}
                      onValueChange={(value) => setNewMeal({ ...newMeal, meal_type: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                        <SelectItem value="lunch">☀️ Lunch</SelectItem>
                        <SelectItem value="dinner">🌙 Dinner</SelectItem>
                        <SelectItem value="snack">🍎 Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>What did you eat?</Label>
                      <VoiceInput 
                        onTranscription={(text) => setNewMeal({ ...newMeal, name: text })}
                      />
                    </div>
                    <Input
                      placeholder="e.g., Grilled chicken salad"
                      value={newMeal.name}
                      onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Calories</Label>
                      <Input type="number" placeholder="400" value={newMeal.calories} onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Protein (g)</Label>
                      <Input type="number" placeholder="30" value={newMeal.protein} onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Carbs (g)</Label>
                      <Input type="number" placeholder="45" value={newMeal.carbs} onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fat (g)</Label>
                      <Input type="number" placeholder="15" value={newMeal.fat} onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea placeholder="Any additional notes..." value={newMeal.notes} onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => addMealMutation.mutate()} disabled={!newMeal.name || addMealMutation.isPending}>
                    Log Meal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Meal Suggestions */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Meal Suggestions
            </CardTitle>
            <CardDescription>Get personalized meal ideas or scan food photos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <Label>Meal Type</Label>
                <Select value={suggestionMealType} onValueChange={setSuggestionMealType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={getMealSuggestions} disabled={isGettingSuggestions}>
                {isGettingSuggestions ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Getting Ideas...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Get Suggestions</>
                )}
              </Button>
            </div>

            {mealSuggestions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mealSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{suggestion.name}</h4>
                      <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{suggestion.description}</p>
                    <div className="flex gap-2 mt-3 text-xs">
                      <Badge variant="outline">{suggestion.calories} cal</Badge>
                      <Badge variant="outline">{suggestion.protein}g P</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Charts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Progress
            </CardTitle>
            <CardDescription>Your nutrition trends over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="calories" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="calories">Calories</TabsTrigger>
                <TabsTrigger value="macros">Macros</TabsTrigger>
              </TabsList>
              <TabsContent value="calories">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                      <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="macros">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="protein" fill="hsl(0, 70%, 50%)" name="Protein" />
                      <Bar dataKey="carbs" fill="hsl(210, 70%, 50%)" name="Carbs" />
                      <Bar dataKey="fat" fill="hsl(45, 70%, 50%)" name="Fat" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Weekly Meal Planner */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Weekly Meal Planner
                </CardTitle>
                <CardDescription>Schedule your meals for the week</CardDescription>
              </div>
              <Dialog open={isAddingToWeeklyPlan} onOpenChange={setIsAddingToWeeklyPlan}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to Weekly Plan</DialogTitle>
                    <DialogDescription>Schedule a meal for a specific day</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Select value={selectedWeeklyDay.toString()} onValueChange={(v) => setSelectedWeeklyDay(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {dayNames.map((day, i) => (
                            <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Meal Type</Label>
                      <Select value={newWeeklyMeal.meal_type} onValueChange={(v) => setNewWeeklyMeal({ ...newWeeklyMeal, meal_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Meal Name</Label>
                      <Input placeholder="e.g., Oatmeal with berries" value={newWeeklyMeal.meal_name} onChange={(e) => setNewWeeklyMeal({ ...newWeeklyMeal, meal_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Calories</Label>
                        <Input type="number" placeholder="400" value={newWeeklyMeal.calories} onChange={(e) => setNewWeeklyMeal({ ...newWeeklyMeal, calories: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Protein (g)</Label>
                        <Input type="number" placeholder="20" value={newWeeklyMeal.protein} onChange={(e) => setNewWeeklyMeal({ ...newWeeklyMeal, protein: e.target.value })} />
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => addWeeklyMealMutation.mutate()} disabled={!newWeeklyMeal.meal_name || addWeeklyMealMutation.isPending}>
                      Add to Plan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day, dayIndex) => {
                const dayMeals = weeklyMealPlans.filter(m => m.day_of_week === dayIndex);
                const isToday = new Date().getDay() === dayIndex;
                return (
                  <div key={dayIndex} className={`p-3 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <h4 className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : ''}`}>{day.slice(0, 3)}</h4>
                    <div className="space-y-1">
                      {dayMeals.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No meals</p>
                      ) : (
                        dayMeals.map((meal) => (
                          <div key={meal.id} className="text-xs p-2 bg-muted/50 rounded group relative">
                            <div className="flex items-center gap-1">
                              {mealTypeIcons[meal.meal_type]}
                              <span className="truncate">{meal.meal_name}</span>
                            </div>
                            <button
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteWeeklyMealMutation.mutate(meal.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Water Tracking */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Water Intake
            </CardTitle>
            <CardDescription>Stay hydrated! Goal: {WATER_GOAL / 1000}L daily</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold">{(totalWater / 1000).toFixed(1)}L</span>
                  <span className="text-muted-foreground">/ {WATER_GOAL / 1000}L</span>
                </div>
                <Progress value={waterProgress} className="h-3" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addWaterMutation.mutate(250)} disabled={addWaterMutation.isPending}>
                  <GlassWater className="w-4 h-4 mr-1" />250ml
                </Button>
                <Button variant="outline" size="sm" onClick={() => addWaterMutation.mutate(500)} disabled={addWaterMutation.isPending}>
                  <GlassWater className="w-4 h-4 mr-1" />500ml
                </Button>
                <Button size="sm" onClick={() => addWaterMutation.mutate(1000)} disabled={addWaterMutation.isPending}>
                  <GlassWater className="w-4 h-4 mr-1" />1L
                </Button>
              </div>
            </div>
            {todayWater.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {todayWater.map((w) => (
                  <Badge key={w.id} variant="secondary" className="text-xs">
                    {w.amount_ml}ml @ {format(new Date(w.logged_at), "HH:mm")}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Progress */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotals.calories}</div>
              {activePlan?.daily_calories && (
                <>
                  <p className="text-xs text-muted-foreground">of {activePlan.daily_calories} goal</p>
                  <Progress value={getProgressPercentage(todayTotals.calories, activePlan.daily_calories)} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Protein
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotals.protein}g</div>
              {activePlan?.daily_protein && (
                <>
                  <p className="text-xs text-muted-foreground">of {activePlan.daily_protein}g goal</p>
                  <Progress value={getProgressPercentage(todayTotals.protein, activePlan.daily_protein)} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Carbs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotals.carbs}g</div>
              {activePlan?.daily_carbs && (
                <>
                  <p className="text-xs text-muted-foreground">of {activePlan.daily_carbs}g goal</p>
                  <Progress value={getProgressPercentage(todayTotals.carbs, activePlan.daily_carbs)} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Fat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTotals.fat}g</div>
              {activePlan?.daily_fat && (
                <>
                  <p className="text-xs text-muted-foreground">of {activePlan.daily_fat}g goal</p>
                  <Progress value={getProgressPercentage(todayTotals.fat, activePlan.daily_fat)} className="mt-2 h-2" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Meals */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Today's Meals</CardTitle>
          </CardHeader>
          <CardContent>
            {todayMeals.length === 0 ? (
              <div className="text-center py-8">
                <Utensils className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No meals logged today</p>
                <Button variant="link" className="mt-2" onClick={() => setIsAddingMeal(true)}>
                  Log your first meal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {mealTypeIcons[meal.meal_type]}
                      </div>
                      <div>
                        <h4 className="font-medium">{meal.name}</h4>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          {meal.calories && <span>{meal.calories} cal</span>}
                          {meal.protein && <span>{meal.protein}g P</span>}
                          {meal.carbs && <span>{meal.carbs}g C</span>}
                          {meal.fat && <span>{meal.fat}g F</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{format(new Date(meal.logged_at), "h:mm a")}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteMealMutation.mutate(meal.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight Tracker with AI Goal Suggestions */}
        <WeightTracker />

        {/* Food Database */}
        <FoodDatabase 
          onSelectFood={(food) => {
            setNewMeal({
              meal_type: suggestionMealType,
              name: food.name,
              calories: food.calories?.toString() || "",
              protein: food.protein?.toString() || "",
              carbs: food.carbs?.toString() || "",
              fat: food.fat?.toString() || "",
              notes: `Serving: ${food.serving_size}`,
            });
            setIsAddingMeal(true);
          }}
        />

        {/* AI Meal Plan Generator */}
        <AIMealPlanGenerator />

        {/* Nutrition Insights */}
        <NutritionInsights />

        {/* Two Column Layout for Trackers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FastingTracker />
          <SleepTracker />
        </div>

        {/* Water Reminders */}
        <WaterReminders />

        {/* Meal Prep Planner */}
        <MealPrepPlanner />

        {/* Recipe Database */}
        <RecipeDatabase />

        {/* Grocery List */}
        <GroceryList />

        {/* Meal Reminders */}
        <MealReminders />
      </div>

      <BarcodeScanner
        open={isBarcodeOpen}
        onOpenChange={setIsBarcodeOpen}
        onProductFound={(product) => {
          setNewMeal({
            meal_type: suggestionMealType,
            name: product.name,
            calories: product.calories?.toString() || "",
            protein: product.protein?.toString() || "",
            carbs: product.carbs?.toString() || "",
            fat: product.fat?.toString() || "",
            notes: "",
          });
          setIsAddingMeal(true);
        }}
      />

      <AIChatbot />
    </DashboardLayout>
  );
};

export default DietPlanner;
