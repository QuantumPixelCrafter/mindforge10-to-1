import { useState, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetLeaderboard, useGetAchievements, useUploadProfilePicture, useUpdateName, useChangePassword, useGetShop, useEquipItem, customFetch } from "@workspace/api-client-react";
import type { ShopItem } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LogOut, Trophy, Brain, Leaf, Sparkles, Star, User, GraduationCap, CheckCircle2, Medal, ShoppingBag, Camera, Pencil, X, Check, Zap, Lock, Eye, EyeOff, Globe, Globe2, Palette, Trash2, AlertTriangle, Search, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getBgStyle, getFrameGradient, getItemDef } from "@/lib/shop-data";
import { getCountry, getGradeName, searchCountries } from "@/lib/countries-grades";
import type { CountryDef } from "@/lib/countries-grades";

const LEVELS = [
  { code: "P1", label: "P1", group: "Primary" },
  { code: "P2", label: "P2", group: "Primary" },
  { code: "P3", label: "P3", group: "Primary" },
  { code: "P4", label: "P4", group: "Primary" },
  { code: "P5", label: "P5", group: "Primary" },
  { code: "P6", label: "P6", group: "Primary" },
  { code: "S1", label: "S1", group: "Secondary" },
  { code: "S2", label: "S2", group: "Secondary" },
  { code: "S3", label: "S3", group: "Secondary" },
  { code: "S4", label: "S4", group: "Secondary" },
  { code: "S5", label: "S5", group: "Secondary" },
  { code: "S6", label: "S6", group: "Secondary" },
  { code: "U1", label: "U1", group: "University" },
  { code: "U2", label: "U2", group: "University" },
  { code: "U3", label: "U3", group: "University" },
  { code: "U4", label: "U4", group: "University" },
];

const LEVEL_GROUPS = [
  { name: "Primary",    color: "text-green-600 dark:text-green-400",  bg: "bg-green-500/10",  selected: "bg-green-500 text-white shadow-green-500/25",   levels: LEVELS.filter(l => l.group === "Primary") },
  { name: "Secondary",  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-500/10",   selected: "bg-blue-500 text-white shadow-blue-500/25",     levels: LEVELS.filter(l => l.group === "Secondary") },
  { name: "University", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", selected: "bg-purple-500 text-white shadow-purple-500/25", levels: LEVELS.filter(l => l.group === "University") },
];

function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height, maxPx);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const sx = (img.width - Math.min(img.width, img.height)) / 2;
        const sy = (img.height - Math.min(img.width, img.height)) / 2;
        const sSize = Math.min(img.width, img.height);
        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const APPEARANCE_TABS = [
  { key: "background" as const, label: "Backdrop", icon: "🖼️" },
  { key: "frame"      as const, label: "Frame",    icon: "⭕" },
  { key: "tag"        as const, label: "Tags",     icon: "🏷️" },
];

export default function ProfilePage() {
  const { user, logout, updateLevel } = useAuth();
  const { data: lb } = useGetLeaderboard();
  const { data: achData } = useGetAchievements();
  const { data: shop } = useGetShop();
  const uploadPicMut = useUploadProfilePicture();
  const updateNameMut = useUpdateName();
  const changePasswordMut = useChangePassword();
  const equipMut = useEquipItem();
  const [savingLevel, setSavingLevel] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState<"background" | "frame" | "tag">("background");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  // Country dialog
  const [showCountryDialog, setShowCountryDialog] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);
  const [togglingDevMode, setTogglingDevMode] = useState(false);
  // Username change
  const [showUsernameChange, setShowUsernameChange] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPoints = achData?.totalPoints ?? 0;
  const earnedCount = achData?.achievements.filter(a => a.earned).length ?? 0;
  const totalCount = achData?.achievements.length ?? 0;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Anonymous";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const equippedBg = shop?.equipped.background ?? user?.equippedBackground ?? null;
  const equippedFrame = shop?.equipped.frame ?? user?.equippedFrame ?? null;
  const equippedNametag = shop?.equipped.nametag ?? user?.equippedNametag ?? null;
  const bgStyle = getBgStyle(equippedBg);
  const frameGrad = getFrameGradient(equippedFrame);
  const nametagDef = getItemDef(equippedNametag);

  const handleEquipItem = (item: ShopItem) => {
    const isEquipped = item.equipped;
    equipMut.mutate({ itemKey: isEquipped ? "" : item.key, slot: item.type }, {
      onSuccess: () => toast({ title: isEquipped ? `Unequipped "${item.name}"` : `Equipped "${item.name}"! ✨` }),
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    });
  };

  const myMemoryBest = lb?.memoryMatch?.filter(e => e.userId === user?.id).sort((a, b) => b.score - a.score)[0];
  const myBubbleBest = lb?.bubblePop?.filter(e => e.userId === user?.id).sort((a, b) => b.score - a.score)[0];
  const myQuizBest = lb?.quiz?.filter(e => e.userId === user?.id).sort((a, b) => b.score - a.score)[0];

  const memoryRank = myMemoryBest ? (lb?.memoryMatch?.findIndex(e => e.userId === user?.id) ?? -1) + 1 : null;
  const bubbleRank = myBubbleBest ? (lb?.bubblePop?.findIndex(e => e.userId === user?.id) ?? -1) + 1 : null;
  const quizRank   = myQuizBest   ? (lb?.quiz?.findIndex(e => e.userId === user?.id) ?? -1) + 1   : null;

  const stats = [
    { label: "Memory Match", icon: Brain,    best: myMemoryBest?.score, rank: memoryRank, bg: "bg-primary/10",  text: "text-primary" },
    { label: "Bubble Pop",   icon: Leaf,     best: myBubbleBest?.score, rank: bubbleRank, bg: "bg-sky-500/10",  text: "text-sky-500" },
    { label: "Quiz",         icon: Sparkles, best: myQuizBest?.score,   rank: quizRank,   bg: "bg-amber-500/10",text: "text-amber-500" },
  ];

  const handleLevelSelect = async (code: string) => {
    if (savingLevel) return;
    const newLevel = user?.level === code ? null : code;
    setSavingLevel(true);
    try {
      await updateLevel(newLevel);
      toast({ title: newLevel ? `Level set to ${newLevel}` : "Level cleared" });
    } catch {
      toast({ title: "Failed to update level", variant: "destructive" });
    } finally {
      setSavingLevel(false);
    }
  };

  const handleStartEditName = () => {
    setNameFirst(user?.firstName ?? "");
    setNameLast(user?.lastName ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const first = nameFirst.trim();
    if (!first) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    try {
      await updateNameMut.mutateAsync({ firstName: first, lastName: nameLast.trim() || undefined });
      toast({ title: "Name updated!" });
      setEditingName(false);
      window.location.reload();
    } catch {
      toast({ title: "Failed to update name", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      await changePasswordMut.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      toast({ title: "Password changed successfully!" });
      setShowChangePw(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      toast({ title: err?.message ?? "Failed to change password", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      await customFetch("/api/auth/account", { method: "DELETE" });
      await logout();
      setLocation("/login");
    } catch (err: any) {
      toast({ title: "Failed to delete account. Please try again.", description: err?.message, variant: "destructive" });
      setIsDeletingAccount(false);
    }
  };

  const handleCountrySave = async (countryCode: string) => {
    setSavingCountry(true);
    try {
      await customFetch("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ country: countryCode }),
      });
      toast({ title: "Country saved!" });
      setShowCountryDialog(false);
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message, variant: "destructive" });
    } finally {
      setSavingCountry(false);
    }
  };

  const handleToggleDevMode = async () => {
    setTogglingDevMode(true);
    try {
      const res = await customFetch<{ devMode: boolean }>("/api/developer/toggle-dev-mode", { method: "POST" });
      toast({ title: res.devMode ? "Developer mode ON" : "Developer mode OFF", description: res.devMode ? "Scores and XP are paused." : "You are now earning scores and XP normally." });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Failed to toggle", description: err?.message, variant: "destructive" });
    } finally {
      setTogglingDevMode(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) return;
    setSavingUsername(true);
    try {
      await customFetch("/api/auth/username", {
        method: "PATCH",
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      toast({ title: "Username updated!", description: "Your friends have been notified." });
      setShowUsernameChange(false);
      setNewUsername("");
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Could not change username", description: err?.message, variant: "destructive" });
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploadingPic(true);
    try {
      const dataUrl = await resizeImage(file, 512);
      await uploadPicMut.mutateAsync(dataUrl);
      toast({ title: "Profile picture updated!" });
      window.location.reload();
    } catch {
      toast({ title: "Failed to upload picture", variant: "destructive" });
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Layout title="My Profile">
      <div className="max-w-2xl mx-auto space-y-6 py-4">

        {/* Avatar Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          {/* Equipped background banner */}
          {equippedBg && (
            <div className="h-28 relative" style={{ background: bgStyle }}>
              <span className="absolute bottom-2 right-3 text-[10px] text-white/60 font-medium">
                {getItemDef(equippedBg)?.name} background
              </span>
            </div>
          )}

          {/* Avatar — overlaps banner */}
          <div className={cn("px-6 mb-3 flex items-end gap-4", equippedBg ? "-mt-10" : "pt-5")}>
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePicChange}
              />
              {frameGrad ? (
                <div className="rounded-2xl p-[3px] shadow-xl" style={{ background: frameGrad }}>
                  <div className="w-20 h-20 rounded-[14px] overflow-hidden bg-card">
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-card shadow-xl overflow-hidden bg-gradient-to-br from-primary to-accent">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                title="Change profile picture"
              >
                {uploadingPic ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Name + details — always below the banner */}
          <div className="px-6 pb-6">
            <div className="mb-5">
              {editingName ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={nameFirst}
                      onChange={e => setNameFirst(e.target.value)}
                      placeholder="First name"
                      className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    />
                    <input
                      value={nameLast}
                      onChange={e => setNameLast(e.target.value)}
                      placeholder="Last name"
                      className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-xl gap-1.5 h-7 px-3 text-xs" onClick={handleSaveName} disabled={updateNameMut.isPending}>
                      <Check className="w-3 h-3" /> Save
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-7 px-3 text-xs" onClick={() => setEditingName(false)}>
                      <X className="w-3 h-3" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center flex-wrap gap-2">
                    <h2 className="text-2xl font-bold leading-tight">{displayName}</h2>
                    <button
                      onClick={handleStartEditName}
                      className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      title="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {nametagDef && (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 text-xs font-bold px-2 py-0.5 rounded-full">
                        {nametagDef.emoji} {nametagDef.name}
                      </span>
                    )}
                  </div>
                  {user?.username && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5" /> @{user.username}
                    </p>
                  )}
                  {user?.level && (
                    <span className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                      <GraduationCap className="w-3 h-3" />
                      {user.level} — {LEVELS.find(l => l.code === user.level)?.group}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setLocation("/shop")} variant="outline" className="rounded-xl gap-2 flex-1 border-border/60">
                <ShoppingBag className="w-4 h-4" /> Shop
              </Button>
              <Button onClick={logout} variant="outline" className="rounded-xl gap-2 flex-1 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Appearance Customization */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/40">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-fuchsia-500" />
            </div>
            <div>
              <h3 className="font-bold text-base">Appearance</h3>
              <p className="text-xs text-muted-foreground">Equip cosmetics from your collection</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/40">
            {APPEARANCE_TABS.map(tab => (
              <button key={tab.key} onClick={() => setAppearanceTab(tab.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors border-b-2",
                  appearanceTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="p-4">
            {(() => {
              if (!shop) {
                return <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>;
              }

              if (appearanceTab === "background") {
                const ownedItems = shop.items.filter(i => i.type === "background" && i.owned);
                if (ownedItems.length === 0) return (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">You don't own any backdrops yet.</p>
                    <button onClick={() => setLocation("/shop")} className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" /> Visit Shop
                    </button>
                  </div>
                );
                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ownedItems.map(item => (
                      <button key={item.key} onClick={() => handleEquipItem(item)} disabled={equipMut.isPending}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all",
                          item.equipped ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "border-transparent hover:border-border"
                        )} style={{ aspectRatio: "16/9" }}>
                        <div className="absolute inset-0" style={{ background: getBgStyle(item.key) }} />
                        {item.equipped && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Check className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5">
                          <p className="text-[9px] font-bold text-white truncate">{item.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              }

              if (appearanceTab === "frame") {
                const ownedItems = shop.items.filter(i => i.type === "frame" && i.owned);
                if (ownedItems.length === 0) return (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">You don't own any frames yet.</p>
                    <button onClick={() => setLocation("/shop")} className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" /> Visit Shop
                    </button>
                  </div>
                );
                return (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {ownedItems.map(item => {
                      const grad = getFrameGradient(item.key);
                      return (
                        <button key={item.key} onClick={() => handleEquipItem(item)} disabled={equipMut.isPending}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                            item.equipped ? "border-primary shadow-lg shadow-primary/20 bg-primary/5" : "border-transparent hover:border-border bg-muted/30"
                          )}>
                          <div className="rounded-xl p-[3px]" style={{ background: grad ?? "transparent" }}>
                            <div className="w-9 h-9 rounded-[10px] bg-card flex items-center justify-center">
                              {item.equipped ? <Check className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>
                          <p className="text-[9px] font-semibold text-center leading-tight">{item.name}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              if (appearanceTab === "tag") {
                const ownedNametags = shop.items.filter(i => i.type === "nametag" && i.owned);
                if (ownedNametags.length === 0) return (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">You don't own any nametags yet.</p>
                    <button onClick={() => setLocation("/shop")} className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">
                      <ShoppingBag className="w-3.5 h-3.5" /> Visit Shop
                    </button>
                  </div>
                );
                return (
                  <div className="flex flex-wrap gap-2">
                    {ownedNametags.map(item => (
                      <button key={item.key} onClick={() => handleEquipItem(item)} disabled={equipMut.isPending}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition-all",
                          item.equipped
                            ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20"
                            : "border-border bg-muted/40 text-foreground hover:border-primary/40"
                        )}>
                        <span>{item.emoji}</span>
                        {item.name}
                        {item.equipped && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </motion.div>

        {/* XP / Game Level */}
        {(() => {
          const LEVEL_THRESHOLDS = [0,50,100,150,200,300,400,500,600,700,800,900,1000,1100,1200,1350,1500,1650,1800,1950,2100,2250,2400,2550,2700,2850,3000,3150,3300,3450,3650,3850,4050,4250,4450,4650,4850,5050,5250,5450,5650,5850,6050,6250,6450,6650,6850,7050,7250,7450,7650,7850,8050,8250,8450,8650,8850,9050,9250,9450,9750,10050,10350,10650,10950,11250,11550,11850,12150,12450,12750,13050,13350,13650,13950,14250,14550,14850,15150,15450,15850,16250,16650,17050,17450,17950,18450,18950,19450,19950,20550,21250,22050,22950,23950,25200,26700,28450,30450,33450];
          const xp = (user as any)?.xp ?? 0;
          const gameLevel = (user as any)?.gameLevel ?? 1;
          const currentThresh = LEVEL_THRESHOLDS[gameLevel - 1] ?? 0;
          const nextThresh = LEVEL_THRESHOLDS[gameLevel] ?? null;
          const xpInLevel = xp - currentThresh;
          const xpNeeded = nextThresh !== null ? nextThresh - currentThresh : 0;
          const progress = nextThresh !== null ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Game Level</p>
                    <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-violet-500">{gameLevel}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Level</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{xpInLevel.toLocaleString()} XP</span>
                  {nextThresh !== null
                    ? <span className="text-muted-foreground">{xpNeeded.toLocaleString()} XP to Lv.{gameLevel + 1}</span>
                    : <span className="text-violet-500 font-bold">Level 100</span>}
                </div>
                <div className="h-2.5 bg-violet-500/15 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Level Picker */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">My Education Level</h3>
              <p className="text-xs text-muted-foreground">Used to tailor AI quizzes and filter leaderboard scores</p>
            </div>
            {user?.level && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-xl shrink-0">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          {user?.level ? (
            /* ── LOCKED: level already set ── */
            <>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15 mb-3">
                <div>
                  <p className="font-semibold">
                    {user.level} — {LEVELS.find(l => l.code === user.level)?.group}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your current education level</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl border border-border/40">
                <Lock className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/70" />
                <span>
                  Your education level is <strong>locked</strong> until the start of the next school year in your country.
                  It will update automatically — no action needed.
                </span>
              </div>
            </>
          ) : (
            /* ── UNLOCKED: first-time setup ── */
            <>
              <div className="space-y-4">
                {LEVEL_GROUPS.map(group => (
                  <div key={group.name}>
                    <p className={cn("text-xs font-bold uppercase tracking-widest mb-2", group.color)}>{group.name}</p>
                    <div className="grid grid-cols-6 gap-2">
                      {group.levels.map(lvl => {
                        const isSelected = user?.level === lvl.code;
                        return (
                          <button key={lvl.code} onClick={() => handleLevelSelect(lvl.code)} disabled={savingLevel}
                            className={cn(
                              "relative py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95",
                              isSelected ? `${group.selected} shadow-lg` : `${group.bg} ${group.color} hover:opacity-80`
                            )}
                          >
                            {lvl.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
                Set your level so your quiz scores appear on the right leaderboard and the AI generates age-appropriate questions.
                Once set, it can only be changed at the start of a new school year.
              </p>
            </>
          )}
        </motion.div>

        {/* Country & Grade Card */}
        {(() => {
          const userCountry = (user as any)?.country as string | null | undefined;
          const userGradeIndex = (user as any)?.gradeIndex as number | null | undefined;
          const countryDef = userCountry ? getCountry(userCountry) : null;
          const gradeName = countryDef && userGradeIndex != null
            ? getGradeName(userCountry!, userGradeIndex)
            : null;

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
              className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Globe2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Country &amp; Grade</h3>
                  <p className="text-xs text-muted-foreground">Used to auto-advance your education level each school year</p>
                </div>
              </div>

              {countryDef ? (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{countryDef.flag}</span>
                    <div>
                      <p className="font-semibold text-sm">{countryDef.name}</p>
                      {gradeName
                        ? <p className="text-xs text-muted-foreground mt-0.5">{gradeName}</p>
                        : <p className="text-xs text-amber-500 mt-0.5">Grade not set</p>
                      }
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => {
                    setCountrySearch(""); setShowCountryDialog(true);
                  }}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No country or grade set.</p>
                  <Button variant="outline" className="rounded-xl" onClick={() => {
                    setCountrySearch(""); setShowCountryDialog(true);
                  }}>
                    <Globe className="w-4 h-4 mr-2" /> Set Country
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* Developer Mode Card — only visible to the developer themselves */}
        {user?.isDeveloper && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className={`rounded-3xl border shadow-sm p-6 ${(user as any).devMode ? "bg-violet-500/10 border-violet-500/30" : "bg-card border-border/60"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${(user as any).devMode ? "bg-violet-500/20" : "bg-muted"}`}>
                <span className="text-lg">🛠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">Developer Grade</h3>
                <p className="text-xs text-muted-foreground">Only you can see this</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${(user as any).devMode ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {(user as any).devMode ? "ON" : "OFF"}
              </span>
            </div>
            <div className="rounded-2xl bg-background/60 border border-border/40 p-4 mb-4 space-y-1.5">
              <p className="text-sm font-semibold">{(user as any).devMode ? "You are in Developer grade" : "You are in your real grade"}</p>
              <p className="text-xs text-muted-foreground">
                {(user as any).devMode
                  ? "Scores and XP are not saved. You won't appear on any leaderboard while this is on."
                  : "Switch to Developer grade to test the game without affecting scores or leaderboards."}
              </p>
            </div>
            <Button
              onClick={handleToggleDevMode}
              disabled={togglingDevMode}
              variant="outline"
              className={`w-full rounded-xl ${(user as any).devMode ? "border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10" : ""}`}
            >
              {togglingDevMode ? "Switching…" : (user as any).devMode ? "Switch to real grade" : "Switch to Developer grade"}
            </Button>
          </motion.div>
        )}

        {/* Achievements + Shop quick links */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => setLocation("/achievements")}
            className="text-left bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-4 hover:from-yellow-500/15 hover:to-amber-500/15 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Medal className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-sm">Achievements</span>
            </div>
            <p className="text-2xl font-black text-yellow-500">{totalPoints.toLocaleString()}<span className="text-xs font-medium text-muted-foreground ml-1">pts</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{earnedCount}/{totalCount} unlocked</p>
            {totalCount > 0 && (
              <div className="mt-2 h-1.5 bg-yellow-500/20 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.round((earnedCount/totalCount)*100)}%` }} />
              </div>
            )}
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            onClick={() => setLocation("/shop")}
            className="text-left bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-2xl p-4 hover:from-rose-500/15 hover:to-pink-500/15 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-rose-500" />
              <span className="font-bold text-sm">Shop</span>
            </div>
            <div className="space-y-1">
              {equippedBg || equippedFrame || equippedNametag ? (
                <>
                  <p className="text-xs text-muted-foreground">Equipped:</p>
                  {equippedBg && <p className="text-[11px] font-medium">🖼️ {getItemDef(equippedBg)?.name}</p>}
                  {equippedFrame && <p className="text-[11px] font-medium">⭕ {getItemDef(equippedFrame)?.name} frame</p>}
                  {equippedNametag && <p className="text-[11px] font-medium">{getItemDef(equippedNametag)?.emoji} {getItemDef(equippedNametag)?.name} tag</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Buy backgrounds, frames & nametags</p>
              )}
            </div>
          </motion.button>
        </div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <h3 className="font-bold text-lg mb-3 px-1">My Best Scores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.06 }}
                className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.text}`} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                {s.best != null ? (
                  <>
                    <p className="text-2xl font-extrabold">{s.best}</p>
                    {s.rank && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        {s.rank === 1 ? "🥇 1st" : s.rank === 2 ? "🥈 2nd" : s.rank === 3 ? "🥉 3rd" : `#${s.rank}`}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No score yet</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4">Account Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2.5 border-b border-border/40">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-24">Display name</span>
              <span className="font-medium">{displayName}</span>
            </div>
            {user?.username && (
              <div className="py-2.5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground w-24 shrink-0">Username</span>
                  <span className="font-medium flex-1">@{user.username}</span>
                  <button
                    onClick={() => { setShowUsernameChange(v => !v); setNewUsername(""); }}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>
                {showUsernameChange && (
                  <div className="mt-3 space-y-2 pl-8">
                    {(() => {
                      const changedAt = (user as any)?.usernameChangedAt;
                      const msSince = changedAt ? Date.now() - new Date(changedAt).getTime() : null;
                      const cooldownMs = 14 * 24 * 60 * 60 * 1000;
                      const daysLeft = msSince !== null && msSince < cooldownMs
                        ? Math.ceil((cooldownMs - msSince) / (24 * 60 * 60 * 1000)) : 0;
                      if (daysLeft > 0) {
                        return (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/20">
                            You can change your username again in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
                          </p>
                        );
                      }
                      return (
                        <>
                          <input
                            type="text"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                            placeholder="new_username"
                            maxLength={30}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-[11px] text-muted-foreground">Letters, numbers, underscores only. 3–30 characters. You can change once every 2 weeks.</p>
                          <div className="flex gap-2">
                            <Button size="sm" className="rounded-xl flex-1" disabled={newUsername.trim().length < 3 || savingUsername} onClick={handleUsernameChange}>
                              {savingUsername ? "Saving…" : "Save Username"}
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setShowUsernameChange(false); setNewUsername(""); }}>Cancel</Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 py-2.5">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-24">Level</span>
              <span className="font-medium">{user?.level ? `${user.level} (${LEVELS.find(l => l.code === user.level)?.group})` : "Not set"}</span>
            </div>
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
          className="bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => {
              setShowChangePw(v => !v);
              setCurrentPw(""); setNewPw(""); setConfirmPw("");
            }}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-base">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
            </div>
            <div className={cn("transition-transform duration-200", showChangePw && "rotate-180")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </button>

          {showChangePw && (
            <div className="px-6 pb-6 space-y-3 border-t border-border/40 pt-4">
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className={cn(
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                    confirmPw && newPw !== confirmPw ? "border-destructive" : "border-border"
                  )}
                  autoComplete="new-password"
                  onKeyDown={e => { if (e.key === "Enter") handleChangePassword(); }}
                />
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleChangePassword}
                  disabled={changePasswordMut.isPending || !currentPw || !newPw || !confirmPw}
                  className="rounded-xl gap-1.5 flex-1"
                >
                  {changePasswordMut.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Update Password
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => { setShowChangePw(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                >
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex gap-3">
          <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-1">Tip: Earn points, customise your profile!</p>
            <p className="text-sm text-muted-foreground">Complete achievements to earn points, then visit the Shop to buy backgrounds, frames, and nametags for your profile.</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="font-semibold text-sm">Danger Zone</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. Your name will be removed from the leaderboard.
            This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white gap-1.5 rounded-xl"
              onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(""); }}
            >
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground font-medium">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full rounded-xl border border-destructive/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40 font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90 text-white rounded-xl gap-1.5 flex-1"
                >
                  {isDeletingAccount ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isDeletingAccount ? "Deleting…" : "Permanently Delete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  disabled={isDeletingAccount}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Country Dialog ──────────────────────────────────────────────── */}
      {showCountryDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCountryDialog(false)}>
          <div className="bg-card rounded-3xl border border-border/60 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border/40 shrink-0">
              <div className="flex-1">
                <h3 className="font-bold text-base">Select Your Country</h3>
              </div>
              <button onClick={() => setShowCountryDialog(false)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Country list */}
            <div className="p-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Search countries…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1">
              {searchCountries(countrySearch).map(c => (
                <button
                  key={c.code}
                  disabled={savingCountry}
                  onClick={() => handleCountrySave(c.code)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left disabled:opacity-50"
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className="font-medium text-sm">{c.name}</span>
                  {savingCountry && <span className="ml-auto text-xs text-muted-foreground">Saving…</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
