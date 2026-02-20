import {
  addDays,
  endOfDay,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import type { PlannerDay, PlannerSettings, Task } from "./types";
import { getSmartScore } from "./score";

const DEFAULT_HOURS_BY_DAY: Record<number, number> = {
  0: 1,
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 1,
};

export function getDefaultPlannerSettings(): PlannerSettings {
  return {
    hoursByDay: { ...DEFAULT_HOURS_BY_DAY },
    bufferHours: 0.5,
    weekStart: "monday",
  };
}

export function normalizePlannerSettings(
  settings?: PlannerSettings | null
): PlannerSettings {
  if (!settings) {
    return getDefaultPlannerSettings();
  }
  return {
    hoursByDay: {
      ...DEFAULT_HOURS_BY_DAY,
      ...settings.hoursByDay,
    },
    bufferHours: Math.max(settings.bufferHours ?? 0, 0),
    weekStart: settings.weekStart ?? "monday",
  };
}

export function generateStudyPlan(
  tasks: Task[],
  subjectDifficulty: Record<string, number | null | undefined>,
  settings?: PlannerSettings | null,
  now: Date = new Date()
): { days: PlannerDay[]; overloaded: boolean } {
  const normalized = normalizePlannerSettings(settings);
  const activeTasks = tasks.filter((task) => task.status !== "Done");
  if (!activeTasks.length) {
    return { days: [], overloaded: false };
  }

  const latestDeadline = activeTasks
    .map((task) => new Date(task.deadlineDateTime))
    .reduce((latest, current) =>
      isAfter(current, latest) ? current : latest
    );

  const start = startOfDay(now);
  const end = endOfDay(latestDeadline);
  const days: PlannerDay[] = [];
  const remaining = new Map<string, number>();

  activeTasks.forEach((task) => {
    remaining.set(task.id, Math.max(task.estimatedHours, 0));
  });

  let cursor = start;
  // Cap the infinite loop to max 60 days to prevent browser hanging.
  const MAX_DAYS = 60;
  let dayCount = 0;

  while (!isAfter(cursor, end) && dayCount < MAX_DAYS) {
    const allDone = Array.from(remaining.values()).every((v) => v <= 0);
    // Always render at least 7 days for the UI, but stop if tasks are done
    if (allDone && days.length >= 7) {
      break;
    }

    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);
    const dayIndex = dayStart.getDay();
    const availableRaw = normalized.hoursByDay[dayIndex] ?? 0;
    const availableHours = Math.max(availableRaw - normalized.bufferHours, 0);
    let remainingHours = availableHours;

    const candidates = activeTasks
      .filter((task) => {
        const remainingHoursForTask = remaining.get(task.id) ?? 0;
        return remainingHoursForTask > 0; // Filter ONLY by remaining hours, allowing overdue tasks to be scheduled
      })
      .sort((a, b) => {
        // Smart score inherently prioritizes by urgency (deadline), priority, and difficulty
        const scoreA = getSmartScore(a, subjectDifficulty[a.subjectId], now);
        const scoreB = getSmartScore(b, subjectDifficulty[b.subjectId], now);
        return scoreB - scoreA;
      });

    const allocations = [] as PlannerDay["allocations"];
    for (const task of candidates) {
      if (remainingHours <= 0) break;

      const remainingForTask = remaining.get(task.id) ?? 0;
      if (remainingForTask <= 0) continue;

      const allocate = Math.min(remainingForTask, remainingHours);
      allocations.push({
        taskId: task.id,
        title: task.title,
        hours: allocate,
      });

      remaining.set(task.id, remainingForTask - allocate);
      remainingHours -= allocate;
    }

    const dayOverload = activeTasks.some((task) => {
      const deadline = new Date(task.deadlineDateTime);
      const remainingForTask = remaining.get(task.id) ?? 0;
      // Overload if a task is STILL unfinished even though its deadline is before the end of this current chunk
      return remainingForTask > 0 && isBefore(deadline, dayEnd);
    });

    days.push({
      date: dayStart.toISOString(),
      allocations,
      availableHours,
      usedHours: availableHours - remainingHours,
      overload: dayOverload,
    });

    cursor = addDays(cursor, 1);
    dayCount++;
  }

  const overloaded = Array.from(remaining.values()).some((value) => value > 0);
  return { days, overloaded };
}
