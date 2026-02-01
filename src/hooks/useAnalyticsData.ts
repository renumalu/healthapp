import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, subDays, parseISO, differenceInMinutes } from "date-fns";

interface EnergyLog {
  id: string;
  energy_level: number;
  mood: string | null;
  notes: string | null;
  logged_at: string;
}

interface FocusSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  focus_type: string | null;
  energy_before: number | null;
  energy_after: number | null;
}

interface DailyData {
  day: string;
  dayShort: string;
  energy: number;
  mood: number;
  focus: number;
  productivity: number;
  sessions: number;
}

interface HourlyData {
  hour: string;
  energy: number;
  count: number;
}

const moodToScore = (mood: string | null): number => {
  switch (mood?.toLowerCase()) {
    case 'great': case 'excellent': return 95;
    case 'good': return 80;
    case 'okay': case 'neutral': return 60;
    case 'tired': case 'low': return 40;
    case 'bad': case 'stressed': return 25;
    default: return 70;
  }
};

export const useAnalyticsData = () => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const { data: energyLogs, isLoading: energyLoading } = useQuery({
    queryKey: ['energy-logs-week'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('energy_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', subDays(today, 7).toISOString())
        .order('logged_at', { ascending: true });

      if (error) throw error;
      return data as EnergyLog[];
    },
  });

  const { data: focusSessions, isLoading: focusLoading } = useQuery({
    queryKey: ['focus-sessions-week'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', subDays(today, 7).toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;
      return data as FocusSession[];
    },
  });

  const { data: allTimeLogs } = useQuery({
    queryKey: ['energy-logs-all'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('energy_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true });

      if (error) throw error;
      return data as EnergyLog[];
    },
  });

  // Process daily data for charts
  const dailyData: DailyData[] = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const dayDate = subDays(today, 6 - i);
    const dayStr = format(dayDate, 'yyyy-MM-dd');
    const dayShort = format(dayDate, 'EEE');

    const dayLogs = energyLogs?.filter(log => 
      format(parseISO(log.logged_at), 'yyyy-MM-dd') === dayStr
    ) || [];

    const daySessions = focusSessions?.filter(session =>
      format(parseISO(session.started_at), 'yyyy-MM-dd') === dayStr
    ) || [];

    const avgEnergy = dayLogs.length > 0
      ? Math.round(dayLogs.reduce((sum, log) => sum + log.energy_level, 0) / dayLogs.length)
      : 0;

    const avgMood = dayLogs.length > 0
      ? Math.round(dayLogs.reduce((sum, log) => sum + moodToScore(log.mood), 0) / dayLogs.length)
      : 0;

    const totalFocus = daySessions.reduce((sum, session) => {
      return sum + (session.duration_minutes || 0);
    }, 0);

    const productivity = avgEnergy > 0 && totalFocus > 0
      ? Math.min(100, Math.round((avgEnergy * 0.4) + (Math.min(totalFocus / 300, 1) * 60)))
      : 0;

    dailyData.push({
      day: dayStr,
      dayShort,
      energy: avgEnergy,
      mood: avgMood,
      focus: Math.round(totalFocus / 60 * 10) / 10, // Convert to hours
      productivity,
      sessions: daySessions.length,
    });
  }

  // Process hourly energy patterns
  const hourlyData: HourlyData[] = [];
  const hourlyAggregates: { [hour: number]: { total: number; count: number } } = {};

  allTimeLogs?.forEach(log => {
    const hour = parseISO(log.logged_at).getHours();
    if (!hourlyAggregates[hour]) {
      hourlyAggregates[hour] = { total: 0, count: 0 };
    }
    hourlyAggregates[hour].total += log.energy_level;
    hourlyAggregates[hour].count += 1;
  });

  for (let h = 6; h <= 22; h += 2) {
    const aggregate = hourlyAggregates[h] || hourlyAggregates[h + 1];
    const energy = aggregate ? Math.round(aggregate.total / aggregate.count) : 50;
    hourlyData.push({
      hour: `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`,
      energy,
      count: aggregate?.count || 0,
    });
  }

  // Calculate stats
  const totalFocusHours = focusSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
  const avgEnergy = energyLogs?.length 
    ? Math.round(energyLogs.reduce((sum, l) => sum + l.energy_level, 0) / energyLogs.length)
    : 0;
  
  const bestDay = dailyData.reduce((best, day) => 
    day.energy > (best?.energy || 0) ? day : best, dailyData[0]);
  
  const worstDay = dailyData.filter(d => d.energy > 0).reduce((worst, day) => 
    day.energy < (worst?.energy || 100) ? day : worst, dailyData[0]);

  const peakHour = hourlyData.reduce((peak, hour) =>
    hour.energy > (peak?.energy || 0) ? hour : peak, hourlyData[0]);

  // Time distribution (based on focus sessions)
  const focusTypes: { [key: string]: number } = {};
  focusSessions?.forEach(session => {
    const type = session.focus_type || 'deep_work';
    focusTypes[type] = (focusTypes[type] || 0) + (session.duration_minutes || 0);
  });

  const totalMinutes = Object.values(focusTypes).reduce((a, b) => a + b, 0) || 1;
  const timeDistribution = [
    { name: 'Deep Work', value: Math.round((focusTypes['deep_work'] || 0) / totalMinutes * 100) || 35, color: 'hsl(38, 92%, 55%)' },
    { name: 'Meetings', value: Math.round((focusTypes['meeting'] || 0) / totalMinutes * 100) || 20, color: 'hsl(220, 70%, 50%)' },
    { name: 'Admin', value: Math.round((focusTypes['admin'] || 0) / totalMinutes * 100) || 15, color: 'hsl(280, 70%, 50%)' },
    { name: 'Breaks', value: Math.round((focusTypes['break'] || 0) / totalMinutes * 100) || 15, color: 'hsl(142, 70%, 45%)' },
    { name: 'Learning', value: Math.round((focusTypes['learning'] || 0) / totalMinutes * 100) || 15, color: 'hsl(350, 70%, 50%)' },
  ];

  // Wellness radar data
  const wellnessData = [
    { skill: 'Focus', A: Math.min(100, Math.round(totalFocusHours / 60 / 20 * 100)) || 50 },
    { skill: 'Energy', A: avgEnergy || 50 },
    { skill: 'Mood', A: energyLogs?.length ? Math.round(energyLogs.reduce((sum, l) => sum + moodToScore(l.mood), 0) / energyLogs.length) : 50 },
    { skill: 'Sleep', A: 65 }, // Would need sleep data
    { skill: 'Exercise', A: 55 }, // Would need exercise data
    { skill: 'Mindfulness', A: 60 }, // Would need mindfulness data
  ];

  return {
    isLoading: energyLoading || focusLoading,
    dailyData,
    hourlyData,
    timeDistribution,
    wellnessData,
    stats: {
      avgEnergy,
      totalFocusHours: Math.round(totalFocusHours / 60 * 10) / 10,
      totalSessions: focusSessions?.length || 0,
      totalLogs: energyLogs?.length || 0,
      bestDay,
      worstDay,
      peakHour: peakHour?.hour || '10AM',
    },
    hasData: (energyLogs?.length || 0) > 0 || (focusSessions?.length || 0) > 0,
  };
};
