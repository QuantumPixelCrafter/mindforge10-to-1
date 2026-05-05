import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Trash2, BookOpen } from "lucide-react";
import { LEVEL_LABELS, DIFFICULTY_LABELS } from "@/lib/quiz-curriculum";
import { useLanguage } from "@/lib/language-context";

type ReviewItem = {
  id: number;
  level: string;
  subject: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number | null;
  explanation: string | null;
  createdAt: string;
};

function difficultyLabel(d: string) {
  return DIFFICULTY_LABELS.find(x => x.value === d)?.label ?? d;
}

export default function ReviewPage() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["review-items"],
    queryFn: () => customFetch<{ items: ReviewItem[] }>("/api/review"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ ok: boolean }>(`/api/review/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-items"] }),
  });

  const items = data?.items ?? [];

  const grouped = items.reduce<Record<string, ReviewItem[]>>((acc, item) => {
    const key = `${item.level}|${item.subject}|${item.topic}|${item.difficulty}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Layout title={t.review.title}>
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center">
            <span className="text-xl">📋</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{t.review.title}</h1>
            <p className="text-sm text-muted-foreground">{t.review.subtitle}</p>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">🎉</div>
            <p className="font-semibold text-lg">{t.review.nothingToReview}</p>
            <p className="text-sm text-muted-foreground">
              {t.review.nothingDesc}
            </p>
          </div>
        )}

        <AnimatePresence>
          {Object.entries(grouped).map(([key, groupItems]) => {
            const [level, subject, topic, difficulty] = key.split("|");
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-bold">
                    {topic}
                    <span className="font-normal text-muted-foreground"> · {subject} · {LEVEL_LABELS[level] ?? level} · {difficultyLabel(difficulty)}</span>
                  </p>
                </div>

                {groupItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border/60 rounded-2xl p-4 space-y-3"
                  >
                    <p className="font-medium text-sm leading-relaxed">{item.question}</p>

                    <div className="space-y-2">
                      {item.options.map((opt, idx) => {
                        const isCorrect = idx === item.correctAnswer;
                        const isWrong = idx === item.userAnswer && !isCorrect;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm border",
                              isCorrect
                                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                                : isWrong
                                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 line-through opacity-70"
                                : "bg-muted/30 border-transparent text-muted-foreground"
                            )}
                          >
                            <span className="shrink-0 font-bold mt-0.5">
                              {isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation && (
                      <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">{t.review.explanation} </span>
                        {item.explanation}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                        disabled={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(item.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.review.markMastered}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
