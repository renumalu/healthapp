import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Droplets, Bell, BellOff, Clock, Settings, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WaterReminder {
  id: string;
  interval_minutes: number;
  start_time: string;
  end_time: string;
  is_enabled: boolean;
}

export const WaterReminders = () => {
  const queryClient = useQueryClient();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [nextReminder, setNextReminder] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [config, setConfig] = useState({
    interval_minutes: 60,
    start_time: "08:00",
    end_time: "22:00",
    is_enabled: true,
  });

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const { data: reminder, isLoading } = useQuery({
    queryKey: ["waterReminder"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("water_reminders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig({
          interval_minutes: data.interval_minutes,
          start_time: data.start_time,
          end_time: data.end_time,
          is_enabled: data.is_enabled,
        });
      }
      return data as WaterReminder | null;
    },
  });

  const saveReminderMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (reminder) {
        const { error } = await supabase
          .from("water_reminders")
          .update(config)
          .eq("id", reminder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("water_reminders")
          .insert({ user_id: user.id, ...config });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waterReminder"] });
      setIsConfiguring(false);
      toast.success("Water reminder settings saved!");
      scheduleNextReminder();
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const toggleEnabled = async () => {
    const newEnabled = !config.is_enabled;
    setConfig({ ...config, is_enabled: newEnabled });

    if (reminder) {
      await supabase
        .from("water_reminders")
        .update({ is_enabled: newEnabled })
        .eq("id", reminder.id);
      queryClient.invalidateQueries({ queryKey: ["waterReminder"] });

      if (newEnabled) {
        scheduleNextReminder();
        toast.success("Water reminders enabled!");
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        setNextReminder(null);
        toast.success("Water reminders disabled");
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast.success("Notifications enabled!");
        scheduleNextReminder();
      }
    }
  };

  const scheduleNextReminder = () => {
    if (notificationPermission !== "granted" || !config.is_enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = config.start_time.split(":").map(Number);
    const [endH, endM] = config.end_time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if we're within the active window
    if (currentTime < startMinutes || currentTime > endMinutes) {
      // Schedule for start of next window
      const nextStart = new Date();
      if (currentTime > endMinutes) {
        nextStart.setDate(nextStart.getDate() + 1);
      }
      nextStart.setHours(startH, startM, 0, 0);
      setNextReminder(nextStart);

      const delay = nextStart.getTime() - now.getTime();
      timerRef.current = setTimeout(() => {
        sendWaterReminder();
        scheduleNextReminder();
      }, delay);
      return;
    }

    // Schedule next reminder
    const nextTime = new Date(now.getTime() + config.interval_minutes * 60 * 1000);

    // Check if next reminder would be after end time
    const nextTimeMinutes = nextTime.getHours() * 60 + nextTime.getMinutes();
    if (nextTimeMinutes > endMinutes) {
      // Schedule for tomorrow's start
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(startH, startM, 0, 0);
      setNextReminder(tomorrow);

      const delay = tomorrow.getTime() - now.getTime();
      timerRef.current = setTimeout(() => {
        sendWaterReminder();
        scheduleNextReminder();
      }, delay);
      return;
    }

    setNextReminder(nextTime);
    timerRef.current = setTimeout(() => {
      sendWaterReminder();
      scheduleNextReminder();
    }, config.interval_minutes * 60 * 1000);
  };

  const sendWaterReminder = () => {
    if (notificationPermission === "granted") {
      new Notification("💧 Time to Hydrate!", {
        body: "Take a moment to drink some water and stay healthy.",
        icon: "/favicon.ico",
      });
    }
  };

  // Schedule reminders on mount
  useEffect(() => {
    if (reminder?.is_enabled && notificationPermission === "granted") {
      scheduleNextReminder();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reminder, notificationPermission]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Water Reminders
            </CardTitle>
            <CardDescription>Stay hydrated throughout the day</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.is_enabled}
              onCheckedChange={toggleEnabled}
              disabled={!reminder}
            />
            <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Water Reminder Settings</DialogTitle>
                  <DialogDescription>Configure how often you want to be reminded</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Remind every: {formatMinutes(config.interval_minutes)}</Label>
                      <Slider
                        value={[config.interval_minutes]}
                        onValueChange={([value]) => setConfig({ ...config, interval_minutes: value })}
                        min={15}
                        max={120}
                        step={15}
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={config.start_time}
                          onChange={(e) => setConfig({ ...config, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={config.end_time}
                          onChange={(e) => setConfig({ ...config, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => saveReminderMutation.mutate()}
                    disabled={saveReminderMutation.isPending}
                  >
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notificationPermission !== "granted" ? (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Enable Notifications</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Allow notifications to receive water reminders
                </p>
                <Button size="sm" onClick={requestNotificationPermission}>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable
                </Button>
              </div>
            </div>
          </div>
        ) : !reminder ? (
          <div className="text-center py-4">
            <Button onClick={() => setIsConfiguring(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Set Up Water Reminders
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Every {formatMinutes(config.interval_minutes)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatTime(config.start_time)} - {formatTime(config.end_time)}
              </span>
            </div>

            {config.is_enabled && nextReminder && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="w-4 h-4 text-blue-500" />
                <span>
                  Next reminder at{" "}
                  {nextReminder.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={sendWaterReminder}
            >
              <Droplets className="w-4 h-4 mr-2" />
              Send Test Reminder
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
