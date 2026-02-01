import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EnergyGaugeProps {
  value: number;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export const EnergyGauge = ({ value, trend = "stable", className }: EnergyGaugeProps) => {
  const { color, label, glowClass } = useMemo(() => {
    if (value >= 70) return { 
      color: "text-energy-high", 
      label: "High Energy",
      glowClass: "success-glow"
    };
    if (value >= 40) return { 
      color: "text-energy-medium", 
      label: "Moderate",
      glowClass: "warning-glow"
    };
    if (value >= 20) return { 
      color: "text-energy-low", 
      label: "Low Energy",
      glowClass: ""
    };
    return { 
      color: "text-energy-critical", 
      label: "Critical",
      glowClass: "danger-glow"
    };
  }, [value]);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("glass-card p-6 hover-lift", glowClass, className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-5 h-5", color)} />
          <h3 className="font-semibold text-foreground">Energy Level</h3>
        </div>
        <div className={cn("flex items-center gap-1 text-sm", 
          trend === "up" ? "text-energy-high" : 
          trend === "down" ? "text-energy-low" : 
          "text-muted-foreground"
        )}>
          <TrendIcon className="w-4 h-4" />
          <span>{trend === "up" ? "+5%" : trend === "down" ? "-3%" : "Stable"}</span>
        </div>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              className="opacity-30"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#energyGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--energy-high))" />
                <stop offset="50%" stopColor="hsl(var(--energy-medium))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-4xl font-bold", color)}>{value}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className={cn("font-medium", color)}>{label}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {value >= 70 ? "Great time for challenging tasks" :
           value >= 40 ? "Good for routine work" :
           value >= 20 ? "Consider taking a break" :
           "Rest recommended"}
        </p>
      </div>
    </div>
  );
};
