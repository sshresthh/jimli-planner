"use client";

import { useMemo, useState } from "react";
import { useDb } from "../../../components/DbProvider";
import type { Subject } from "../../../lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function SubjectsPage() {
  const { ready, subjects, tasks, actions } = useDb();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const pendingBySubject = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      if (task.status !== "Done") {
        acc[task.subjectId] = (acc[task.subjectId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [tasks]);

  const openNew = () => {
    setEditingSubject(null);
    setModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setModalOpen(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm("Delete this subject? Tasks will remain but be unassigned.")) {
      return;
    }
    await actions.deleteSubject(subjectId);
  };

  const handleSubmit = async (subject: Subject) => {
    if (editingSubject) {
      await actions.updateSubject(subject);
    } else {
      await actions.createSubject(subject);
    }
    setModalOpen(false);
    setEditingSubject(null);
  };

  if (!ready) {
    return <div className="p-8">Loading subjects...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-4 md:px-8 max-w-5xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Course Load
          </h1>
          <p className="font-sans text-sm text-zinc-500">
            Manage your IB subjects and their relative difficulty.
          </p>
        </div>
        <Button className="rounded-full shadow-md transition-all hover:-translate-y-0.5" size="lg" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-24 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="font-sans text-lg font-medium text-zinc-500">
              No subjects added yet. Add your IB subjects to start organizing tasks.
            </p>
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
              <div
                className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/3 rounded-full blur-[30px] transition-opacity group-hover:opacity-80 opacity-20 bg-zinc-400 dark:bg-zinc-600"
              />
              <div className="relative flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {subject.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Difficulty {subject.difficulty ?? 3}
                  </span>
                </div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {pendingBySubject[subject.id] ?? 0} Pending Tasks
                </p>
              </div>
              <div className="relative mt-8 flex w-full items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <Button variant="ghost" size="sm" className="h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => openEdit(subject)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete(subject.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingSubject ? "Edit Subject" : "New Subject"}
            </DialogTitle>
          </DialogHeader>
          <SubjectForm
            subject={editingSubject}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubjectForm({
  subject,
  onCancel,
  onSubmit,
}: {
  subject: Subject | null;
  onCancel: () => void;
  onSubmit: (subject: Subject) => void;
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [difficulty, setDifficulty] = useState(subject?.difficulty ?? 3);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }
    if (difficulty < 1 || difficulty > 5) {
      setError("Difficulty must be between 1 and 5.");
      return;
    }

    setError(null);
    const now = new Date().toISOString();
    onSubmit({
      id: subject?.id ?? crypto.randomUUID(),
      name: name.trim(),
      difficulty,
      createdAt: subject?.createdAt ?? now,
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
        <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Subject Name
        </Label>
        <Input
          id="name"
          className="h-11 font-sans text-base shadow-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Mathematics AA HL"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="difficulty" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Difficulty Level
          </Label>
          <span className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">{difficulty}/5</span>
        </div>
        <input
          id="difficulty"
          type="range"
          min="1"
          max="5"
          className="w-full accent-zinc-900 dark:accent-zinc-100"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        />
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <span>Easy</span>
          <span>Hard</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="h-11 sm:w-auto">
          {subject ? "Save Changes" : "Create Subject"}
        </Button>
      </div>
    </form>
  );
}
