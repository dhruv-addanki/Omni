import { IntegrationProvider, TaskStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { ExternalTaskInput } from './providers/types';

function mapStatus(status: string): TaskStatus {
  const normalized = status.toLowerCase();
  if (normalized.includes('done') || normalized.includes('complete')) return 'DONE';
  if (normalized.includes('progress')) return 'IN_PROGRESS';
  return 'TODO';
}

export async function upsertExternalTaskIntoOmniTask(
  userId: string,
  provider: IntegrationProvider,
  input: ExternalTaskInput
) {
  // Persist raw external task for auditing/dedupe.
  const external = await prisma.externalTask.upsert({
    where: {
      userId_provider_externalId: {
        userId,
        provider,
        externalId: input.externalId
      }
    },
    update: {
      title: input.title,
      status: input.status,
      due: input.due || null,
      projectName: input.projectName || null,
      dataJSON: input.dataJSON || undefined
    },
    create: {
      userId,
      provider,
      externalId: input.externalId,
      title: input.title,
      status: input.status,
      due: input.due || null,
      projectName: input.projectName || null,
      dataJSON: input.dataJSON || undefined
    }
  });

  const status = mapStatus(input.status);

  const task = await prisma.task.upsert({
    where: {
      userId_externalProvider_externalId: {
        userId,
        externalProvider: provider,
        externalId: input.externalId
      }
    },
    update: {
      title: input.title,
      status,
      scheduledEnd: input.due || undefined
    },
    create: {
      userId,
      title: input.title,
      status,
      source: provider === IntegrationProvider.NOTION ? 'NOTION' : provider === IntegrationProvider.ASANA ? 'ASANA' : provider === IntegrationProvider.LINEAR ? 'LINEAR' : 'OMNI',
      externalProvider: provider,
      externalId: input.externalId,
      scheduledEnd: input.due || undefined
    }
  });

  return { external, task };
}
