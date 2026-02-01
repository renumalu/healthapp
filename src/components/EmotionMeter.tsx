import { 
  Smile, 
  Frown, 
  Meh, 
  AlertCircle, 
  Heart, 
  Zap,
  Cloud,
  Sun,
  Angry
} from "lucide-react";

interface EmotionMeterProps {
  emotion: string;
  confidence: number;
  wellbeingScore: number;
  summary?: string;
}

const emotionConfig: Record<string, { icon: typeof Smile; color: string; bg: string }> = {
  joy: { icon: Smile, color: "text-energy-high", bg: "bg-energy-high/20" },
  content: { icon: Sun, color: "text-energy-high", bg: "bg-energy-high/20" },
  hopeful: { icon: Heart, color: "text-primary", bg: "bg-primary/20" },
  neutral: { icon: Meh, color: "text-muted-foreground", bg: "bg-secondary" },
  sadness: { icon: Frown, color: "text-energy-low", bg: "bg-energy-low/20" },
  anxious: { icon: AlertCircle, color: "text-energy-medium", bg: "bg-energy-medium/20" },
  frustrated: { icon: Zap, color: "text-energy-medium", bg: "bg-energy-medium/20" },
  angry: { icon: Angry, color: "text-destructive", bg: "bg-destructive/20" },
  overwhelmed: { icon: Cloud, color: "text-energy-low", bg: "bg-energy-low/20" },
  fear: { icon: AlertCircle, color: "text-energy-low", bg: "bg-energy-low/20" },
  surprise: { icon: Zap, color: "text-primary", bg: "bg-primary/20" },
  disgust: { icon: Frown, color: "text-muted-foreground", bg: "bg-secondary" },
};

export const EmotionMeter = ({ emotion, confidence, wellbeingScore, summary }: EmotionMeterProps) => {
  const config = emotionConfig[emotion.toLowerCase()] || emotionConfig.neutral;
  const Icon = config.icon;

  const getWellbeingColor = (score: number) => {
    if (score >= 7) return "bg-energy-high";
    if (score >= 4) return "bg-energy-medium";
    return "bg-energy-low";
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground capitalize">{emotion}</h3>
          <p className="text-sm text-muted-foreground">
            Detected with {Math.round(confidence * 100)}% confidence
          </p>
        </div>
      </div>

      {/* Wellbeing Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Wellbeing Score</span>
          <span className="text-sm font-medium text-foreground">{wellbeingScore}/10</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full ${getWellbeingColor(wellbeingScore)} transition-all duration-500`}
            style={{ width: `${wellbeingScore * 10}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
          {summary}
        </p>
      )}
    </div>
  );
};
