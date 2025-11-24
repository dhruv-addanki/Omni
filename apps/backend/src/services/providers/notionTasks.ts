import { IntegrationProvider } from '@prisma/client';
import { TaskProvider, ExternalTaskInput } from './types';

// Placeholder: wire real Notion API (search databases, query tasks) here.
export const notionTaskProvider: TaskProvider = {
  provider: IntegrationProvider.NOTION,
  async fetchTasks(_userId: string, _params?: { updatedAfter?: Date }): Promise<ExternalTaskInput[]> {
    // TODO: Fetch OAuth tokens from IntegrationConnection and query Notion tasks.
    return [];
  }
};
