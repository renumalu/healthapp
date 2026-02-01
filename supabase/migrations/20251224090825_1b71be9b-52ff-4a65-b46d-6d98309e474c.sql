-- Create grocery lists table
CREATE TABLE public.grocery_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  items JSONB NOT NULL DEFAULT '[]',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own grocery lists" 
ON public.grocery_lists FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grocery lists" 
ON public.grocery_lists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grocery lists" 
ON public.grocery_lists FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grocery lists" 
ON public.grocery_lists FOR DELETE 
USING (auth.uid() = user_id);

-- Create meal reminders table
CREATE TABLE public.meal_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_type TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own meal reminders" 
ON public.meal_reminders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal reminders" 
ON public.meal_reminders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal reminders" 
ON public.meal_reminders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal reminders" 
ON public.meal_reminders FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_grocery_lists_updated_at
BEFORE UPDATE ON public.grocery_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_reminders_updated_at
BEFORE UPDATE ON public.meal_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();