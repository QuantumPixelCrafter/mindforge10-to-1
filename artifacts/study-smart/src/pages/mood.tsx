import { useState } from "react";
import { Layout } from "@/components/layout";
import { useMoodsData, useCreateMoodAction, useDeleteMoodAction } from "@/hooks/use-moods";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, isToday, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { CreateMoodBodyMood } from "@workspace/api-client-react/src/generated/api.schemas";
import { Calendar as CalendarIcon, Edit2, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function MoodPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: moods = [] } = useMoodsData();
  const createMut = useCreateMoodAction();
  const deleteMut = useDeleteMoodAction();

  const MOODS: { val: CreateMoodBodyMood, emoji: string, label: string, color: string }[] = [
    { val: "great", emoji: "😄", label: t.mood.great, color: "text-green-500 bg-green-500/10 border-green-500/20" },
    { val: "good", emoji: "🙂", label: t.mood.good, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { val: "okay", emoji: "😐", label: t.mood.okay, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { val: "tired", emoji: "😴", label: t.mood.tired, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { val: "stressed", emoji: "😰", label: t.mood.stressed, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  ];

  const [selectedMood, setSelectedMood] = useState<CreateMoodBodyMood | null>(null);
  const [note, setNote] = useState("");

  const todayMood = moods.find(m => isToday(parseISO(m.createdAt)));

  const handleLog = async () => {
    if (!selectedMood) return;
    try {
      await createMut.mutateAsync({ data: { mood: selectedMood, note } });
      toast({ title: "Mood logged successfully!" });
      setSelectedMood(null);
      setNote("");
    } catch(e) {
      toast({ title: "Failed to log mood", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Mood entry deleted" });
    } catch {
      toast({ title: "Failed to delete mood", variant: "destructive" });
    }
  };

  const sortedMoods = [...moods].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());

  return (
    <Layout title={t.nav.mood}>
      <div className="max-w-3xl mx-auto space-y-12 pb-12">
        
        {/* Check-in Section */}
        <section className="bg-card rounded-3xl p-6 md:p-10 border border-border/50 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-2 mb-10 relative z-10">
            <h2 className="text-3xl font-display font-bold">{t.mood.howFeeling}</h2>
            <p className="text-muted-foreground">{t.mood.selfAwareness}</p>
          </div>

          {!todayMood ? (
            <div className="space-y-8 relative z-10">
              <div className="flex flex-wrap justify-center gap-4">
                {MOODS.map(m => (
                  <button
                    key={m.val}
                    onClick={() => setSelectedMood(m.val)}
                    className={`
                      flex flex-col items-center p-4 rounded-2xl transition-all duration-300 min-w-[90px] border-2
                      ${selectedMood === m.val ? `${m.color} scale-110 shadow-lg shadow-black/5` : 'bg-background border-border/50 hover:bg-muted grayscale-[0.5] hover:grayscale-0'}
                    `}
                  >
                    <span className="text-4xl mb-2 filter drop-shadow-sm">{m.emoji}</span>
                    <span className="font-semibold text-sm">{m.label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedMood && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="max-w-lg mx-auto space-y-4"
                  >
                    <div>
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Edit2 className="w-4 h-4" /> {t.mood.noteOptional}
                      </label>
                      <Textarea 
                        value={note} onChange={e => setNote(e.target.value)}
                        placeholder={t.mood.notePlaceholder}
                        className="rounded-2xl resize-none bg-background focus-visible:ring-primary/20 min-h-[100px]"
                      />
                    </div>
                    <Button 
                      onClick={handleLog} 
                      disabled={createMut.isPending}
                      className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20"
                    >
                      {createMut.isPending ? t.mood.logging : t.mood.logMood}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 relative z-10">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl filter drop-shadow-md">{MOODS.find(m => m.val === todayMood.mood)?.emoji}</span>
              </div>
              <h3 className="text-2xl font-bold font-display text-foreground">{t.mood.youreFeeling.replace("{mood}", todayMood.mood)}</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {t.mood.thanksCheckin}
              </p>
            </div>
          )}
        </section>

        {/* History Section */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-display font-bold">{t.mood.history}</h3>
          </div>

          <div className="space-y-4">
            {sortedMoods.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-dashed border-border/60">
                {t.mood.noMoods}
              </div>
            ) : (
              sortedMoods.map(mood => {
                const moodDef = MOODS.find(m => m.val === mood.mood)!;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={mood.id} 
                    className="bg-card p-5 rounded-2xl border border-border/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm group"
                  >
                    <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border ${moodDef.color.split(' ').slice(1).join(' ')}`}>
                      {moodDef.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold capitalize ${moodDef.color.split(' ')[0]}`}>
                          {moodDef.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            {format(parseISO(mood.createdAt), "MMM d, yyyy")}
                          </span>
                          <button
                            onClick={() => handleDelete(mood.id)}
                            disabled={deleteMut.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {mood.note && (
                        <p className="text-muted-foreground text-sm italic border-l-2 border-border/60 pl-3 py-1">"{mood.note}"</p>
                      )}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </section>

      </div>
    </Layout>
  );
}
