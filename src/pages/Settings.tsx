import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Moon, 
  Shield, 
  Sparkles,
  Zap,
  Sun,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationSettings } from "@/components/NotificationSettings";
import { WeeklyDigestSettings } from "@/components/settings/WeeklyDigestSettings";
import { useTheme } from "@/contexts/ThemeContext";

const PreferencesSection = ({ silentMode, setSilentMode }: { silentMode: boolean; setSilentMode: (v: boolean) => void }) => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="glass-card p-8 animate-scale-in">
      <h2 className="text-xl font-semibold text-foreground mb-6">Preferences</h2>
      <div className="space-y-6">
        {/* Theme Selector */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" />
            Theme
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "dark", label: "Dark", icon: Moon, colors: "from-slate-800 to-slate-900" },
              { id: "purple", label: "Purple", icon: Palette, colors: "from-purple-800 to-purple-900" },
              { id: "light", label: "Light", icon: Sun, colors: "from-gray-100 to-white" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as "dark" | "purple" | "light")}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                  theme === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", t.colors)}>
                  <t.icon className={cn("w-5 h-5", t.id === "light" ? "text-gray-700" : "text-white")} />
                </div>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-warning/5 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Silent Days Mode</p>
              <p className="text-sm text-muted-foreground">Minimal UI and gentle suggestions only</p>
            </div>
          </div>
          <Switch checked={silentMode} onCheckedChange={setSilentMode} />
        </div>

        <div>
          <Label>Work Hours</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Input type="time" defaultValue="09:00" className="bg-secondary/50" />
            <Input type="time" defaultValue="18:00" className="bg-secondary/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">AI will prioritize suggestions within these hours</p>
        </div>

        <div>
          <Label>Energy Check-in Frequency</Label>
          <div className="flex gap-2 mt-2">
            {["Every 2h", "Every 4h", "3x daily", "Once daily"].map((freq) => (
              <Button 
                key={freq} 
                variant={freq === "Every 4h" ? "default" : "outline"} 
                size="sm"
              >
                {freq}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const [silentMode, setSilentMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "preferences", label: "Preferences", icon: Moon },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "about", label: "About", icon: Sparkles },
  ];

  const [activeSection, setActiveSection] = useState("profile");

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9">
            {activeSection === "profile" && (
              <div className="glass-card p-8 animate-scale-in">
                <h2 className="text-xl font-semibold text-foreground mb-6">Profile Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <User className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">Change Avatar</Button>
                      <p className="text-xs text-muted-foreground mt-1">JPG, GIF or PNG. Max 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue="John Doe" className="mt-2 bg-secondary/50" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" defaultValue="john@example.com" className="mt-2 bg-secondary/50" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" defaultValue="America/New_York" className="mt-2 bg-secondary/50" />
                  </div>

                  <Button>Save Changes</Button>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-6 animate-scale-in">
                <NotificationSettings />
                
                <WeeklyDigestSettings />
                
                <div className="glass-card p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Email Notifications</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">Receive updates via email</p>
                      </div>
                      <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Weekly Digest</p>
                        <p className="text-sm text-muted-foreground">Summary of your week every Sunday</p>
                      </div>
                      <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "preferences" && (
              <PreferencesSection silentMode={silentMode} setSilentMode={setSilentMode} />
            )}

            {activeSection === "privacy" && (
              <div className="glass-card p-8 animate-scale-in">
                <h2 className="text-xl font-semibold text-foreground mb-6">Privacy & Security</h2>
                <div className="space-y-6">
                  <div className="bg-energy-high/10 border border-energy-high/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-energy-high" />
                      <p className="font-medium text-foreground">Your data is encrypted</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All your personal data is encrypted end-to-end. We never sell or share your information.
                    </p>
                  </div>

                  <Button variant="outline">Download My Data</Button>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            )}

            {activeSection === "about" && (
              <div className="glass-card p-8 animate-scale-in">
                <h2 className="text-xl font-semibold text-foreground mb-6">About HumanOS</h2>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">All Features Free</p>
                      <p className="text-sm text-muted-foreground">No payment required - enjoy everything!</p>
                    </div>
                  </div>
                  <div className="text-sm text-foreground space-y-1">
                    <p>✓ Unlimited AI insights</p>
                    <p>✓ Voice input for chatbot</p>
                    <p>✓ Advanced analytics</p>
                    <p>✓ Life Debugger access</p>
                    <p>✓ All features included</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Version 1.0.0</p>
                  <p>Built with ❤️ for human optimization</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;