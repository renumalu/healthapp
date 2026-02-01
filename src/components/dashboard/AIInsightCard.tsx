import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight, TrendingUp, Brain, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIInsightCardProps {
  title: string;
  content: string;
  confidence?: number;
  explanation?: string;
  type?: "suggestion" | "insight" | "warning";
  className?: string;
}

export const AIInsightCard = ({ 
  title, 
  content, 
  confidence = 85, 
  explanation,
  type = "insight",
  className 
}: AIInsightCardProps) => {
  const typeConfig = {
    suggestion: {
      icon: Lightbulb,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20"
    },
    insight: {
      icon: Brain,
      color: "text-mood-good",
      bgColor: "bg-mood-good/10",
      borderColor: "border-mood-good/20"
    },
    warning: {
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/20"
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("glass-card p-6 hover-lift", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary animate-pulse-slow" />
          </div>
          <h3 className="font-semibold text-foreground">AI Insight</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Confidence:</span>
          <span className={cn(
            "font-semibold",
            confidence >= 80 ? "text-energy-high" :
            confidence >= 60 ? "text-energy-medium" :
            "text-energy-low"
          )}>
            {confidence}%
          </span>
        </div>
      </div>

      <div className={cn(
        "rounded-xl p-4 border mb-4",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", config.bgColor)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <h4 className={cn("font-medium mb-1", config.color)}>{title}</h4>
            <p className="text-sm text-foreground/80">{content}</p>
          </div>
        </div>
      </div>

      {explanation && (
        <div className="bg-muted/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why: </span>
            {explanation}
          </p>
        </div>
      )}

      <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
        <span>View more insights</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
