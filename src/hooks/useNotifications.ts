import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  enabled: boolean;
  focusReminder: boolean;
  focusInterval: number; // minutes
  breakReminder: boolean;
  breakInterval: number; // minutes
  energyLogReminder: boolean;
  energyLogInterval: number; // hours
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  focusReminder: true,
  focusInterval: 90,
  breakReminder: true,
  breakInterval: 25,
  energyLogReminder: true,
  energyLogInterval: 3,
};

export const useNotifications = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [timers, setTimers] = useState<{ [key: string]: NodeJS.Timeout }>({});

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('notification-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications not supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive',
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      updateSettings({ enabled: true });
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive reminders.',
      });
      return true;
    } else {
      toast({
        title: 'Permission denied',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, updateSettings]);

  // Send a notification
  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission !== 'granted' || !settings.enabled) return;

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: title.toLowerCase().replace(/\s+/g, '-'),
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }, [permission, settings.enabled]);

  // Schedule reminders
  const startReminders = useCallback(() => {
    // Clear existing timers
    Object.values(timers).forEach(timer => clearInterval(timer));
    const newTimers: { [key: string]: NodeJS.Timeout } = {};

    if (!settings.enabled || permission !== 'granted') return;

    // Focus reminder
    if (settings.focusReminder) {
      newTimers.focus = setInterval(() => {
        sendNotification(
          '🎯 Time for Deep Focus',
          "It's been a while! Start a focus session to boost your productivity."
        );
      }, settings.focusInterval * 60 * 1000);
    }

    // Break reminder
    if (settings.breakReminder) {
      newTimers.break = setInterval(() => {
        sendNotification(
          '🧘 Take a Break',
          'Step away from the screen. Try the breathing exercise in Zen Zone!'
        );
      }, settings.breakInterval * 60 * 1000);
    }

    // Energy log reminder
    if (settings.energyLogReminder) {
      newTimers.energy = setInterval(() => {
        sendNotification(
          '⚡ Log Your Energy',
          "How are you feeling? Log your energy level to track your patterns."
        );
      }, settings.energyLogInterval * 60 * 60 * 1000);
    }

    setTimers(newTimers);
  }, [settings, permission, sendNotification, timers]);

  // Stop all reminders
  const stopReminders = useCallback(() => {
    Object.values(timers).forEach(timer => clearInterval(timer));
    setTimers({});
  }, [timers]);

  // Start/stop reminders when settings change
  useEffect(() => {
    if (settings.enabled && permission === 'granted') {
      startReminders();
    } else {
      stopReminders();
    }

    return () => stopReminders();
  }, [settings.enabled, permission]);

  // Quick notification triggers
  const notifyFocusStart = useCallback(() => {
    sendNotification('🎯 Focus Session Started', 'Stay focused! You got this.');
  }, [sendNotification]);

  const notifyFocusEnd = useCallback((duration: number) => {
    sendNotification(
      '✅ Focus Session Complete',
      `Great job! You focused for ${duration} minutes.`
    );
  }, [sendNotification]);

  const notifyBreakTime = useCallback(() => {
    sendNotification(
      '☕ Break Time',
      'Take a short break to recharge your energy.'
    );
  }, [sendNotification]);

  return {
    settings,
    updateSettings,
    permission,
    requestPermission,
    sendNotification,
    startReminders,
    stopReminders,
    notifyFocusStart,
    notifyFocusEnd,
    notifyBreakTime,
    isSupported: 'Notification' in window,
  };
};
