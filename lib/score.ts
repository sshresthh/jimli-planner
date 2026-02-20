import { differenceInHours } from "date-fns";
import type { Task } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getSmartScore(
  task: Task,
  difficulty: number | null | undefined,
  now: Date
) {
  if (task.status === "Done") {
    return -1;
  }
  const deadline = new Date(task.deadlineDateTime);
  const hoursUntil = differenceInHours(deadline, now);
  const cappedHours = clamp(hoursUntil, 0, 336);
  const urgency = 1 - cappedHours / 336;
  const priorityNorm = clamp((task.priority - 1) / 4, 0, 1);
  const effortNorm = clamp(task.estimatedHours / 10, 0, 1);
  const difficultyNorm = clamp(((difficulty ?? 3) - 1) / 4, 0, 1);
  let score =
    0.45 * urgency +
    0.3 * priorityNorm +
    0.15 * effortNorm +
    0.1 * difficultyNorm;
  if (deadline.getTime() < now.getTime()) {
    score = Math.min(score + 0.2, 1);
  }
  return score;
}
