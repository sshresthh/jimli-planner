"use client";

import { useMemo, useState } from "react";
import { useDb } from "../../../components/DbProvider";
import { UrgencyBadge } from "../../../components/Badge";
import { getUrgencyLabel } from "../../../lib/date";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarPage() {
  const { ready, tasks, subjects, plannerSettings } = useDb();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const now = new Date();

  const weekStartsOn = plannerSettings?.weekStart === "sunday" ? 0 : 1;
  const dayLabels = weekStartsOn === 0
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];


  const subjectMap = useMemo(() => {
    return subjects.reduce<Record<string, string>>((acc, subject) => {
      acc[subject.id] = subject.name;
      return acc;
    }, {});
  }, [subjects]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
      const key = format(new Date(task.deadlineDateTime), "yyyy-MM-dd");
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn });
    const days = [] as Date[];
    let cursor = start;
    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [currentMonth, weekStartsOn]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedTasks = tasksByDate[selectedKey] ?? [];

  if (!ready) {
    return <div className="p-8">Loading calendar...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-4 md:px-8 max-w-5xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Calendar
          </h1>
          <p className="font-sans text-sm text-zinc-500">
            Monthly deadlines and upcoming exams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full bg-white dark:bg-zinc-900" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full bg-white dark:bg-zinc-900" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-6 flex items-center justify-center">
            <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {dayLabels.map((label) => (
              <span key={label} className="text-center pb-2">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const hasTasks = (tasksByDate[key] ?? []).length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, now);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border transition-all hover:scale-105 active:scale-95 ${isSelected
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : isToday
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-transparent bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-200 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                    } ${!isCurrentMonth ? "opacity-30" : ""}`}
                >
                  <span className="font-sans text-xs md:text-sm font-bold">{format(day, "d")}</span>
                  <div className="flex h-1.5 gap-0.5">
                    {hasTasks && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white dark:bg-zinc-900" : isToday ? "bg-amber-500" : "bg-blue-500"}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="font-display text-lg font-bold tracking-tight text-zinc-900 border-b border-zinc-100 pb-4 mb-4 dark:text-zinc-50 dark:border-zinc-800">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>
          <div className="flex flex-col gap-3">
            {selectedTasks.length === 0 ? (
              <p className="font-sans text-sm font-medium text-zinc-500 py-8 text-center">No tasks due.</p>
            ) : (
              selectedTasks.map((task) => {
                const label = getUrgencyLabel(task, now);
                return (
                  <div key={task.id} className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 transition-all hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-sans text-sm font-bold text-zinc-900 leading-tight dark:text-zinc-100">{task.title}</p>
                      <UrgencyBadge label={label}>{label}</UrgencyBadge>
                    </div>
                    <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span>{subjectMap[task.subjectId] ?? "Unassigned"}</span>
                      <span>•</span>
                      <span>{task.type}</span>
                    </div>
                  </div>
                );
              })
            )}

            <Button variant="outline" className="mt-4 w-full rounded-full border-dashed">
              + Add Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
