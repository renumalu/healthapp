import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Sparkles, Loader2, Check } from "lucide-react";

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  is_completed: boolean;
  created_at: string;
}

export const GroceryList = () => {
  const queryClient = useQueryClient();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newListName, setNewListName] = useState("Shopping List");
  const [newItem, setNewItem] = useState({ name: "", quantity: "1" });

  const { data: groceryLists = [], isLoading } = useQuery({
    queryKey: ["groceryLists"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("grocery_lists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]).map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : []
      })) as GroceryList[];
    },
  });

  const { data: weeklyMealPlans = [] } = useQuery({
    queryKey: ["weeklyMealPlans"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (items: GroceryItem[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("grocery_lists").insert({
        user_id: user.id,
        name: newListName,
        items: JSON.parse(JSON.stringify(items)),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceryLists"] });
      setIsCreatingList(false);
      setNewListName("Shopping List");
      toast.success("Grocery list created!");
    },
    onError: (error) => {
      toast.error("Failed to create list: " + error.message);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async ({ id, items }: { id: string; items: GroceryItem[] }) => {
      const { error } = await supabase
        .from("grocery_lists")
        .update({ items: JSON.parse(JSON.stringify(items)) })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceryLists"] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grocery_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groceryLists"] });
      toast.success("List deleted");
    },
  });

  const generateFromMealPlan = async () => {
    setIsGenerating(true);
    try {
      const ingredients: GroceryItem[] = [];
      const addedItems = new Set<string>();

      // Get ingredients from recipes that match meal plan names
      for (const mealPlan of weeklyMealPlans) {
        const matchingRecipe = recipes.find(r => 
          r.name.toLowerCase().includes(mealPlan.meal_name.toLowerCase()) ||
          mealPlan.meal_name.toLowerCase().includes(r.name.toLowerCase())
        );

        if (matchingRecipe?.ingredients) {
          const recipeIngredients = Array.isArray(matchingRecipe.ingredients) 
            ? matchingRecipe.ingredients 
            : [];
          
          for (const ing of recipeIngredients) {
            const ingName = typeof ing === 'string' ? ing : (ing as any).name || '';
            if (ingName && !addedItems.has(ingName.toLowerCase())) {
              addedItems.add(ingName.toLowerCase());
              ingredients.push({
                id: crypto.randomUUID(),
                name: ingName,
                quantity: typeof ing === 'object' ? (ing as any).quantity || "1" : "1",
                category: categorizeIngredient(ingName),
                checked: false,
              });
            }
          }
        }
      }

      // Also add common items based on meal types
      const mealTypes = [...new Set(weeklyMealPlans.map(m => m.meal_type))];
      for (const mealType of mealTypes) {
        const commonItems = getCommonItemsForMealType(mealType);
        for (const item of commonItems) {
          if (!addedItems.has(item.toLowerCase())) {
            addedItems.add(item.toLowerCase());
            ingredients.push({
              id: crypto.randomUUID(),
              name: item,
              quantity: "1",
              category: categorizeIngredient(item),
              checked: false,
            });
          }
        }
      }

      if (ingredients.length === 0) {
        toast.info("No ingredients found. Add meals to your weekly plan or recipes first.");
        setIsGenerating(false);
        return;
      }

      await createListMutation.mutateAsync(ingredients);
    } catch (error) {
      console.error("Error generating list:", error);
      toast.error("Failed to generate grocery list");
    } finally {
      setIsGenerating(false);
    }
  };

  const categorizeIngredient = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (/chicken|beef|pork|fish|salmon|turkey|meat/.test(lowerName)) return "Protein";
    if (/milk|cheese|yogurt|butter|cream/.test(lowerName)) return "Dairy";
    if (/apple|banana|orange|berry|fruit|lemon|avocado/.test(lowerName)) return "Fruits";
    if (/lettuce|spinach|carrot|tomato|onion|garlic|pepper|vegetable|broccoli/.test(lowerName)) return "Vegetables";
    if (/bread|rice|pasta|flour|oat|cereal/.test(lowerName)) return "Grains";
    if (/oil|salt|pepper|spice|sauce|honey/.test(lowerName)) return "Pantry";
    return "Other";
  };

  const getCommonItemsForMealType = (mealType: string): string[] => {
    switch (mealType) {
      case "breakfast":
        return ["Eggs", "Milk", "Bread"];
      case "lunch":
        return ["Lettuce", "Tomatoes"];
      case "dinner":
        return ["Olive Oil", "Garlic"];
      default:
        return [];
    }
  };

  const toggleItemCheck = (listId: string, itemId: string) => {
    const list = groceryLists.find(l => l.id === listId);
    if (!list) return;

    const updatedItems = list.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    updateListMutation.mutate({ id: listId, items: updatedItems });
  };

  const addItemToList = (listId: string) => {
    if (!newItem.name.trim()) return;

    const list = groceryLists.find(l => l.id === listId);
    if (!list) return;

    const newGroceryItem: GroceryItem = {
      id: crypto.randomUUID(),
      name: newItem.name,
      quantity: newItem.quantity,
      category: categorizeIngredient(newItem.name),
      checked: false,
    };

    updateListMutation.mutate({ id: listId, items: [...list.items, newGroceryItem] });
    setNewItem({ name: "", quantity: "1" });
    toast.success("Item added!");
  };

  const removeItemFromList = (listId: string, itemId: string) => {
    const list = groceryLists.find(l => l.id === listId);
    if (!list) return;

    const updatedItems = list.items.filter(item => item.id !== itemId);
    updateListMutation.mutate({ id: listId, items: updatedItems });
  };

  const groupItemsByCategory = (items: GroceryItem[]) => {
    return items.reduce((acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Grocery Lists
            </CardTitle>
            <CardDescription>Generate shopping lists from your meal plans</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateFromMealPlan}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate from Plan</>
              )}
            </Button>
            <Dialog open={isCreatingList} onOpenChange={setIsCreatingList}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Grocery List</DialogTitle>
                  <DialogDescription>Start a new shopping list</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="List name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <Button 
                    className="w-full" 
                    onClick={() => createListMutation.mutate([])}
                    disabled={!newListName.trim()}
                  >
                    Create Empty List
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groceryLists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No grocery lists yet</p>
            <p className="text-sm">Generate one from your meal plan or create a new list</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groceryLists.map((list) => {
              const groupedItems = groupItemsByCategory(list.items);
              const checkedCount = list.items.filter(i => i.checked).length;
              
              return (
                <div key={list.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{list.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {checkedCount}/{list.items.length} items checked
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteListMutation.mutate(list.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Add item input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add item..."
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addItemToList(list.id)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Qty"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      className="w-16"
                    />
                    <Button size="icon" onClick={() => addItemToList(list.id)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Items grouped by category */}
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                      <Badge variant="outline" className="mb-2">{category}</Badge>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 py-1"
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItemCheck(list.id, item.id)}
                            />
                            <span className={`flex-1 ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                              {item.name}
                            </span>
                            <span className="text-sm text-muted-foreground">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeItemFromList(list.id, item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
