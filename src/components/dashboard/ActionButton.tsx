import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  onAction?: () => void;
  loading?: boolean;
  className?: string;
}

export const ActionButton = ({ onAction, loading = false, className }: ActionButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn("glass-card p-6 hover-lift", className)}>
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Need guidance?</h3>
        <p className="text-sm text-muted-foreground">
          Let AI analyze your current state and suggest the best action for right now.
        </p>
        
        <Button
          variant="glow"
          size="xl"
          className={cn(
            "w-full relative overflow-hidden group",
            isHovered && "animate-pulse-glow"
          )}
          onClick={onAction}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={loading}
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-energy-flow opacity-80" />
          
          {/* Content */}
          <span className="relative flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>What should I do now?</span>
              </>
            )}
          </span>
        </Button>

        <p className="text-xs text-muted-foreground">
          Based on your energy, mood, and schedule
        </p>
      </div>
    </div>
  );
};
