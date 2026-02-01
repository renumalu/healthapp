import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Mail, 
  Loader2,
  Trophy,
  Flame,
  Target,
  Copy,
  Link,
  Share2
} from "lucide-react";

interface Partnership {
  id: string;
  user_id: string;
  partner_id: string;
  status: string;
  created_at: string;
  partner_profile?: {
    full_name: string | null;
  } | null;
}

export function AccountabilityPartners() {
  const queryClient = useQueryClient();
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Generate invite link when user is loaded
  useEffect(() => {
    if (currentUser) {
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/auth?partner=${currentUser.id}`);
    }
  }, [currentUser]);

  // Check for pending partner invite on mount
  useEffect(() => {
    const checkPendingInvite = async () => {
      const partnerId = new URLSearchParams(window.location.search).get("partner");
      if (partnerId && currentUser && partnerId !== currentUser.id) {
        // Check if partnership already exists
        const { data: existing } = await supabase
          .from("accountability_partners")
          .select("id")
          .or(`and(user_id.eq.${partnerId},partner_id.eq.${currentUser.id}),and(user_id.eq.${currentUser.id},partner_id.eq.${partnerId})`)
          .maybeSingle();

        if (!existing) {
          // Create partnership request
          const { error } = await supabase
            .from("accountability_partners")
            .insert({
              user_id: partnerId,
              partner_id: currentUser.id,
              status: "pending"
            });

          if (!error) {
            toast.success("Partnership request sent!", {
              description: "Waiting for them to accept."
            });
            queryClient.invalidateQueries({ queryKey: ["accountabilityPartners"] });
          }
        }
        // Clear the URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (currentUser) {
      checkPendingInvite();
    }
  }, [currentUser, queryClient]);

  // Fetch partnerships
  const { data: partnerships = [], isLoading } = useQuery({
    queryKey: ["accountabilityPartners"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("accountability_partners")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`);

      if (error) throw error;
      return data as Partnership[];
    },
  });

  // Fetch partner stats (simulated - would need real data in production)
  const activePartners = partnerships.filter(p => p.status === "accepted");
  const pendingRequests = partnerships.filter(
    p => p.status === "pending" && p.partner_id === currentUser?.id
  );
  const sentRequests = partnerships.filter(
    p => p.status === "pending" && p.user_id === currentUser?.id
  );

  // Accept partnership mutation
  const acceptMutation = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from("accountability_partners")
        .update({ status: "accepted" })
        .eq("id", partnershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountabilityPartners"] });
      toast.success("Partnership accepted!");
    },
  });

  // Decline partnership mutation
  const declineMutation = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from("accountability_partners")
        .delete()
        .eq("id", partnershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountabilityPartners"] });
      toast.success("Request declined");
    },
  });

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!", {
        description: "Share this link with your friend to connect."
      });
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareInviteLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on HumanOS!",
          text: "Let's be accountability partners and stay motivated together!",
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled sharing or error occurred
        if ((err as Error).name !== 'AbortError') {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Accountability Partners
            </CardTitle>
            <CardDescription>
              Stay motivated with friends and family
            </CardDescription>
          </div>
          <Dialog open={isInviting} onOpenChange={setIsInviting}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite an Accountability Partner</DialogTitle>
                <DialogDescription>
                  Share this link with someone you'd like to partner with
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    When they click your link, they'll create an account and automatically connect with you!
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={inviteLink}
                        readOnly
                        className="pl-10 bg-background text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyInviteLink}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={shareInviteLink}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Invite Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Pending Requests</h4>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-yellow-500/20">
                      <UserPlus className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Partnership Request</p>
                    <p className="text-xs text-muted-foreground">
                      Someone wants to be your accountability partner
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-green-500 hover:bg-green-500/20"
                    onClick={() => acceptMutation.mutate(request.id)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/20"
                    onClick={() => declineMutation.mutate(request.id)}
                    disabled={declineMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Partners */}
        {activePartners.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Active Partners</h4>
            {activePartners.map((partner) => (
              <div
                key={partner.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10">
                      <Users className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Partner</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Flame className="w-3 h-3 mr-1" />
                        5 day streak
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-500/20 text-green-500">
                    <Trophy className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No accountability partners yet</p>
            <p className="text-sm">Invite someone to stay motivated together!</p>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Sent Requests</h4>
            {sentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted">
                      <Mail className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Pending Invite</p>
                    <p className="text-xs text-muted-foreground">Waiting for response</p>
                  </div>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Motivation Tips */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            Partner Benefits
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Share progress and celebrate wins together</li>
            <li>• Get gentle reminders when you miss goals</li>
            <li>• Compete in friendly challenges</li>
            <li>• Stay accountable to your health journey</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
