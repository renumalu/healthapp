import { cn } from "@/lib/utils";
import { Smile, Meh, Frown, Heart, AlertCircle } from "lucide-react";

type MoodType = "great" | "good" | "neutral" | "low" | "exhausted";

interface MoodIndicatorProps {
  mood: MoodType;
  onMoodChange?: (mood: MoodType) => void;
  className?: string;
}

const moodConfig = {
  great: {
    icon: Heart,
    label: "Great",
    color: "text-mood-great",
    bgColor: "bg-mood-great/10",
    borderColor: "border-mood-great/30",
  },
  good: {
    icon: Smile,
    label: "Good",
    color: "text-mood-good",
    bgColor: "bg-mood-good/10",
    borderColor: "border-mood-good/30",
  },
  neutral: {
    icon: Meh,
    label: "Okay",
    color: "text-mood-neutral",
    bgColor: "bg-mood-neutral/10",
    borderColor: "border-mood-neutral/30",
  },
  low: {
    icon: Frown,
    label: "Low",
    color: "text-mood-low",
    bgColor: "bg-mood-low/10",
    borderColor: "border-mood-low/30",
  },
  exhausted: {
    icon: AlertCircle,
    label: "Tired",
    color: "text-mood-exhausted",
    bgColor: "bg-mood-exhausted/10",
    borderColor: "border-mood-exhausted/30",
  }
};

export const MoodIndicator = ({ mood, onMoodChange, className }: MoodIndicatorProps) => {
  const config = moodConfig[mood];
  const Icon = config.icon;

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", config.color)} />
          <h3 className="font-medium text-foreground text-sm">Mood</h3>
        </div>
        <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
      </div>

      <div className="flex gap-1.5">
        {(Object.keys(moodConfig) as MoodType[]).map((m) => {
          const MoodIcon = moodConfig[m].icon;
          const isActive = m === mood;
          
          return (
            <button
              key={m}
              onClick={() => onMoodChange?.(m)}
              className={cn(
                "flex-1 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center",
                isActive 
                  ? `${moodConfig[m].bgColor} ${moodConfig[m].borderColor} border` 
                  : "bg-secondary/30 hover:bg-secondary/50"
              )}
              title={moodConfig[m].label}
            >
              <MoodIcon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? moodConfig[m].color : "text-muted-foreground"
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
