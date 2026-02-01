import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  TrendingUp, 
  Brain, 
  Zap,
  Target,
  Clock,
  Activity,
  AlertCircle,
  Download
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExportProgressModal } from "@/components/reports/ExportProgressModal";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyState = () => {
  const navigate = useNavigate();
  
  return (
    <div className="glass-card p-12 text-center">
      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Start tracking your energy and focus sessions to see your analytics. 
        Log your first entry to begin visualizing your patterns.
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => navigate('/dashboard')}>
          <Zap className="w-4 h-4 mr-2" />
          Log Energy
        </Button>
        <Button variant="outline" onClick={() => navigate('/focus')}>
          <Target className="w-4 h-4 mr-2" />
          Start Focus Session
        </Button>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-12 gap-6">
      <Skeleton className="col-span-8 h-80" />
      <Skeleton className="col-span-4 h-80" />
    </div>
  </div>
);

const Analytics = () => {
  const { 
    isLoading, 
    dailyData, 
    hourlyData, 
    timeDistribution, 
    wellnessData, 
    stats,
    hasData 
  } = useAnalyticsData();

  // Initialize streak tracking
  useStreakTracking();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Loading your data...</p>
          </div>
          <LoadingSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Understand your patterns and optimize performance</p>
          </div>
          <div className="flex items-center gap-4">
            <ExportProgressModal 
              trigger={
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
              }
            />
            <Tabs defaultValue="week" className="w-auto">
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { 
                  label: "Avg Energy", 
                  value: `${stats.avgEnergy}%`, 
                  change: stats.avgEnergy > 70 ? "+High" : stats.avgEnergy > 50 ? "Normal" : "Low", 
                  icon: Zap, 
                  color: stats.avgEnergy > 70 ? "text-energy-high" : stats.avgEnergy > 50 ? "text-energy-medium" : "text-energy-low" 
                },
                { 
                  label: "Focus Hours", 
                  value: `${stats.totalFocusHours}h`, 
                  change: `${stats.totalSessions} sessions`, 
                  icon: Target, 
                  color: "text-primary" 
                },
                { 
                  label: "Energy Logs", 
                  value: stats.totalLogs.toString(), 
                  change: "this week", 
                  icon: TrendingUp, 
                  color: "text-mood-good" 
                },
                { 
                  label: "Peak Time", 
                  value: stats.peakHour, 
                  change: "optimal", 
                  icon: Brain, 
                  color: "text-primary" 
                },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-12 gap-6">
              {/* Energy Trend */}
              <div className="col-span-8 glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Energy & Mood Trends</h3>
                    <p className="text-sm text-muted-foreground">Your performance over the week</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Energy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-energy-high" />
                      <span className="text-muted-foreground">Mood</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span className="text-muted-foreground">Productivity</span>
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="dayShort" stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="energy" name="Energy" stroke="hsl(38, 92%, 55%)" fill="url(#energyGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="mood" name="Mood" stroke="hsl(142, 70%, 45%)" fill="url(#moodGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="productivity" name="Productivity" stroke="hsl(220, 70%, 50%)" fill="url(#prodGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time Distribution Pie */}
              <div className="col-span-4 glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Time Distribution</h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {timeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {timeDistribution.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-semibold text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Focus Hours Bar Chart */}
              <div className="col-span-6 glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-foreground">Daily Focus Hours</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>Goal: 4h/day</span>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <XAxis dataKey="dayShort" stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="focus" name="Focus Hours" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart - Wellness Overview */}
              <div className="col-span-6 glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Wellness Overview</h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={wellnessData}>
                      <PolarGrid stroke="hsl(215, 16%, 25%)" />
                      <PolarAngleAxis dataKey="skill" stroke="hsl(215, 16%, 55%)" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(215, 16%, 35%)" fontSize={10} />
                      <Radar name="You" dataKey="A" stroke="hsl(38, 92%, 55%)" fill="hsl(38, 92%, 55%)" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hourly Energy Pattern */}
              <div className="col-span-8 glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Hourly Energy Pattern</h3>
                    <p className="text-sm text-muted-foreground">Find your peak performance hours</p>
                  </div>
                  <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full">
                    Peak: {stats.peakHour}
                  </span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData}>
                      <XAxis dataKey="hour" stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(215, 16%, 55%)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="energy" 
                        name="Energy"
                        stroke="hsl(38, 92%, 55%)" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(38, 92%, 55%)", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(38, 92%, 55%)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Weekly Summary */}
              <div className="col-span-4 glass-card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">AI Weekly Summary</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm text-foreground leading-relaxed">
                      {stats.bestDay && stats.worstDay ? (
                        <>
                          Your energy levels peaked on {stats.bestDay.dayShort} ({stats.bestDay.energy}%). 
                          {stats.worstDay.dayShort !== stats.bestDay.dayShort && 
                            ` ${stats.worstDay.dayShort} was more challenging (${stats.worstDay.energy}%).`}
                          {' '}Keep tracking to discover more patterns!
                        </>
                      ) : (
                        'Log more data to get personalized insights about your energy patterns.'
                      )}
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    {stats.bestDay && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-energy-high mt-1.5" />
                        <span className="text-muted-foreground">
                          Best day: {stats.bestDay.dayShort} ({stats.bestDay.energy}% energy)
                        </span>
                      </div>
                    )}
                    {stats.worstDay && stats.worstDay.energy > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-energy-low mt-1.5" />
                        <span className="text-muted-foreground">
                          Challenging: {stats.worstDay.dayShort} ({stats.worstDay.energy}% energy)
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <span className="text-muted-foreground">
                        Peak hours: {stats.peakHour}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                      <span className="text-muted-foreground">
                        Total focus: {stats.totalFocusHours}h this week
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
