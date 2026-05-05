import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetFriends, useSearchUsers, useSendFriendRequest, useAcceptFriendRequest,
  useDeclineFriendRequest, useRemoveFriend, useGetChat, useSendMessage, useGetChatBalance,
  useGetPowerups, useUnreadChatMessages, useDeleteMessageForMe, useDeleteMessageForEveryone,
  useEditMessage, useBlockUser, customFetch,
  type FriendEntry, type FriendUser,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, UserPlus, MessageCircle, Check, X, Trash2,
  ArrowLeft, Send, User, Zap, ChevronRight, Users, Gift, X as XIcon, AlertTriangle, Coins, Settings,
  Paperclip, FileText, Loader2, MoreVertical, Lock, LockOpen, Pencil, Copy, Ban, ImageOff,
} from "lucide-react";
import { getItemDef } from "@/lib/shop-data";
import { useLanguage } from "@/lib/language-context";

// ── Media Lightbox ────────────────────────────────────────────────────────────
// ── AuthMedia: fetches media with auth headers, renders via blob URL ──────────
function AuthMedia({
  src,
  type,
  className,
  onBlobReady,
  onClick,
}: {
  src: string;
  type: "image" | "video";
  className?: string;
  onBlobReady?: (blobUrl: string) => void;
  onClick?: (blobUrl: string) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onBlobReadyRef = useRef(onBlobReady);
  useEffect(() => { onBlobReadyRef.current = onBlobReady; }, [onBlobReady]);

  useEffect(() => {
    let revokeUrl: string | null = null;
    let cancelled = false;
    customFetch<Blob>(src, { responseType: "blob" })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revokeUrl = url;
        setBlobUrl(url);
        onBlobReadyRef.current?.(url);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [src]);

  if (failed) return (
    <div className={cn("flex items-center justify-center bg-muted/40 rounded-xl min-w-[80px] min-h-[60px]", className)}>
      <ImageOff className="w-6 h-6 text-muted-foreground/40" />
    </div>
  );

  if (!blobUrl) return (
    <div className={cn("animate-pulse bg-muted/60 rounded-xl min-w-[80px] min-h-[60px]", className)} />
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (blobUrl && onClick) onClick(blobUrl);
  };

  if (type === "video") {
    return onClick
      ? <button className="block" onClick={handleClick}><video src={blobUrl} className={className} /></button>
      : <video src={blobUrl} className={className} />;
  }
  return onClick
    ? <button className="block" onClick={handleClick}><img src={blobUrl} alt="media" className={className} /></button>
    : <img src={blobUrl} alt="media" className={className} />;
}

function MediaLightbox({ src, mediaType, onClose }: { src: string; mediaType: "image" | "video"; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(5, Math.max(1, prev - e.deltaY * 0.005)));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist.current !== null) {
        setScale(prev => Math.min(5, Math.max(1, prev * (dist / lastTouchDist.current!))));
      }
      lastTouchDist.current = dist;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-[201] transition-colors"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <p className="absolute bottom-4 text-white/40 text-xs">Scroll to zoom • Tap outside to close</p>
      {mediaType === "video" ? (
        <video
          src={src}
          controls
          autoPlay
          className="max-w-[92vw] max-h-[88vh] rounded-xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <div
          className="overflow-hidden flex items-center justify-center select-none"
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => { lastTouchDist.current = null; }}
          onClick={e => e.stopPropagation()}
          style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
        >
          <img
            src={src}
            alt="media"
            style={{ transform: `scale(${scale})`, transition: scale === 1 ? "transform 0.2s ease" : "none" }}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

const GIFTABLE_POWERUPS = [
  { key: "streak_freeze", name: "Streak Freeze", emoji: "🧊", price: 2000, cooldownDays: 4 },
  { key: "double_points", name: "Double Points Boost", emoji: "⚡", price: 1500, cooldownDays: 3 },
  { key: "hint_token", name: "Hint Token", emoji: "💡", price: 500, cooldownDays: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadChatLocks(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem("mf_chat_locks") ?? "{}"); } catch { return {}; }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = "md" }: { user: { profileImageUrl?: string | null; displayName: string }; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-9 h-9 text-xs" : size === "md" ? "w-11 h-11 text-sm" : "w-14 h-14 text-base";
  const initials = user.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (user.profileImageUrl)
    return <img src={user.profileImageUrl} alt={user.displayName} className={cn("rounded-xl object-cover shrink-0", dim)} />;
  return (
    <div className={cn("rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shrink-0", dim)}>
      {initials}
    </div>
  );
}

// ── LevelBadge ────────────────────────────────────────────────────────────────
function LevelBadge({ gameLevel }: { gameLevel: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
      <Zap className="w-2.5 h-2.5" /> Lv.{gameLevel}
    </span>
  );
}

// ── PinKeypad ─────────────────────────────────────────────────────────────────
function PinKeypad({
  title, subtitle, error, onComplete, onCancel,
}: {
  title: string;
  subtitle?: string;
  error?: string;
  onComplete: (pin: string) => void;
  onCancel: () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  const addDigit = (d: string) => {
    setDigits(prev => {
      if (prev.length >= 6) return prev;
      const next = [...prev, d];
      if (next.length === 6) setTimeout(() => onComplete(next.join("")), 80);
      return next;
    });
  };

  const removeDigit = () => setDigits(prev => prev.slice(0, -1));

  useEffect(() => { setDigits([]); }, [error]);

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-3xl p-6 w-full max-w-xs space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-1">
          <div className="text-4xl mb-1">🔒</div>
          <h3 className="font-extrabold text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* dots */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(
              "w-3.5 h-3.5 rounded-full border-2 transition-all duration-150",
              i < digits.length
                ? "bg-primary border-primary scale-110"
                : "bg-transparent border-muted-foreground/30"
            )} />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive font-semibold animate-pulse">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map((key, idx) => {
            if (key === "") return <div key={idx} />;
            const isBackspace = key === "⌫";
            return (
              <button
                key={key}
                onClick={() => isBackspace ? removeDigit() : addDigit(key)}
                className={cn(
                  "h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 select-none",
                  isBackspace
                    ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "bg-muted/60 hover:bg-primary/10 hover:text-primary active:bg-primary/20"
                )}
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── GiftModal ─────────────────────────────────────────────────────────────────
function GiftModal({
  friend, onClose, onGift, isGifting,
}: {
  friend: { id: string; displayName: string; profileImageUrl?: string | null };
  onClose: () => void;
  onGift: (type: string) => void;
  isGifting: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: powerupsData } = useGetPowerups();
  const { t } = useLanguage();
  const balance = powerupsData?.balance ?? 0;
  const selectedDef = GIFTABLE_POWERUPS.find(p => p.key === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar user={friend} size="sm" />
            <div>
              <p className="font-bold text-sm">{t.friends.giftTo.replace("{name}", friend.displayName)}</p>
              <p className="text-xs text-muted-foreground">{t.friends.yourBalance}: <span className="font-semibold text-amber-500">{balance.toLocaleString()} {t.friends.pts}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {GIFTABLE_POWERUPS.map(p => {
            const canAfford = balance >= p.price;
            const isSel = selected === p.key;
            return (
              <button key={p.key} onClick={() => canAfford && setSelected(isSel ? null : p.key)} disabled={!canAfford}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                  isSel ? "bg-emerald-500/10 border-emerald-500/30"
                    : canAfford ? "bg-muted/40 border-border hover:bg-muted/80"
                    : "opacity-40 cursor-not-allowed bg-muted/20 border-border/40"
                )}>
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{t.friends.cooldownDays.replace("{n}", String(p.cooldownDays))}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-amber-500">{p.price.toLocaleString()} pts</p>
                  {!canAfford && <p className="text-[10px] text-destructive font-medium">{t.friends.notEnough}</p>}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDef && (
          <div className="p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground">
            {t.friends.giftCooldownMsg.replace("{n}", String(selectedDef.cooldownDays))}
          </div>
        )}

        <Button
          className="w-full rounded-2xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!selected || isGifting}
          onClick={() => selected && onGift(selected)}
        >
          <Gift className="w-4 h-4" />
          {isGifting ? t.friends.gifting : selected
            ? `${t.friends.sendGift} ${GIFTABLE_POWERUPS.find(p => p.key === selected)?.emoji} ${GIFTABLE_POWERUPS.find(p => p.key === selected)?.name}`
            : t.friends.selectPowerup}
        </Button>
      </div>
    </div>
  );
}

// ── FriendListItem ─────────────────────────────────────────────────────────────
function FriendListItem({
  entry, selected, onSelect, onAccept, onDecline, onRemove, myId, onViewProfile, onGift, onLockChat, onBlock, isLocked, unreadCount,
}: {
  entry: FriendEntry;
  selected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRemove: () => void;
  myId: string;
  onViewProfile: () => void;
  onGift?: () => void;
  onLockChat?: () => void;
  onBlock?: () => void;
  isLocked?: boolean;
  unreadCount?: number;
}) {
  const u = entry.user;
  if (!u) return null;
  const { t } = useLanguage();
  const nametag = getItemDef(u.equippedNametag);
  const isPending = entry.status === "pending";
  const isIncoming = isPending && !entry.iAmRequester;
  const isOutgoing = isPending && entry.iAmRequester;
  const isAccepted = entry.status === "accepted";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group border",
      selected ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50 border-transparent"
    )}>
      <div onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative shrink-0">
          <Avatar user={u} size="md" />
          {!!unreadCount && !selected && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm border-2 border-card leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
              className="font-semibold text-sm truncate hover:underline hover:text-primary transition-colors text-left"
            >{u.displayName}</button>
            {nametag && <span className="text-sm">{nametag.emoji}</span>}
            {isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <LevelBadge gameLevel={u.gameLevel} />
            {isIncoming && <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full">{t.friends.incoming}</span>}
            {isOutgoing && <span className="text-[10px] text-muted-foreground font-medium">{t.friends.pendingDots}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isIncoming && (
          <>
            <button onClick={onAccept} className="w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={onDecline} className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
          </>
        )}
        {isAccepted && (
          <>
            <button onClick={onSelect} className="w-7 h-7 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors" title="Open chat">
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            {onGift && (
              <button onClick={(e) => { e.stopPropagation(); onGift(); }} className="w-7 h-7 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="Gift a power-up">
                <Gift className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* 3-dots menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-7 h-7 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-card border border-border rounded-2xl shadow-xl overflow-hidden py-1">
              {/* Profile */}
              <button
                onClick={() => { setMenuOpen(false); onViewProfile(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
              >
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Profile
              </button>

              {/* Lock Chat — only for accepted friends */}
              {isAccepted && onLockChat && (
                <button
                  onClick={() => { setMenuOpen(false); onLockChat(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                >
                  {isLocked
                    ? <LockOpen className="w-3.5 h-3.5 text-amber-500" />
                    : <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                  {isLocked ? "Unlock Chat" : "Lock Chat"}
                </button>
              )}

              {/* Divider */}
              {!isIncoming && <div className="border-t border-border/50 my-1" />}

              {/* Delete Friend */}
              {!isIncoming && (
                <button
                  onClick={() => { setMenuOpen(false); onRemove(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isAccepted ? "Delete Friend" : "Cancel Request"}
                </button>
              )}

              {/* Block */}
              {isAccepted && onBlock && (
                <button
                  onClick={() => { setMenuOpen(false); onBlock(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Block this user
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LockModal state type ──────────────────────────────────────────────────────
type LockModal =
  | { mode: "setup-1"; friendId: string; error?: string }
  | { mode: "setup-2"; friendId: string; firstPin: string; error?: string }
  | { mode: "unlock-to-open"; friendId: string; onSuccess: () => void; error?: string }
  | { mode: "unlock-to-remove"; friendId: string; error?: string };

// ── FriendsPage ───────────────────────────────────────────────────────────────
export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [searchQ, setSearchQ] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [giftFriend, setGiftFriend] = useState<{ id: string; displayName: string; profileImageUrl?: string | null } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMedia, setPendingMedia] = useState<{
    mediaUrl: string;
    preview: string | null;
    name: string;
    mediaType: "image" | "video" | "file";
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "image" | "video" } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number; isMe: boolean; hasText: boolean; deletedForEveryone: boolean } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Lock chat state
  const [chatLocks, setChatLocks] = useState<Record<string, string>>(loadChatLocks);
  const [lockModal, setLockModal] = useState<LockModal | null>(null);

  const saveLock = (friendId: string, pin: string) => {
    const next = { ...chatLocks, [friendId]: pin };
    setChatLocks(next);
    localStorage.setItem("mf_chat_locks", JSON.stringify(next));
  };

  const removeLock = (friendId: string) => {
    const next = { ...chatLocks };
    delete next[friendId];
    setChatLocks(next);
    localStorage.setItem("mf_chat_locks", JSON.stringify(next));
  };

  // Open chat — intercept with lock if needed
  const handleOpenChat = (friendId: string) => {
    const open = () => {
      setSelectedFriendId(prev => prev === friendId ? null : friendId);
      // backend marks messages as read on GET /chat/:id; invalidate unread count
      qc.invalidateQueries({ queryKey: ["chat-unread-messages"] });
    };
    if (chatLocks[friendId]) {
      setLockModal({
        mode: "unlock-to-open",
        friendId,
        onSuccess: () => { setSelectedFriendId(friendId); qc.invalidateQueries({ queryKey: ["chat-unread-messages"] }); },
      });
    } else {
      open();
    }
  };

  // Lock Chat menu item handler
  const handleLockChat = (friendId: string) => {
    if (chatLocks[friendId]) {
      setLockModal({ mode: "unlock-to-remove", friendId });
    } else {
      setLockModal({ mode: "setup-1", friendId });
    }
  };

  // PinKeypad submit handler
  const handlePinSubmit = (pin: string) => {
    if (!lockModal) return;

    if (lockModal.mode === "setup-1") {
      setLockModal({ mode: "setup-2", friendId: lockModal.friendId, firstPin: pin });
    } else if (lockModal.mode === "setup-2") {
      if (pin === lockModal.firstPin) {
        saveLock(lockModal.friendId, pin);
        setLockModal(null);
        toast({ title: "🔒 Chat locked", description: "Passcode set successfully." });
      } else {
        setLockModal({ ...lockModal, error: "Passcodes don't match — try again" });
      }
    } else if (lockModal.mode === "unlock-to-open") {
      if (pin === chatLocks[lockModal.friendId]) {
        lockModal.onSuccess();
        setLockModal(null);
      } else {
        setLockModal({ ...lockModal, error: "Incorrect passcode" });
      }
    } else if (lockModal.mode === "unlock-to-remove") {
      if (pin === chatLocks[lockModal.friendId]) {
        removeLock(lockModal.friendId);
        setLockModal(null);
        toast({ title: "🔓 Chat unlocked" });
      } else {
        setLockModal({ ...lockModal, error: "Incorrect passcode" });
      }
    }
  };

  const lockModalTitle = lockModal
    ? lockModal.mode === "setup-1" ? "Set a Passcode"
    : lockModal.mode === "setup-2" ? "Confirm Passcode"
    : lockModal.mode === "unlock-to-open" ? "Enter Passcode"
    : "Enter Passcode to Unlock"
    : "";

  const lockModalSubtitle = lockModal
    ? lockModal.mode === "setup-1" ? "Enter a 6-digit passcode for this chat"
    : lockModal.mode === "setup-2" ? "Re-enter the same passcode to confirm"
    : lockModal.mode === "unlock-to-open" ? "This chat is locked — enter your passcode to open it"
    : "Enter your current passcode to remove the lock"
    : "";

  const { data: unreadData } = useUnreadChatMessages(true);
  const unreadByFriend: Record<string, number> = {};
  for (const msg of unreadData?.messages ?? []) {
    unreadByFriend[msg.senderId] = (unreadByFriend[msg.senderId] ?? 0) + 1;
  }

  const { data: friends = [], isLoading: friendsLoading } = useGetFriends();
  const { data: searchResults = [], isLoading: searching } = useSearchUsers(searchQ);
  const sendReqMut = useSendFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const declineMut = useDeclineFriendRequest();
  const removeMut = useRemoveFriend();
  const blockMut = useBlockUser();
  const sendMsgMut = useSendMessage();
  const deleteForMeMut = useDeleteMessageForMe();
  const deleteForEveryoneMut = useDeleteMessageForEveryone();
  const editMsgMut = useEditMessage();

  const handleDeleteForMe = (msgId: number) => {
    if (!selectedFriendId) return;
    deleteForMeMut.mutate({ msgId, chatUserId: selectedFriendId }, {
      onError: (err: Error) => toast({ title: "Couldn't delete", description: err.message, variant: "destructive" }),
    });
    setContextMenu(null);
  };

  const handleDeleteForEveryone = (msgId: number) => {
    if (!selectedFriendId) return;
    deleteForEveryoneMut.mutate({ msgId, chatUserId: selectedFriendId }, {
      onError: (err: Error) => toast({ title: "Couldn't delete", description: err.message, variant: "destructive" }),
    });
    setContextMenu(null);
  };

  const handleStartEdit = (msgId: number, currentContent: string) => {
    setEditingMsgId(msgId);
    setEditingContent(currentContent);
    setContextMenu(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleEditSubmit = () => {
    if (!editingMsgId || !selectedFriendId || !editingContent.trim()) return;
    editMsgMut.mutate({ msgId: editingMsgId, content: editingContent, chatUserId: selectedFriendId }, {
      onSuccess: () => { setEditingMsgId(null); setEditingContent(""); },
      onError: (err: Error) => toast({ title: "Couldn't edit", description: err.message, variant: "destructive" }),
    });
  };

  const openContextMenu = (e: { clientX: number; clientY: number }, msgId: number, isMe: boolean, hasText: boolean, deletedForEveryone: boolean) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 180;
    const menuH = 160;
    const x = Math.min(e.clientX, vw - menuW - 8);
    const y = Math.min(e.clientY, vh - menuH - 8);
    setContextMenu({ msgId, x, y, isMe, hasText, deletedForEveryone });
  };

  const giftMut = useMutation({
    mutationFn: ({ recipientId, type }: { recipientId: string; type: string }) =>
      customFetch<{ success: boolean; cooldownDays: number; cooldownEndsAt: string }>("/api/powerups/gift", {
        method: "POST",
        body: JSON.stringify({ recipientId, type }),
      }),
    onSuccess: (res, vars) => {
      const def = GIFTABLE_POWERUPS.find(p => p.key === vars.type);
      toast({
        title: `${def?.emoji} Gift sent!`,
        description: `You can send another gift in ${res.cooldownDays} day${res.cooldownDays !== 1 ? "s" : ""}.`,
      });
      setGiftFriend(null);
      qc.invalidateQueries({ queryKey: ["powerups"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't send gift", description: err.message, variant: "destructive" });
    },
  });

  const selectedEntry = friends.find(f => f.user?.id === selectedFriendId && f.status === "accepted");
  const { data: messages = [] } = useGetChat(selectedFriendId ?? "", !!selectedFriendId && !!selectedEntry);
  const { data: chatBalance } = useGetChatBalance(!!selectedFriendId && !!selectedEntry);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const acceptedFriends = friends.filter(f => f.status === "accepted");
  const pending = friends.filter(f => f.status === "pending");

  const handleSendRequest = (u: FriendUser) => {
    if (u.friendshipStatus) return;
    sendReqMut.mutate(u.id, {
      onSuccess: () => toast({ title: `Friend request sent to ${u.displayName}!` }),
      onError: () => toast({ title: "Could not send request", variant: "destructive" }),
    });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() && !pendingMedia) return;
    if (!selectedFriendId) return;
    const balance = chatBalance?.balance ?? null;
    const cost = chatBalance?.messageCost ?? 5;
    if (balance !== null && balance < cost) {
      toast({ title: "Not enough points", description: `Sending a message costs ${cost} pts. You have ${balance} pts.`, variant: "destructive" });
      return;
    }
    const mediaUrl = pendingMedia ? pendingMedia.mediaUrl : undefined;
    sendMsgMut.mutate({ userId: selectedFriendId, content: messageText, mediaUrl }, {
      onSuccess: () => { setMessageText(""); setPendingMedia(null); },
      onError: (err: Error) => toast({ title: "Message not sent", description: err.message, variant: "destructive" }),
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 8 MB.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await customFetch<{ id: string; mediaUrl: string }>(
        "/api/attachments",
        { method: "POST", body: formData }
      );
      const mediaType: "image" | "video" | "file" = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
      const preview = mediaType !== "file" ? URL.createObjectURL(file) : null;
      setPendingMedia({ mediaUrl: result.mediaUrl, preview, name: file.name, mediaType });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const selectedFriendUser = selectedEntry?.user;

  return (
    <Layout title={t.nav.friends}>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[500px]">

          {/* Left panel */}
          <div className={cn(
            "flex flex-col gap-3 transition-all",
            selectedFriendId ? "hidden md:flex md:w-72 lg:w-80 shrink-0" : "flex w-full"
          )}>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={t.friends.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Search results */}
            {searchQ.length >= 2 && (
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
                <p className="text-xs font-bold text-muted-foreground px-3 pt-3 pb-1.5 uppercase tracking-wide">{t.friends.searchResults}</p>
                {searching && <div className="px-3 py-4 text-sm text-muted-foreground">{t.friends.searching}</div>}
                {!searching && searchResults.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">{t.friends.noUsersFound}</div>}
                <div className="divide-y divide-border/30">
                  {searchResults.map(u => {
                    const nametag = getItemDef(u.equippedNametag);
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Avatar user={u} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setLocation(`/users/${u.id}`)} className="font-semibold text-sm truncate hover:underline hover:text-primary transition-colors text-left">{u.displayName}</button>
                            {nametag && <span>{nametag.emoji}</span>}
                          </div>
                          <LevelBadge gameLevel={u.gameLevel} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setLocation(`/users/${u.id}`)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">{t.friends.view}</button>
                          {!u.friendshipStatus ? (
                            <button onClick={() => handleSendRequest(u)} disabled={sendReqMut.isPending} className="flex items-center gap-1 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:bg-primary/90 transition-colors">
                              <UserPlus className="w-3 h-3" /> {t.friends.add}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded-lg bg-muted">
                              {u.friendshipStatus === "accepted" ? t.friends.friends : t.friends.pending}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <div className="bg-card border border-amber-500/20 rounded-2xl overflow-hidden">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 px-3 pt-3 pb-1.5 uppercase tracking-wide">{t.friends.pending} ({pending.length})</p>
                <div className="space-y-0.5 px-2 pb-2">
                  {pending.map(entry => (
                    <FriendListItem key={entry.friendshipId} entry={entry} selected={false}
                      onSelect={() => {}} myId={user?.id ?? ""}
                      onAccept={() => acceptMut.mutate(entry.friendshipId)}
                      onDecline={() => declineMut.mutate(entry.friendshipId)}
                      onRemove={() => removeMut.mutate(entry.friendshipId)}
                      onViewProfile={() => entry.user && setLocation(`/users/${entry.user.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
              <p className="text-xs font-bold text-muted-foreground px-3 pt-3 pb-1.5 uppercase tracking-wide shrink-0">
                {t.friends.friends} ({acceptedFriends.length})
              </p>
              {friendsLoading && <div className="px-3 py-4 text-sm text-muted-foreground">Loading…</div>}
              {!friendsLoading && acceptedFriends.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t.friends.noFriends}</p>
                </div>
              )}
              <div className="space-y-0.5 px-2 pb-2 overflow-y-auto flex-1">
                {acceptedFriends.map(entry => (
                  <FriendListItem key={entry.friendshipId} entry={entry}
                    selected={selectedFriendId === entry.user?.id}
                    onSelect={() => entry.user && handleOpenChat(entry.user.id)}
                    myId={user?.id ?? ""}
                    onAccept={() => {}}
                    onDecline={() => {}}
                    onRemove={() => removeMut.mutate(entry.friendshipId, { onSuccess: () => setSelectedFriendId(null) })}
                    onViewProfile={() => entry.user && setLocation(`/users/${entry.user.id}`)}
                    onGift={() => entry.user && setGiftFriend({ id: entry.user.id, displayName: entry.user.displayName, profileImageUrl: entry.user.profileImageUrl })}
                    onLockChat={() => entry.user && handleLockChat(entry.user.id)}
                    onBlock={() => entry.user && blockMut.mutate(entry.user.id, {
                      onSuccess: () => { toast({ title: "User blocked" }); setSelectedFriendId(null); },
                      onError: (err: Error) => toast({ title: "Could not block user", description: err.message, variant: "destructive" }),
                    })}
                    isLocked={!!entry.user && !!chatLocks[entry.user.id]}
                    unreadCount={entry.user ? (unreadByFriend[entry.user.id] ?? 0) : 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: chat */}
          {selectedFriendId && selectedFriendUser && (
            <div className="flex flex-col flex-1 min-w-0 bg-card border border-border/60 rounded-2xl overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
                <button onClick={() => setSelectedFriendId(null)} className="md:hidden w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar user={selectedFriendUser} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setLocation(`/users/${selectedFriendUser.id}`)} className="font-bold text-sm truncate hover:underline hover:text-primary transition-colors text-left">{selectedFriendUser.displayName}</button>
                    {chatLocks[selectedFriendUser.id] && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <LevelBadge gameLevel={selectedFriendUser.gameLevel} />
                </div>
                <button
                  onClick={() => setGiftFriend({ id: selectedFriendUser.id, displayName: selectedFriendUser.displayName, profileImageUrl: selectedFriendUser.profileImageUrl })}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                >
                  <Gift className="w-3.5 h-3.5" /> {t.friends.gift}
                </button>
                <button onClick={() => setLocation(`/users/${selectedFriendUser.id}`)} className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  {t.friends.profile} <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => setContextMenu(null)}>
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    {t.friends.startChat}
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.senderId === user?.id;
                  const hasMedia = !!msg.mediaUrl;
                  const isImage = hasMedia && (msg.mediaUrl!.includes("?t=image") || /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(msg.mediaUrl!));
                  const isVideo = hasMedia && (msg.mediaUrl!.includes("?t=video") || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(msg.mediaUrl!));
                  const isEditing = editingMsgId === msg.id;
                  const isDeleted = msg.deletedForEveryone;

                  const triggerContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
                    if (isDeleted) return;
                    const pt = "touches" in e ? { clientX: (e as React.TouchEvent).touches[0]?.clientX ?? 0, clientY: (e as React.TouchEvent).touches[0]?.clientY ?? 0 } : e as React.MouseEvent;
                    openContextMenu(pt, msg.id, isMe, !!msg.content, isDeleted);
                  };

                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden select-none",
                          isDeleted ? "px-4 py-2.5 opacity-60" : hasMedia && !msg.content ? "p-0" : "px-4 py-2.5",
                          isMe
                            ? isDeleted ? "bg-primary/40 text-primary-foreground/70 rounded-br-md" : "bg-primary text-primary-foreground rounded-br-md"
                            : isDeleted ? "bg-muted/60 text-muted-foreground rounded-bl-md" : "bg-muted text-foreground rounded-bl-md"
                        )}
                        onContextMenu={e => { e.preventDefault(); triggerContextMenu(e); }}
                        onTouchStart={e => {
                          longPressTimer.current = setTimeout(() => triggerContextMenu(e), 500);
                        }}
                        onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                        onTouchMove={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                      >
                        {isDeleted ? (
                          <p className="italic flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5 shrink-0" /> This message was deleted
                          </p>
                        ) : isEditing ? (
                          <div className="flex gap-1.5 items-center" onClick={e => e.stopPropagation()}>
                            <input
                              ref={editInputRef}
                              value={editingContent}
                              onChange={e => setEditingContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleEditSubmit();
                                if (e.key === "Escape") { setEditingMsgId(null); setEditingContent(""); }
                              }}
                              className="flex-1 bg-transparent border-b border-current/40 outline-none text-sm min-w-0"
                              maxLength={2000}
                            />
                            <button onClick={handleEditSubmit} disabled={editMsgMut.isPending} className="shrink-0 opacity-80 hover:opacity-100">
                              {editMsgMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button onClick={() => { setEditingMsgId(null); setEditingContent(""); }} className="shrink-0 opacity-60 hover:opacity-100">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {hasMedia && (
                              <div className={msg.content ? "mb-2" : ""}>
                                {isVideo ? (
                                  <AuthMedia
                                    src={msg.mediaUrl!}
                                    type="video"
                                    className="max-w-[260px] max-h-[200px] rounded-xl pointer-events-none"
                                    onClick={(blobUrl) => setLightbox({ src: blobUrl, mediaType: "video" })}
                                  />
                                ) : isImage ? (
                                  <AuthMedia
                                    src={msg.mediaUrl!}
                                    type="image"
                                    className="max-w-[260px] max-h-[200px] rounded-xl object-cover"
                                    onClick={(blobUrl) => setLightbox({ src: blobUrl, mediaType: "image" })}
                                  />
                                ) : (
                                  <a href={msg.mediaUrl!} target="_blank" rel="noopener noreferrer"
                                    className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium underline", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                    <FileText className="w-4 h-4 shrink-0" />
                                    Attachment
                                  </a>
                                )}
                              </div>
                            )}
                            {msg.content && <p className={hasMedia ? "px-4 pb-2.5" : ""}>{msg.content}</p>}
                          </>
                        )}
                        {!isDeleted && !isEditing && (
                          <p className={cn("text-[10px] mt-1 opacity-60 flex items-center gap-1", isMe ? "justify-end" : "justify-start", hasMedia && !msg.content ? "px-4 pb-2" : "")}>
                            {msg.editedAt && <span className="italic">edited</span>}
                            {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Low balance warning */}
              {chatBalance && chatBalance.threshold !== null && chatBalance.balance <= chatBalance.threshold && (
                <div className="mx-3 mb-0 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t.friends.lowBalance} — <span className="font-bold">{chatBalance.balance} {t.friends.pts}</span> {t.friends.remaining}
                    {chatBalance.balance < chatBalance.messageCost && ` (${t.friends.notEnoughSend})`}
                  </span>
                  <a href="/preferences" className="ml-auto flex items-center gap-1 text-amber-500 hover:text-amber-600 transition-colors shrink-0">
                    <Settings className="w-3 h-3" /> Settings
                  </a>
                </div>
              )}

              {/* Message input */}
              <div className="flex flex-col gap-1 p-3 border-t border-border/40 shrink-0">
                {pendingMedia && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <div className="relative flex-1 max-w-[200px]">
                      {pendingMedia.mediaType === "image" && pendingMedia.preview ? (
                        <img src={pendingMedia.preview} alt="preview" className="h-16 w-auto rounded-xl object-cover border border-border" />
                      ) : pendingMedia.mediaType === "video" && pendingMedia.preview ? (
                        <video src={pendingMedia.preview} className="h-16 w-auto rounded-xl border border-border" />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-medium text-muted-foreground">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[120px]">{pendingMedia.name}</span>
                        </div>
                      )}
                      <button onClick={() => setPendingMedia(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || (chatBalance !== undefined && chatBalance.balance < (chatBalance.messageCost ?? 10))}
                    className="w-10 h-10 shrink-0 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Attach file"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t.friends.messagePlaceholder}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={2000}
                    disabled={chatBalance !== undefined && chatBalance.balance < (chatBalance.messageCost ?? 10)}
                  />
                  <Button size="icon" onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !pendingMedia) || isUploading || sendMsgMut.isPending || (chatBalance !== undefined && chatBalance.balance < (chatBalance.messageCost ?? 10))}
                    className="rounded-xl w-10 h-10 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 px-1">
                  <Coins className="w-3 h-3" />
                  <span>{t.friends.msgCosts.replace("{n}", String(chatBalance?.messageCost ?? 5))}</span>
                  {chatBalance !== undefined && (
                    <span className="ml-auto font-medium text-muted-foreground">{chatBalance.balance} {t.friends.pts} {t.friends.remaining}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right panel placeholder */}
          {!selectedFriendId && acceptedFriends.length > 0 && (
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground/40 flex-col gap-3">
              <MessageCircle className="w-12 h-12" />
              <p className="text-sm">{t.friends.selectFriend}</p>
            </div>
          )}
        </div>
      </div>

      {/* Media lightbox */}
      {lightbox && (
        <MediaLightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[150] bg-card border border-border shadow-xl rounded-2xl py-1 min-w-[160px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.hasText && (
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-3 transition-colors"
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.msgId);
                if (msg?.content) navigator.clipboard.writeText(msg.content).catch(() => {});
                setContextMenu(null);
              }}
            >
              <Copy className="w-4 h-4 text-muted-foreground" /> Copy text
            </button>
          )}
          {contextMenu.isMe && contextMenu.hasText && !contextMenu.deletedForEveryone && (
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-3 transition-colors"
              onClick={() => {
                const msg = messages.find(m => m.id === contextMenu.msgId);
                if (msg) handleStartEdit(msg.id, msg.content);
              }}
            >
              <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
            </button>
          )}
          {!contextMenu.deletedForEveryone && (
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-3 transition-colors text-destructive"
              onClick={() => handleDeleteForMe(contextMenu.msgId)}
            >
              <Trash2 className="w-4 h-4" /> Delete for me
            </button>
          )}
          {contextMenu.isMe && !contextMenu.deletedForEveryone && (
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-3 transition-colors text-destructive font-semibold"
              onClick={() => handleDeleteForEveryone(contextMenu.msgId)}
            >
              <Ban className="w-4 h-4" /> Delete for everyone
            </button>
          )}
        </div>
      )}
      {/* Click-away to close context menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-[140]" onClick={() => setContextMenu(null)} />
      )}

      {/* Gift modal */}
      {giftFriend && (
        <GiftModal
          friend={giftFriend}
          onClose={() => setGiftFriend(null)}
          onGift={(type) => giftMut.mutate({ recipientId: giftFriend.id, type })}
          isGifting={giftMut.isPending}
        />
      )}

      {/* Lock / unlock keypad */}
      {lockModal && (
        <PinKeypad
          key={`${lockModal.mode}-${lockModal.error ?? ""}`}
          title={lockModalTitle}
          subtitle={lockModalSubtitle}
          error={lockModal.error}
          onComplete={handlePinSubmit}
          onCancel={() => setLockModal(null)}
        />
      )}
    </Layout>
  );
}
