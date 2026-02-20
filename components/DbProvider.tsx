"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CasEntry, PlannerSettings, Subject, Task, TokEntry, EeEntry } from "../lib/types";
import {
  createCasEntry,
  createSubject,
  createTask,
  deleteCasEntry,
  deleteSubject,
  deleteTask,
  fetchCasEntries,
  fetchTokEntries,
  fetchEeEntries,
  fetchPlannerSettings,
  fetchSubjects,
  fetchTasks,
  getDbSalt,
  hasDbFile,
  initDb,
  saveDbFile,
  savePlannerSettings,
  setDbSalt,
  toggleTaskStatus,
  updateCasEntry,
  updateSubject,
  updateTask,
  createTokEntry,
  updateTokEntry,
  deleteTokEntry,
  createEeEntry,
  updateEeEntry,
  deleteEeEntry,
} from "../lib/db";
import { deriveKey, generateSalt } from "../lib/crypto";
import { getDefaultPlannerSettings } from "../lib/planner";

type DbContextValue = {
  ready: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isNewDatabase: boolean;
  authError: string | null;
  authenticate: (password: string) => Promise<void>;
  logout: () => void;
  tasks: Task[];
  subjects: Subject[];
  casEntries: CasEntry[];
  tokEntries: TokEntry[];
  eeEntries: EeEntry[];
  plannerSettings: PlannerSettings;
  refresh: () => Promise<void>;
  actions: {
    createSubject: (subject: Subject) => Promise<void>;
    updateSubject: (subject: Subject) => Promise<void>;
    deleteSubject: (subjectId: string) => Promise<void>;
    createTask: (task: Task) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    toggleTaskStatus: (task: Task) => Promise<void>;
    createCasEntry: (entry: CasEntry) => Promise<void>;
    updateCasEntry: (entry: CasEntry) => Promise<void>;
    deleteCasEntry: (entryId: string) => Promise<void>;
    createTokEntry: (entry: TokEntry) => Promise<void>;
    updateTokEntry: (entry: TokEntry) => Promise<void>;
    deleteTokEntry: (entryId: string) => Promise<void>;
    createEeEntry: (entry: EeEntry) => Promise<void>;
    updateEeEntry: (entry: EeEntry) => Promise<void>;
    deleteEeEntry: (entryId: string) => Promise<void>;
    savePlannerSettings: (settings: PlannerSettings) => Promise<void>;
  };
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewDatabase, setIsNewDatabase] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [casEntries, setCasEntries] = useState<CasEntry[]>([]);
  const [tokEntries, setTokEntries] = useState<TokEntry[]>([]);
  const [eeEntries, setEeEntries] = useState<EeEntry[]>([]);
  const [plannerSettings, setPlannerSettingsState] = useState<PlannerSettings>(
    getDefaultPlannerSettings()
  );

  const dbRef = useRef<Awaited<ReturnType<typeof initDb>> | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  const loadAll = useCallback(() => {
    const db = dbRef.current;
    if (!db) return;
    setSubjects(fetchSubjects(db));
    setTasks(fetchTasks(db));
    setCasEntries(fetchCasEntries(db));
    setTokEntries(fetchTokEntries(db));
    setEeEntries(fetchEeEntries(db));
    setPlannerSettingsState(fetchPlannerSettings(db) ?? getDefaultPlannerSettings());
  }, []);

  const persist = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    await saveDbFile(db.export(), cryptoKeyRef.current ?? undefined);
  }, []);

  // 1. Initial Check: Does the DB exist?
  useEffect(() => {
    let active = true;
    hasDbFile()
      .then((exists) => {
        if (!active) return;
        setIsNewDatabase(!exists);
        setReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setError("Failed to check database storage: " + err.message);
      });
    return () => { active = false; };
  }, []);

  // 2. Authentication Flow
  const authenticate = useCallback(async (password: string) => {
    setAuthError(null);
    try {
      if (isNewDatabase) {
        // Create new salt and key
        const salt = generateSalt();
        await setDbSalt(salt);
        const cryptoKey = await deriveKey(password, salt);
        cryptoKeyRef.current = cryptoKey;

        // Initialize fresh database
        const db = await initDb(cryptoKey);
        dbRef.current = db;
        loadAll();
        // Encrypt and save the fresh empty DB immediately
        await persist();

        setIsAuthenticated(true);
        setIsNewDatabase(false);
      } else {
        // Existing database, try getting salt
        let salt = await getDbSalt();

        if (!salt) {
          // Legacy Database migration: It exists, but wasn't encrypted.
          // We will generate a new salt and encrypt it now!
          salt = generateSalt();
          await setDbSalt(salt);

          const cryptoKey = await deriveKey(password, salt);
          cryptoKeyRef.current = cryptoKey;

          // Load the UNENCRYPTED database first (no key passed to initDb)
          const db = await initDb();
          dbRef.current = db;
          loadAll();

          // Encrypt and save immediately with the new key!
          await persist();

          setIsAuthenticated(true);
        } else {
          // Standard encrypted flow
          const cryptoKey = await deriveKey(password, salt);
          cryptoKeyRef.current = cryptoKey;

          // Try decrypting and loading existing DB
          const db = await initDb(cryptoKey);
          dbRef.current = db;
          loadAll();
          setIsAuthenticated(true);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Invalid password")) {
        setAuthError("Invalid password. Please try again.");
      } else {
        setAuthError(err instanceof Error ? err.message : "Authentication failed.");
      }
    }
  }, [isNewDatabase, loadAll, persist]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    dbRef.current = null;
    cryptoKeyRef.current = null;
    setTasks([]);
    setSubjects([]);
    setCasEntries([]);
    setTokEntries([]);
    setEeEntries([]);
    setPlannerSettingsState(getDefaultPlannerSettings());
  }, []);

  const refresh = useCallback(async () => {
    loadAll();
  }, [loadAll]);

  const actions = useMemo(
    () => ({
      createSubject: async (subject: Subject) => {
        if (!dbRef.current) return;
        createSubject(dbRef.current, subject);
        await persist();
        loadAll();
      },
      updateSubject: async (subject: Subject) => {
        if (!dbRef.current) return;
        updateSubject(dbRef.current, subject);
        await persist();
        loadAll();
      },
      deleteSubject: async (subjectId: string) => {
        if (!dbRef.current) return;
        deleteSubject(dbRef.current, subjectId);
        await persist();
        loadAll();
      },
      createTask: async (task: Task) => {
        if (!dbRef.current) return;
        createTask(dbRef.current, task);
        await persist();
        loadAll();
      },
      updateTask: async (task: Task) => {
        if (!dbRef.current) return;
        updateTask(dbRef.current, task);
        await persist();
        loadAll();
      },
      deleteTask: async (taskId: string) => {
        if (!dbRef.current) return;
        deleteTask(dbRef.current, taskId);
        await persist();
        loadAll();
      },
      toggleTaskStatus: async (task: Task) => {
        if (!dbRef.current) return;
        toggleTaskStatus(dbRef.current, task);
        await persist();
        loadAll();
      },
      createCasEntry: async (entry: CasEntry) => {
        if (!dbRef.current) return;
        createCasEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      updateCasEntry: async (entry: CasEntry) => {
        if (!dbRef.current) return;
        updateCasEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      deleteCasEntry: async (entryId: string) => {
        if (!dbRef.current) return;
        deleteCasEntry(dbRef.current, entryId);
        await persist();
        loadAll();
      },
      createTokEntry: async (entry: TokEntry) => {
        if (!dbRef.current) return;
        createTokEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      updateTokEntry: async (entry: TokEntry) => {
        if (!dbRef.current) return;
        updateTokEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      deleteTokEntry: async (entryId: string) => {
        if (!dbRef.current) return;
        deleteTokEntry(dbRef.current, entryId);
        await persist();
        loadAll();
      },
      createEeEntry: async (entry: EeEntry) => {
        if (!dbRef.current) return;
        createEeEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      updateEeEntry: async (entry: EeEntry) => {
        if (!dbRef.current) return;
        updateEeEntry(dbRef.current, entry);
        await persist();
        loadAll();
      },
      deleteEeEntry: async (entryId: string) => {
        if (!dbRef.current) return;
        deleteEeEntry(dbRef.current, entryId);
        await persist();
        loadAll();
      },
      savePlannerSettings: async (settings: PlannerSettings) => {
        if (!dbRef.current) return;
        savePlannerSettings(dbRef.current, settings);
        setPlannerSettingsState(settings);
        await persist();
      },
    }),
    [loadAll, persist]
  );

  const value = useMemo<DbContextValue>(
    () => ({
      ready,
      error,
      isAuthenticated,
      isNewDatabase,
      authError,
      authenticate,
      logout,
      tasks,
      subjects,
      casEntries,
      tokEntries,
      eeEntries,
      plannerSettings,
      refresh,
      actions,
    }),
    [ready, error, isAuthenticated, isNewDatabase, authError, authenticate, logout, tasks, subjects, casEntries, tokEntries, eeEntries, plannerSettings, refresh, actions]
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error("useDb must be used inside DbProvider");
  }
  return context;
}
