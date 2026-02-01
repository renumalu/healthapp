import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    target: "[data-tour='energy-gauge']",
    title: "Energy Level",
    content: "Track your current energy level here. Log regularly to discover your peak performance hours.",
    position: "bottom",
  },
  {
    target: "[data-tour='log-energy-btn']",
    title: "Log Energy",
    content: "Click here to quickly log your energy level, mood, and any notes about how you're feeling.",
    position: "bottom",
  },
  {
    target: "[data-tour='quick-stats']",
    title: "Quick Stats",
    content: "View your daily focus time and session count at a glance.",
    position: "bottom",
  },
  {
    target: "[data-tour='burnout-meter']",
    title: "Burnout Risk",
    content: "Monitor your burnout risk level. The AI analyzes your patterns to help prevent exhaustion.",
    position: "top",
  },
  {
    target: "[data-tour='ai-chatbot']",
    title: "AI Assistant",
    content: "Ask questions about your energy patterns, get personalized tips, or just chat about your wellness journey.",
    position: "top",
  },
  {
    target: "[data-tour='sidebar']",
    title: "Navigation",
    content: "Access all features from the sidebar: Focus sessions, Diet planner, Analytics, Zen Zone, and more!",
    position: "right",
  },
];

interface WalkthroughTourProps {
  onComplete: () => void;
}

export const WalkthroughTour = ({ onComplete }: WalkthroughTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const step = tourSteps[currentStep];

  const updateTargetPosition = useCallback(() => {
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);
    
    const interval = setInterval(updateTargetPosition, 500);
    
    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
      clearInterval(interval);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem("walkthrough-completed", "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (step.position) {
      case "top":
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipWidth / 2}px`,
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipWidth / 2}px`,
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipHeight / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
        };
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipHeight / 2}px`,
          left: `${targetRect.right + padding}px`,
        };
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left}px`,
        };
    }
  };

  const getSpotlightStyle = () => {
    if (!targetRect) return {};
    
    const padding = 8;
    return {
      top: `${targetRect.top - padding}px`,
      left: `${targetRect.left - padding}px`,
      width: `${targetRect.width + padding * 2}px`,
      height: `${targetRect.height + padding * 2}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={handleSkip} />
      
      {/* Spotlight */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-300 pointer-events-none"
          style={getSpotlightStyle()}
        />
      )}

      {/* Tooltip Card */}
      <Card
        className="absolute w-80 p-4 shadow-xl border-primary/20 bg-card z-[101] animate-in fade-in-0 zoom-in-95"
        style={getTooltipPosition()}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">{step.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 -mt-1"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">{step.content}</p>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-3">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full flex-1 transition-colors",
                index === currentStep
                  ? "bg-primary"
                  : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} of {tourSteps.length}
          </span>
          
          <Button size="sm" onClick={handleNext} className="gap-1">
            {currentStep === tourSteps.length - 1 ? (
              "Finish"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const useWalkthroughTour = () => {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
  }, []);

  const shouldShowTour = useCallback(() => {
    return !localStorage.getItem("walkthrough-completed");
  }, []);

  return { showTour, startTour, completeTour, shouldShowTour };
};
