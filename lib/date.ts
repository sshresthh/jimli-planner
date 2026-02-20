import {
  addDays,
  differenceInHours,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { Task, TaskStatus } from "./types";

export type UrgencyLabel =
  | "overdue"
  | "today"
  | "soon"
  | "week"
  | "normal"
  | "done";

export const WEEK_START_MAP: Record<"monday" | "sunday", 0 | 1> = {
  sunday: 0,
  monday: 1,
};

export function getWeekRange(date: Date, weekStart: "monday" | "sunday") {
  const start = startOfWeek(date, { weekStartsOn: WEEK_START_MAP[weekStart] });
  const end = endOfWeek(date, { weekStartsOn: WEEK_START_MAP[weekStart] });
  return { start, end };
}

export function getUrgencyLabel(task: Task, now: Date): UrgencyLabel {
  if (task.status === "Done") {
    return "done";
  }
  const deadline = new Date(task.deadlineDateTime);
  if (deadline.getTime() < now.getTime()) {
    return "overdue";
  }
  if (isSameDay(deadline, now)) {
    return "today";
  }
  const hoursUntil = differenceInHours(deadline, now);
  if (hoursUntil <= 48) {
    return "soon";
  }
  const weekWindow = {
    start: now,
    end: addDays(now, 7),
  };
  if (isWithinInterval(deadline, weekWindow)) {
    return "week";
  }
  return "normal";
}

export function isDueSoon(task: Task, now: Date) {
  if (task.status === "Done") {
    return false;
  }
  const deadline = new Date(task.deadlineDateTime);
  return deadline.getTime() <= addDays(now, 7).getTime();
}

export function isInWeek(task: Task, weekStart: "monday" | "sunday", now: Date) {
  const deadline = new Date(task.deadlineDateTime);
  const { start, end } = getWeekRange(now, weekStart);
  return isWithinInterval(deadline, { start, end });
}

export function isSameCalendarDay(date: Date, other: Date) {
  return isSameDay(date, other);
}

export function startOfLocalDay(date: Date) {
  return startOfDay(date);
}

export function isStatusActive(status: TaskStatus) {
  return status !== "Done";
}
