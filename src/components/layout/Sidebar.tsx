import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Target, 
  Bug, 
  BarChart3, 
  ListChecks, 
  BookOpen, 
  Settings,
  Zap,
  LogOut,
  Gamepad2,
  Utensils,
  Dumbbell,
  TrendingUp,
  FlaskConical,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, onClick }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
        "hover:bg-sidebar-accent/50 group relative",
        isActive 
          ? "bg-sidebar-accent text-sidebar-primary" 
          : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
      )}
    >
      <span className={cn(
        "transition-colors duration-200",
        isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
      )}>
        {icon}
      </span>
      <span>{label}</span>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full" />
      )}
    </NavLink>
  );
};

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps = {}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      navigate("/auth");
      onNavigate?.();
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 sidebar-gradient border-r border-sidebar-border flex flex-col z-50" data-tour="sidebar">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            <path d="M12 2v2" strokeWidth="1.5" />
            <path d="M8 4l1 1" strokeWidth="1.5" />
            <path d="M16 4l-1 1" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-foreground">HumanOS</h1>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-lg shadow-emerald-500/30">
              FREE
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Personal Operating System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <NavItem to="/dashboard" icon={<Home className="w-5 h-5" />} label="Home" onClick={onNavigate} />
        <NavItem to="/focus" icon={<Target className="w-5 h-5" />} label="Focus" onClick={onNavigate} />
        <NavItem to="/diet-planner" icon={<Utensils className="w-5 h-5" />} label="Diet Planner" onClick={onNavigate} />
        <NavItem to="/exercise-planner" icon={<Dumbbell className="w-5 h-5" />} label="Exercise" onClick={onNavigate} />
        <NavItem to="/energy-forecast" icon={<TrendingUp className="w-5 h-5" />} label="Energy Forecast" onClick={onNavigate} />
        <NavItem to="/experiments" icon={<FlaskConical className="w-5 h-5" />} label="Life Experiments" onClick={onNavigate} />
        <NavItem to="/life-debugger" icon={<Bug className="w-5 h-5" />} label="Life Debugger" onClick={onNavigate} />
        <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" onClick={onNavigate} />
        <NavItem to="/rules" icon={<ListChecks className="w-5 h-5" />} label="Rules" onClick={onNavigate} />
        <NavItem to="/reflection" icon={<BookOpen className="w-5 h-5" />} label="Reflection" onClick={onNavigate} />
        <NavItem to="/zen-zone" icon={<Gamepad2 className="w-5 h-5" />} label="Zen Zone" onClick={onNavigate} />
        
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" onClick={onNavigate} />
        </div>
      </nav>

      {/* All Features Free Card */}
      <div className="p-4">
        <div className="glass-card p-4 space-y-3 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm text-foreground">All Features Free!</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You have full access to all features. No payment required! 🎉
          </p>
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};