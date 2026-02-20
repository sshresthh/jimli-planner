"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDb } from "../../../components/DbProvider";
import { exportCasEntriesCsv } from "../../../lib/csv";
import type { CasEntry, CasStrand } from "../../../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Edit2, Trash2, ExternalLink } from "lucide-react";

const STRANDS: CasStrand[] = ["Creativity", "Activity", "Service"];

export default function CasPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading CAS data...</div>}>
      <CasContent />
    </Suspense>
  );
}

function CasContent() {
  const { ready, casEntries, actions } = useDb();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CasEntry | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalOpen(true);
      setEditingEntry(null);
    }
  }, [searchParams]);

  const totals = useMemo(() => {
    return casEntries.reduce(
      (acc, entry) => {
        acc.total += entry.hours;
        acc.byStrand[entry.strand] = (acc.byStrand[entry.strand] ?? 0) + entry.hours;
        return acc;
      },
      { total: 0, byStrand: { Creativity: 0, Activity: 0, Service: 0 } as Record<CasStrand, number> }
    );
  }, [casEntries]);

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this CAS entry?")) {
      return;
    }
    await actions.deleteCasEntry(entryId);
  };

  const handleExport = () => {
    const csv = exportCasEntriesCsv(casEntries);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cas-entries.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (entry: CasEntry) => {
    if (editingEntry) {
      await actions.updateCasEntry(entry);
    } else {
      await actions.createCasEntry(entry);
    }
    setModalOpen(false);
    setEditingEntry(null);
  };

  if (!ready) {
    return <div className="p-8">Loading CAS data...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-4 md:px-8 max-w-5xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            CAS Tracker
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Creativity, Activity, Service
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full bg-white dark:bg-zinc-900 shadow-sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="rounded-full shadow-md transition-all hover:-translate-y-0.5" onClick={() => { setEditingEntry(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Entry
          </Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-50">
          <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total Hours</p>
          <p className="font-display mt-2 text-5xl font-semibold text-white dark:text-zinc-900">
            {totals.total.toFixed(1)}
          </p>
        </div>
        {STRANDS.map((strand) => (
          <div key={strand} className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div
              className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/3 rounded-full blur-[30px] opacity-20 bg-zinc-400 dark:bg-zinc-600"
            />
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-zinc-500">{strand}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">{totals.byStrand[strand].toFixed(1)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {casEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-24 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="font-sans text-lg font-medium text-zinc-500">
              No CAS entries yet. Add your experiences to track hours and reflections.
            </p>
          </div>
        ) : (
          casEntries.map((entry) => (
            <div key={entry.id} className="group flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-lg font-bold text-zinc-900 dark:text-zinc-50">{entry.strand}</h3>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {entry.hours.toFixed(1)}h
                    </span>
                  </div>
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {entry.dateStart}
                    {entry.dateEnd ? ` to ${entry.dateEnd}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => { setEditingEntry(entry); setModalOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
                <p className="font-serif text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{entry.reflectionText}</p>
              </div>

              {entry.evidenceUri && (
                <div className="mt-1">
                  <a
                    className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    href={entry.evidenceUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" /> View Evidence
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingEntry ? "Edit CAS Entry" : "New CAS Entry"}
            </DialogTitle>
          </DialogHeader>
          <CasForm
            entry={editingEntry}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CasForm({
  entry,
  onCancel,
  onSubmit,
}: {
  entry: CasEntry | null;
  onCancel: () => void;
  onSubmit: (entry: CasEntry) => void;
}) {
  const [strand, setStrand] = useState<CasStrand>(entry?.strand ?? "Creativity");
  const [dateStart, setDateStart] = useState(entry?.dateStart ?? "");
  const [dateEnd, setDateEnd] = useState(entry?.dateEnd ?? "");
  const [hours, setHours] = useState(entry?.hours.toString() ?? "");
  const [reflectionText, setReflectionText] = useState(entry?.reflectionText ?? "");
  const [evidenceUri, setEvidenceUri] = useState(entry?.evidenceUri ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim()) {
      setError("Reflection is required for CAS entries.");
      return;
    }
    if (Number(hours) <= 0) {
      setError("Hours must be greater than 0.");
      return;
    }
    if (!dateStart) {
      setError("Start date is required.");
      return;
    }

    setError(null);
    const now = new Date().toISOString();
    onSubmit({
      id: entry?.id ?? crypto.randomUUID(),
      strand,
      dateStart,
      dateEnd: dateEnd.trim() ? dateEnd : null,
      hours: Number(hours),
      reflectionText,
      evidenceUri: evidenceUri.trim() ? evidenceUri : null,
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="strand" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          CAS Strand
        </Label>
        <select
          id="strand"
          className="flex h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300"
          value={strand}
          onChange={(event) => setStrand(event.target.value as CasStrand)}
        >
          {STRANDS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateStart" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Start Date
          </Label>
          <Input
            id="dateStart"
            type="date"
            className="h-11 shadow-sm"
            value={dateStart}
            onChange={(event) => setDateStart(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateEnd" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            End Date <span className="text-zinc-400 normal-case font-medium">(Optional)</span>
          </Label>
          <Input
            id="dateEnd"
            type="date"
            className="h-11 shadow-sm"
            value={dateEnd}
            onChange={(event) => setDateEnd(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="hours" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Hours
        </Label>
        <Input
          id="hours"
          type="number"
          min="0"
          step="0.5"
          className="h-11 shadow-sm font-mono text-base"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          placeholder="e.g. 2.5"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reflectionText" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Reflection <span className="text-zinc-400 normal-case font-medium">(Required)</span>
        </Label>
        <Textarea
          id="reflectionText"
          className="min-h-[140px] resize-y shadow-sm font-serif text-base leading-relaxed"
          value={reflectionText}
          onChange={(event) => setReflectionText(event.target.value)}
          placeholder="What did you learn from this experience? How did it help you grow?"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="evidenceUri" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Evidence Link <span className="text-zinc-400 normal-case font-medium">(Optional)</span>
        </Label>
        <Input
          id="evidenceUri"
          type="url"
          className="h-11 shadow-sm"
          value={evidenceUri}
          onChange={(event) => setEvidenceUri(event.target.value)}
          placeholder="https://"
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="h-11 sm:w-auto">
          {entry ? "Save Changes" : "Create Entry"}
        </Button>
      </div>
    </form>
  );
}
