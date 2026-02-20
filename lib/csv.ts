import type { CasEntry, Task } from "./types";

function escapeValue(value: string | number | null | undefined) {
  const safe = value === null || value === undefined ? "" : String(value);
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const headerRow = headers.map(escapeValue).join(",");
  const dataRows = rows.map((row) => row.map(escapeValue).join(","));
  return [headerRow, ...dataRows].join("\n");
}

export function exportCasEntriesCsv(entries: CasEntry[]) {
  const headers = [
    "Strand",
    "Date Start",
    "Date End",
    "Hours",
    "Reflection",
    "Evidence",
  ];
  const rows = entries.map((entry) => [
    entry.strand,
    entry.dateStart,
    entry.dateEnd ?? "",
    entry.hours,
    entry.reflectionText,
    entry.evidenceUri ?? "",
  ]);
  return toCsv(headers, rows);
}

export function exportTasksCsv(tasks: Task[]) {
  const headers = [
    "Title",
    "SubjectId",
    "Type",
    "Deadline",
    "Estimated Hours",
    "Priority",
    "Status",
    "Notes",
  ];
  const rows = tasks.map((task) => [
    task.title,
    task.subjectId,
    task.type,
    task.deadlineDateTime,
    task.estimatedHours,
    task.priority,
    task.status,
    task.notes ?? "",
  ]);
  return toCsv(headers, rows);
}
