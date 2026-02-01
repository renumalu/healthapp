-- Drop the existing status check constraint
ALTER TABLE public.life_debugger_sessions DROP CONSTRAINT IF EXISTS life_debugger_sessions_status_check;

-- Add a new check constraint that includes all valid statuses used by the app
ALTER TABLE public.life_debugger_sessions 
ADD CONSTRAINT life_debugger_sessions_status_check 
CHECK (status IS NULL OR status IN ('input', 'clarifying', 'analysis', 'plan', 'tracking', 'completed'));