import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Zap, Smile, Meh, Frown, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const energyLogSchema = z.object({
  energy_level: z.number().min(1).max(100),
  mood: z.string().max(50),
  notes: z.string().max(500).optional(),
});

const moods = [
  { value: "great", label: "Great", icon: Sparkles, color: "text-green-400 bg-green-400/20 border-green-400/50" },
  { value: "good", label: "Good", icon: Smile, color: "text-blue-400 bg-blue-400/20 border-blue-400/50" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-400 bg-yellow-400/20 border-yellow-400/50" },
  { value: "tired", label: "Tired", icon: Frown, color: "text-orange-400 bg-orange-400/20 border-orange-400/50" },
  { value: "stressed", label: "Stressed", icon: Frown, color: "text-red-400 bg-red-400/20 border-red-400/50" },
];

interface EnergyLogModalProps {
  onLogComplete?: () => void;
  trigger?: React.ReactNode;
}

export const EnergyLogModal = ({ onLogComplete, trigger }: EnergyLogModalProps) => {
  const [open, setOpen] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(70);
  const [selectedMood, setSelectedMood] = useState("good");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getEnergyColor = (level: number) => {
    if (level >= 70) return "text-energy-high";
    if (level >= 40) return "text-energy-medium";
    return "text-energy-low";
  };

  const getEnergyLabel = (level: number) => {
    if (level >= 80) return "Energized!";
    if (level >= 60) return "Good";
    if (level >= 40) return "Moderate";
    if (level >= 20) return "Low";
    return "Very Low";
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validate input
      const validated = energyLogSchema.parse({
        energy_level: energyLevel,
        mood: selectedMood,
        notes: notes.trim() || undefined,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to log energy.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("energy_logs").insert({
        user_id: user.id,
        energy_level: validated.energy_level,
        mood: validated.mood,
        notes: validated.notes || null,
        logged_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Energy logged!",
        description: `You're feeling ${getEnergyLabel(energyLevel).toLowerCase()} with ${energyLevel}% energy.`,
      });

      // Reset form
      setEnergyLevel(70);
      setSelectedMood("good");
      setNotes("");
      setOpen(false);
      onLogComplete?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to log energy. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Zap className="w-4 h-4" />
            Log Energy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            How are you feeling?
          </DialogTitle>
          <DialogDescription>
            Log your current energy level to track your patterns over time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Energy Level Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Energy Level</Label>
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold", getEnergyColor(energyLevel))}>
                  {energyLevel}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {getEnergyLabel(energyLevel)}
                </span>
              </div>
            </div>
            
            <div className="relative pt-2">
              <div className="absolute inset-x-0 top-0 h-2 rounded-full bg-gradient-to-r from-energy-low via-energy-medium to-energy-high opacity-30" />
              <Slider
                value={[energyLevel]}
                onValueChange={([value]) => setEnergyLevel(value)}
                min={1}
                max={100}
                step={1}
                className="relative"
              />
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Exhausted</span>
              <span>Energized</span>
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-3">
            <Label>Current Mood</Label>
            <div className="grid grid-cols-5 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    selectedMood === mood.value
                      ? mood.color
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <mood.icon className={cn(
                    "w-5 h-5",
                    selectedMood === mood.value ? "" : "text-muted-foreground"
                  )} />
                  <span className="text-[10px] font-medium">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="What's affecting your energy today?"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              className="resize-none bg-secondary/30"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Log Energy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
