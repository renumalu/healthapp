import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Users, 
  Utensils, 
  ChefHat,
  Plus,
  Loader2,
  Send,
  UserPlus
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SharedMeal {
  id: string;
  user_id: string;
  meal_id: string | null;
  recipe_id: string | null;
  caption: string | null;
  likes_count: number;
  is_public: boolean;
  created_at: string;
  meal?: {
    name: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  recipe?: {
    name: string;
    calories_per_serving: number | null;
    description: string | null;
  } | null;
}

export function SocialFeed() {
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [shareType, setShareType] = useState<"meal" | "recipe">("meal");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [caption, setCaption] = useState("");

  // Fetch shared meals
  const { data: sharedMeals = [], isLoading } = useQuery({
    queryKey: ["sharedMeals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_meals")
        .select(`
          *,
          meal:meals(name, calories, protein, carbs, fat),
          recipe:recipes(name, calories_per_serving, description)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SharedMeal[];
    },
  });

  // Fetch user's meals for sharing
  const { data: userMeals = [] } = useQuery({
    queryKey: ["userMealsForShare"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("meals")
        .select("id, name, calories")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Fetch user's recipes for sharing
  const { data: userRecipes = [] } = useQuery({
    queryKey: ["userRecipesForShare"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, calories_per_serving")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Fetch user's likes
  const { data: userLikes = [] } = useQuery({
    queryKey: ["userLikes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("meal_likes")
        .select("shared_meal_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((l) => l.shared_meal_id);
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("shared_meals").insert({
        user_id: user.id,
        meal_id: shareType === "meal" ? selectedItemId : null,
        recipe_id: shareType === "recipe" ? selectedItemId : null,
        caption,
        is_public: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharedMeals"] });
      setIsSharing(false);
      setCaption("");
      setSelectedItemId("");
      toast.success("Shared successfully!");
    },
    onError: () => {
      toast.error("Failed to share");
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (sharedMealId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isLiked = userLikes.includes(sharedMealId);

      if (isLiked) {
        const { error } = await supabase
          .from("meal_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("shared_meal_id", sharedMealId);
        if (error) throw error;

        await supabase
          .from("shared_meals")
          .update({ likes_count: Math.max(0, (sharedMeals.find(m => m.id === sharedMealId)?.likes_count || 1) - 1) })
          .eq("id", sharedMealId);
      } else {
        const { error } = await supabase.from("meal_likes").insert({
          user_id: user.id,
          shared_meal_id: sharedMealId,
        });
        if (error) throw error;

        await supabase
          .from("shared_meals")
          .update({ likes_count: (sharedMeals.find(m => m.id === sharedMealId)?.likes_count || 0) + 1 })
          .eq("id", sharedMealId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharedMeals"] });
      queryClient.invalidateQueries({ queryKey: ["userLikes"] });
    },
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Community Feed
            </CardTitle>
            <CardDescription>
              Share meals and recipes with the community
            </CardDescription>
          </div>
          <Dialog open={isSharing} onOpenChange={setIsSharing}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share with Community</DialogTitle>
                <DialogDescription>
                  Share your meal or recipe with others
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={shareType === "meal" ? "default" : "outline"}
                    onClick={() => setShareType("meal")}
                    className="flex-1"
                  >
                    <Utensils className="w-4 h-4 mr-2" />
                    Meal
                  </Button>
                  <Button
                    variant={shareType === "recipe" ? "default" : "outline"}
                    onClick={() => setShareType("recipe")}
                    className="flex-1"
                  >
                    <ChefHat className="w-4 h-4 mr-2" />
                    Recipe
                  </Button>
                </div>

                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${shareType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {shareType === "meal"
                      ? userMeals.map((meal) => (
                          <SelectItem key={meal.id} value={meal.id}>
                            {meal.name} ({meal.calories} cal)
                          </SelectItem>
                        ))
                      : userRecipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name} ({recipe.calories_per_serving} cal)
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />

                <Button
                  className="w-full"
                  onClick={() => shareMutation.mutate()}
                  disabled={!selectedItemId || shareMutation.isPending}
                >
                  {shareMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Share
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sharedMeals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No shared meals yet</p>
            <p className="text-sm">Be the first to share!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {sharedMeals.map((shared) => (
                <div
                  key={shared.id}
                  className="p-4 rounded-lg bg-background/50 border border-border/30"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10">
                        {shared.meal?.name?.[0] || shared.recipe?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {shared.meal?.name || shared.recipe?.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {shared.meal ? "Meal" : "Recipe"}
                        </Badge>
                      </div>
                      {shared.caption && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {shared.caption}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
                        {(shared.meal?.calories || shared.recipe?.calories_per_serving) && (
                          <span>{shared.meal?.calories || shared.recipe?.calories_per_serving} cal</span>
                        )}
                        {shared.meal?.protein && <span>{shared.meal.protein}g protein</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => likeMutation.mutate(shared.id)}
                          className={userLikes.includes(shared.id) ? "text-red-500" : ""}
                        >
                          <Heart
                            className={`w-4 h-4 mr-1 ${
                              userLikes.includes(shared.id) ? "fill-current" : ""
                            }`}
                          />
                          {shared.likes_count}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(shared.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
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
