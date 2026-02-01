import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Heart, 
  Clock, 
  Flame, 
  Sparkles, 
  Loader2,
  Search,
  ChefHat
} from "lucide-react";

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  ingredients: unknown;
  instructions: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  carbs_per_serving: number | null;
  fat_per_serving: number | null;
  category: string | null;
  is_favorite: boolean | null;
}

interface RecipeDatabaseProps {
  onSelectRecipe?: (recipe: Recipe) => void;
}

export const RecipeDatabase = ({ onSelectRecipe }: RecipeDatabaseProps) => {
  const queryClient = useQueryClient();
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [generateInputs, setGenerateInputs] = useState({
    ingredients: "",
    mealType: "lunch",
    dietaryPreferences: "",
  });
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    ingredients: "",
    instructions: "",
    prep_time_minutes: "",
    cook_time_minutes: "",
    servings: "1",
    calories_per_serving: "",
    protein_per_serving: "",
    carbs_per_serving: "",
    fat_per_serving: "",
    category: "main",
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Recipe[];
    },
  });

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addRecipeMutation = useMutation({
    mutationFn: async (recipe: typeof newRecipe) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ingredientsList = recipe.ingredients.split("\n").filter(Boolean).map((ing) => ({
        name: ing.trim(),
        amount: "",
      }));

      const { error } = await supabase.from("recipes").insert({
        user_id: user.id,
        name: recipe.name,
        description: recipe.description || null,
        ingredients: ingredientsList,
        instructions: recipe.instructions || null,
        prep_time_minutes: recipe.prep_time_minutes ? parseInt(recipe.prep_time_minutes) : null,
        cook_time_minutes: recipe.cook_time_minutes ? parseInt(recipe.cook_time_minutes) : null,
        servings: parseInt(recipe.servings) || 1,
        calories_per_serving: recipe.calories_per_serving ? parseInt(recipe.calories_per_serving) : null,
        protein_per_serving: recipe.protein_per_serving ? parseInt(recipe.protein_per_serving) : null,
        carbs_per_serving: recipe.carbs_per_serving ? parseInt(recipe.carbs_per_serving) : null,
        fat_per_serving: recipe.fat_per_serving ? parseInt(recipe.fat_per_serving) : null,
        category: recipe.category,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setIsAddingRecipe(false);
      setNewRecipe({
        name: "",
        description: "",
        ingredients: "",
        instructions: "",
        prep_time_minutes: "",
        cook_time_minutes: "",
        servings: "1",
        calories_per_serving: "",
        protein_per_serving: "",
        carbs_per_serving: "",
        fat_per_serving: "",
        category: "main",
      });
      toast.success("Recipe saved!");
    },
    onError: (error) => {
      toast.error("Failed to save recipe: " + error.message);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("recipes")
        .update({ is_favorite: !isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe deleted");
    },
  });

  const generateRecipe = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: {
          ingredients: generateInputs.ingredients,
          mealType: generateInputs.mealType,
          dietaryPreferences: generateInputs.dietaryPreferences,
        },
      });

      if (error) throw error;

      if (data?.recipe) {
        const recipe = data.recipe;
        const ingredientsText = recipe.ingredients
          ?.map((ing: { name: string; amount: string; unit?: string }) => 
            `${ing.amount} ${ing.unit || ""} ${ing.name}`.trim()
          )
          .join("\n") || "";

        setNewRecipe({
          name: recipe.name || "",
          description: recipe.description || "",
          ingredients: ingredientsText,
          instructions: recipe.instructions || "",
          prep_time_minutes: recipe.prep_time_minutes?.toString() || "",
          cook_time_minutes: recipe.cook_time_minutes?.toString() || "",
          servings: recipe.servings?.toString() || "1",
          calories_per_serving: recipe.calories_per_serving?.toString() || "",
          protein_per_serving: recipe.protein_per_serving?.toString() || "",
          carbs_per_serving: recipe.carbs_per_serving?.toString() || "",
          fat_per_serving: recipe.fat_per_serving?.toString() || "",
          category: recipe.category || "main",
        });
        toast.success("Recipe generated! Review and save.");
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast.error("Failed to generate recipe");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Recipe Database
            </CardTitle>
            <CardDescription>Save and browse your favorite recipes</CardDescription>
          </div>
          <Dialog open={isAddingRecipe} onOpenChange={setIsAddingRecipe}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Recipe</DialogTitle>
                <DialogDescription>Create a new recipe or generate one with AI</DialogDescription>
              </DialogHeader>
              
              {/* AI Generation Section */}
              <div className="border rounded-lg p-4 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Generate with AI
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Available Ingredients (optional)</Label>
                    <Input
                      placeholder="e.g., chicken, rice, broccoli"
                      value={generateInputs.ingredients}
                      onChange={(e) => setGenerateInputs({ ...generateInputs, ingredients: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Meal Type</Label>
                    <Select
                      value={generateInputs.mealType}
                      onValueChange={(v) => setGenerateInputs({ ...generateInputs, mealType: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Dietary Preferences</Label>
                    <Input
                      placeholder="e.g., low-carb, vegetarian"
                      value={generateInputs.dietaryPreferences}
                      onChange={(e) => setGenerateInputs({ ...generateInputs, dietaryPreferences: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={generateRecipe} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Recipe</>
                  )}
                </Button>
              </div>

              {/* Manual Entry Form */}
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Recipe Name *</Label>
                    <Input
                      placeholder="e.g., Grilled Chicken Salad"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of the dish..."
                      value={newRecipe.description}
                      onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Ingredients (one per line)</Label>
                    <Textarea
                      placeholder="1 cup rice&#10;2 chicken breasts&#10;1 tbsp olive oil"
                      className="min-h-[100px]"
                      value={newRecipe.ingredients}
                      onChange={(e) => setNewRecipe({ ...newRecipe, ingredients: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Instructions</Label>
                    <Textarea
                      placeholder="Step-by-step cooking instructions..."
                      className="min-h-[100px]"
                      value={newRecipe.instructions}
                      onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prep Time (min)</Label>
                    <Input
                      type="number"
                      value={newRecipe.prep_time_minutes}
                      onChange={(e) => setNewRecipe({ ...newRecipe, prep_time_minutes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cook Time (min)</Label>
                    <Input
                      type="number"
                      value={newRecipe.cook_time_minutes}
                      onChange={(e) => setNewRecipe({ ...newRecipe, cook_time_minutes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                      type="number"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({ ...newRecipe, servings: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newRecipe.category}
                      onValueChange={(v) => setNewRecipe({ ...newRecipe, category: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                        <SelectItem value="main">Main Course</SelectItem>
                        <SelectItem value="side">Side Dish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calories/Serving</Label>
                    <Input
                      type="number"
                      value={newRecipe.calories_per_serving}
                      onChange={(e) => setNewRecipe({ ...newRecipe, calories_per_serving: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={newRecipe.protein_per_serving}
                      onChange={(e) => setNewRecipe({ ...newRecipe, protein_per_serving: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={newRecipe.carbs_per_serving}
                      onChange={(e) => setNewRecipe({ ...newRecipe, carbs_per_serving: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fat (g)</Label>
                    <Input
                      type="number"
                      value={newRecipe.fat_per_serving}
                      onChange={(e) => setNewRecipe({ ...newRecipe, fat_per_serving: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addRecipeMutation.mutate(newRecipe)}
                  disabled={!newRecipe.name || addRecipeMutation.isPending}
                >
                  Save Recipe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
              <SelectItem value="main">Main</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recipe List */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recipes yet. Add your first recipe!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => onSelectRecipe?.(recipe)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{recipe.name}</h4>
                        {recipe.is_favorite && (
                          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        )}
                      </div>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {recipe.category && (
                          <Badge variant="outline" className="text-xs">
                            {recipe.category}
                          </Badge>
                        )}
                        {recipe.prep_time_minutes && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min
                          </Badge>
                        )}
                        {recipe.calories_per_serving && (
                          <Badge variant="secondary" className="text-xs">
                            <Flame className="w-3 h-3 mr-1" />
                            {recipe.calories_per_serving} cal
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate({ id: recipe.id, isFavorite: recipe.is_favorite || false });
                        }}
                      >
                        <Heart className={`w-4 h-4 ${recipe.is_favorite ? "text-red-500 fill-red-500" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRecipeMutation.mutate(recipe.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
