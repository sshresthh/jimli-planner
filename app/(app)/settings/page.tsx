"use client";

import { useState } from "react";
import { useDb } from "../../../components/DbProvider";
import { exportCasEntriesCsv, exportTasksCsv, exportTokEntriesCsv, exportEeEntriesCsv } from "../../../lib/csv";
import type { PlannerSettings } from "../../../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Save, LogOut } from "lucide-react";

const DAY_LABELS: Array<{ label: string; index: number }> = [
  { label: "Monday", index: 1 },
  { label: "Tuesday", index: 2 },
  { label: "Wednesday", index: 3 },
  { label: "Thursday", index: 4 },
  { label: "Friday", index: 5 },
  { label: "Saturday", index: 6 },
  { label: "Sunday", index: 0 },
];

export default function SettingsPage() {
  const { ready, plannerSettings, actions, tasks, casEntries, tokEntries, eeEntries, logout } = useDb();
  const [localSettings, setLocalSettings] = useState<PlannerSettings>(plannerSettings);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const updateHours = (index: number, value: number) => {
    setLocalSettings((prev) => ({
      ...prev,
      hoursByDay: { ...prev.hoursByDay, [index]: value },
    }));
  };

  const handleSave = async () => {
    await actions.savePlannerSettings(localSettings);
    setSaveMessage("Settings saved successfully.");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleExport = (type: "tasks" | "cas" | "tok" | "ee") => {
    let csv = "";
    let filename = "";
    if (type === "tasks") {
      csv = exportTasksCsv(tasks);
      filename = "tasks.csv";
    } else if (type === "cas") {
      csv = exportCasEntriesCsv(casEntries);
      filename = "cas-entries.csv";
    } else if (type === "tok") {
      csv = exportTokEntriesCsv(tokEntries);
      filename = "tok-entries.csv";
    } else if (type === "ee") {
      csv = exportEeEntriesCsv(eeEntries);
      filename = "ee-entries.csv";
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-32 pt-8 px-4 md:px-8 max-w-3xl mx-auto">
      <header className="flex flex-col gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          Settings
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Planner Preferences
        </h1>
      </header>

      <section className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">Study Planner Hours</h2>
          <p className="mt-1 font-sans text-sm text-zinc-500">
            Set realistic daily capacity for the study planner generator. It will allocate tasks across these hours.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {DAY_LABELS.map((day) => (
            <div key={day.label} className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{day.label}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                className="h-10 font-mono text-base shadow-sm"
                value={localSettings.hoursByDay[day.index] ?? 0}
                onChange={(event) => updateHours(day.index, Number(event.target.value))}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-6 border-t border-zinc-100 pt-6 dark:border-zinc-800 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Daily Buffer Hours
            </Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              className="h-10 font-mono text-base shadow-sm"
              value={localSettings.bufferHours}
              onChange={(event) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  bufferHours: Number(event.target.value),
                }))
              }
            />
            <p className="font-sans text-[10px] text-zinc-400">Time reserved for breaks and hobbies.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Week Starts On
            </Label>
            <select
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300"
              value={localSettings.weekStart}
              onChange={(event) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  weekStart: event.target.value as PlannerSettings["weekStart"],
                }))
              }
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
            <p className="font-sans text-[10px] text-zinc-400">Affects calendar and weekly progress.</p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <p className="font-sans text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {saveMessage}
          </p>
          <Button className="rounded-full shadow-md transition-all hover:-translate-y-0.5" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Preferences
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">Data Export</h2>
          <p className="mt-1 font-sans text-sm text-zinc-500">
            Download your data as CSV files for backup or external review.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" className="rounded-full bg-white shadow-sm dark:bg-zinc-900" onClick={() => handleExport("tasks")}>
            <Download className="mr-2 h-4 w-4" /> Export Tasks
          </Button>
          <Button variant="outline" className="rounded-full bg-white shadow-sm dark:bg-zinc-900" onClick={() => handleExport("cas")}>
            <Download className="mr-2 h-4 w-4" /> Export CAS
          </Button>
          <Button variant="outline" className="rounded-full bg-white shadow-sm dark:bg-zinc-900" onClick={() => handleExport("tok")}>
            <Download className="mr-2 h-4 w-4" /> Export TOK
          </Button>
          <Button variant="outline" className="rounded-full bg-white shadow-sm dark:bg-zinc-900" onClick={() => handleExport("ee")}>
            <Download className="mr-2 h-4 w-4" /> Export EE
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20 md:p-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-red-900 dark:text-red-50">Danger Zone</h2>
          <p className="mt-1 font-sans text-sm text-red-700 dark:text-red-400">
            Securely log out of your session. Your encrypted database will remain safe on your device.
          </p>
        </div>
        <div className="flex">
          <Button variant="destructive" className="rounded-full shadow-md transition-all hover:-translate-y-0.5" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </div>
      </section>
    </div>
  );
}
