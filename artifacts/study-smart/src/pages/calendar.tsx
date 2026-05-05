import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useSchedulesData, useDeleteScheduleAction, useSkipScheduleDateAction } from "@/hooks/use-schedules";
import { useGoalsData, useUpdateGoalAction } from "@/hooks/use-goals";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Target, BookOpen, Trash2, CalendarX, CalendarOff, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { Schedule } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/language-context";

function isScheduleActiveOnDate(schedule: Schedule, dateStr: string): boolean {
  if (schedule.startDate && dateStr < schedule.startDate) return false;
  if (schedule.endDate && dateStr > schedule.endDate) return false;
  let deleted: string[] = [];
  try { deleted = JSON.parse(schedule.deletedDates ?? "[]"); } catch { deleted = []; }
  if (deleted.includes(dateStr)) return false;
  return true;
}

interface DeleteDialogState {
  schedule: Schedule;
  dateStr: string;
}

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: schedules = [] } = useSchedulesData();
  const { data: goals = [] } = useGoalsData();
  const deleteMut = useDeleteScheduleAction();
  const skipMut = useSkipScheduleDateAction();
  const updateGoalMut = useUpdateGoalAction();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);

  const handleGoalToggle = async (e: React.MouseEvent, goal: any) => {
    e.stopPropagation();
    try {
      await updateGoalMut.mutateAsync({ id: goal.id, data: { completed: !goal.completed } });
      toast({ title: goal.completed ? "Goal marked as pending" : "Goal marked as complete!" });
    } catch {
      toast({ title: "Failed to update goal", variant: "destructive" });
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const startingDayIndex = startOfMonth(currentDate).getDay();
  const blanks = Array(startingDayIndex).fill(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    setLocation(`/timetable?date=${format(day, "yyyy-MM-dd")}`);
  };

  const handleDeleteChipClick = (e: React.MouseEvent, schedule: Schedule, day: Date) => {
    e.stopPropagation();
    setDeleteDialog({ schedule, dateStr: format(day, "yyyy-MM-dd") });
  };

  const handleSkipDay = async () => {
    if (!deleteDialog) return;
    try {
      await skipMut.mutateAsync({ id: deleteDialog.schedule.id, date: deleteDialog.dateStr });
      toast({ title: "Event removed for this day" });
    } catch {
      toast({ title: "Failed to remove event", variant: "destructive" });
    }
    setDeleteDialog(null);
  };

  const handleDeleteSeries = async () => {
    if (!deleteDialog) return;
    try {
      await deleteMut.mutateAsync({ id: deleteDialog.schedule.id });
      toast({ title: "Event series deleted" });
    } catch {
      toast({ title: "Failed to delete event", variant: "destructive" });
    }
    setDeleteDialog(null);
  };

  return (
    <Layout title="Calendar Overview">
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-4 md:p-8 mb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full border-border/50">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full border-border/50">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[t.calendar.sun, t.calendar.mon, t.calendar.tue, t.calendar.wed, t.calendar.thu, t.calendar.fri, t.calendar.sat].map((d) => (
            <div key={d} className="text-center font-bold text-sm text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2 md:gap-4 auto-rows-fr">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[80px] md:min-h-[120px] rounded-2xl bg-muted/20 border border-transparent" />
          ))}

          {daysInMonth.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTdy = isToday(day);
            const dayOfWeek = day.getDay();
            const dateStr = format(day, "yyyy-MM-dd");

            const daySchedules = schedules.filter(
              (s) => s.dayOfWeek === dayOfWeek && isScheduleActiveOnDate(s, dateStr)
            );
            const dayGoals = goals.filter((g) => isSameDay(parseISO(g.deadline), day));

            return (
              <motion.div
                key={day.toISOString()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[80px] md:min-h-[120px] rounded-2xl p-1.5 md:p-3 transition-all relative
                  cursor-pointer select-none
                  ${isTdy
                    ? "bg-primary/5 border-2 border-primary/40 shadow-inner"
                    : "bg-background border border-border/60 hover:border-primary/30 hover:shadow-md"
                  }
                  ${!isCurrentMonth ? "opacity-40" : ""}
                `}
              >
                <span className={`
                  inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mb-1
                  ${isTdy ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-foreground"}
                `}>
                  {format(day, "d")}
                </span>

                <div className="space-y-1 mt-0.5">
                  {dayGoals.slice(0, 2).map((g) => (
                    <div
                      key={g.id}
                      className={`group/goal text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 truncate relative
                        ${g.completed
                          ? "bg-green-500/10 text-green-600 dark:text-green-400 line-through"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                    >
                      <Target className="w-3 h-3 shrink-0 hidden md:block" />
                      <span className="truncate flex-1">{g.title}</span>
                      <button
                        onClick={(e) => handleGoalToggle(e, g)}
                        className="opacity-0 group-hover/goal:opacity-100 transition-opacity shrink-0 rounded hover:bg-black/10 p-0.5"
                        title={g.completed ? "Mark as pending" : "Mark as complete"}
                      >
                        {g.completed
                          ? <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                          : <Circle className="w-2.5 h-2.5" />
                        }
                      </button>
                    </div>
                  ))}
                  {dayGoals.length > 2 && (
                    <div className="text-[10px] font-bold text-red-500 pl-1">+{dayGoals.length - 2} {t.calendar.goals}</div>
                  )}

                  {daySchedules.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className="group/chip text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 truncate relative"
                      style={{ backgroundColor: `${s.color}18`, color: s.color }}
                    >
                      <BookOpen className="w-3 h-3 shrink-0 hidden md:block" />
                      <span className="truncate flex-1">{s.subject}</span>
                      <button
                        onClick={(e) => handleDeleteChipClick(e, s, day)}
                        className="opacity-0 group-hover/chip:opacity-100 transition-opacity shrink-0 rounded hover:bg-black/10 p-0.5"
                        title="Delete event"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div className="text-[10px] font-bold pl-1 text-muted-foreground">+{daySchedules.length - 2} {t.calendar.more}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t.calendar.tapToView}
        </p>
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{t.calendar.removeEvent}</DialogTitle>
          </DialogHeader>
          {deleteDialog && (
            <div className="space-y-4 py-2">
              <div
                className="rounded-2xl p-3 text-sm font-semibold"
                style={{ backgroundColor: `${deleteDialog.schedule.color}15`, color: deleteDialog.schedule.color }}
              >
                {deleteDialog.schedule.subject}
                <p className="text-xs font-normal mt-0.5 opacity-70">
                  {deleteDialog.dateStr} · {deleteDialog.schedule.startTime}–{deleteDialog.schedule.endTime}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">{t.calendar.howRemove}</p>

              <div className="space-y-2">
                <button
                  onClick={handleSkipDay}
                  disabled={skipMut.isPending || deleteMut.isPending}
                  className="w-full flex items-start gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-orange-500/10 shrink-0">
                    <CalendarX className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.calendar.skipDayOnly}</p>
                    <p className="text-xs text-muted-foreground">Remove only the <span className="font-medium">{deleteDialog.dateStr}</span> occurrence. The event still repeats on other weeks.</p>
                  </div>
                </button>

                <button
                  onClick={handleDeleteSeries}
                  disabled={skipMut.isPending || deleteMut.isPending}
                  className="w-full flex items-start gap-3 p-3 rounded-2xl border border-destructive/30 hover:bg-destructive/5 transition-colors text-left disabled:opacity-50"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-destructive/10 shrink-0">
                    <CalendarOff className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-destructive">{t.calendar.deleteEntireSeries}</p>
                    <p className="text-xs text-muted-foreground">Permanently remove this event from all dates
                      {deleteDialog.schedule.startDate || deleteDialog.schedule.endDate
                        ? ` (${deleteDialog.schedule.startDate ?? "…"} → ${deleteDialog.schedule.endDate ?? "…"})`
                        : " indefinitely"}
                      .
                    </p>
                  </div>
                </button>
              </div>

              <Button variant="ghost" className="w-full rounded-xl" onClick={() => setDeleteDialog(null)}>
                {t.common.cancel}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
