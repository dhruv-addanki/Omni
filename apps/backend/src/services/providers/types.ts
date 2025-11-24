import { IntegrationProvider } from '@prisma/client';

export interface CalendarEventInput {
  externalId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  dataJSON?: Record<string, unknown>;
}

export interface CalendarProvider {
  provider: IntegrationProvider;
  fetchEvents: (userId: string, params: { start: Date; end: Date }) => Promise<CalendarEventInput[]>;
}

export interface ExternalTaskInput {
  externalId: string;
  title: string;
  status: string;
  due?: Date | null;
  projectName?: string | null;
  dataJSON?: Record<string, unknown>;
}

export interface TaskProvider {
  provider: IntegrationProvider;
  fetchTasks: (userId: string, params?: { updatedAfter?: Date }) => Promise<ExternalTaskInput[]>;
}
