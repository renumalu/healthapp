-- Add unique constraint for user reflections per week
ALTER TABLE public.reflections
ADD CONSTRAINT reflections_user_week_unique UNIQUE (user_id, week_start);