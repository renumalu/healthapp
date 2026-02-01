import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search, Apple, Beef, Milk, Wheat, Cookie, Coffee, Plus, Loader2 } from "lucide-react";

interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
}

interface FoodDatabaseProps {
  onSelectFood?: (food: FoodItem) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  fruits: <Apple className="w-4 h-4" />,
  vegetables: <Apple className="w-4 h-4 text-green-500" />,
  protein: <Beef className="w-4 h-4" />,
  dairy: <Milk className="w-4 h-4" />,
  grains: <Wheat className="w-4 h-4" />,
  legumes: <Wheat className="w-4 h-4 text-amber-600" />,
  nuts: <Cookie className="w-4 h-4" />,
  snacks: <Cookie className="w-4 h-4 text-pink-500" />,
  beverages: <Coffee className="w-4 h-4" />,
};

const categories = [
  { id: "all", label: "All" },
  { id: "fruits", label: "Fruits" },
  { id: "vegetables", label: "Vegetables" },
  { id: "protein", label: "Protein" },
  { id: "dairy", label: "Dairy" },
  { id: "grains", label: "Grains" },
  { id: "legumes", label: "Legumes" },
  { id: "nuts", label: "Nuts & Seeds" },
  { id: "snacks", label: "Snacks" },
  { id: "beverages", label: "Beverages" },
];

export function FoodDatabase({ onSelectFood }: FoodDatabaseProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: foods = [], isLoading } = useQuery({
    queryKey: ["foodDatabase", searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("food_database")
        .select("*")
        .order("name", { ascending: true });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as FoodItem[];
    },
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Food Database
        </CardTitle>
        <CardDescription>
          Search our database of 50+ common foods with nutritional info
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </ScrollArea>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No foods found. Try a different search.
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {categoryIcons[food.category] || <Apple className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-muted-foreground">{food.serving_size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-primary">{food.calories} cal</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>P: {food.protein}g</span>
                        <span>C: {food.carbs}g</span>
                        <span>F: {food.fat}g</span>
                      </div>
                    </div>
                    {onSelectFood && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onSelectFood(food)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
