import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGoalsData, useCreateGoalAction, useUpdateGoalAction, useDeleteGoalAction } from "@/hooks/use-goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Target, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";

export default function GoalsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: goals = [] } = useGoalsData();
  const createMut = useCreateGoalAction();
  const updateMut = useUpdateGoalAction();
  const deleteMut = useDeleteGoalAction();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSave = async () => {
    if (!title || !deadline) return;
    try {
      await createMut.mutateAsync({
        data: { title, description: desc, deadline: new Date(deadline).toISOString() }
      });
      setOpen(false);
      setTitle(""); setDesc(""); setDeadline("");
      toast({ title: "Goal created!" });
    } catch(e) {
      toast({ title: "Error creating goal", variant: "destructive" });
    }
  };

  const toggleComplete = async (goal: any) => {
    try {
      await updateMut.mutateAsync({
        id: goal.id,
        data: { completed: !goal.completed }
      });
    } catch(e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const getStatusColor = (deadlineStr: string, completed: boolean) => {
    if (completed) return "bg-green-500/10 text-green-600 border-green-500/20";
    const date = parseISO(deadlineStr);
    if (isPast(date)) return "bg-red-500/10 text-red-600 border-red-500/20";
    const days = differenceInDays(date, new Date());
    if (days <= 3) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  };

  const getStatusText = (deadlineStr: string, completed: boolean) => {
    if (completed) return t.goals.completed;
    const date = parseISO(deadlineStr);
    if (isPast(date)) return t.goals.overdue;
    const days = differenceInDays(date, new Date());
    if (days === 0) return t.goals.dueToday;
    if (days === 1) return t.goals.dueTomorrow;
    return t.goals.inDays.replace("{n}", String(days));
  };

  const sortedGoals = [...goals].sort((a, b) => {
    if (a.completed === b.completed) {
      return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
    }
    return a.completed ? 1 : -1;
  });

  return (
    <Layout 
      title={t.nav.goals}
      actions={
        <Button onClick={() => setOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> {t.goals.newGoal}
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-primary to-accent text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold">{t.goals.yourProgress}</h2>
                <p className="text-white/80">{t.goals.keepCrushing}</p>
              </div>
            </div>
            
            <div className="flex gap-8 text-center bg-black/20 backdrop-blur-md rounded-2xl p-4 w-full md:w-auto justify-around md:justify-center">
              <div>
                <p className="text-3xl font-bold font-display">{goals.filter(g => g.completed).length}</p>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{t.goals.doneStat}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-3xl font-bold font-display">{goals.filter(g => !g.completed).length}</p>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{t.goals.pendingStat}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-8">
          <AnimatePresence>
            {sortedGoals.map((goal) => {
              const statusClass = getStatusColor(goal.deadline, goal.completed);
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={goal.id}
                  className={`
                    group bg-card rounded-2xl p-4 md:p-5 border transition-all duration-300 flex items-center gap-4
                    ${goal.completed ? 'opacity-60 bg-muted/30 border-transparent hover:opacity-100' : 'border-border/60 shadow-sm hover:shadow-md'}
                  `}
                >
                  <button 
                    onClick={() => toggleComplete(goal)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {goal.completed ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    ) : (
                      <Circle className="w-8 h-8" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-lg truncate ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {goal.title}
                    </h4>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground truncate">{goal.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${statusClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {getStatusText(goal.deadline, goal.completed)}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {format(parseISO(goal.deadline), "MMM d, yyyy")}
                    </span>
                  </div>

                  <button 
                    onClick={() => deleteMut.mutate({ id: goal.id })}
                    className="shrink-0 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {goals.length === 0 && (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border/60">
              <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{t.goals.noGoals}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.goals.createNew}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">{t.goals.goalTitle}</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.goals.titlePlaceholder} className="rounded-xl bg-muted/50 border-transparent" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">{t.goals.descOptional}</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.goals.descPlaceholder} className="rounded-xl bg-muted/50 border-transparent" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">{t.goals.deadline}</label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="rounded-xl bg-muted/50 border-transparent" />
            </div>
            <Button onClick={handleSave} disabled={createMut.isPending || !title || !deadline} className="w-full rounded-xl py-6 text-base mt-2 shadow-lg shadow-primary/20">
              {createMut.isPending ? t.goals.creating : t.goals.setGoal}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
