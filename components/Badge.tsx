import type { ReactNode } from "react";

const styles: Record<string, string> = {
  overdue: "bg-red-500/15 text-red-700 ring-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-400/30",
  today: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30",
  soon: "bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-400/30",
  week: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30",
  normal: "bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-300 dark:ring-zinc-400/30",
  done: "bg-zinc-100 text-zinc-400 ring-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-500 dark:ring-zinc-800",
};

export function UrgencyBadge({ label, children }: { label: string; children: ReactNode }) {
  const style = styles[label] ?? styles.normal;
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${style}`}>
      {children}
    </span>
  );
}
