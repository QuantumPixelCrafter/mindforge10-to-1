import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { ThemeProvider } from "@/lib/theme-context";
import { LanguageProvider } from "@/lib/language-context";
import { UIModeProvider } from "@/lib/ui-mode-context";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Home from "@/pages/home";
import Notes from "@/pages/notes";
import Timetable from "@/pages/timetable";
import Goals from "@/pages/goals";
import Calendar from "@/pages/calendar";
import Mood from "@/pages/mood";
import Games from "@/pages/games";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import Achievements from "@/pages/achievements";
import Objectives from "@/pages/objectives";
import Shop from "@/pages/shop";
import Inventory from "@/pages/inventory";
import Friends from "@/pages/friends";
import UserProfile from "@/pages/user-profile";
import Quiz from "@/pages/quiz";
import InboxPage from "@/pages/inbox";
import DeveloperPanel from "@/pages/developer-panel";
import Preferences from "@/pages/preferences";
import ReviewPage from "@/pages/review";
import Spin from "@/pages/spin";
import Chatbot from "@/pages/chatbot";
import { FloatingChatbot } from "@/components/floating-chatbot";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RedirectToHome() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/"); }, [setLocation]);
  return null;
}

function AppRoutes() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/25 animate-pulse">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <p className="text-muted-foreground font-medium">Loading Mind Forge…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/notes" component={Notes} />
      <Route path="/timetable" component={Timetable} />
      <Route path="/goals" component={Goals} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/mood" component={Mood} />
      <Route path="/games" component={Games} />
      <Route path="/profile" component={Profile} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/objectives" component={Objectives} />
      <Route path="/shop" component={Shop} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/friends" component={Friends} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/developer" component={DeveloperPanel} />
      <Route path="/preferences" component={Preferences} />
      <Route path="/review" component={ReviewPage} />
      <Route path="/spin" component={Spin} />
      <Route path="/chatbot" component={Chatbot} />
      <Route path="/users/:userId" component={UserProfile} />
      <Route path="/login" component={RedirectToHome} />
      <Route path="/signup" component={RedirectToHome} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UIModeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppRoutes />
                <FloatingChatbot />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
      </UIModeProvider>
    </ThemeProvider>
  );
}

export default App;
