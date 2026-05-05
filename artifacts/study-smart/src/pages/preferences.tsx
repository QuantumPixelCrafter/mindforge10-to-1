import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { useUpdatePreferences } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useThemeMode } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { Bell, MessageCircle, Settings, Sun, Moon, Monitor, Globe2, EyeOff, Smartphone, Tablet, Bot } from "lucide-react";
import { useUIMode } from "@/lib/ui-mode-context";

const REMINDER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Don't remind me", value: null },
  { label: "1 day before", value: 1 },
  { label: "2 days before", value: 2 },
  { label: "3 days before", value: 3 },
  { label: "1 week before", value: 7 },
];

export default function Preferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useThemeMode();
  const { uiMode, setUIMode } = useUIMode();

  const updatePrefsMut = useUpdatePreferences();

  const currentGoalReminderDays = (user as any)?.goalReminderDays ?? null;
  const [goalReminderDays, setGoalReminderDays] = useState<number | null>(currentGoalReminderDays);

  const [showFloatingSage, setShowFloatingSage] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mf_show_floating_sage") === "1";
  });

  const handleToggleFloatingSage = (v: boolean) => {
    setShowFloatingSage(v);
    try {
      localStorage.setItem("mf_show_floating_sage", v ? "1" : "0");
      window.dispatchEvent(new Event("mf-floating-sage-changed"));
    } catch {}
  };

  useEffect(() => {
    setGoalReminderDays((user as any)?.goalReminderDays ?? null);
  }, [(user as any)?.goalReminderDays]);

  const handleSave = async () => {
    await updatePrefsMut.mutateAsync({
      goalReminderDays,
    });
    toast({
      title: "Preferences saved",
      description: "Your settings have been updated.",
    });
  };

  const handleVisibility = async (value: boolean) => {
    try {
      await updatePrefsMut.mutateAsync({ isPublic: value });
      toast({ title: value ? "Account set to public" : "Account set to private" });
      window.location.reload();
    } catch {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    }
  };

  const isPublic = (user as any)?.isPublic ?? true;

  return (
    <Layout title="Preferences">
      <div className="max-w-xl space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted/60">
            <Settings className="w-6 h-6 text-foreground/70" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Preferences</h2>
            <p className="text-sm text-muted-foreground">Customise your Mind Forge experience</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground">Choose between light, dark, or system-based theme.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "light",  label: "Light",  Icon: Sun },
              { value: "dark",   label: "Dark",   Icon: Moon },
              { value: "system", label: "Auto",   Icon: Monitor },
            ] as const).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all duration-200",
                  theme === value
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Mode */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h3 className="font-semibold">Layout</h3>
              <p className="text-sm text-muted-foreground">Switch between a mobile bottom-bar layout or a tablet sidebar layout.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "mobile" as const, label: "Mobile",  Icon: Smartphone, sub: "Bottom nav + drawer" },
              { value: "tablet" as const, label: "Tablet",  Icon: Tablet,      sub: "Fixed sidebar"      },
            ]).map(({ value, label, Icon, sub }) => (
              <button
                key={value}
                onClick={() => setUIMode(value)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200",
                  uiMode === value
                    ? "bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20"
                    : "border-border bg-background text-muted-foreground hover:border-sky-400/40"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{label}</span>
                </div>
                <span className={cn("text-[10px] leading-tight", uiMode === value ? "text-white/70" : "text-muted-foreground/60")}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account Visibility */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0 mt-0.5">
              <Globe2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Account Visibility</h3>
              <p className="text-sm text-muted-foreground">Control who can see your profile and scores.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              { value: true,  label: "Public",  sub: "Visible on leaderboard & search", Icon: Globe2 },
              { value: false, label: "Private", sub: "Hidden from other users",          Icon: EyeOff },
            ] as const).map(({ value, label, sub, Icon }) => {
              const isSelected = isPublic === value;
              return (
                <button
                  key={String(value)}
                  onClick={() => handleVisibility(value)}
                  disabled={updatePrefsMut.isPending}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-200",
                    isSelected
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                      : "border-border bg-background text-muted-foreground hover:border-emerald-400/40"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{label}</span>
                  </div>
                  <span className={cn("text-[10px] leading-tight", isSelected ? "text-white/70" : "text-muted-foreground/60")}>{sub}</span>
                </button>
              );
            })}
          </div>

          {/* Fine-grained privacy settings (private accounts only) */}
          {isPublic === false && (
            <div className="border-t border-border/40 pt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Privacy Preferences</p>
              {([
                {
                  key: "showNameOnLeaderboard" as const,
                  label: "Show name on leaderboard",
                  sub: "Others see your display name instead of just your username",
                },
              ]).map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-muted/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{sub}</p>
                  </div>
                  <Switch
                    checked={((user as any)?.[key] ?? true) as boolean}
                    onCheckedChange={async (v) => {
                      await updatePrefsMut.mutateAsync({ [key]: v });
                    }}
                    disabled={updatePrefsMut.isPending}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Sage Chatbot */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 shrink-0 mt-0.5">
              <Bot className="w-5 h-5 text-fuchsia-500" />
            </div>
            <div>
              <h3 className="font-semibold">Floating Sage button</h3>
              <p className="text-sm text-muted-foreground">Show a small round Sage chatbot button on every screen so you can chat with one tap. It's hidden during quizzes and minigames so it never gets in the way.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">Show floating Sage button</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Drag it anywhere on the screen. Tap to open Sage.</p>
            </div>
            <Switch
              checked={showFloatingSage}
              onCheckedChange={handleToggleFloatingSage}
              className="shrink-0"
              data-testid="switch-floating-sage"
            />
          </div>
        </div>

        {/* Messaging Preferences */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 shrink-0 mt-0.5">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Messaging</h3>
              <p className="text-sm text-muted-foreground">Control who can message you.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">Allow messages from non-friends</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Let people who aren't your friend send you up to 3 messages. You'll get an inbox notification.
              </p>
            </div>
            <Switch
              checked={((user as any)?.receiveStrangerMessages ?? false) as boolean}
              onCheckedChange={async (v) => {
                await updatePrefsMut.mutateAsync({ receiveStrangerMessages: v });
                toast({ title: v ? "Non-friend messages enabled" : "Non-friend messages disabled" });
              }}
              disabled={updatePrefsMut.isPending}
              className="shrink-0"
            />
          </div>
        </div>

        {/* Goal Reminders */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold">Goal Reminders</h3>
              <p className="text-sm text-muted-foreground">
                Get an inbox notification before your goal's deadline so you don't miss it.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Remind me before a goal is due:</p>
            <div className="grid grid-cols-1 gap-2">
              {REMINDER_OPTIONS.map(({ label, value }) => {
                const isSelected = goalReminderDays === value;
                return (
                  <button
                    key={String(value)}
                    onClick={() => setGoalReminderDays(value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-200",
                      isSelected
                        ? "bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20"
                        : "border-border bg-background text-foreground hover:border-violet-400/40"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                      isSelected ? "border-white" : "border-muted-foreground/40"
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>
            {goalReminderDays !== null && (
              <p className="text-xs text-muted-foreground pt-1">
                You'll receive an inbox notification {goalReminderDays === 1 ? "1 day" : `${goalReminderDays} days`} before each goal's deadline.
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={updatePrefsMut.isPending}
          className="rounded-xl px-8"
        >
          {updatePrefsMut.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </Layout>
  );
}
