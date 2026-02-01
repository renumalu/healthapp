import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps components that require user authentication.
 * Automatically redirects unauthenticated users to the /auth page.
 * 
 * Features:
 * - Checks authentication status on mount
 * - Listens for auth state changes (login/logout/session refresh)
 * - Shows loading state while checking authentication
 * - Redirects to auth page if not authenticated
 * - Properly cleans up subscriptions on unmount
 * 
 * Usage:
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          // User logged out - redirect to auth page
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    // Check current session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        // No active session - redirect to auth page
        navigate("/auth");
      }
      setLoading(false);
    });

    // Cleanup: unsubscribe from auth changes when component unmounts
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, don't render anything (redirect is handled above)
  if (!user) {
    return null;
  }

  return <>{children}</>;
};
