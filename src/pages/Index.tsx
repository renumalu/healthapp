import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Brain, Shield, TrendingUp, Sparkles, ChevronRight, Activity, Battery, Moon, Heart, Target, BarChart3, Mic, MessageCircle, Utensils, Dumbbell, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Every recommendation explains why, helping you understand your patterns.",
      gradient: "from-violet-500 to-purple-600"
    },
    {
      icon: Shield,
      title: "Burnout Prevention",
      description: "Automatic detection and protective measures when burnout risk rises.",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: TrendingUp,
      title: "Energy Budgeting",
      description: "Treat daily energy like currency. Allocate wisely for peak performance.",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      icon: Mic,
      title: "Voice AI Chat",
      description: "Speak to your wellness assistant naturally with voice input support.",
      gradient: "from-pink-500 to-rose-600"
    },
    {
      icon: Utensils,
      title: "Diet Planning",
      description: "AI meal suggestions, calorie tracking, and personalized nutrition plans.",
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      icon: Dumbbell,
      title: "Exercise Planner",
      description: "Custom workout routines tailored to your energy and fitness goals.",
      gradient: "from-red-500 to-orange-600"
    }
  ];

  const stats = [
    { value: "100%", label: "Free Forever" },
    { value: "∞", label: "All Features" },
    { value: "AI", label: "Powered" },
    { value: "24/7", label: "Available" }
  ];

  const capabilities = [
    { icon: Activity, label: "Energy Tracking" },
    { icon: Battery, label: "Focus Sessions" },
    { icon: Moon, label: "Sleep Analysis" },
    { icon: Heart, label: "Mood Monitoring" },
    { icon: Target, label: "Goal Setting" },
    { icon: BarChart3, label: "Analytics" },
    { icon: MessageCircle, label: "AI Chatbot" },
    { icon: Mic, label: "Voice Input" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Main gradient orbs */}
        <div 
          className="absolute w-[900px] h-[900px] rounded-full opacity-30 blur-[150px]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
            left: `calc(${mousePosition.x * 0.03}px - 450px)`,
            top: `calc(${mousePosition.y * 0.03}px - 300px)`,
            transition: 'left 1s ease-out, top 1s ease-out'
          }}
        />
        <div 
          className="absolute w-[700px] h-[700px] rounded-full opacity-25 blur-[120px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(160 84% 39%) 0%, transparent 70%)',
            right: '-250px',
            bottom: '-150px'
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[100px] animate-float"
          style={{
            background: 'radial-gradient(circle, hsl(280 84% 60%) 0%, transparent 70%)',
            left: '25%',
            bottom: '15%'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 55%) 0%, transparent 70%)',
            right: '20%',
            top: '10%',
            animation: 'float 8s ease-in-out infinite reverse'
          }}
        />
        
        {/* Animated grid */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.08)_1px,transparent_1px)] bg-[size:80px_80px]"
          style={{
            transform: `translateY(${scrollY * 0.15}px)`
          }}
        />
        
        {/* Floating particles */}
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: `hsl(var(--primary) / ${0.3 + Math.random() * 0.4})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
              boxShadow: '0 0 10px hsl(var(--primary) / 0.3)'
            }}
          />
        ))}
      </div>
      
      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-110 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                <path d="M12 2v2" strokeWidth="1.5" />
                <path d="M8 4l1 1" strokeWidth="1.5" />
                <path d="M16 4l-1 1" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
          <span className="font-bold text-2xl text-foreground tracking-tight">HumanOS</span>
        </div>
        
        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate("/auth?mode=login")} 
            className="border-primary/50 hover:bg-primary/10 hover:border-primary transition-all duration-300 gap-2"
          >
            <LogIn className="w-4 h-4" />
            Log In
          </Button>
          <Button 
            onClick={() => navigate("/auth?mode=signup")} 
            className="bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-20">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-emerald-500/20 to-cyan-500/20 border border-primary/30 text-sm text-primary animate-fade-in backdrop-blur-sm hover:scale-105 transition-transform cursor-default shadow-lg shadow-primary/10">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="font-semibold">AI-Powered Personal Operating System</span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">FREE</span>
          </div>
          
          {/* Main Headline */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground max-w-5xl mx-auto leading-[1.05] tracking-tight">
              Optimize your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  energy
                </span>
                <span className="absolute -inset-3 bg-gradient-to-r from-emerald-400/40 via-cyan-400/40 to-blue-500/40 blur-2xl animate-pulse" />
              </span>
              ,{" "}
              <br className="hidden md:block" />
              not just your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                  time
                </span>
                <span className="absolute -inset-3 bg-gradient-to-r from-amber-400/30 via-orange-400/30 to-red-400/30 blur-2xl animate-pulse" style={{ animationDelay: '500ms' }} />
              </span>
            </h1>
          </div>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            HumanOS treats your energy, focus, and mood as system resources. 
            Make better decisions, prevent burnout, and understand how you truly function.
            <span className="block mt-2 text-primary font-semibold text-xl">🎉 100% Free, forever!</span>
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center pt-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth?mode=signup")}
              className="group h-16 px-12 text-lg bg-gradient-to-r from-primary via-amber-500 to-emerald-500 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl"
            >
              <UserPlus className="w-6 h-6 mr-3 group-hover:text-white transition-colors" />
              Get Started Free
              <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-10 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {[
              "No credit card required",
              "All features included",
              "Voice AI powered"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-50" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-28 animate-fade-in" style={{ animationDelay: '500ms' }}>
          {stats.map((stat, i) => (
            <div 
              key={i} 
              className="group text-center p-8 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-md hover:bg-card/90 hover:border-primary/40 hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20"
            >
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent group-hover:scale-110 inline-block transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Capabilities Pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-20 animate-fade-in" style={{ animationDelay: '600ms' }}>
          {capabilities.map((cap, i) => (
            <div 
              key={i}
              className="group flex items-center gap-3 px-5 py-3 rounded-full bg-secondary/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/15 hover:scale-110 transition-all duration-300 cursor-default backdrop-blur-sm"
            >
              <cap.icon className="w-4 h-4 group-hover:text-primary transition-colors" />
              {cap.label}
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-28">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="group relative p-8 rounded-3xl bg-card/60 border border-border/50 backdrop-blur-md hover:bg-card/90 hover:border-primary/40 hover:-translate-y-3 transition-all duration-500 animate-fade-in overflow-hidden hover:shadow-2xl hover:shadow-primary/10"
              style={{ animationDelay: `${700 + i * 100}ms` }}
            >
              {/* Hover glow effect */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${feature.gradient}`} />
              
              <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 group-hover:shadow-2xl transition-all duration-300`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="relative text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="relative text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-36 text-center animate-fade-in" style={{ animationDelay: '1000ms' }}>
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-cyan-500/40 to-emerald-500/40 blur-3xl animate-pulse" />
            <div className="relative p-14 rounded-3xl bg-card/70 border-2 border-primary/30 backdrop-blur-md hover:bg-card/90 transition-all duration-300">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                Ready to optimize your life? ✨
              </h2>
              <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg">
                All features are completely free. No subscriptions, no hidden fees.
                Join now and start your wellness journey!
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth?mode=signup")} 
                className="h-16 px-12 text-lg bg-gradient-to-r from-primary via-amber-500 to-emerald-500 hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-300 rounded-2xl"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started Free
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-36 pt-10 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>© 2026 HumanOS. All rights reserved. Built with ❤️ for human optimization. <span className="text-primary font-semibold">100% Free.</span></p>
        </footer>
      </main>
    </div>
  );
};

export default Index;