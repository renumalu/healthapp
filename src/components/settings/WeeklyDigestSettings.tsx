import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, Send, Calendar } from "lucide-react";

export function WeeklyDigestSettings() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const sendDigestNow = async () => {
    if (!user) {
      toast.error("Please log in to send digest");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-weekly-digest", {
        body: { user_id: user.id },
      });

      if (error) throw error;
      toast.success("Weekly digest sent to your email!");
    } catch (error: any) {
      console.error("Error sending digest:", error);
      toast.error("Failed to send digest: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Weekly Email Digest
        </CardTitle>
        <CardDescription>
          Get a summary of your progress delivered to your inbox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            What's included in your digest
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your current streak and total points</li>
            <li>• Average energy levels for the week</li>
            <li>• Total focus time and meals logged</li>
            <li>• Workout summary and achievements</li>
            <li>• Personalized motivational message</li>
          </ul>
        </div>

        <Button
          onClick={sendDigestNow}
          disabled={isSending || !user}
          className="w-full gap-2"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Weekly Digest Now
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your digest will be sent to: {user?.email || "your registered email"}
        </p>
      </CardContent>
    </Card>
  );
}
