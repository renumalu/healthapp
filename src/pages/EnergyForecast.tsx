import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Zap,
  RefreshCw,
  Calendar,
  Sparkles,
  Info,
  Sun,
  Moon,
  Activity
} from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface Prediction {
  date: string;
  predicted_energy: number;
  confidence: number;
  factors: string[];
  recommendation: string;
}

interface PredictionResponse {
  predictions: Prediction[];
  patterns: string[];
  insights: string;
}

const EnergyForecast = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);

  const { data: storedPredictions, isLoading: loadingStored } = useQuery({
    queryKey: ['energy-predictions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = startOfToday();
      const { data, error } = await supabase
        .from('energy_predictions')
        .select('*')
        .eq('user_id', user.id)
        .gte('prediction_date', today.toISOString().split('T')[0])
        .order('prediction_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const generatePredictions = async () => {
    setIsGenerating(true);
    try {
      // Refresh session to ensure valid auth token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        // Try to get existing session as fallback
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          toast.error("Please log in to generate predictions");
          setIsGenerating(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("predict-energy", {
        body: {},
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      setPredictions(data as PredictionResponse);
      toast.success("Energy forecast generated!");
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error("Failed to generate predictions");
    } finally {
      setIsGenerating(false);
    }
  };

  const getEnergyColor = (level: number) => {
    if (level >= 7) return "text-energy-high";
    if (level >= 4) return "text-energy-medium";
    return "text-energy-low";
  };

  const getEnergyBg = (level: number) => {
    if (level >= 7) return "bg-energy-high/20";
    if (level >= 4) return "bg-energy-medium/20";
    return "bg-energy-low/20";
  };

  const chartData = predictions?.predictions.map(p => ({
    date: format(new Date(p.date), 'EEE'),
    fullDate: format(new Date(p.date), 'MMM d'),
    energy: p.predicted_energy,
    confidence: Math.round(p.confidence * 100)
  })) || storedPredictions?.map(p => ({
    date: format(new Date(p.prediction_date), 'EEE'),
    fullDate: format(new Date(p.prediction_date), 'MMM d'),
    energy: p.predicted_energy,
    confidence: Math.round(Number(p.confidence_score) * 100)
  })) || [];

  const displayPredictions = predictions?.predictions || storedPredictions?.map(p => ({
    date: p.prediction_date,
    predicted_energy: p.predicted_energy,
    confidence: Number(p.confidence_score),
    factors: (p.factors as string[]) || [],
    recommendation: ""
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Energy Forecast
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered 7-day energy predictions based on your patterns
            </p>
          </div>
          <Button 
            onClick={generatePredictions} 
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isGenerating ? "Analyzing..." : "Generate Forecast"}
          </Button>
        </div>

        {/* Main Content */}
        {displayPredictions.length > 0 ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Chart Section */}
            <div className="col-span-8">
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">7-Day Energy Forecast</h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="date" 
                        className="text-muted-foreground"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        className="text-muted-foreground"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number, name: string) => [
                          name === 'energy' ? `${value}/10` : `${value}%`,
                          name === 'energy' ? 'Predicted Energy' : 'Confidence'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="energy" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#energyGradient)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily Predictions Grid */}
              <div className="grid grid-cols-7 gap-3 mt-6">
                {displayPredictions.map((pred, i) => (
                  <div 
                    key={pred.date} 
                    className={`glass-card p-4 text-center ${i === 0 ? 'ring-2 ring-primary' : ''}`}
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(pred.date), 'EEE')}
                    </p>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {format(new Date(pred.date), 'MMM d')}
                    </p>
                    <div className={`w-12 h-12 rounded-full ${getEnergyBg(pred.predicted_energy)} flex items-center justify-center mx-auto mb-2`}>
                      <span className={`text-xl font-bold ${getEnergyColor(pred.predicted_energy)}`}>
                        {pred.predicted_energy}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(pred.confidence * 100)}% conf
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights Panel */}
            <div className="col-span-4 space-y-6">
              {/* AI Insights */}
              {predictions?.insights && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">AI Analysis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {predictions.insights}
                  </p>
                </div>
              )}

              {/* Detected Patterns */}
              {predictions?.patterns && predictions.patterns.length > 0 && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Your Patterns</h3>
                  </div>
                  <div className="space-y-3">
                    {predictions.patterns.map((pattern, i) => (
                      <div key={i} className="flex items-start gap-3 bg-secondary/30 rounded-lg p-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary font-medium">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Recommendation */}
              {predictions?.predictions[0]?.recommendation && (
                <div className="glass-card p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Today's Recommendation</h3>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {predictions.predictions[0].recommendation}
                  </p>
                </div>
              )}

              {/* Factors for Today */}
              {predictions?.predictions[0]?.factors && predictions.predictions[0].factors.length > 0 && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Influencing Factors</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {predictions.predictions[0].factors.map((factor, i) => (
                      <span 
                        key={i} 
                        className="px-3 py-1 bg-secondary rounded-full text-xs text-foreground"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Predict Your Energy
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Our AI analyzes your energy logs, sleep patterns, focus sessions, and workouts 
              to predict your energy levels for the next 7 days.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <div className="bg-secondary/30 rounded-lg p-4">
                <Sun className="w-6 h-6 text-energy-high mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">High Energy Days</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <Moon className="w-6 h-6 text-energy-medium mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Rest Recommendations</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Pattern Insights</p>
              </div>
            </div>
            <Button onClick={generatePredictions} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isGenerating ? "Analyzing Your Data..." : "Generate Your Forecast"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnergyForecast;
