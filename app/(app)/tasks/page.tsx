"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDb } from "../../../components/DbProvider";
import { UrgencyBadge } from "../../../components/Badge";
import { getUrgencyLabel } from "../../../lib/date";
import { getSmartScore } from "../../../lib/score";
import type { TaskSort, Task, TaskType, Subject, TaskStatus } from "../../../lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Search, Plus, Filter, ArrowUpDown, Edit2, Trash2, CheckCircle2, CalendarIcon, Clock } from "lucide-react";

const TYPES: TaskType[] = ["IA", "EE", "HW", "Test", "Revision", "CAS"];
const STATUSES: TaskStatus[] = ["NotStarted", "InProgress", "Done"];

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const { ready, tasks, subjects, actions } = useDb();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("deadline");

  const [selectedTypes, setSelectedTypes] = useState<TaskType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [dueSoonOnly, setDueSoonOnly] = useState(false);

  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalOpen(true);
      setEditingTask(null);
    }
  }, [searchParams]);

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await actions.deleteTask(taskId);
  };

  const handleToggleStatus = async (task: Task) => {
    await actions.toggleTaskStatus(task);
  };

  const handleSubmit = async (task: Task) => {
    if (editingTask) {
      await actions.updateTask(task);
    } else {
      await actions.createTask(task);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

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

  const filteredTasks = useMemo(() => {
    const days7 = addDays(new Date(), 7);
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) return false;
      if (selectedSubjects.length > 0 && !selectedSubjects.includes(t.subjectId)) return false;
      if (dueSoonOnly) {
        const deadline = new Date(t.deadlineDateTime);
        if (isAfter(deadline, days7) || t.status === "Done") return false;
      }
      return true;
    });
  }, [tasks, search, selectedTypes, selectedStatuses, selectedSubjects, dueSoonOnly]);

  const sortedTasks = useMemo(() => {
    const now = new Date();
    return [...filteredTasks].sort((a, b) => {
      if (sort === "deadline") {
        return new Date(a.deadlineDateTime).getTime() - new Date(b.deadlineDateTime).getTime();
      }
      if (sort === "priority") {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(a.deadlineDateTime).getTime() - new Date(b.deadlineDateTime).getTime();
      }
      if (sort === "subject") {
        const nameA = subjectMap[a.subjectId] || "";
        const nameB = subjectMap[b.subjectId] || "";
        return nameA.localeCompare(nameB);
      }
      if (sort === "score") {
        const scoreA = getSmartScore(a, difficultyMap[a.subjectId], now);
        const scoreB = getSmartScore(b, difficultyMap[b.subjectId], now);
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [filteredTasks, sort, subjectMap, difficultyMap]);

  if (!ready) {
    return <div className="p-8">Loading tasks...</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-32 pt-12 px-4 md:px-8 max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tasks
          </h1>
          <p className="font-sans text-sm text-zinc-500">
            {tasks.length} total tasks · {tasks.filter(t => t.status === "Done").length} completed
          </p>
        </div>
        <Button className="rounded-full shadow-md transition-all hover:-translate-y-0.5" size="lg" onClick={() => { setEditingTask(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <Filter className="mr-2 h-4 w-4" /> Filter
                {(selectedTypes.length + selectedStatuses.length + selectedSubjects.length + (dueSoonOnly ? 1 : 0)) > 0 && (
                  <span className="ml-2 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-1.5 py-0.5 text-[10px] font-bold">
                    {selectedTypes.length + selectedStatuses.length + selectedSubjects.length + (dueSoonOnly ? 1 : 0)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 shadow-xl rounded-2xl flex flex-col gap-5 dark:bg-zinc-950 dark:border-zinc-800" align="end">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-50">Filters</span>
                {(selectedTypes.length + selectedStatuses.length + selectedSubjects.length + (dueSoonOnly ? 1 : 0)) > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => {
                    setSelectedTypes([]);
                    setSelectedStatuses([]);
                    setSelectedSubjects([]);
                    setDueSoonOnly(false);
                  }}>
                    Clear all
                  </Button>
                )}
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Subject</span>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map(sub => {
                      const active = selectedSubjects.includes(sub.id);
                      return (
                        <button key={sub.id} onClick={() => setSelectedSubjects(prev => active ? prev.filter(id => id !== sub.id) : [...prev, sub.id])} className={cn("px-2.5 py-1 rounded-md text-xs font-bold transition-colors border", active ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800")}>
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Task Type</span>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map(type => {
                    const active = selectedTypes.includes(type);
                    return (
                      <button key={type} onClick={() => setSelectedTypes(prev => active ? prev.filter(t => t !== type) : [...prev, type])} className={cn("px-2.5 py-1 rounded-md text-xs font-bold transition-colors border", active ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800")}>
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(status => {
                    const active = selectedStatuses.includes(status);
                    return (
                      <button key={status} onClick={() => setSelectedStatuses(prev => active ? prev.filter(s => s !== status) : [...prev, status])} className={cn("px-2.5 py-1 rounded-md text-xs font-bold transition-colors border", active ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800")}>
                        {status === "NotStarted" ? "To Do" : status === "InProgress" ? "In Progress" : "Done"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setDueSoonOnly(prev => !prev)} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border transition-colors", dueSoonOnly ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300" : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800")}>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-bold">Due Soon</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Next 7 Days</span>
                  </div>
                  <div className={cn("h-4 w-4 rounded-full border-2", dueSoonOnly ? "bg-red-500 border-red-500" : "border-zinc-300 dark:border-zinc-600")} />
                </button>
              </div>

            </PopoverContent>
          </Popover>
          <Button variant="outline" className="rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" onClick={() => setSort((prev) => prev === "deadline" ? "score" : prev === "score" ? "priority" : "deadline")}>
            <ArrowUpDown className="mr-2 h-4 w-4" /> Sort: {sort}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sortedTasks.map((task) => {
          const label = getUrgencyLabel(task, new Date());
          return (
            <div key={task.id} className="group relative flex flex-col gap-4 rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm shadow-zinc-200/50 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleStatus(task)} className="focus:outline-none flex-shrink-0">
                    <CheckCircle2 className={`h-6 w-6 transition-colors ${task.status === "Done" ? "text-emerald-500 hover:text-emerald-600" : "text-zinc-300 hover:text-emerald-400 dark:text-zinc-700 dark:hover:text-emerald-500"}`} />
                  </button>
                  <h3 className={`font-sans text-base font-bold ${task.status === "Done" ? "text-zinc-400 line-through dark:text-zinc-600" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {task.title}
                  </h3>
                  <UrgencyBadge label={label}>{label}</UrgencyBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-sans text-xs font-semibold uppercase tracking-wider text-zinc-400 ml-9">
                  <span className="text-zinc-600 dark:text-zinc-300">{subjectMap[task.subjectId] ?? "No Subject"}</span>
                  <span className="opacity-50">•</span>
                  <span>{task.type}</span>
                  <span className="opacity-50">•</span>
                  <span>Priority {task.priority}</span>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 md:items-end">
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 absolute right-4 top-4 md:relative md:top-0 md:right-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => { setEditingTask(task); setModalOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <span className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-200 mt-6 md:mt-0">
                  {format(new Date(task.deadlineDateTime), "MMM d, yyyy")}
                </span>
                <span className="font-sans text-xs font-medium text-zinc-500">
                  {task.estimatedHours}h estimated
                </span>
              </div>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="font-sans text-lg font-medium text-zinc-500">No tasks found.</p>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            subjects={subjects}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskForm({
  task,
  subjects,
  onCancel,
  onSubmit,
}: {
  task: Task | null;
  subjects: Subject[];
  onCancel: () => void;
  onSubmit: (t: Task) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [subjectId, setSubjectId] = useState(task?.subjectId ?? (subjects[0]?.id || ""));
  const [type, setType] = useState<TaskType>(task?.type ?? "HW");
  const initialDate = task?.deadlineDateTime ? new Date(task.deadlineDateTime) : undefined;
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState<string>(
    initialDate ? format(initialDate, "HH:mm") : "23:59"
  );
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours.toString() ?? "");
  const [priority, setPriority] = useState(task?.priority.toString() ?? "3");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    if (!subjectId) return setError("Please select a valid Subject.");
    if (!date) return setError("Deadline date is required.");
    if (!time) return setError("Deadline time is required.");
    if (Number(estimatedHours) <= 0) return setError("Hours must be greater than 0.");
    if (Number(priority) < 1 || Number(priority) > 10) return setError("Priority must be between 1 and 10.");

    const [hours, minutes] = time.split(":").map(Number);
    const finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
    if (isNaN(finalDate.getTime())) return setError("Invalid deadline time.");

    setError(null);
    const now = new Date().toISOString();
    onSubmit({
      id: task?.id ?? crypto.randomUUID(),
      title,
      subjectId,
      type,
      deadlineDateTime: finalDate.toISOString(),
      estimatedHours: Number(estimatedHours),
      priority: Number(priority),
      status: task?.status ?? "NotStarted",
      notes: notes.trim() ? notes : null,
      createdAt: task?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const types: TaskType[] = ["IA", "EE", "HW", "Test", "Revision", "CAS"];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Task Title
        </Label>
        <Input
          id="title"
          className="h-11 shadow-sm font-sans text-base"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Physics IA First Draft"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="subjectId" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Subject
          </Label>
          <select
            id="subjectId"
            className="flex h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="" disabled>Select a subject...</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Task Type
          </Label>
          <select
            id="type"
            className="flex h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300"
            value={type}
            onChange={(event) => setType(event.target.value as TaskType)}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Deadline
        </Label>
        <div className="grid gap-4 md:grid-cols-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-11 w-full justify-start text-left font-normal shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
                  !date && "text-zinc-500 dark:text-zinc-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="time"
              className="h-11 pl-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="estimatedHours" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Estimated Hours
          </Label>
          <Input
            id="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            className="h-11 shadow-sm font-mono text-base"
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
            placeholder="2.5"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Priority (1-10)
          </Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            className="h-11 shadow-sm font-mono text-base"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Notes <span className="text-zinc-400 normal-case font-medium">(Optional)</span>
        </Label>
        <Textarea
          id="notes"
          className="min-h-[80px] resize-y shadow-sm font-sans text-base"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any specific requirements or rubric details..."
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" className="h-11 sm:w-auto">
          {task ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
