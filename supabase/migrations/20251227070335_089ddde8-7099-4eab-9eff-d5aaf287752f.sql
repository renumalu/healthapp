-- Energy predictions table for AI forecasting
CREATE TABLE public.energy_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_energy INTEGER NOT NULL CHECK (predicted_energy >= 1 AND predicted_energy <= 10),
  confidence_score DECIMAL NOT NULL DEFAULT 0.5,
  factors JSONB DEFAULT '[]'::jsonb,
  actual_energy INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, prediction_date)
);

-- Enable RLS
ALTER TABLE public.energy_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own predictions" ON public.energy_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own predictions" ON public.energy_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own predictions" ON public.energy_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own predictions" ON public.energy_predictions FOR DELETE USING (auth.uid() = user_id);

-- Life experiments table
CREATE TABLE public.life_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  variable_a TEXT NOT NULL,
  variable_b TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'energy',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  min_sample_size INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.life_experiments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own experiments" ON public.life_experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own experiments" ON public.life_experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own experiments" ON public.life_experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own experiments" ON public.life_experiments FOR DELETE USING (auth.uid() = user_id);

-- Experiment results table
CREATE TABLE public.experiment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.life_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  metric_value DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own results" ON public.experiment_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own results" ON public.experiment_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own results" ON public.experiment_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own results" ON public.experiment_results FOR DELETE USING (auth.uid() = user_id);

-- Add voice and emotion fields to reflections
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS voice_url TEXT;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS detected_emotion TEXT;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS emotion_confidence DECIMAL;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Update timestamp trigger
CREATE TRIGGER update_energy_predictions_updated_at
BEFORE UPDATE ON public.energy_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_life_experiments_updated_at
BEFORE UPDATE ON public.life_experiments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();