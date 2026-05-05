import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useSubjectsData, useNotesData } from "@/hooks/use-notes";
import { useSchedulesData } from "@/hooks/use-schedules";
import { useGoalsData } from "@/hooks/use-goals";
import { useMoodsData } from "@/hooks/use-moods";
import { BookOpen, Target, Clock, Calendar as CalendarIcon, Smile, BrainCircuit, ArrowRight, BookMarked, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isToday, isFuture } from "date-fns";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  
  const { data: notes } = useNotesData();
  const { data: schedules } = useSchedulesData();
  const { data: goals } = useGoalsData();
  const { data: moods } = useMoodsData();

  const todaySchedules = schedules?.filter(s => s.dayOfWeek === new Date().getDay()) || [];
  const activeGoals = goals?.filter(g => !g.completed && isFuture(new Date(g.deadline))) || [];
  const todayMood = moods?.find(m => isToday(new Date(m.createdAt)));

  const moodEmojis = {
    great: "😄", good: "🙂", okay: "😐", tired: "😴", stressed: "😰"
  };

  const featureCards = [
    { title: t.nav.notes, desc: t.home.notesDesc, icon: BookOpen, href: "/notes", color: "from-blue-500 to-cyan-400", shadow: "shadow-blue-500/25" },
    { title: t.nav.quiz, desc: t.home.quizDesc, icon: BrainCircuit, href: "/notes", color: "from-purple-500 to-pink-500", shadow: "shadow-purple-500/25" },
    { title: t.nav.timetable, desc: t.home.timetableDesc, icon: Clock, href: "/timetable", color: "from-orange-500 to-amber-400", shadow: "shadow-orange-500/25" },
    { title: t.nav.goals, desc: t.home.goalsDesc, icon: Target, href: "/goals", color: "from-green-500 to-emerald-400", shadow: "shadow-green-500/25" },
    { title: t.nav.calendar, desc: t.home.calendarDesc, icon: CalendarIcon, href: "/calendar", color: "from-indigo-500 to-blue-500", shadow: "shadow-indigo-500/25" },
    { title: t.nav.mood, desc: t.home.moodDesc, icon: Smile, href: "/mood", color: "from-rose-500 to-red-400", shadow: "shadow-rose-500/25" },
  ];

  return (
    <Layout title="Dashboard">
      <div className="space-y-8 pb-8">
        
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-card border border-border/50 shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
          <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border/50 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" /> {t.home.welcomeBack}
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight">
                Ready to <span className="text-gradient">Mind Forge</span> today?
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl">
                You have {todaySchedules.length} {t.home.classesScheduled} and {activeGoals.length} {t.home.activeGoalsFocus}.
              </p>
              <Button 
                onClick={() => setLocation('/timetable')}
                className="mt-4 rounded-xl px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
              >
                {t.home.viewSchedule} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="w-full max-w-[280px] md:max-w-[350px] aspect-square relative drop-shadow-2xl">
              <img 
                src={`${import.meta.env.BASE_URL}images/dashboard-hero.png`} 
                alt="Study Illustration" 
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><BookMarked className="w-5 h-5" /></div>
              <span className="font-semibold text-sm text-muted-foreground">{t.home.totalNotes}</span>
            </div>
            <p className="text-3xl font-display font-bold">{notes?.length || 0}</p>
          </div>
          
          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><Clock className="w-5 h-5" /></div>
              <span className="font-semibold text-sm text-muted-foreground">{t.home.classesToday}</span>
            </div>
            <p className="text-3xl font-display font-bold">{todaySchedules.length}</p>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Target className="w-5 h-5" /></div>
              <span className="font-semibold text-sm text-muted-foreground">{t.home.activeGoals}</span>
            </div>
            <p className="text-3xl font-display font-bold">{activeGoals.length}</p>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500"><Smile className="w-5 h-5" /></div>
              <span className="font-semibold text-sm text-muted-foreground">{t.home.todayMood}</span>
            </div>
            <p className="text-3xl font-display font-bold">
              {todayMood ? moodEmojis[todayMood.mood] : "—"}
            </p>
            {todayMood && <p className="text-xs text-muted-foreground mt-1 capitalize">{todayMood.mood}</p>}
          </div>
        </section>

        {/* Features Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold">{t.home.exploreFeatures}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {featureCards.map((feat, i) => (
              <motion.div
                key={feat.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setLocation(feat.href)}
                className="group cursor-pointer bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feat.color} opacity-5 group-hover:opacity-10 rounded-bl-full transition-opacity duration-500`} />
                
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center mb-4 shadow-lg ${feat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <feat.icon className="w-7 h-7" />
                </div>
                
                <h4 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{feat.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                
                <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  );
}
