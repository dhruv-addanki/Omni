export type ID = string;

export interface User {
  id: ID;
  email: string;
  name?: string;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: ID;
  userId: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  plannedMinutes?: number;
  actualMinutes?: number;
  dueDate?: string;
  completedAt?: string;
}

export interface FocusBlock {
  id: ID;
  userId: ID;
  taskId?: ID;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface DailySummary {
  userId: ID;
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  tasksCompleted: number;
  focusBlocks: number;
  summary: string;
  feedback: string;
}
