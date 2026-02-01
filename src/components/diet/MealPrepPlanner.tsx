import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface MealPrepSession {
  id: string;
  name: string;
  prep_date: string;
  meals_count: number;
  recipes: Array<{ name: string; servings: number }>;
  ingredients: Array<{ name: string; quantity: string; checked: boolean }>;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
}

export const MealPrepPlanner = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MealPrepSession | null>(null);
  const [newSession, setNewSession] = useState({
    name: "",
    prep_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    meals_count: "5",
    notes: "",
  });
  const [newIngredient, setNewIngredient] = useState({ name: "", quantity: "" });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["mealPrepSessions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("meal_prep_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("prep_date", { ascending: true });

      if (error) throw error;
      return (data as any[]).map(s => ({
        ...s,
        recipes: Array.isArray(s.recipes) ? s.recipes : [],
        ingredients: Array.isArray(s.ingredients) ? s.ingredients : [],
      })) as MealPrepSession[];
    },
  });

  const { data: userRecipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("recipes")
        .select("name, servings, ingredients")
        .eq("user_id", user.id)
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meal_prep_sessions").insert({
        user_id: user.id,
        name: newSession.name,
        prep_date: newSession.prep_date,
        meals_count: parseInt(newSession.meals_count),
        notes: newSession.notes || null,
        recipes: [],
        ingredients: [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPrepSessions"] });
      setIsCreating(false);
      setNewSession({
        name: "",
        prep_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        meals_count: "5",
        notes: "",
      });
      toast.success("Meal prep session created!");
    },
    onError: (error) => {
      toast.error("Failed to create session: " + error.message);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MealPrepSession> }) => {
      const { error } = await supabase
        .from("meal_prep_sessions")
        .update({
          ...updates,
          recipes: updates.recipes ? JSON.parse(JSON.stringify(updates.recipes)) : undefined,
          ingredients: updates.ingredients ? JSON.parse(JSON.stringify(updates.ingredients)) : undefined,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPrepSessions"] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_prep_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPrepSessions"] });
      setSelectedSession(null);
      toast.success("Session deleted");
    },
  });

  const addIngredientToSession = () => {
    if (!selectedSession || !newIngredient.name.trim()) return;

    const updatedIngredients = [
      ...selectedSession.ingredients,
      { name: newIngredient.name, quantity: newIngredient.quantity || "1", checked: false }
    ];

    updateSessionMutation.mutate({
      id: selectedSession.id,
      updates: { ingredients: updatedIngredients }
    });

    setSelectedSession({ ...selectedSession, ingredients: updatedIngredients });
    setNewIngredient({ name: "", quantity: "" });
  };

  const toggleIngredient = (index: number) => {
    if (!selectedSession) return;

    const updatedIngredients = selectedSession.ingredients.map((ing, i) =>
      i === index ? { ...ing, checked: !ing.checked } : ing
    );

    updateSessionMutation.mutate({
      id: selectedSession.id,
      updates: { ingredients: updatedIngredients }
    });

    setSelectedSession({ ...selectedSession, ingredients: updatedIngredients });
  };

  const addRecipeToSession = (recipe: { name: string; servings: number | null; ingredients: any }) => {
    if (!selectedSession) return;

    const updatedRecipes = [
      ...selectedSession.recipes,
      { name: recipe.name, servings: recipe.servings || 1 }
    ];

    // Extract ingredients from recipe
    let updatedIngredients = [...selectedSession.ingredients];
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      for (const ing of recipe.ingredients) {
        const ingName = typeof ing === 'string' ? ing : ing.name || '';
        if (ingName && !updatedIngredients.some(i => i.name.toLowerCase() === ingName.toLowerCase())) {
          updatedIngredients.push({
            name: ingName,
            quantity: typeof ing === 'object' ? ing.quantity || "1" : "1",
            checked: false,
          });
        }
      }
    }

    updateSessionMutation.mutate({
      id: selectedSession.id,
      updates: { recipes: updatedRecipes, ingredients: updatedIngredients }
    });

    setSelectedSession({
      ...selectedSession,
      recipes: updatedRecipes,
      ingredients: updatedIngredients
    });

    toast.success(`Added ${recipe.name}`);
  };

  const markComplete = () => {
    if (!selectedSession) return;

    updateSessionMutation.mutate({
      id: selectedSession.id,
      updates: { is_completed: true }
    });

    setSelectedSession({ ...selectedSession, is_completed: true });
    toast.success("Meal prep complete! Great job!");
  };

  const upcomingSessions = sessions.filter(s => !s.is_completed);
  const completedSessions = sessions.filter(s => s.is_completed);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Meal Prep Planner
            </CardTitle>
            <CardDescription>Plan your batch cooking sessions</CardDescription>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Plan Meal Prep Session</DialogTitle>
                <DialogDescription>Schedule your next batch cooking day</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Session Name</Label>
                  <Input
                    placeholder="Sunday Meal Prep"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prep Date</Label>
                    <Input
                      type="date"
                      value={newSession.prep_date}
                      onChange={(e) => setNewSession({ ...newSession, prep_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meals to Prep</Label>
                    <Input
                      type="number"
                      value={newSession.meals_count}
                      onChange={(e) => setNewSession({ ...newSession, meals_count: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Focus on high-protein lunches..."
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createSessionMutation.mutate()}
                  disabled={!newSession.name || createSessionMutation.isPending}
                >
                  Create Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedSession ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                ← Back to sessions
              </Button>
              <div className="flex gap-2">
                {!selectedSession.is_completed && (
                  <Button size="sm" onClick={markComplete}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteSessionMutation.mutate(selectedSession.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold">{selectedSession.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(selectedSession.prep_date), "EEEE, MMM d, yyyy")}
              </p>
            </div>

            {/* Recipes */}
            <div>
              <Label className="mb-2 block">Recipes ({selectedSession.recipes.length})</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSession.recipes.map((recipe, i) => (
                  <Badge key={i} variant="secondary">
                    {recipe.name} ({recipe.servings} servings)
                  </Badge>
                ))}
              </div>
              {userRecipes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {userRecipes
                    .filter(r => !selectedSession.recipes.some(sr => sr.name === r.name))
                    .slice(0, 5)
                    .map((recipe) => (
                      <Button
                        key={recipe.name}
                        variant="outline"
                        size="sm"
                        onClick={() => addRecipeToSession(recipe)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {recipe.name}
                      </Button>
                    ))}
                </div>
              )}
            </div>

            {/* Ingredients Checklist */}
            <div>
              <Label className="mb-2 block">Ingredients Checklist</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedSession.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Checkbox
                      checked={ing.checked}
                      onCheckedChange={() => toggleIngredient(i)}
                    />
                    <span className={ing.checked ? "line-through text-muted-foreground" : ""}>
                      {ing.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{ing.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add ingredient..."
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addIngredientToSession()}
                  className="flex-1"
                />
                <Input
                  placeholder="Qty"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  className="w-20"
                />
                <Button size="icon" onClick={addIngredientToSession}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No meal prep sessions planned</p>
            <p className="text-sm">Create a session to start batch cooking</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
                <div className="space-y-2">
                  {upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.prep_date), "EEE, MMM d")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{session.meals_count} meals</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.recipes.length} recipes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedSessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Completed</h4>
                <div className="space-y-2">
                  {completedSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{session.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(session.prep_date), "MMM d")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
