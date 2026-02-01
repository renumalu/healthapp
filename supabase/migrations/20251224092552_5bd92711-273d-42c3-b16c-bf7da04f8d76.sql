-- Create food database table for common foods
CREATE TABLE public.food_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  serving_size TEXT NOT NULL DEFAULT '100g',
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  sodium NUMERIC DEFAULT 0,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shared meals table for social features
CREATE TABLE public.shared_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal likes table
CREATE TABLE public.meal_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shared_meal_id UUID NOT NULL REFERENCES public.shared_meals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shared_meal_id)
);

-- Create accountability partners table
CREATE TABLE public.accountability_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- Create user stats table for progress tracking
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_meals_logged INTEGER DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  goal_completion_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Food database is public readable
CREATE POLICY "Anyone can view food database"
ON public.food_database FOR SELECT
USING (true);

-- Shared meals policies
CREATE POLICY "Users can view public shared meals"
ON public.shared_meals FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own shared meals"
ON public.shared_meals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared meals"
ON public.shared_meals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared meals"
ON public.shared_meals FOR DELETE
USING (auth.uid() = user_id);

-- Meal likes policies
CREATE POLICY "Users can view meal likes"
ON public.meal_likes FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own likes"
ON public.meal_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.meal_likes FOR DELETE
USING (auth.uid() = user_id);

-- Accountability partners policies
CREATE POLICY "Users can view their partnerships"
ON public.accountability_partners FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partnerships"
ON public.accountability_partners FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their partnerships"
ON public.accountability_partners FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete their partnerships"
ON public.accountability_partners FOR DELETE
USING (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_food_database_name ON public.food_database USING gin(to_tsvector('english', name));
CREATE INDEX idx_food_database_category ON public.food_database(category);
CREATE INDEX idx_shared_meals_user ON public.shared_meals(user_id);
CREATE INDEX idx_shared_meals_public ON public.shared_meals(is_public);
CREATE INDEX idx_accountability_partners_user ON public.accountability_partners(user_id);
CREATE INDEX idx_accountability_partners_partner ON public.accountability_partners(partner_id);

-- Add trigger for updated_at
CREATE TRIGGER update_shared_meals_updated_at
BEFORE UPDATE ON public.shared_meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accountability_partners_updated_at
BEFORE UPDATE ON public.accountability_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();