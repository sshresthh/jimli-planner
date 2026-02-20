export type TaskType = "IA" | "EE" | "HW" | "Test" | "Revision" | "CAS";
export type TaskStatus = "NotStarted" | "InProgress" | "Done";
export type CasStrand = "Creativity" | "Activity" | "Service";

export type Task = {
  id: string;
  title: string;
  subjectId: string;
  type: TaskType;
  deadlineDateTime: string;
  estimatedHours: number;
  priority: number;
  status: TaskStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  color?: string | null;
  difficulty?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CasEntry = {
  id: string;
  strand: CasStrand;
  dateStart: string;
  dateEnd?: string | null;
  hours: number;
  reflectionText: string;
  evidenceUri?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TokEntry = {
  id: string;
  date: string;
  title: string;
  reflectionText: string;
  evidenceUri?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EeEntry = {
  id: string;
  date: string;
  title: string;
  reflectionText: string;
  evidenceUri?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerSettings = {
  hoursByDay: Record<number, number>;
  bufferHours: number;
  weekStart: "monday" | "sunday";
};

export type TaskFilters = {
  subjectIds: string[];
  types: TaskType[];
  statuses: TaskStatus[];
  dueSoonOnly: boolean;
  search: string;
};

export type TaskSort = "deadline" | "priority" | "subject" | "score";

export type PlannerAllocation = {
  taskId: string;
  title: string;
  hours: number;
};

export type PlannerDay = {
  date: string;
  allocations: PlannerAllocation[];
  availableHours: number;
  usedHours: number;
  overload: boolean;
};
