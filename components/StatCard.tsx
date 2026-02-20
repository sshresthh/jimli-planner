import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-zinc-200 bg-white shadow-lg shadow-zinc-200/40 transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/50">
      <div className="absolute top-0 right-0 h-32 w-32 -translate-y-1/2 translate-x-1/3 rounded-full bg-zinc-900/5 dark:bg-zinc-100/5 blur-[40px]" />
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-xs font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-5xl font-semibold tracking-tighter text-zinc-900 dark:text-zinc-50">{value}</div>
        {subtitle && <p className="mt-2 font-sans text-xs font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-none bg-white shadow-xl shadow-zinc-200/50 dark:bg-zinc-900 dark:shadow-black/50">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <CardTitle className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}
