import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Target, 
  BarChart3, 
  Brain, 
  ChevronRight, 
  CheckCircle,
  Sparkles,
  Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to HumanOS",
    description: "Your personal operating system for optimizing energy and preventing burnout.",
    icon: Zap,
    color: "from-primary to-accent",
  },
  {
    id: "energy",
    title: "Track Your Energy",
    description: "Log your energy levels throughout the day to discover your peak performance hours.",
    icon: Sparkles,
    color: "from-yellow-400 to-orange-500",
    feature: "Quick logging from dashboard",
  },
  {
    id: "focus",
    title: "Deep Focus Sessions",
    description: "Use focus timers to maximize productivity and track your concentration patterns.",
    icon: Target,
    color: "from-blue-400 to-cyan-500",
    feature: "Pomodoro-style sessions",
  },
  {
    id: "analytics",
    title: "Discover Patterns",
    description: "AI-powered insights help you understand when you're most productive and why.",
    icon: BarChart3,
    color: "from-green-400 to-emerald-500",
    feature: "Weekly & monthly reports",
  },
  {
    id: "zen",
    title: "Recharge & Play",
    description: "Take mindful breaks with breathing exercises and fun mini-games in the Zen Zone.",
    icon: Gamepad2,
    color: "from-purple-400 to-pink-500",
    feature: "Breathing & reaction games",
  },
  {
    id: "ready",
    title: "You're All Set!",
    description: "Start by logging your first energy check-in to begin your optimization journey.",
    icon: CheckCircle,
    color: "from-energy-high to-green-400",
  },
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
    setIsOpen(false);
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              step.color
            )}>
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-3">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
            {step.feature && (
              <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                {step.feature}
              </div>
            )}
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : index < currentStep 
                      ? "bg-primary/50" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
            )}
            <Button onClick={handleNext} className={cn("gap-2", isLastStep ? "w-full" : "flex-1")}>
              {isLastStep ? (
                <>
                  Get Started
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile && !profile.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  return { showOnboarding, setShowOnboarding, isLoading };
};
