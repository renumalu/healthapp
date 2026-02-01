import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ListChecks, 
  Plus, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight,
  TrendingUp,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  ifCondition: string;
  thenAction: string;
  isActive: boolean;
  isAiSuggested: boolean;
  timesTriggered: number;
  successRate: number;
}

const mockRules: Rule[] = [
  {
    id: "1",
    ifCondition: "Energy drops below 40%",
    thenAction: "Take a 10-minute break and hydrate",
    isActive: true,
    isAiSuggested: false,
    timesTriggered: 15,
    successRate: 87
  },
  {
    id: "2", 
    ifCondition: "It's past 10 PM",
    thenAction: "Start winding down routine",
    isActive: true,
    isAiSuggested: false,
    timesTriggered: 28,
    successRate: 92
  },
  {
    id: "3",
    ifCondition: "Focus session ends",
    thenAction: "Log energy level and take notes",
    isActive: false,
    isAiSuggested: false,
    timesTriggered: 8,
    successRate: 75
  }
];

const aiSuggestedRules: Rule[] = [
  {
    id: "ai-1",
    ifCondition: "Morning energy is above 80%",
    thenAction: "Tackle your most challenging task first",
    isActive: false,
    isAiSuggested: true,
    timesTriggered: 0,
    successRate: 0
  },
  {
    id: "ai-2",
    ifCondition: "3 context switches in 1 hour",
    thenAction: "Pause and refocus with a 5-min meditation",
    isActive: false,
    isAiSuggested: true,
    timesTriggered: 0,
    successRate: 0
  }
];

const Rules = () => {
  const [rules, setRules] = useState<Rule[]>(mockRules);
  const [newIf, setNewIf] = useState("");
  const [newThen, setNewThen] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const addRule = () => {
    if (!newIf.trim() || !newThen.trim()) return;
    
    const newRule: Rule = {
      id: Date.now().toString(),
      ifCondition: newIf,
      thenAction: newThen,
      isActive: true,
      isAiSuggested: false,
      timesTriggered: 0,
      successRate: 0
    };
    
    setRules([...rules, newRule]);
    setNewIf("");
    setNewThen("");
    setShowAddForm(false);
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Personal Rules</h1>
            <p className="text-muted-foreground mt-1">IF-THEN rules that automate your decision making</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" />
            Add Rule
          </Button>
        </div>

        {/* Add Rule Form */}
        {showAddForm && (
          <div className="glass-card p-6 animate-scale-in">
            <h3 className="font-semibold text-foreground mb-4">Create New Rule</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">IF (condition)</label>
                <Input
                  placeholder="e.g., Energy drops below 30%"
                  value={newIf}
                  onChange={(e) => setNewIf(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">THEN (action)</label>
                <Input
                  placeholder="e.g., Take a 15-minute walk"
                  value={newThen}
                  onChange={(e) => setNewThen(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addRule}>Save Rule</Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Active Rules */}
          <div className="col-span-8 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Your Rules ({rules.length})
            </h3>
            
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className={cn(
                  "glass-card p-5 transition-all duration-200",
                  !rule.isActive && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">IF</span>
                      <span className="text-foreground">{rule.ifCondition}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-energy-high bg-energy-high/10 px-2 py-0.5 rounded">THEN</span>
                      <span className="text-foreground">{rule.thenAction}</span>
                    </div>
                    
                    {rule.timesTriggered > 0 && (
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Triggered {rule.timesTriggered} times</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-energy-high" />
                          {rule.successRate}% success rate
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRule(rule.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-8 h-8 text-primary" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Suggested Rules */}
          <div className="col-span-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Suggestions
            </h3>
            
            {aiSuggestedRules.map((rule) => (
              <div 
                key={rule.id} 
                className="glass-card p-5 border-primary/20"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Suggested based on your patterns</p>
                    <p className="text-sm text-foreground mb-1">
                      <span className="text-primary">IF</span> {rule.ifCondition}
                    </p>
                    <p className="text-sm text-foreground">
                      <span className="text-energy-high">THEN</span> {rule.thenAction}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="w-4 h-4" />
                  Add Rule
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Rules;
