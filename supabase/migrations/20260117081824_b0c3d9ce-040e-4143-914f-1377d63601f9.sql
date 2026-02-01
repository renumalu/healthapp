-- Fix meal_likes RLS policy to prevent user enumeration
-- Drop the overly permissive policy that allows anyone to see all likes
DROP POLICY IF EXISTS "Users can view meal likes" ON public.meal_likes;

-- Create a more restrictive policy that only shows likes for accessible meals
-- Users can only see likes for public shared meals or their own shared meals
CREATE POLICY "Users can view likes for accessible meals"
ON public.meal_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_meals 
    WHERE shared_meals.id = meal_likes.shared_meal_id 
    AND (shared_meals.is_public = true OR shared_meals.user_id = auth.uid())
  )
);