import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Sparkles, AlertCircle, CheckCircle2, XCircle, ArrowRight, Trophy, Upload, GraduationCap } from "lucide-react";
import { useGenerateQuizAction } from "@/hooks/use-notes";
import { useSubmitScore } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import type { Quiz, GenerateQuizBodyDifficulty } from "@workspace/api-client-react/src/generated/api.schemas";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuizModalProps {
  noteId: number;
  subjectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIFFICULTY_MULTIPLIER: Record<string, number> = { easy: 1, normal: 1.5, difficult: 2 };

function calcQuizScore(correct: number, total: number, difficulty: string): number {
  return Math.round(correct * (DIFFICULTY_MULTIPLIER[difficulty] ?? 1) * 100);
}

export function QuizModal({ noteId, subjectName, open, onOpenChange }: QuizModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'setup' | 'loading' | 'playing' | 'results'>('setup');
  const [difficulty, setDifficulty] = useState<GenerateQuizBodyDifficulty>('normal');
  const [questionCount, setQuestionCount] = useState(5);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const generateQuizMut = useGenerateQuizAction();
  const submitScoreMut = useSubmitScore();

  const handleGenerate = async () => {
    setStep('loading');
    try {
      const data = await generateQuizMut.mutateAsync({
        id: noteId,
        data: { difficulty, questionCount, level: user?.level ?? undefined }
      });
      setQuiz(data);
      setCurrentQuestionIdx(0);
      setScore(0);
      setSelectedOption(null);
      setShowExplanation(false);
      setScoreSubmitted(false);
      setStep('playing');
    } catch (error) {
      console.error("Failed to generate quiz", error);
      setStep('setup');
    }
  };

  const handleAnswer = (optionIdx: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIdx);
    setShowExplanation(true);
    if (quiz && optionIdx === quiz.questions[currentQuestionIdx].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIdx < quiz.questions.length - 1) {
      setCurrentQuestionIdx(i => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setStep('results');
    }
  };

  const handleSubmitScore = async () => {
    if (!quiz || scoreSubmitted) return;
    const finalScore = calcQuizScore(score, quiz.questions.length, quiz.difficulty);
    try {
      await submitScoreMut.mutateAsync({
        data: {
          gameType: "quiz",
          score: finalScore,
          subject: subjectName || undefined,
          userLevel: user?.level || undefined,
        }
      });
      setScoreSubmitted(true);
    } catch (err) {
      console.error("Failed to submit score", err);
    }
  };

  const reset = () => {
    setStep('setup');
    setQuiz(null);
    setScoreSubmitted(false);
  };

  const finalScore = quiz ? calcQuizScore(score, quiz.questions.length, quiz.difficulty) : 0;
  const pct = quiz ? Math.round((score / quiz.questions.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) reset();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg border-0 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 bg-background/95 backdrop-blur-xl">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 'setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center mb-4 ring-8 ring-primary/5">
                    <BrainCircuit className="w-8 h-8" />
                  </div>
                  <DialogTitle className="text-2xl font-display">Generate AI Quiz</DialogTitle>
                  <DialogDescription>
                    Test your knowledge on this note. The more detailed your notes, the better the questions!
                  </DialogDescription>
                </div>

                {/* Level indicator */}
                {user?.level ? (
                  <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center gap-2.5 text-sm">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Questions tailored for</span>
                    <span className="font-bold text-primary">{user.level}</span>
                    {subjectName && <>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium">{subjectName}</span>
                    </>}
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded-xl flex items-start gap-2.5 text-sm border border-amber-200 dark:border-amber-500/20">
                    <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Set your education level in Profile to get age-appropriate questions and appear on the right leaderboard.</p>
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3 text-sm border border-amber-200 dark:border-amber-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Images inside the note are not read by the AI. Only text content will be used to generate questions.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['easy', 'normal', 'difficult'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`
                            px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 capitalize
                            ${difficulty === d
                              ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105 z-10 relative'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                          `}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Number of Questions ({questionCount})</label>
                    <input
                      type="range"
                      min="3" max="10"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>3</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full py-6 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
                  onClick={handleGenerate}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Magic Quiz
                </Button>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center space-y-6 text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="w-20 h-20 bg-gradient-to-tr from-primary to-accent rounded-full flex items-center justify-center shadow-xl animate-spin-slow relative z-10">
                    <BrainCircuit className="w-10 h-10 text-white animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold">Analyzing your notes...</h3>
                  <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                    Crafting {questionCount} customized {difficulty} questions{user?.level ? ` for ${user.level}` : ""} just for you.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'playing' && quiz && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Question {currentQuestionIdx + 1} of {quiz.questions.length}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {quiz.difficulty} Level
                  </span>
                </div>

                <h3 className="text-xl font-semibold leading-relaxed">
                  {quiz.questions[currentQuestionIdx].question}
                </h3>

                <div className="space-y-3">
                  {quiz.questions[currentQuestionIdx].options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = showExplanation && idx === quiz.questions[currentQuestionIdx].correctAnswer;
                    const isWrong = showExplanation && isSelected && !isCorrect;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={showExplanation}
                        className={`
                          w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                          ${showExplanation ? 'cursor-default' : 'hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]'}
                          ${!showExplanation && !isSelected ? 'border-border bg-card' : ''}
                          ${isSelected && !showExplanation ? 'border-primary bg-primary/10 ring-4 ring-primary/10' : ''}
                          ${isCorrect ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' : ''}
                          ${isWrong ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 opacity-70' : ''}
                          ${showExplanation && !isCorrect && !isWrong ? 'opacity-50 border-border bg-card' : ''}
                        `}
                      >
                        <span className="font-medium">{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {isWrong && <XCircle className="w-5 h-5 text-red-500" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                      className="bg-muted p-5 rounded-2xl border border-border/50"
                    >
                      <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                        {selectedOption === quiz.questions[currentQuestionIdx].correctAnswer
                          ? <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Correct!</span>
                          : <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Not quite.</span>
                        }
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {quiz.questions[currentQuestionIdx].explanation}
                      </p>

                      <Button onClick={nextQuestion} className="w-full mt-4 rounded-xl">
                        {currentQuestionIdx < quiz.questions.length - 1 ? 'Next Question' : 'See Results'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === 'results' && quiz && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full" />
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/20 relative z-10 mx-auto">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-3xl font-display font-bold">Quiz Complete!</h2>
                  <p className="text-muted-foreground">
                    You scored <span className="font-bold text-foreground">{score}</span> out of {quiz.questions.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({quiz.difficulty} · {pct}% correct)
                  </p>
                </div>

                {/* Score card */}
                <div className={cn(
                  "rounded-2xl p-5 border",
                  pct >= 80 ? "bg-green-500/10 border-green-500/20" : pct >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"
                )}>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Leaderboard Score</p>
                  <p className={cn("text-4xl font-extrabold", pct >= 80 ? "text-green-600 dark:text-green-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                    {finalScore.toLocaleString()} pts
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{score} correct × {DIFFICULTY_MULTIPLIER[quiz.difficulty] ?? 1}× {quiz.difficulty} multiplier × 100</p>
                  {(subjectName || user?.level) && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                      {user?.level && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{user.level}</span>}
                      {subjectName && <span className="bg-muted px-2 py-0.5 rounded-full">{subjectName}</span>}
                    </p>
                  )}
                </div>

                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                  <motion.div
                    className={cn("h-full", pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  />
                </div>

                {/* Score submission */}
                {user ? (
                  scoreSubmitted ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      Score submitted to leaderboard!
                    </div>
                  ) : (
                    <Button
                      onClick={handleSubmitScore}
                      disabled={submitScoreMut.isPending}
                      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-amber-500/25"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {submitScoreMut.isPending ? "Submitting…" : `Submit ${finalScore.toLocaleString()} pts to Leaderboard`}
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Log in to submit your score to the leaderboard.</p>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button className="flex-1 rounded-xl" onClick={reset}>
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
