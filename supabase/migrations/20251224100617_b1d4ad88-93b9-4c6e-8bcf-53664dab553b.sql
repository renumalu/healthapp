-- Create achievements table (system-defined achievements)
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'trophy',
  points INTEGER NOT NULL DEFAULT 10,
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table (tracks which users earned which achievements)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_gamification table (tracks points, level, XP)
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- Achievements are readable by everyone
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User gamification policies
CREATE POLICY "Users can view their own gamification" ON public.user_gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gamification" ON public.user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gamification" ON public.user_gamification FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some default achievements
INSERT INTO public.achievements (name, description, icon, points, category, requirement_type, requirement_value) VALUES
('First Steps', 'Log your first energy entry', 'zap', 10, 'energy', 'energy_logs', 1),
('Energy Tracker', 'Log 10 energy entries', 'battery', 25, 'energy', 'energy_logs', 10),
('Energy Master', 'Log 50 energy entries', 'battery-full', 100, 'energy', 'energy_logs', 50),
('Meal Starter', 'Log your first meal', 'utensils', 10, 'nutrition', 'meals', 1),
('Nutrition Ninja', 'Log 25 meals', 'salad', 50, 'nutrition', 'meals', 25),
('Food Champion', 'Log 100 meals', 'crown', 150, 'nutrition', 'meals', 100),
('Focus Beginner', 'Complete your first focus session', 'target', 10, 'focus', 'focus_sessions', 1),
('Deep Worker', 'Complete 20 focus sessions', 'brain', 75, 'focus', 'focus_sessions', 20),
('Focus Legend', 'Complete 100 focus sessions', 'star', 200, 'focus', 'focus_sessions', 100),
('Workout Warrior', 'Log your first workout', 'dumbbell', 10, 'fitness', 'workouts', 1),
('Gym Regular', 'Log 20 workouts', 'trophy', 75, 'fitness', 'workouts', 20),
('Fitness Fanatic', 'Log 100 workouts', 'medal', 200, 'fitness', 'workouts', 100),
('Week Streak', 'Maintain a 7-day activity streak', 'flame', 50, 'streaks', 'streak', 7),
('Month Warrior', 'Maintain a 30-day activity streak', 'fire', 150, 'streaks', 'streak', 30),
('Centurion', 'Maintain a 100-day activity streak', 'rocket', 500, 'streaks', 'streak', 100);