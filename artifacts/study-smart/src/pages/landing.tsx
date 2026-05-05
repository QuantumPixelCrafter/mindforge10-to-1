import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Brain, BookOpen, Target, Gamepad2, Trophy, Sparkles, ChevronRight, Clock, Smile, Calendar } from "lucide-react";

const FEATURES = [
  { icon: BookOpen, title: "Smart Notes", desc: "Organise notes by subject with colour-coded folders.", color: "from-orange-400 to-amber-500" },
  { icon: Brain, title: "AI Quizzes", desc: "Generate quiz questions from your notes instantly with AI.", color: "from-violet-500 to-purple-600" },
  { icon: Clock, title: "Timetable", desc: "Plan your week and get browser reminders for each class.", color: "from-blue-400 to-cyan-500" },
  { icon: Target, title: "Goal Tracker", desc: "Set study goals, track progress and celebrate wins.", color: "from-emerald-400 to-teal-500" },
  { icon: Calendar, title: "Calendar", desc: "See everything you have scheduled in a clean monthly view.", color: "from-pink-400 to-rose-500" },
  { icon: Smile, title: "Mood Check-in", desc: "Log how you feel each day and build healthy habits.", color: "from-yellow-400 to-orange-400" },
  { icon: Gamepad2, title: "Minigames", desc: "Revise with AI Memory Match or relax with Bubble Pop.", color: "from-indigo-400 to-blue-500" },
  { icon: Trophy, title: "Leaderboard", desc: "Compete with other students across games and quizzes.", color: "from-amber-400 to-yellow-500" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Mind Forge</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="rounded-full px-5">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button className="rounded-full px-6 shadow-lg shadow-primary/20">
              Sign Up <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 overflow-hidden">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-primary/20">
              <Sparkles className="w-4 h-4" />
              AI-powered student productivity
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Study Smarter,<br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-accent bg-clip-text text-transparent">
                Not Harder
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              One app for notes, AI-generated quizzes, timetables, goal tracking, mood check-ins, and even a leaderboard to make studying fun.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="rounded-2xl px-10 h-14 text-base shadow-2xl shadow-primary/25">
                  <Sparkles className="w-5 h-5 mr-2" /> Get Started — It's Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-2xl px-10 h-14 text-base border-2">
                  Log In
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Mock UI preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-16 relative"
          >
            <div className="rounded-3xl border border-border/60 bg-card shadow-2xl shadow-black/10 overflow-hidden mx-auto max-w-3xl">
              <div className="h-10 bg-muted/50 flex items-center px-4 gap-2 border-b border-border/40">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 h-5 bg-muted rounded-full mx-4" />
              </div>
              <div className="grid grid-cols-4 h-48">
                <div className="bg-card border-r border-border/40 p-3 flex flex-col gap-2">
                  {["Dashboard", "Notes", "Timetable", "Goals"].map((item, i) => (
                    <div key={item} className={`h-6 rounded-lg text-xs flex items-center px-2 font-medium ${i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="col-span-3 p-4 flex flex-col gap-2">
                  <div className="h-5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg w-2/3" />
                  <div className="grid grid-cols-3 gap-2 mt-2 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-muted/60 rounded-xl p-2">
                        <div className="h-2 bg-muted rounded w-3/4 mb-1.5" />
                        <div className="h-2 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 md:px-12 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Everything you need to succeed</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">All the tools that top students use, in one beautifully designed app.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-base mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-primary/10 via-violet-500/10 to-accent/10 rounded-3xl p-12 border border-primary/10">
            <h2 className="text-4xl font-extrabold mb-4">Ready to study smart?</h2>
            <p className="text-muted-foreground mb-8 text-lg">Join students using AI-powered tools to revise more effectively and stress less.</p>
            <Link href="/signup">
              <Button size="lg" className="rounded-2xl px-12 h-14 text-base shadow-2xl shadow-primary/25">
                <Sparkles className="w-5 h-5 mr-2" /> Start for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-foreground">Mind Forge</span>
        </div>
        <p>AI-powered student productivity app</p>
      </footer>
    </div>
  );
}
