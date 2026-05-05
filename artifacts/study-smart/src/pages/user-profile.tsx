import { useState } from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useGetUserProfile, useSendFriendRequest, useRemoveFriend, customFetch } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getBgStyle, getFrameGradient, getItemDef } from "@/lib/shop-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, EyeOff, GraduationCap, UserCheck, UserMinus, UserPlus,
  Zap, Brain, Leaf, Sparkles, Trophy, Medal, Lock, Users, User, MessageCircle, X, Send,
} from "lucide-react";
import { getCountry, getGradeName } from "@/lib/countries-grades";

const LEVEL_GROUP: Record<string, string> = {
  P1:"Primary", P2:"Primary", P3:"Primary", P4:"Primary", P5:"Primary", P6:"Primary",
  S1:"Secondary", S2:"Secondary", S3:"Secondary", S4:"Secondary", S5:"Secondary", S6:"Secondary",
  U1:"University", U2:"University", U3:"University", U4:"University",
};

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId ?? "";
  const { user: me } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading, refetch } = useGetUserProfile(userId);
  const sendReqMut = useSendFriendRequest();
  const removeMut = useRemoveFriend();

  const [showMsgDialog, setShowMsgDialog] = useState(false);
  const [msgText, setMsgText] = useState("");

  const sendStrangerMsg = useMutation({
    mutationFn: (content: string) =>
      customFetch(`/api/chat/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      toast({ title: "Message sent!", description: "They'll see it in their chat." });
      setShowMsgDialog(false);
      setMsgText("");
    },
    onError: (err: Error) => toast({ title: "Could not send message", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Layout title="Profile">
        <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </Layout>
    );
  }
  if (!profile) {
    return <Layout title="Not Found"><div className="text-center py-20 text-muted-foreground">User not found.</div></Layout>;
  }

  const isBot = !!(profile as any).isBot;
  const isMe = !isBot && me?.id === profile.id;
  const fs = profile.friendship;
  const isFriend = fs?.status === "accepted";
  const isPending = fs?.status === "pending";
  // Friends always see the full profile, even if the account is private. Bots follow their own isPublic flag.
  const isPublic = profile.isPublic !== false || isMe || isFriend;

  const bgStyle = getBgStyle(profile.equippedBackground);
  const frameGrad = getFrameGradient(profile.equippedFrame);
  const nametagDef = getItemDef(profile.equippedNametag);

  const handleAddFriend = () => {
    sendReqMut.mutate(profile.id, {
      onSuccess: () => {
        toast({ title: "Friend request sent!", description: "They'll receive a message in their inbox." });
        refetch();
      },
      onError: () => toast({ title: "Could not send request", variant: "destructive" }),
    });
  };

  const handleRemove = () => {
    if (!fs) return;
    removeMut.mutate(fs.id, { onSuccess: () => { toast({ title: "Removed" }); refetch(); } });
  };

  const initials = profile.displayName.slice(0, 2).toUpperCase();

  // Country & grade (public only)
  const countryDef = profile.country ? getCountry(profile.country) : null;
  const gradeName = profile.country && profile.gradeIndex != null
    ? getGradeName(profile.country, profile.gradeIndex) : null;

  // XP/level (public only)
  const lp = profile.levelProgress;

  // Achievements (public only)
  const earnedList = profile.achievements.list.filter(a => a.earned);
  const achieveProgress = profile.achievements.total > 0
    ? Math.round((profile.achievements.earned / profile.achievements.total) * 100) : 0;

  // Best scores (public only)
  const scores = [
    { label: "Memory Match", icon: Brain,    value: profile.scores.memory, bg: "bg-primary/10",   text: "text-primary" },
    { label: "Bubble Pop",   icon: Leaf,     value: profile.scores.bubble, bg: "bg-sky-500/10",   text: "text-sky-500" },
    { label: "Quiz",         icon: Sparkles, value: profile.scores.quiz,   bg: "bg-amber-500/10", text: "text-amber-500" },
  ];

  const eduGroup = profile.level ? LEVEL_GROUP[profile.level] ?? null : null;

  // ── Shared friend action buttons ──────────────────────────────────────────
  const FriendActions = () => (!isMe && !isBot) ? (
    <div className="flex gap-2 flex-wrap">
      {!fs && (
        <Button size="sm" onClick={handleAddFriend} disabled={sendReqMut.isPending} className="rounded-xl gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          {sendReqMut.isPending ? "Sending…" : "Add Friend"}
        </Button>
      )}
      {!isFriend && (
        <Button size="sm" variant="outline" onClick={() => setShowMsgDialog(true)} className="rounded-xl gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> Message
        </Button>
      )}
      {isPending && fs?.iAmRequester && (
        <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5">
          <UserCheck className="w-3.5 h-3.5" /> Request sent
        </Button>
      )}
      {isPending && !fs?.iAmRequester && (
        <Button size="sm" variant="outline" disabled className="rounded-xl gap-1.5">
          <UserCheck className="w-3.5 h-3.5" /> Check your inbox
        </Button>
      )}
      {isFriend && (
        <Button size="sm" variant="outline" onClick={handleRemove}
          className="rounded-xl gap-1.5 text-destructive hover:bg-destructive hover:text-white border-destructive/30">
          <UserMinus className="w-3.5 h-3.5" /> Remove Friend
        </Button>
      )}
    </div>
  ) : null;

  return (
    <Layout title={isPublic ? profile.displayName : (profile.username ?? "Private Profile")}>
      <div className="max-w-2xl mx-auto space-y-5 pb-12 py-4">

        {/* Back */}
        <button onClick={() => history.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* ─── Identity Card (always shown) ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">

          {/* Backdrop — always visible */}
          {bgStyle && (
            <div className="h-28 relative" style={{ background: bgStyle }}>
              <span className="absolute bottom-2 right-3 text-[10px] text-white/60 font-medium">
                {getItemDef(profile.equippedBackground)?.name} background
              </span>
            </div>
          )}

          <div className={cn("px-6 mb-3 flex items-end gap-4", bgStyle ? "-mt-10" : "pt-6")}>
            {/* Avatar + frame — always visible */}
            {frameGrad ? (
              <div className="rounded-2xl p-[3px] shadow-xl shrink-0" style={{ background: frameGrad }}>
                <div className="w-20 h-20 rounded-[14px] overflow-hidden bg-card">
                  {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-card shadow-xl overflow-hidden bg-gradient-to-br from-primary to-accent shrink-0">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 space-y-4">

            {/* ── PRIVATE ACCOUNT ────────────────────────────────────────── */}
            {!isPublic && (
              <>
                {/* Private badge */}
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-muted/60 border border-border/50">
                  <EyeOff className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">This account is private.</p>
                </div>

                {/* Username + nametag — only identifiers shown for private */}
                <div>
                  {(profile.firstName || profile.lastName) && (
                    <h2 className="text-xl font-bold leading-tight mb-0.5">
                      {[profile.firstName, profile.lastName].filter(Boolean).join(" ")}
                    </h2>
                  )}
                  {profile.username && (
                    <p className="text-muted-foreground text-base font-semibold flex items-center gap-1.5">
                      <User className="w-4 h-4" /> @{profile.username}
                    </p>
                  )}
                  {nametagDef && (
                    <span className="mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 text-xs font-bold px-2 py-0.5 rounded-full">
                      {nametagDef.emoji} {nametagDef.name}
                    </span>
                  )}
                  {isBot && (
                    <span className="mt-2 inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      🤖 Bot
                    </span>
                  )}
                </div>

                {/* Friend count + join month */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold">{profile.friendCount}</span>
                    <span className="text-muted-foreground">{profile.friendCount === 1 ? "friend" : "friends"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-sm">
                    <span className="text-muted-foreground text-xs">Joined</span>
                    <span className="font-medium text-xs">
                      {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Add / Remove friend */}
                <FriendActions />
              </>
            )}

            {/* ── PUBLIC ACCOUNT ─────────────────────────────────────────── */}
            {isPublic && (
              <>
                {/* Display name + nametag */}
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-2xl font-bold leading-tight">{profile.displayName}</h2>
                    {nametagDef && (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 text-xs font-bold px-2 py-0.5 rounded-full">
                        {nametagDef.emoji} {nametagDef.name}
                      </span>
                    )}
                    {isBot && (
                      <span className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        🤖 Bot
                      </span>
                    )}
                  </div>
                  {profile.username && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5" /> @{profile.username}
                    </p>
                  )}
                  {/* Level + country badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {profile.level && (
                      <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                        <GraduationCap className="w-3 h-3" />
                        {profile.level}{eduGroup ? ` — ${eduGroup}` : ""}
                      </span>
                    )}
                    {countryDef && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-full">
                        <span>{countryDef.flag}</span>
                        {gradeName ? `${gradeName} · ${countryDef.name}` : countryDef.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Friend count + join month */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold">{profile.friendCount}</span>
                    <span className="text-muted-foreground">{profile.friendCount === 1 ? "friend" : "friends"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-sm">
                    <span className="text-muted-foreground text-xs">Joined</span>
                    <span className="font-medium text-xs">
                      {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Add / Remove friend */}
                <FriendActions />
              </>
            )}
          </div>
        </motion.div>

        {/* ─── Everything below only for PUBLIC accounts ─────────────────────── */}
        {isPublic && (
          <>
            {/* XP / Game Level */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Game Level</p>
                    <p className="text-xs text-muted-foreground">{profile.xp.toLocaleString()} XP total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-violet-500">{lp.level}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Level</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{lp.xpInLevel.toLocaleString()} XP</span>
                  {lp.xpNeeded > 0
                    ? <span className="text-muted-foreground">{lp.xpNeeded.toLocaleString()} XP to Lv.{lp.level + 1}</span>
                    : <span className="text-violet-500 font-bold">Level 100 — Max</span>}
                </div>
                <div className="h-2.5 bg-violet-500/15 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
                    style={{ width: `${lp.progress}%` }} />
                </div>
              </div>
            </motion.div>

            {/* Education Level (read-only) */}
            {profile.level && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Education Level</h3>
                    <p className="text-xs text-muted-foreground">Used to tailor AI quizzes and leaderboard filters</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
                  <div>
                    <p className="font-semibold text-sm">{profile.level} — {eduGroup}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {countryDef ? `Studying in ${countryDef.name}` : "Educational level"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-xl">
                    <Lock className="w-3 h-3 shrink-0" /> Locked
                  </span>
                </div>
              </motion.div>
            )}

            {/* Country & Grade (read-only) */}
            {countryDef && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-base">{countryDef.flag}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Country & Grade</h3>
                    <p className="text-xs text-muted-foreground">Grade auto-advances each school year</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{countryDef.flag}</span>
                    <div>
                      <p className="font-semibold text-sm">{countryDef.name}</p>
                      {gradeName && <p className="text-xs text-muted-foreground">{gradeName}</p>}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-xl">
                    <Lock className="w-3 h-3 shrink-0" /> Auto-updates
                  </span>
                </div>
              </motion.div>
            )}

            {/* Achievements */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
              className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/40">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">Achievements</h3>
                  <p className="text-xs text-muted-foreground">
                    {profile.achievements.earned}/{profile.achievements.total} unlocked ·{" "}
                    <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                      {profile.achievements.totalPoints.toLocaleString()} pts
                    </span>
                  </p>
                </div>
              </div>
              <div className="px-6 py-3 border-b border-border/30">
                <div className="h-2 bg-yellow-500/15 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${achieveProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{achieveProgress}% complete</p>
              </div>
              {earnedList.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-muted-foreground">No achievements unlocked yet.</div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {earnedList.map(a => (
                    <div key={a.key} className="flex items-center gap-3 p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/15">
                      <span className="text-xl shrink-0">{a.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground">{a.points} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Best Scores */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <h3 className="font-bold text-lg mb-3 px-1">Best Scores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {scores.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16 + i * 0.06 }}
                    className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                      <s.icon className={cn("w-5 h-5", s.text)} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                    {s.value != null ? (
                      <p className="text-2xl font-extrabold">{s.value}</p>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">No score yet</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Tip: add as friend */}
            {!isMe && !isFriend && !isPending && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex gap-3 items-start">
                <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Add <span className="font-semibold text-foreground">{profile.displayName}</span> as a friend to chat, challenge scores, and send power-ups!
                </p>
              </motion.div>
            )}
          </>
        )}

      </div>

      {/* Stranger message dialog */}
      {showMsgDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowMsgDialog(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Send a message
              </h3>
              <button onClick={() => setShowMsgDialog(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              You can send up to <span className="font-semibold text-foreground">3 messages</span> to{" "}
              <span className="font-semibold text-foreground">{profile.displayName}</span>.
              Add them as a friend to chat freely.
            </p>
            <Textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Write your message…"
              className="resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMsgDialog(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={() => msgText.trim() && sendStrangerMsg.mutate(msgText.trim())}
                disabled={!msgText.trim() || sendStrangerMsg.isPending}
                className="rounded-xl gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {sendStrangerMsg.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
