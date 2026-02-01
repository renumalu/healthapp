import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Clock, Coffee, Sun, Moon, Apple } from "lucide-react";

interface MealReminder {
  id: string;
  meal_type: string;
  reminder_time: string;
  is_enabled: boolean;
  days_of_week: number[];
}

const mealTypeConfig: Record<string, { icon: React.ReactNode; label: string; defaultTime: string }> = {
  breakfast: { icon: <Coffee className="w-4 h-4" />, label: "Breakfast", defaultTime: "08:00" },
  lunch: { icon: <Sun className="w-4 h-4" />, label: "Lunch", defaultTime: "12:00" },
  dinner: { icon: <Moon className="w-4 h-4" />, label: "Dinner", defaultTime: "18:00" },
  snack: { icon: <Apple className="w-4 h-4" />, label: "Snack", defaultTime: "15:00" },
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MealReminders = () => {
  const queryClient = useQueryClient();
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [newReminder, setNewReminder] = useState({
    meal_type: "breakfast",
    reminder_time: "08:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast.success("Notifications enabled!");
      } else {
        toast.error("Notifications denied. Please enable in browser settings.");
      }
    }
  };

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["mealReminders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("meal_reminders")
        .select("*")
        .eq("user_id", user.id)
        .order("reminder_time", { ascending: true });

      if (error) throw error;
      return data as MealReminder[];
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("meal_reminders").insert({
        user_id: user.id,
        meal_type: newReminder.meal_type,
        reminder_time: newReminder.reminder_time,
        days_of_week: newReminder.days_of_week,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealReminders"] });
      setIsAddingReminder(false);
      setNewReminder({
        meal_type: "breakfast",
        reminder_time: "08:00",
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
      });
      toast.success("Reminder created!");
      scheduleReminders();
    },
    onError: (error) => {
      toast.error("Failed to create reminder: " + error.message);
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("meal_reminders")
        .update({ is_enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealReminders"] });
      scheduleReminders();
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealReminders"] });
      toast.success("Reminder deleted");
    },
  });

  const toggleDay = (day: number) => {
    const newDays = newReminder.days_of_week.includes(day)
      ? newReminder.days_of_week.filter(d => d !== day)
      : [...newReminder.days_of_week, day].sort();
    setNewReminder({ ...newReminder, days_of_week: newDays });
  };

  // Schedule browser notifications
  const scheduleReminders = () => {
    if (notificationPermission !== "granted") return;

    // Clear existing timers (in a real app, you'd store these)
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    reminders.filter(r => r.is_enabled).forEach(reminder => {
      if (!reminder.days_of_week.includes(currentDay)) return;

      const [hours, minutes] = reminder.reminder_time.split(":").map(Number);
      const reminderMinutes = hours * 60 + minutes;
      const diff = reminderMinutes - currentMinutes;

      if (diff > 0 && diff < 60) {
        setTimeout(() => {
          const config = mealTypeConfig[reminder.meal_type];
          new Notification(`Time for ${config.label}!`, {
            body: `Don't forget to log your ${config.label.toLowerCase()}.`,
            icon: "/favicon.ico",
          });
        }, diff * 60 * 1000);
      }
    });
  };

  // Check reminders on mount
  useEffect(() => {
    if (reminders.length > 0 && notificationPermission === "granted") {
      scheduleReminders();
    }
  }, [reminders, notificationPermission]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Meal Reminders
            </CardTitle>
            <CardDescription>Get notified when it's time to eat</CardDescription>
          </div>
          <Dialog open={isAddingReminder} onOpenChange={setIsAddingReminder}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Meal Reminder</DialogTitle>
                <DialogDescription>Set up a reminder for your meals</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select
                    value={newReminder.meal_type}
                    onValueChange={(value) => {
                      setNewReminder({ 
                        ...newReminder, 
                        meal_type: value,
                        reminder_time: mealTypeConfig[value]?.defaultTime || "12:00"
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(mealTypeConfig).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          <span className="flex items-center gap-2">
                            {config.icon} {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newReminder.reminder_time}
                    onChange={(e) => setNewReminder({ ...newReminder, reminder_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Days</Label>
                  <div className="flex gap-1">
                    {dayNames.map((day, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant={newReminder.days_of_week.includes(i) ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10 p-0"
                        onClick={() => toggleDay(i)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createReminderMutation.mutate()}
                  disabled={createReminderMutation.isPending}
                >
                  Create Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {notificationPermission !== "granted" && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Enable notifications to receive meal reminders
            </p>
            <Button size="sm" onClick={requestNotificationPermission}>
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          </div>
        )}

        {reminders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No reminders set</p>
            <p className="text-sm">Add reminders to stay on track with your meals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const config = mealTypeConfig[reminder.meal_type] || mealTypeConfig.snack;
              return (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      {config.icon}
                    </div>
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(reminder.reminder_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={reminder.is_enabled}
                      onCheckedChange={(checked) => 
                        updateReminderMutation.mutate({ id: reminder.id, is_enabled: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteReminderMutation.mutate(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
