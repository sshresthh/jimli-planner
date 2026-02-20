"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { UrgencyBadge } from "../../components/Badge";
import { InfoCard, StatCard } from "../../components/StatCard";
import { useDb } from "../../components/DbProvider";
import { getUrgencyLabel, isInWeek } from "../../lib/date";
import { generateStudyPlan } from "../../lib/planner";
import type { Task } from "../../lib/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";

const UPCOMING_COUNT = 7;

export default function HomePage() {
  const { ready, error, tasks, subjects, plannerSettings } = useDb();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const subjectMap = useMemo(() => {
    return subjects.reduce<Record<string, string>>((acc, subject) => {
      acc[subject.id] = subject.name;
      return acc;
    }, {});
  }, [subjects]);

  const difficultyMap = useMemo(() => {
    return subjects.reduce<Record<string, number | null | undefined>>((acc, subject) => {
      acc[subject.id] = subject.difficulty;
      return acc;
    }, {});
  }, [subjects]);

  const overdueTasks = tasks.filter(
    (task) => getUrgencyLabel(task, now) === "overdue"
  );

  const todayTasks = tasks.filter(
    (task) => getUrgencyLabel(task, now) === "today"
  );

  const upcomingTasks = tasks
    .filter((task) => task.status !== "Done")
    .sort((a, b) =>
      new Date(a.deadlineDateTime).getTime() -
      new Date(b.deadlineDateTime).getTime()
    )
    .slice(0, UPCOMING_COUNT);

  const weekTasks = tasks.filter((task) =>
    isInWeek(task, plannerSettings.weekStart, now)
  );
  const weekCompleted = weekTasks.filter((task) => task.status === "Done");
  const weekPercent = weekTasks.length
    ? Math.round((weekCompleted.length / weekTasks.length) * 100)
    : 0;

  const planner = generateStudyPlan(tasks, difficultyMap, plannerSettings, now);
  const plannerPreview = planner.days.slice(0, 4);

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-bold text-red-600">Database Error</h1>
        <p className="text-sm text-zinc-500 max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-32 pt-12 px-4 md:px-8 max-w-6xl mx-auto selection:bg-zinc-200">
      <header className="flex flex-col gap-3">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          Dashboard
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          IB Life Planner
        </h1>
        <p className="font-sans text-lg font-medium text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
          A calm, clear look at what needs your attention.
        </p>
      </header>

      {!ready ? (
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-32 w-full rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50" />
        </div>
      ) : null}

      {overdueTasks.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
          <div className="absolute top-0 right-0 h-48 w-48 -translate-y-1/2 translate-x-1/3 rounded-full bg-red-900/5 dark:bg-red-100/5 blur-[40px]" />
          <div className="relative flex items-center justify-between">
            <span className="font-display text-xl font-semibold text-red-900 dark:text-red-400">
              Overdue tasks need attention
            </span>
            <UrgencyBadge label="overdue">Overdue {overdueTasks.length}</UrgencyBadge>
          </div>
          <p className="relative mt-2 font-sans text-sm font-medium text-red-700 dark:text-red-300">
            Open Tasks to reschedule or complete them.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Weekly Progress"
          value={`${weekPercent}%`}
          subtitle={`${weekCompleted.length} of ${weekTasks.length} due this week`}
        />
        <StatCard
          title="Due Today"
          value={`${todayTasks.length}`}
          subtitle="Items that land on your desk today"
        />
        <StatCard
          title="Active Subjects"
          value={`${subjects.length}`}
          subtitle="Subjects being tracked right now"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <InfoCard title="Upcoming deadlines">
          <div className="flex flex-col gap-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Nothing scheduled yet. Add a task to see it here.
              </p>
            ) : (
              upcomingTasks.map((task) => (
                <TaskRow key={task.id} task={task} subjectMap={subjectMap} now={now} />
              ))
            )}

            <div className="mt-2 text-right">
              <Button variant="link" asChild className="text-zinc-500 p-0 font-sans font-semibold tracking-wide hover:text-zinc-900 dark:hover:text-zinc-50">
                <Link href="/tasks">View all tasks &rarr;</Link>
              </Button>
            </div>
          </div>
        </InfoCard>

        <div className="flex flex-col gap-6">
          <InfoCard title="Quick actions">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => router.push("/tasks?new=1")} className="w-full sm:w-auto rounded-full shadow-lg shadow-zinc-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:shadow-none font-semibold px-8">
                Add Task
              </Button>
              <Button size="lg" onClick={() => router.push("/cas?new=1")} variant="secondary" className="w-full sm:w-auto rounded-full bg-white transition-all hover:-translate-y-0.5 shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 font-semibold px-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                Add CAS Entry
              </Button>
            </div>
          </InfoCard>

          <InfoCard title="Study planner preview">
            {plannerPreview.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Add tasks to generate a study plan.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {plannerPreview.map((day) => (
                  <div key={day.date} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      <span>{format(new Date(day.date), "EEE, MMM d")}</span>
                      <span>
                        {day.usedHours.toFixed(1)}h / {day.availableHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {day.allocations.length === 0 ? (
                        <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Open study block</span>
                      ) : (
                        day.allocations.map((allocation) => (
                          <div key={allocation.taskId} className="flex justify-between items-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            <span className="truncate pr-4">{allocation.title}</span>
                            <span className="text-xs font-bold text-zinc-400">{allocation.hours.toFixed(1)}h</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                {planner.overloaded ? (
                  <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                    Your plan is overloaded. Reduce scope or add available hours.
                  </p>
                ) : null}
              </div>
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  subjectMap,
  now,
}: {
  task: Task;
  subjectMap: Record<string, string>;
  now: Date;
}) {
  const label = getUrgencyLabel(task, now);
  return (
    <Link href={`/tasks?edit=${task.id}`} className="block group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-sans text-base font-bold text-zinc-900 group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-400 transition-colors">
            {task.title}
          </span>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {subjectMap[task.subjectId] ?? "Unassigned"} <span className="mx-1.5 opacity-50">•</span> {task.type} <span className="mx-1.5 opacity-50">•</span> {format(new Date(task.deadlineDateTime), "MMM d, yyyy")}
          </span>
        </div>
        <UrgencyBadge label={label}>{label === "today" ? "Today" : label}</UrgencyBadge>
      </div>
    </Link>
  );
}
