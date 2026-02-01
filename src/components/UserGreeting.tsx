import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Flame } from "lucide-react";

export const UserGreeting = () => {
  const [userName, setUserName] = useState<string>("");
  const [streak, setStreak] = useState(0);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name.split(" ")[0]);
        } else if (user.email) {
          setUserName(user.email.split("@")[0]);
        }

        // Calculate streak (mock for now - could be based on daily logins)
        const storedStreak = localStorage.getItem(`streak_${user.id}`);
        const lastLogin = localStorage.getItem(`lastLogin_${user.id}`);
        const today = new Date().toDateString();
        
        if (lastLogin === today) {
          setStreak(parseInt(storedStreak || "1"));
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastLogin === yesterday.toDateString()) {
            const newStreak = (parseInt(storedStreak || "0") + 1);
            setStreak(newStreak);
            localStorage.setItem(`streak_${user.id}`, newStreak.toString());
          } else {
            setStreak(1);
            localStorage.setItem(`streak_${user.id}`, "1");
          }
          localStorage.setItem(`lastLogin_${user.id}`, today);
        }
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          {greeting}, {userName || "there"}! 
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </h1>
        <p className="text-muted-foreground mt-1">
          Ready to optimize your energy today?
        </p>
      </div>
      
      {streak > 0 && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-2 rounded-full border border-orange-500/30">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-foreground">{streak} day streak!</span>
        </div>
      )}
    </div>
  );
};
