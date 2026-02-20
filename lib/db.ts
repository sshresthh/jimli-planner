import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import { encryptDatabase, decryptDatabase } from "./crypto";
import type { CasEntry, PlannerSettings, Subject, Task, TokEntry, EeEntry } from "./types";

const DB_KEY = "ibplanner-db";
const SALT_KEY = "ibplanner-salt";
const IDB_NAME = "ibplanner-storage";
const IDB_STORE = "files";

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbInstance: Database | null = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet(key: string) {
  const db = await openIdb();
  return new Promise<ArrayBuffer | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

async function idbSet(key: string, value: ArrayBuffer) {
  const db = await openIdb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function hasDbFile(): Promise<boolean> {
  const db = await openIdb();
  return new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.count(DB_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result > 0);
  });
}

export async function getDbSalt(): Promise<Uint8Array | null> {
  const buffer = await idbGet(SALT_KEY);
  if (!buffer) return null;
  return new Uint8Array(buffer);
}

export async function setDbSalt(salt: Uint8Array): Promise<void> {
  await idbSet(SALT_KEY, salt.buffer as ArrayBuffer);
}

export async function loadDbFile(cryptoKey?: CryptoKey): Promise<Uint8Array | null> {
  const buffer = await idbGet(DB_KEY);
  if (!buffer) {
    return null;
  }
  const payload = new Uint8Array(buffer);
  if (!cryptoKey) {
    return payload; // Fallback for unencrypted dev instances
  }
  return await decryptDatabase(payload, cryptoKey);
}

export async function saveDbFile(data: Uint8Array, cryptoKey?: CryptoKey) {
  let finalData = data;
  if (cryptoKey) {
    finalData = await encryptDatabase(data, cryptoKey);
  }
  await idbSet(DB_KEY, finalData.buffer as ArrayBuffer);
}

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      try {
        const response = await fetch("/sql-wasm.wasm");
        if (!response.ok) {
          throw new Error(`Failed to fetch sql-wasm.wasm (${response.status})`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(
            "Next.js Turbopack is serving HTML instead of the WASM binary. ACTION REQUIRED: Please restart your dev server (Ctrl+C and run 'bun run dev') so Turbopack can index the newly created /public/sql-wasm.wasm file."
          );
        }

        const buffer = await response.arrayBuffer();
        return await initSqlJs({ wasmBinary: buffer });
      } catch (err) {
        console.error("SQL.js Init Error:", err);
        throw err;
      }
    })();
  }
  return sqlPromise;
}

export async function initDb(cryptoKey?: CryptoKey) {
  if (dbInstance) {
    return dbInstance;
  }
  const SQL = await getSql();
  const dbFile = await loadDbFile(cryptoKey);
  const db = dbFile ? new SQL.Database(dbFile) : new SQL.Database();
  runMigrations(db);
  dbInstance = db;
  return db;
}

export function runMigrations(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      color TEXT,
      difficulty INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      type TEXT NOT NULL,
      deadlineDateTime TEXT NOT NULL,
      estimatedHours REAL NOT NULL,
      priority INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      completedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS cas_entries (
      id TEXT PRIMARY KEY,
      strand TEXT NOT NULL,
      dateStart TEXT NOT NULL,
      dateEnd TEXT,
      hours REAL NOT NULL,
      reflectionText TEXT NOT NULL,
      evidenceUri TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadlineDateTime);
    CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
    CREATE INDEX IF NOT EXISTS tasks_subject_idx ON tasks(subjectId);
    CREATE INDEX IF NOT EXISTS cas_date_idx ON cas_entries(dateStart);
    CREATE TABLE IF NOT EXISTS tok_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      reflectionText TEXT NOT NULL,
      evidenceUri TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS ee_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      reflectionText TEXT NOT NULL,
      evidenceUri TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS tok_date_idx ON tok_entries(date);
    CREATE INDEX IF NOT EXISTS ee_date_idx ON ee_entries(date);
  `);

  const version = getSetting(db, "schema_version");
  if (!version) {
    setSetting(db, "schema_version", "1");
  }
}

function getSetting(db: Database, key: string) {
  const rows = all<{ value: string }>(
    db,
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return rows[0]?.value ?? null;
}

function setSetting(db: Database, key: string, value: string) {
  run(db, "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
    key,
    value,
  ]);
}

function run(db: Database, sql: string, params: Array<string | number | null>) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
}

function all<T>(db: Database, sql: string, params: Array<string | number | null> = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function fetchSubjects(db: Database): Subject[] {
  return all<Subject>(
    db,
    "SELECT * FROM subjects ORDER BY name ASC"
  ).map((subject) => ({
    ...subject,
    difficulty: subject.difficulty ?? null,
  }));
}

export function fetchTasks(db: Database): Task[] {
  return all<Task>(db, "SELECT * FROM tasks").map((task) => ({
    ...task,
    estimatedHours: Number(task.estimatedHours ?? 0),
    priority: Number(task.priority ?? 1),
  }));
}

export function fetchCasEntries(db: Database): CasEntry[] {
  return all<CasEntry>(db, "SELECT * FROM cas_entries ORDER BY dateStart DESC").map(
    (entry) => ({
      ...entry,
      hours: Number(entry.hours ?? 0),
    })
  );
}

export function fetchTokEntries(db: Database): TokEntry[] {
  return all<TokEntry>(db, "SELECT * FROM tok_entries ORDER BY date DESC");
}

export function fetchEeEntries(db: Database): EeEntry[] {
  return all<EeEntry>(db, "SELECT * FROM ee_entries ORDER BY date DESC");
}

export function fetchPlannerSettings(db: Database): PlannerSettings | null {
  const raw = getSetting(db, "planner_settings");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PlannerSettings;
  } catch {
    return null;
  }
}

export function savePlannerSettings(db: Database, settings: PlannerSettings) {
  setSetting(db, "planner_settings", JSON.stringify(settings));
}

export function createSubject(db: Database, subject: Subject) {
  run(
    db,
    `INSERT INTO subjects (id, name, color, difficulty, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, " ")
      .trim(),
    [
      subject.id,
      subject.name,
      subject.color ?? null,
      subject.difficulty ?? null,
      subject.createdAt,
      subject.updatedAt,
    ]
  );
}

export function updateSubject(db: Database, subject: Subject) {
  run(
    db,
    `UPDATE subjects
     SET name = ?, color = ?, difficulty = ?, updatedAt = ?
     WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [
      subject.name,
      subject.color ?? null,
      subject.difficulty ?? null,
      subject.updatedAt,
      subject.id,
    ]
  );
}

export function deleteSubject(db: Database, subjectId: string) {
  run(db, "DELETE FROM subjects WHERE id = ?", [subjectId]);
}

export function createTask(db: Database, task: Task) {
  run(
    db,
    `INSERT INTO tasks (
      id, title, subjectId, type, deadlineDateTime, estimatedHours, priority,
      status, notes, createdAt, updatedAt, completedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, " ")
      .trim(),
    [
      task.id,
      task.title,
      task.subjectId,
      task.type,
      task.deadlineDateTime,
      task.estimatedHours,
      task.priority,
      task.status,
      task.notes ?? null,
      task.createdAt,
      task.updatedAt,
      task.completedAt ?? null,
    ]
  );
}

export function updateTask(db: Database, task: Task) {
  run(
    db,
    `UPDATE tasks
     SET title = ?, subjectId = ?, type = ?, deadlineDateTime = ?, estimatedHours = ?,
         priority = ?, status = ?, notes = ?, updatedAt = ?, completedAt = ?
     WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [
      task.title,
      task.subjectId,
      task.type,
      task.deadlineDateTime,
      task.estimatedHours,
      task.priority,
      task.status,
      task.notes ?? null,
      task.updatedAt,
      task.completedAt ?? null,
      task.id,
    ]
  );
}

export function deleteTask(db: Database, taskId: string) {
  run(db, "DELETE FROM tasks WHERE id = ?", [taskId]);
}

export function toggleTaskStatus(db: Database, task: Task) {
  const now = new Date().toISOString();
  const isDone = task.status === "Done";
  const nextStatus = isDone ? "NotStarted" : "Done";
  run(
    db,
    `UPDATE tasks SET status = ?, updatedAt = ?, completedAt = ? WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [nextStatus, now, isDone ? null : now, task.id]
  );
}

export function createCasEntry(db: Database, entry: CasEntry) {
  run(
    db,
    `INSERT INTO cas_entries (
      id, strand, dateStart, dateEnd, hours, reflectionText, evidenceUri,
      createdAt, updatedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.id,
      entry.strand,
      entry.dateStart,
      entry.dateEnd ?? null,
      entry.hours,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.createdAt,
      entry.updatedAt,
    ]
  );
}

export function updateCasEntry(db: Database, entry: CasEntry) {
  run(
    db,
    `UPDATE cas_entries
     SET strand = ?, dateStart = ?, dateEnd = ?, hours = ?, reflectionText = ?,
         evidenceUri = ?, updatedAt = ?
     WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.strand,
      entry.dateStart,
      entry.dateEnd ?? null,
      entry.hours,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.updatedAt,
      entry.id,
    ]
  );
}

export function deleteCasEntry(db: Database, entryId: string) {
  run(db, "DELETE FROM cas_entries WHERE id = ?", [entryId]);
}

export function createTokEntry(db: Database, entry: TokEntry) {
  run(
    db,
    `INSERT INTO tok_entries (
      id, date, title, reflectionText, evidenceUri,
      createdAt, updatedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.id,
      entry.date,
      entry.title,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.createdAt,
      entry.updatedAt,
    ]
  );
}

export function updateTokEntry(db: Database, entry: TokEntry) {
  run(
    db,
    `UPDATE tok_entries
     SET date = ?, title = ?, reflectionText = ?,
         evidenceUri = ?, updatedAt = ?
     WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.date,
      entry.title,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.updatedAt,
      entry.id,
    ]
  );
}

export function deleteTokEntry(db: Database, entryId: string) {
  run(db, "DELETE FROM tok_entries WHERE id = ?", [entryId]);
}

export function createEeEntry(db: Database, entry: EeEntry) {
  run(
    db,
    `INSERT INTO ee_entries (
      id, date, title, reflectionText, evidenceUri,
      createdAt, updatedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.id,
      entry.date,
      entry.title,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.createdAt,
      entry.updatedAt,
    ]
  );
}

export function updateEeEntry(db: Database, entry: EeEntry) {
  run(
    db,
    `UPDATE ee_entries
     SET date = ?, title = ?, reflectionText = ?,
         evidenceUri = ?, updatedAt = ?
     WHERE id = ?`
      .replace(/\s+/g, " ")
      .trim(),
    [
      entry.date,
      entry.title,
      entry.reflectionText,
      entry.evidenceUri ?? null,
      entry.updatedAt,
      entry.id,
    ]
  );
}

export function deleteEeEntry(db: Database, entryId: string) {
  run(db, "DELETE FROM ee_entries WHERE id = ?", [entryId]);
}
