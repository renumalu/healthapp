import { cn } from "@/lib/utils";
import { AlertTriangle, Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface BurnoutMeterProps {
  risk: number; // 0-100
  className?: string;
}

export const BurnoutMeter = ({ risk, className }: BurnoutMeterProps) => {
  const getStatus = () => {
    if (risk <= 25) return {
      label: "Protected",
      color: "text-energy-high",
      bgColor: "bg-energy-high",
      icon: ShieldCheck,
      description: "You're maintaining healthy boundaries",
      glowClass: ""
    };
    if (risk <= 50) return {
      label: "Moderate",
      color: "text-energy-medium",
      bgColor: "bg-energy-medium",
      icon: Shield,
      description: "Keep monitoring your energy",
      glowClass: ""
    };
    if (risk <= 75) return {
      label: "Elevated",
      color: "text-energy-low",
      bgColor: "bg-energy-low",
      icon: ShieldAlert,
      description: "Consider reducing commitments",
      glowClass: "warning-glow"
    };
    return {
      label: "Critical",
      color: "text-energy-critical",
      bgColor: "bg-energy-critical",
      icon: AlertTriangle,
      description: "Immediate action recommended",
      glowClass: "danger-glow"
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn("glass-card p-6 hover-lift", status.glowClass, className)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Burnout Risk</h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center",
          `${status.bgColor}/20`
        )}>
          <Icon className={cn("w-7 h-7", status.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={cn("font-semibold text-lg", status.color)}>{status.label}</span>
            <span className={cn("font-bold text-2xl", status.color)}>{risk}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden mb-3">
        <div 
          className={cn("h-full rounded-full transition-all duration-700 ease-out", status.bgColor)}
          style={{ width: `${risk}%` }}
        />
        {/* Markers */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-foreground/20" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-foreground/20" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-foreground/20" />
      </div>

      <p className="text-sm text-muted-foreground">{status.description}</p>

      {risk > 50 && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Burnout Firewall activated - limiting intense task suggestions
          </p>
        </div>
      )}
    </div>
  );
};
