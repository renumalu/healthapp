-- Weight logs for tracking progress
CREATE TABLE public.weight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  body_fat_percentage NUMERIC(4,1),
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weight logs" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weight logs" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weight logs" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weight logs" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);

-- Meal prep sessions
CREATE TABLE public.meal_prep_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  prep_date DATE NOT NULL,
  meals_count INTEGER DEFAULT 0,
  recipes JSONB DEFAULT '[]',
  ingredients JSONB DEFAULT '[]',
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_prep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal prep" ON public.meal_prep_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal prep" ON public.meal_prep_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal prep" ON public.meal_prep_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal prep" ON public.meal_prep_sessions FOR DELETE USING (auth.uid() = user_id);

-- Fasting sessions
CREATE TABLE public.fasting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fasting_type TEXT NOT NULL DEFAULT '16:8',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  target_hours INTEGER NOT NULL DEFAULT 16,
  ended_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fasting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fasting sessions" ON public.fasting_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fasting sessions" ON public.fasting_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fasting sessions" ON public.fasting_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fasting sessions" ON public.fasting_sessions FOR DELETE USING (auth.uid() = user_id);

-- Sleep logs
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
  sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  deep_sleep_hours NUMERIC(3,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sleep logs" ON public.sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sleep logs" ON public.sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep logs" ON public.sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sleep logs" ON public.sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- Water reminders
CREATE TABLE public.water_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '22:00',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.water_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own water reminders" ON public.water_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own water reminders" ON public.water_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own water reminders" ON public.water_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own water reminders" ON public.water_reminders FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_meal_prep_sessions_updated_at BEFORE UPDATE ON public.meal_prep_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_water_reminders_updated_at BEFORE UPDATE ON public.water_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();