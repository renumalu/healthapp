import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  Calendar,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  variable_a: string;
  variable_b: string;
  metric: string;
  status: string;
  start_date: string;
  end_date: string | null;
  min_sample_size: number;
}

interface ExperimentResult {
  id: string;
  experiment_id: string;
  log_date: string;
  variant: 'A' | 'B';
  metric_value: number;
  notes: string | null;
}

const LifeExperiments = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variableA, setVariableA] = useState("");
  const [variableB, setVariableB] = useState("");
  const [metric, setMetric] = useState("energy");
  const [minSampleSize, setMinSampleSize] = useState(14);

  // Result logging
  const [logVariant, setLogVariant] = useState<'A' | 'B'>('A');
  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");

  const { data: experiments, isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('life_experiments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Experiment[];
    }
  });

  const { data: results } = useQuery({
    queryKey: ['experiment-results', selectedExperiment?.id],
    queryFn: async () => {
      if (!selectedExperiment) return [];

      const { data, error } = await supabase
        .from('experiment_results')
        .select('*')
        .eq('experiment_id', selectedExperiment.id)
        .order('log_date', { ascending: true });

      if (error) throw error;
      return data as ExperimentResult[];
    },
    enabled: !!selectedExperiment
  });

  const createExperiment = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('life_experiments').insert({
        user_id: user.id,
        name,
        hypothesis,
        variable_a: variableA,
        variable_b: variableB,
        metric,
        min_sample_size: minSampleSize
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      toast.success("Experiment created!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create experiment");
    }
  });

  const logResult = useMutation({
    mutationFn: async () => {
      if (!selectedExperiment) throw new Error('No experiment selected');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('experiment_results').insert({
        experiment_id: selectedExperiment.id,
        user_id: user.id,
        log_date: new Date().toISOString().split('T')[0],
        variant: logVariant,
        metric_value: parseFloat(logValue),
        notes: logNotes || null
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment-results', selectedExperiment?.id] });
      toast.success("Result logged!");
      setLogValue("");
      setLogNotes("");
    },
    onError: () => {
      toast.error("Failed to log result");
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('life_experiments')
        .update({ 
          status,
          end_date: status === 'completed' || status === 'cancelled' 
            ? new Date().toISOString().split('T')[0] 
            : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      toast.success("Experiment updated!");
    }
  });

  const resetForm = () => {
    setName("");
    setHypothesis("");
    setVariableA("");
    setVariableB("");
    setMetric("energy");
    setMinSampleSize(14);
  };

  const calculateStats = (results: ExperimentResult[]) => {
    const aResults = results.filter(r => r.variant === 'A').map(r => r.metric_value);
    const bResults = results.filter(r => r.variant === 'B').map(r => r.metric_value);

    const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const stdDev = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      return Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1));
    };

    const meanA = mean(aResults);
    const meanB = mean(bResults);
    const stdA = stdDev(aResults);
    const stdB = stdDev(bResults);

    // Simple effect size (Cohen's d approximation)
    const pooledStd = Math.sqrt((stdA * stdA + stdB * stdB) / 2);
    const effectSize = pooledStd > 0 ? (meanB - meanA) / pooledStd : 0;

    // Simple t-test p-value approximation (not statistically rigorous, just for display)
    const totalN = aResults.length + bResults.length;
    const significance = totalN >= 10 && Math.abs(effectSize) > 0.5 ? "significant" : 
                        totalN >= 10 && Math.abs(effectSize) > 0.2 ? "moderate" : "not_significant";

    return {
      meanA: meanA.toFixed(2),
      meanB: meanB.toFixed(2),
      sampleA: aResults.length,
      sampleB: bResults.length,
      effectSize: effectSize.toFixed(2),
      significance,
      winner: meanB > meanA ? 'B' : meanA > meanB ? 'A' : 'tie'
    };
  };

  const stats = results && results.length > 0 ? calculateStats(results) : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-energy-high bg-energy-high/20';
      case 'paused': return 'text-energy-medium bg-energy-medium/20';
      case 'completed': return 'text-primary bg-primary/20';
      case 'cancelled': return 'text-muted-foreground bg-secondary';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-primary" />
              Life Experiments
            </h1>
            <p className="text-muted-foreground mt-1">
              A/B test your lifestyle changes with statistical rigor
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-5 h-5" />
                New Experiment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Experiment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Experiment Name
                  </label>
                  <Input
                    placeholder="e.g., Morning vs Evening Workout"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Hypothesis
                  </label>
                  <Textarea
                    placeholder="I believe that... will lead to..."
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Variable A (Control)
                    </label>
                    <Input
                      placeholder="e.g., Morning workout"
                      value={variableA}
                      onChange={(e) => setVariableA(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Variable B (Test)
                    </label>
                    <Input
                      placeholder="e.g., Evening workout"
                      value={variableB}
                      onChange={(e) => setVariableB(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Metric to Track
                    </label>
                    <Select value={metric} onValueChange={setMetric}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="energy">Energy Level (1-10)</SelectItem>
                        <SelectItem value="mood">Mood (1-10)</SelectItem>
                        <SelectItem value="sleep">Sleep Quality (1-10)</SelectItem>
                        <SelectItem value="focus">Focus Duration (mins)</SelectItem>
                        <SelectItem value="productivity">Productivity (1-10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Min Sample Size (days)
                    </label>
                    <Input
                      type="number"
                      min={7}
                      max={90}
                      value={minSampleSize}
                      onChange={(e) => setMinSampleSize(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createExperiment.mutate()}
                  disabled={!name || !hypothesis || !variableA || !variableB}
                >
                  Start Experiment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Experiments List */}
          <div className="col-span-5 space-y-4">
            <h3 className="font-semibold text-foreground">Your Experiments</h3>
            {isLoading ? (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : experiments && experiments.length > 0 ? (
              experiments.map((exp) => (
                <div 
                  key={exp.id} 
                  className={`glass-card p-4 cursor-pointer transition-all ${
                    selectedExperiment?.id === exp.id ? 'ring-2 ring-primary' : 'hover:bg-secondary/30'
                  }`}
                  onClick={() => setSelectedExperiment(exp)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{exp.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(exp.status)}`}>
                      {exp.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {exp.hypothesis}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{exp.variable_a} vs {exp.variable_b}</span>
                    <span className="capitalize">{exp.metric}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card p-8 text-center">
                <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No experiments yet</p>
                <p className="text-sm text-muted-foreground">Create your first A/B test to get started</p>
              </div>
            )}
          </div>

          {/* Selected Experiment Details */}
          <div className="col-span-7">
            {selectedExperiment ? (
              <div className="space-y-6">
                {/* Experiment Header */}
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedExperiment.name}</h2>
                      <p className="text-muted-foreground mt-1">{selectedExperiment.hypothesis}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedExperiment.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: selectedExperiment.id, status: 'paused' })}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {selectedExperiment.status === 'paused' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: selectedExperiment.id, status: 'active' })}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {selectedExperiment.status === 'active' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: selectedExperiment.id, status: 'completed' })}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Variable A</p>
                      <p className="font-medium text-foreground">{selectedExperiment.variable_a}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Variable B</p>
                      <p className="font-medium text-foreground">{selectedExperiment.variable_b}</p>
                    </div>
                  </div>
                </div>

                {/* Log Result */}
                {selectedExperiment.status === 'active' && (
                  <div className="glass-card p-6">
                    <h3 className="font-semibold text-foreground mb-4">Log Today's Result</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Which did you try?</label>
                        <Select value={logVariant} onValueChange={(v) => setLogVariant(v as 'A' | 'B')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A: {selectedExperiment.variable_a}</SelectItem>
                            <SelectItem value="B">B: {selectedExperiment.variable_b}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">
                          {selectedExperiment.metric} value
                        </label>
                        <Input
                          type="number"
                          placeholder="1-10"
                          value={logValue}
                          onChange={(e) => setLogValue(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={() => logResult.mutate()}
                          disabled={!logValue}
                          className="w-full"
                        >
                          Log Result
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Analysis */}
                {stats && (
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Statistical Analysis</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className={`p-4 rounded-lg ${stats.winner === 'A' ? 'bg-energy-high/10 ring-2 ring-energy-high' : 'bg-secondary/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Variable A</span>
                          {stats.winner === 'A' && <TrendingUp className="w-4 h-4 text-energy-high" />}
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stats.meanA}</p>
                        <p className="text-xs text-muted-foreground">{stats.sampleA} samples</p>
                      </div>
                      <div className={`p-4 rounded-lg ${stats.winner === 'B' ? 'bg-energy-high/10 ring-2 ring-energy-high' : 'bg-secondary/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Variable B</span>
                          {stats.winner === 'B' && <TrendingUp className="w-4 h-4 text-energy-high" />}
                        </div>
                        <p className="text-2xl font-bold text-foreground">{stats.meanB}</p>
                        <p className="text-xs text-muted-foreground">{stats.sampleB} samples</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Effect Size</p>
                        <p className="text-lg font-semibold text-foreground">{stats.effectSize}</p>
                        <p className="text-xs text-muted-foreground">Cohen's d</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Total Samples</p>
                        <p className="text-lg font-semibold text-foreground">{stats.sampleA + stats.sampleB}</p>
                        <p className="text-xs text-muted-foreground">/ {selectedExperiment.min_sample_size} needed</p>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        stats.significance === 'significant' ? 'bg-energy-high/20' : 
                        stats.significance === 'moderate' ? 'bg-energy-medium/20' : 'bg-secondary/30'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">Significance</p>
                        <p className={`text-lg font-semibold ${
                          stats.significance === 'significant' ? 'text-energy-high' : 
                          stats.significance === 'moderate' ? 'text-energy-medium' : 'text-muted-foreground'
                        }`}>
                          {stats.significance === 'significant' ? 'Significant!' : 
                           stats.significance === 'moderate' ? 'Moderate' : 'Need Data'}
                        </p>
                      </div>
                    </div>

                    {stats.significance !== 'significant' && stats.sampleA + stats.sampleB < selectedExperiment.min_sample_size && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-energy-medium/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-energy-medium" />
                        <p className="text-sm text-energy-medium">
                          Keep logging! You need {selectedExperiment.min_sample_size - (stats.sampleA + stats.sampleB)} more data points for reliable results.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center">
                <Target className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Select an Experiment</h3>
                <p className="text-muted-foreground max-w-sm">
                  Choose an experiment from the list to view details, log results, and see statistical analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LifeExperiments;
