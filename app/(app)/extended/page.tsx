"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDb } from "../../../components/DbProvider";
import { exportEeEntriesCsv } from "../../../lib/csv";
import type { EeEntry } from "../../../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Edit2, Trash2, ExternalLink } from "lucide-react";

export default function EePage() {
    return (
        <Suspense fallback={<div className="p-8">Loading Extended Essay data...</div>}>
            <EeContent />
        </Suspense>
    );
}

function EeContent() {
    const { ready, eeEntries, actions } = useDb();
    const searchParams = useSearchParams();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<EeEntry | null>(null);

    useEffect(() => {
        if (searchParams.get("new") === "1") {
            setModalOpen(true);
            setEditingEntry(null);
        }
    }, [searchParams]);

    const handleDelete = async (entryId: string) => {
        if (!confirm("Delete this Extended Essay entry?")) {
            return;
        }
        await actions.deleteEeEntry(entryId);
    };

    const handleExport = () => {
        const csv = exportEeEntriesCsv(eeEntries);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "ee-entries.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (entry: EeEntry) => {
        if (editingEntry) {
            await actions.updateEeEntry(entry);
        } else {
            await actions.createEeEntry(entry);
        }
        setModalOpen(false);
        setEditingEntry(null);
    };

    if (!ready) {
        return <div className="p-8">Loading Extended Essay data...</div>;
    }

    return (
        <div className="flex flex-col gap-6 pb-32 pt-8 px-4 md:px-8 max-w-5xl mx-auto">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-2">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                        Research Log
                    </p>
                    <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Extended Essay
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

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-50">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total Logs</p>
                    <p className="font-display mt-2 text-5xl font-semibold text-white dark:text-zinc-900">
                        {eeEntries.length}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
                {eeEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-24 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="font-sans text-lg font-medium text-zinc-500">
                            No Extended Essay entries yet. Track your research and supervisor meetings here.
                        </p>
                    </div>
                ) : (
                    eeEntries.map((entry) => (
                        <div key={entry.id} className="group flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <h3 className="font-sans text-lg font-bold text-zinc-900 dark:text-zinc-50">{entry.title}</h3>
                                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        {entry.date}
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
                                        <ExternalLink className="mr-1 h-3 w-3" /> View Source / Material Link
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
                            {editingEntry ? "Edit EE Entry" : "New EE Entry"}
                        </DialogTitle>
                    </DialogHeader>
                    <EeForm
                        entry={editingEntry}
                        onCancel={() => setModalOpen(false)}
                        onSubmit={handleSubmit}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function EeForm({
    entry,
    onCancel,
    onSubmit,
}: {
    entry: EeEntry | null;
    onCancel: () => void;
    onSubmit: (entry: EeEntry) => void;
}) {
    const [date, setDate] = useState(entry?.date ?? "");
    const [title, setTitle] = useState(entry?.title ?? "");
    const [reflectionText, setReflectionText] = useState(entry?.reflectionText ?? "");
    const [evidenceUri, setEvidenceUri] = useState(entry?.evidenceUri ?? "");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        if (!reflectionText.trim()) {
            setError("Notes are required.");
            return;
        }
        if (!date) {
            setError("Date is required.");
            return;
        }

        setError(null);
        const now = new Date().toISOString();
        onSubmit({
            id: entry?.id ?? crypto.randomUUID(),
            date,
            title,
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
                <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Date
                </Label>
                <Input
                    id="date"
                    type="date"
                    className="h-11 shadow-sm"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Title
                </Label>
                <Input
                    id="title"
                    type="text"
                    className="h-11 shadow-sm text-base"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Supervisor Meeting 1, Draft Submission..."
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="reflectionText" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Notes / Reflection <span className="text-zinc-400 normal-case font-medium">(Required)</span>
                </Label>
                <Textarea
                    id="reflectionText"
                    className="min-h-[140px] resize-y shadow-sm font-serif text-base leading-relaxed"
                    value={reflectionText}
                    onChange={(event) => setReflectionText(event.target.value)}
                    placeholder="What was discussed? What is your next step in the research process?"
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="evidenceUri" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Link to Source / Material <span className="text-zinc-400 normal-case font-medium">(Optional)</span>
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
