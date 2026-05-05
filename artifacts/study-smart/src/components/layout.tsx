import { ReactNode, useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, BookOpen, Calendar as CalendarIcon, 
  Target, Clock, Smile, Menu, Flag,
  BrainCircuit, Sparkles, ChevronRight, Gamepad2, Trophy, User, LogOut, Medal, ShoppingBag, Users,
  Inbox, BadgeCheck, Code2, Settings, ClipboardList, Bell, X, MessageCircle, Ticket, Calculator, Package, Bot,
} from "lucide-react";
import { clearAllSageData } from "@/lib/chatbot-storage";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@workspace/replit-auth-web";
import { useQuery } from "@tanstack/react-query";
import { customFetch, useUnreadChatMessages } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/language-context";
import { useUIMode } from "@/lib/ui-mode-context";
import type { Translations } from "@/lib/languages";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

function buildNavItems(t: Translations["nav"]) {
  return [
    { href: "/",             label: t.dashboard,    icon: Home,          color: "text-blue-500",    bg: "bg-blue-500/10"    },
    { href: "/notes",        label: t.notes,        icon: BookOpen,      color: "text-primary",     bg: "bg-primary/10"     },
    { href: "/timetable",    label: t.timetable,    icon: Clock,         color: "text-secondary",   bg: "bg-secondary/10"   },
    { href: "/goals",        label: t.goals,        icon: Target,        color: "text-accent",      bg: "bg-accent/10"      },
    { href: "/calendar",     label: t.calendar,     icon: CalendarIcon,  color: "text-purple-500",  bg: "bg-purple-500/10"  },
    { href: "/chatbot",      label: "Sage",         icon: Bot,           color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
    { href: "/mood",         label: t.mood,         icon: Smile,         color: "text-pink-500",    bg: "bg-pink-500/10"    },
    { href: "/games",        label: t.minigames,    icon: Gamepad2,      color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { href: "/objectives",   label: t.objectives,   icon: Flag,          color: "text-sky-500",     bg: "bg-sky-500/10"     },
    { href: "/leaderboard",  label: t.leaderboard,  icon: Trophy,        color: "text-amber-500",   bg: "bg-amber-500/10"   },
    { href: "/achievements", label: t.achievements, icon: Medal,         color: "text-yellow-500",  bg: "bg-yellow-500/10"  },
    { href: "/quiz",         label: t.quiz,         icon: Sparkles,      color: "text-amber-500",   bg: "bg-amber-500/10"   },
    { href: "/review",       label: t.review,       icon: ClipboardList, color: "text-orange-500",  bg: "bg-orange-500/10"  },
    { href: "/shop",         label: t.shop,         icon: ShoppingBag,   color: "text-rose-500",    bg: "bg-rose-500/10"    },
    { href: "/inventory",    label: t.inventory,    icon: Package,       color: "text-amber-600",   bg: "bg-amber-600/10"   },
    { href: "/spin",         label: "Wheel",        icon: Ticket,        color: "text-violet-500",  bg: "bg-violet-500/10"  },
    { href: "/inbox",        label: t.inbox,        icon: Inbox,         color: "text-indigo-500",  bg: "bg-indigo-500/10"  },
    { href: "/friends",      label: t.friends,      icon: Users,         color: "text-teal-500",    bg: "bg-teal-500/10"    },
  ];
}

function useInboxUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: async () => {
      const res = await customFetch("/api/inbox");
      if (!res.ok) return 0;
      const data = await res.json() as { messages: Array<{ readAt: string | null }> };
      return data.messages.filter((m) => !m.readAt).length;
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });
}

function UserAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const { user } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Me";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  if (user?.profileImageUrl) {
    return <img src={user.profileImageUrl} alt={displayName} className={`${dim} rounded-xl object-cover border-2 border-border/40`} />;
  }
  return (
    <div className={`${dim} rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold`}>
      {initials}
    </div>
  );
}

type NavItemDef = ReturnType<typeof buildNavItems>[0];

function NavItem({ item, isActive }: { item: NavItemDef; isActive: boolean }) {
  return (
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group
      ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}
    `}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 ${isActive ? item.bg : 'bg-transparent group-hover:bg-background'}`}>
        <item.icon className={`w-4 h-4 ${isActive ? item.color : 'text-current'}`} />
      </div>
      <span className="text-sm">{item.label}</span>
    </div>
  );
}

export function Layout({ children, title, actions }: LayoutProps) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const sidebarScrollPos = useRef(0);
  const { user, logout: rawLogout, isAuthenticated } = useAuth();
  const logout = () => {
    try { clearAllSageData(); } catch {}
    rawLogout();
  };
  const { t } = useLanguage();
  const { uiMode } = useUIMode();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Student";
  const { data: unreadCount = 0 } = useInboxUnreadCount();
  const { data: unreadChatData } = useUnreadChatMessages(isAuthenticated);
  const chatUnreadCount = unreadChatData?.count ?? 0;

  const notifiedIdsRef = useRef<Set<number>>(new Set());
  const chatInitializedRef = useRef(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("mf_notif_dismissed")) return;
    const timer = setTimeout(() => setShowNotifPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!unreadChatData || !isAuthenticated) return;
    if (!chatInitializedRef.current) {
      unreadChatData.messages.forEach(m => notifiedIdsRef.current.add(m.id));
      chatInitializedRef.current = true;
      return;
    }
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    for (const msg of unreadChatData.messages) {
      if (notifiedIdsRef.current.has(msg.id)) continue;
      notifiedIdsRef.current.add(msg.id);
      const senderName = msg.senderFirstName || msg.senderUsername || "Someone";
      const hasMedia = !!msg.mediaUrl;
      const isImage = !!msg.mediaUrl?.includes("?t=image");
      const isVideo = !!msg.mediaUrl?.includes("?t=video");
      const hasText = !!(msg.content?.trim());
      let body: string;
      if (!hasMedia) {
        const snippet = (msg.content ?? "").slice(0, 100);
        body = `${senderName} sent to you: ${snippet}${(msg.content?.length ?? 0) > 100 ? "…" : ""}`;
      } else if (isImage && !hasText) {
        body = `${senderName} sent you an image`;
      } else if (isVideo && !hasText) {
        body = `${senderName} sent you a video`;
      } else if (isImage) {
        body = `${senderName} sent you an image with a description`;
      } else if (isVideo) {
        body = `${senderName} sent you a video with a description`;
      } else {
        body = hasText ? `${senderName} sent to you: ${(msg.content ?? "").slice(0, 100)}` : `${senderName} sent you a file`;
      }
      try { new Notification("Mind Forge", { body, icon: "/favicon.ico" }); } catch {}
    }
  }, [unreadChatData, isAuthenticated]);

  const handleAllowNotifications = async () => {
    setShowNotifPrompt(false);
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      notifiedIdsRef.current.clear();
      chatInitializedRef.current = false;
    }
  };

  const handleDismissNotifPrompt = () => {
    setShowNotifPrompt(false);
    localStorage.setItem("mf_notif_dismissed", "1");
  };

  const NAV_ITEMS = buildNavItems(t.nav);
  const DEVELOPER_NAV_ITEMS = [
    { href: "/developer", label: t.nav.devPanel, icon: Code2, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Preserve tablet sidebar scroll position across navigation.
  // We save in the cleanup (runs after DOM mutations, before browser scroll-anchor adjustments)
  // and restore immediately in the effect body (synchronous, before paint).
  useLayoutEffect(() => {
    const el = sidebarNavRef.current;
    if (!el) return;
    el.scrollTop = sidebarScrollPos.current;
    return () => {
      sidebarScrollPos.current = sidebarNavRef.current?.scrollTop ?? sidebarScrollPos.current;
    };
  }, [location]);

  // ── Shared drawer content (rendered inline to avoid inner-component remounting) ─
  const renderDrawerNavContent = () => (
    <>
      <div className="p-4 flex-1 overflow-y-auto">
        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const showInboxBadge = item.href === "/inbox" && unreadCount > 0;
            const showChatBadge = item.href === "/friends" && chatUnreadCount > 0;
            return (
              <Link key={item.href} href={item.href}>
                <SheetTrigger asChild>
                  <div className={`
                    relative flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer
                    ${location === item.href ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}
                  `}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    {showInboxBadge && (
                      <span className="absolute top-2 right-8 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {showChatBadge && (
                      <span className="absolute top-2 right-8 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                      </span>
                    )}
                  </div>
                </SheetTrigger>
              </Link>
            );
          })}
        </nav>

        {user?.isDeveloper && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2 px-4">Developer</p>
            <nav className="space-y-2">
              {DEVELOPER_NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <SheetTrigger asChild>
                    <div className={`
                      flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer
                      ${location === item.href ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}
                    `}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    </div>
                  </SheetTrigger>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/40 space-y-1">
        <Link href="/profile">
          <SheetTrigger asChild>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted">
              <UserAvatar size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm">{displayName}</p>
                  {user?.isDeveloper && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{user?.username ? `@${user.username}` : "View profile"}</p>
              </div>
            </div>
          </SheetTrigger>
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/5 text-sm transition-colors">
          <LogOut className="w-4 h-4" />
          {t.nav.logout}
        </button>
      </div>
    </>
  );

  // ── Shared notification prompt ──────────────────────────────────────────────
  const NotifPrompt = (
    <AnimatePresence>
      {showNotifPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Get message notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">Stay in the loop when friends message you.</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="rounded-xl h-8 text-xs px-4" onClick={handleAllowNotifications}>Allow</Button>
                <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs" onClick={handleDismissNotifPrompt}>Not now</Button>
              </div>
            </div>
            <button onClick={handleDismissNotifPrompt} className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Shared page content ─────────────────────────────────────────────────────
  const PageContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // TABLET LAYOUT
  // ══════════════════════════════════════════════════════════════════════════════
  if (uiMode === "tablet") {
    return (
      <div className="min-h-screen bg-background pl-64 flex flex-col">
        {/* Fixed Sidebar */}
        <aside className="flex flex-col w-64 fixed inset-y-0 left-0 bg-card border-r border-border/50 shadow-sm z-40">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Mind Forge</span>
          </div>

          <div ref={sidebarNavRef} className="px-4 py-2 flex-1 overflow-y-auto" style={{ overflowAnchor: "none" }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu</p>
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                const showInboxBadge = item.href === "/inbox" && unreadCount > 0;
                const showChatBadge = item.href === "/friends" && chatUnreadCount > 0;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className="relative">
                      <NavItem item={item} isActive={isActive} />
                      {showInboxBadge && (
                        <span className="absolute top-1.5 right-2 z-20 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      {showChatBadge && (
                        <span className="absolute top-1.5 right-2 z-20 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {user?.isDeveloper && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-3 px-2">Developer</p>
                <nav className="space-y-1.5">
                  {DEVELOPER_NAV_ITEMS.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <NavItem item={item} isActive={isActive} />
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border/40 space-y-1">
            <Link href="/profile">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group
                ${location === "/profile" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                <UserAvatar size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {user?.isDeveloper && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user?.username ? `@${user.username}` : "My Profile"}</p>
                </div>
              </div>
            </Link>
            <Link href="/preferences">
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all text-xs
                ${location === "/preferences" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Settings className="w-3.5 h-3.5 shrink-0" />
                {t.nav.preferences}
              </div>
            </Link>
          </div>
        </aside>

        {/* Top Header */}
        <header className={`
          sticky top-0 z-30 transition-all duration-300
          ${scrolled ? 'glass-panel py-4' : 'bg-transparent py-6'}
          px-8 flex items-center justify-between
        `}>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <Link href="/friends">
              <div className="relative cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                )}
              </div>
            </Link>
            <Link href="/inbox">
              <div className="relative cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
                <Inbox className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Link>
            <Link href="/profile">
              <div className="cursor-pointer hover:opacity-80 transition-opacity">
                <UserAvatar size="sm" />
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pt-6 md:px-8 max-w-7xl mx-auto w-full pb-8">
          {PageContent}
        </main>

        {NotifPrompt}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════════
  const MOBILE_BOTTOM_NAV = [
    { href: "/",            label: t.nav.dashboard,  icon: Home,        color: "text-blue-500",   bg: "bg-blue-500/10"   },
    { href: "/notes",       label: t.nav.notes,      icon: BookOpen,    color: "text-primary",    bg: "bg-primary/10"    },
    { href: "/games",       label: t.nav.minigames,  icon: Gamepad2,    color: "text-emerald-500",bg: "bg-emerald-500/10"},
    { href: "/shop",        label: t.nav.shop,       icon: ShoppingBag, color: "text-rose-500",   bg: "bg-rose-500/10"   },
    { href: "/preferences", label: t.nav.preferences,icon: Settings,    color: "text-slate-500",  bg: "bg-slate-500/10"  },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Mobile Top Bar */}
      <header className={`
        fixed top-0 inset-x-0 z-40 transition-all duration-300
        ${scrolled ? 'glass-panel py-3' : 'bg-background/95 backdrop-blur-sm border-b border-border/40 py-3'}
        px-4 flex items-center justify-between gap-2
      `}>
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3 min-w-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r-0 flex flex-col">
              <div className="p-6 flex items-center gap-3 bg-card border-b border-border/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight">Mind Forge</span>
              </div>
              {renderDrawerNavContent()}
            </SheetContent>
          </Sheet>

          <span className="font-display font-bold text-lg leading-none truncate">{title || "Mind Forge"}</span>
        </div>

        {/* Right: actions + objectives + messages + inbox + profile */}
        <div className="flex items-center gap-1 shrink-0">
          {actions && <div className="flex items-center gap-1">{actions}</div>}

          {/* Objectives */}
          <Link href="/objectives">
            <div className={`relative cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors ${location === "/objectives" ? "bg-sky-500/10" : ""}`}>
              <Flag className={`w-5 h-5 ${location === "/objectives" ? "text-sky-500" : "text-muted-foreground"}`} />
            </div>
          </Link>

          {/* Messages */}
          <Link href="/friends">
            <div className="relative cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              {chatUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                </span>
              )}
            </div>
          </Link>

          {/* Inbox */}
          <Link href="/inbox">
            <div className="relative cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <Inbox className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </Link>

          {/* Profile avatar */}
          <Link href="/profile">
            <div className="cursor-pointer hover:opacity-80 transition-opacity ml-1">
              <UserAvatar size="sm" />
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-24 pb-4 max-w-7xl mx-auto w-full">
        {PageContent}
      </main>

      {NotifPrompt}

      {/* Mobile Bottom Navigation — 5 icons */}
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border/50 pb-safe z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around p-2">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex flex-col items-center justify-center p-2 min-w-[56px] cursor-pointer">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? `${item.bg} scale-110` : 'text-muted-foreground hover:bg-muted'}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? item.color : ''}`} />
                  </div>
                  <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label.split(' ')[0]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
