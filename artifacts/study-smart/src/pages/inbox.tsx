import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BellOff,
  Coins,
  Inbox as InboxIcon,
  Loader2,
  MailOpen,
  ShieldPlus,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";

const APPROVER_ID = "5705e7da-bb0b-47e5-8563-9bdd23b24973";

interface InboxMessage {
  id: string;
  type: string;
  points: number | null;
  message: string | null;
  status: string;
  targetUserId: string | null;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    isDeveloper: boolean;
  } | null;
}

const INTERACTIVE_TYPES = ["developer_request", "developer_request_rejected", "friend_request", "stripe_claim", "stranger_message_request"];

const DEV_TEAM_TYPES = ["developer_request", "retry_pass_grant"];

function getSenderName(sender: InboxMessage["sender"], type?: string) {
  if (!sender) return "System";
  if (sender.isDeveloper && type && DEV_TEAM_TYPES.includes(type)) return "By the development team";
  return [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.username || "Unknown";
}

export default function InboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isApprover = user?.id === APPROVER_ID;

  const { data, isLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => customFetch<{ messages: InboxMessage[] }>("/api/inbox"),
    refetchInterval: 30000,
  });

  const inv = () => {
    queryClient.invalidateQueries({ queryKey: ["inbox"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
  };

  const readAllMutation = useMutation({
    mutationFn: () => customFetch("/api/inbox/read-all", { method: "PUT" }),
    onSuccess: () => { inv(); toast({ title: "All messages marked as read" }); },
  });

  const readOneMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/read`, { method: "PUT" }),
    onSuccess: inv,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/approve`, { method: "PUT" }),
    onSuccess: () => {
      toast({ title: "Approved!", description: "Developer promotion has been granted." });
      inv();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/reject`, { method: "PUT" }),
    onSuccess: () => {
      toast({ title: "Rejected", description: "The requesting developer has been notified." });
      inv();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const notifyRejectedMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/notify-rejected`, { method: "PUT" }),
    onSuccess: () => {
      toast({ title: "User notified", description: "The user has been told their promotion was rejected." });
      inv();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/accept-friend`, { method: "PUT" }),
    onSuccess: () => {
      toast({ title: "Friend accepted!", description: "You are now friends." });
      inv();
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const declineFriendMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/decline-friend`, { method: "PUT" }),
    onSuccess: () => { toast({ title: "Request declined" }); inv(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}`, { method: "DELETE" }),
    onSuccess: inv,
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const skipNotifyMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/skip-notify`, { method: "PUT" }),
    onSuccess: () => { toast({ title: "Dismissed", description: "The user was not notified." }); inv(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendFriendFromStrangerMutation = useMutation({
    mutationFn: async ({ msgId, targetUserId }: { msgId: string; targetUserId: string }) => {
      await customFetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: targetUserId }),
      });
      await customFetch(`/api/inbox/${msgId}/read`, { method: "PUT" });
    },
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      inv();
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dismissStrangerMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/inbox/${id}/read`, { method: "PUT" }),
    onSuccess: inv,
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const claimStripeMutation = useMutation({
    mutationFn: (inboxMessageId: string) =>
      customFetch<{ pointsAwarded: number; alreadyClaimed?: boolean }>("/api/stripe/inbox-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxMessageId }),
      }),
    onSuccess: (data) => {
      if (data.alreadyClaimed) {
        toast({ title: "Already claimed", description: "These points were already added to your account." });
      } else {
        toast({ title: `+${data.pointsAwarded} pts claimed!`, description: "Points added to your balance." });
      }
      inv();
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const messages = data?.messages ?? [];
  const unreadCount = messages.filter((m) => !m.readAt).length;

  function handleCardClick(msg: InboxMessage) {
    if (!msg.readAt && !INTERACTIVE_TYPES.includes(msg.type)) {
      readOneMutation.mutate(msg.id);
    }
  }

  function borderClass(msg: InboxMessage) {
    if (msg.type === "developer_request") return "border-violet-500/30 shadow-sm shadow-violet-500/10";
    if (msg.type === "developer_request_rejected") return "border-orange-500/30 shadow-sm shadow-orange-500/10";
    if (!msg.readAt) return "border-indigo-500/30 shadow-sm shadow-indigo-500/10";
    return "border-border/50";
  }

  return (
    <Layout title={t.inbox.title}>
      <div className="space-y-6 pb-8 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10">
              <InboxIcon className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.inbox.title}</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0
                  ? unreadCount === 1
                    ? t.inbox.unreadSingle
                    : t.inbox.unreadPlural.replace("{n}", String(unreadCount))
                  : t.inbox.allCaughtUp}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
            >
              <MailOpen className="w-4 h-4" />
              {t.inbox.markAllRead}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <InboxIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">{t.inbox.empty}</p>
            <p className="text-sm text-muted-foreground/70">{t.inbox.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`bg-card border rounded-2xl p-5 transition-all cursor-default ${borderClass(msg)}`}
                onClick={() => handleCardClick(msg)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                    {msg.sender?.profileImageUrl ? (
                      <img src={msg.sender.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getSenderName(msg.sender, msg.type).slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm ${!msg.readAt ? "font-bold" : "font-normal text-muted-foreground"}`}>
                          {getSenderName(msg.sender, msg.type)}
                        </span>
                        {msg.sender?.isDeveloper && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {!msg.readAt && !INTERACTIVE_TYPES.includes(msg.type) && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(msg.id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Points message */}
                    {msg.type === "points" && msg.points != null && msg.points > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-semibold">
                        <Coins className="w-4 h-4" />
                        +{msg.points} {t.inbox.bonusPoints}
                      </div>
                    )}

                    {/* Friend request */}
                    {msg.type === "friend_request" && (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-sm font-semibold">
                          <Users className="w-4 h-4" />
                          {t.inbox.friendRequest}
                        </div>
                        {msg.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => { e.stopPropagation(); acceptFriendMutation.mutate(msg.id); }}
                              disabled={acceptFriendMutation.isPending || declineFriendMutation.isPending}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {t.inbox.accept}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                              onClick={(e) => { e.stopPropagation(); declineFriendMutation.mutate(msg.id); }}
                              disabled={acceptFriendMutation.isPending || declineFriendMutation.isPending}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              {t.inbox.decline}
                            </Button>
                          </div>
                        )}
                        {msg.status === "accepted" && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            <UserCheck className="w-4 h-4" /> {t.inbox.nowFriends}
                          </div>
                        )}
                        {msg.status === "declined" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <UserX className="w-4 h-4" /> {t.inbox.declined}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stranger message request */}
                    {msg.type === "stranger_message_request" && msg.targetUserId && (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                          <Bell className="w-4 h-4" />
                          Message Request
                        </div>
                        {!msg.readAt && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => { e.stopPropagation(); sendFriendFromStrangerMutation.mutate({ msgId: msg.id, targetUserId: msg.targetUserId! }); }}
                              disabled={sendFriendFromStrangerMutation.isPending || dismissStrangerMutation.isPending}
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Add Friend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl gap-1.5"
                              onClick={(e) => { e.stopPropagation(); dismissStrangerMutation.mutate(msg.id); }}
                              disabled={sendFriendFromStrangerMutation.isPending || dismissStrangerMutation.isPending}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Developer approved */}
                    {msg.type === "developer_approved" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
                        <BadgeCheck className="w-4 h-4" />
                        {t.inbox.devAccessGranted}
                      </div>
                    )}

                    {/* Developer rejected (notification to the candidate) */}
                    {msg.type === "developer_rejected" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm font-semibold">
                        <ShieldX className="w-4 h-4" />
                        {t.inbox.devNotApproved}
                      </div>
                    )}

                    {/* Retry pass weekly grant */}
                    {msg.type === "retry_pass_grant" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold">
                        <span>🔄</span>
                        {t.inbox.retryPassGrant}
                      </div>
                    )}

                    {/* Power-up gift received */}
                    {msg.type === "powerup_gift" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-semibold">
                        <span>🎁</span>
                        {t.inbox.powerupReceived}
                      </div>
                    )}

                    {/* Stripe donation claim */}
                    {msg.type === "stripe_claim" && (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-semibold">
                          <Coins className="w-4 h-4" />
                          {msg.points ?? 200} pts donation reward
                        </div>
                        {msg.status === "pending" && (
                          <Button
                            size="sm"
                            className="rounded-xl gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:opacity-90"
                            onClick={(e) => { e.stopPropagation(); claimStripeMutation.mutate(msg.id); }}
                            disabled={claimStripeMutation.isPending}
                          >
                            {claimStripeMutation.isPending ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…</>
                            ) : (
                              <><Coins className="w-3.5 h-3.5" /> Claim {msg.points ?? 200} pts</>
                            )}
                          </Button>
                        )}
                        {msg.status === "accepted" && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            <Coins className="w-4 h-4" /> Points claimed — enjoy!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat point warning */}
                    {msg.type === "chat_point_warning" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        {t.inbox.lowPoints}
                        {msg.points != null && <span className="font-normal ml-0.5">— {msg.points} {t.inbox.ptsRemaining}</span>}
                      </div>
                    )}

                    {/* Developer request (shown to approver) */}
                    {msg.type === "developer_request" && (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-sm font-semibold">
                          <ShieldPlus className="w-4 h-4" />
                          {t.inbox.devPromotionReq}
                        </div>
                        {msg.status === "pending" && isApprover && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(msg.id); }}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {t.inbox.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(msg.id); }}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <ShieldX className="w-3.5 h-3.5" />
                              {t.inbox.reject}
                            </Button>
                          </div>
                        )}
                        {msg.status === "approved" && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            <ShieldCheck className="w-4 h-4" /> {t.inbox.approved}
                          </div>
                        )}
                        {msg.status === "rejected" && (
                          <div className="flex items-center gap-1.5 text-destructive text-sm font-medium">
                            <ShieldX className="w-4 h-4" /> {t.inbox.rejected}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejection notice sent back to the requesting developer */}
                    {msg.type === "developer_request_rejected" && (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-semibold">
                          <ShieldX className="w-4 h-4" />
                          {t.inbox.promotionRejected}
                        </div>
                        {msg.status === "pending_choice" && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {t.inbox.wantToNotify}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="rounded-xl gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={(e) => { e.stopPropagation(); notifyRejectedMutation.mutate(msg.id); }}
                                disabled={notifyRejectedMutation.isPending || skipNotifyMutation.isPending}
                              >
                                <Bell className="w-3.5 h-3.5" />
                                {t.inbox.notifyUser}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl gap-1.5"
                                onClick={(e) => { e.stopPropagation(); skipNotifyMutation.mutate(msg.id); }}
                                disabled={notifyRejectedMutation.isPending || skipNotifyMutation.isPending}
                              >
                                <BellOff className="w-3.5 h-3.5" />
                                {t.inbox.dontNotify}
                              </Button>
                            </div>
                          </div>
                        )}
                        {msg.status === "notified" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <Bell className="w-4 h-4" /> {t.inbox.userNotified}
                          </div>
                        )}
                        {msg.status === "skipped" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <BellOff className="w-4 h-4" /> {t.inbox.userNotNotified}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.message && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{msg.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
