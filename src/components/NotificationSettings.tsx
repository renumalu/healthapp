import { Bell, BellOff, Clock, Zap, Target, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

export const NotificationSettings = () => {
  const {
    settings,
    updateSettings,
    permission,
    requestPermission,
    isSupported,
  } = useNotifications();

  if (!isSupported) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Reminders
            </CardTitle>
            <CardDescription>
              Get reminded to stay focused, take breaks, and log your energy
            </CardDescription>
          </div>
          {permission === 'granted' ? (
            <Badge variant="outline" className="border-green-500 text-green-500">
              Enabled
            </Badge>
          ) : permission === 'denied' ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : (
            <Badge variant="secondary">Not enabled</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission !== 'granted' ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Enable notifications to receive helpful reminders throughout your day.
            </p>
            <Button onClick={requestPermission}>
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          </div>
        ) : (
          <>
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">All Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle all notification reminders
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSettings({ enabled: checked })}
              />
            </div>

            <div className="border-t pt-4 space-y-6">
              {/* Focus Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <Label>Focus Reminders</Label>
                  </div>
                  <Switch
                    checked={settings.focusReminder}
                    onCheckedChange={(checked) => updateSettings({ focusReminder: checked })}
                    disabled={!settings.enabled}
                  />
                </div>
                {settings.focusReminder && settings.enabled && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remind every</span>
                      <span className="font-medium">{settings.focusInterval} min</span>
                    </div>
                    <Slider
                      value={[settings.focusInterval]}
                      onValueChange={([value]) => updateSettings({ focusInterval: value })}
                      min={30}
                      max={180}
                      step={15}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Break Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-green-500" />
                    <Label>Break Reminders</Label>
                  </div>
                  <Switch
                    checked={settings.breakReminder}
                    onCheckedChange={(checked) => updateSettings({ breakReminder: checked })}
                    disabled={!settings.enabled}
                  />
                </div>
                {settings.breakReminder && settings.enabled && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remind every</span>
                      <span className="font-medium">{settings.breakInterval} min</span>
                    </div>
                    <Slider
                      value={[settings.breakInterval]}
                      onValueChange={([value]) => updateSettings({ breakInterval: value })}
                      min={15}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Energy Log Reminder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <Label>Energy Log Reminders</Label>
                  </div>
                  <Switch
                    checked={settings.energyLogReminder}
                    onCheckedChange={(checked) => updateSettings({ energyLogReminder: checked })}
                    disabled={!settings.enabled}
                  />
                </div>
                {settings.energyLogReminder && settings.enabled && (
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remind every</span>
                      <span className="font-medium">{settings.energyLogInterval} hours</span>
                    </div>
                    <Slider
                      value={[settings.energyLogInterval]}
                      onValueChange={([value]) => updateSettings({ energyLogInterval: value })}
                      min={1}
                      max={8}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
