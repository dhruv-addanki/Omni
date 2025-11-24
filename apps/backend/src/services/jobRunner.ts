import prisma from '../lib/prisma';
import { JobStatus, JobType } from '@prisma/client';
import { runJob } from './aiCoach';
import { aggregateDailyMetrics } from './dailyMetrics';
import { upsertExternalTaskIntoOmniTask } from './externalTasks';

const MAX_ATTEMPTS = 3;

function backoffMs(attempts: number) {
  const delays = [5, 15, 60]; // minutes
  return (delays[Math.min(attempts, delays.length - 1)] || 60) * 60 * 1000;
}

async function handleJob(job: any) {
  switch (job.type as JobType) {
    case 'AI_JOB':
      await runJob(job.userId, job.payload.type, job.payload);
      break;
    case 'DAILY_AGGREGATION':
      await aggregateDailyMetrics(job.userId, job.payload.date);
      break;
    case 'TASK_SYNC':
      // Stub: sync external tasks
      if (Array.isArray(job.payload.tasks)) {
        for (const t of job.payload.tasks) {
          await upsertExternalTaskIntoOmniTask(job.userId, t.provider, t);
        }
      }
      break;
    case 'CALENDAR_SYNC':
      // Stub: sync calendar events
      break;
    default:
      throw new Error('Unknown job type');
  }
}

export async function runPendingJobs(batchSize = 5) {
  const now = new Date();
  const jobs = await prisma.job.findMany({
    where: { status: { in: [JobStatus.PENDING, JobStatus.SCHEDULED] }, scheduledAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    take: batchSize
  });

  const results: Array<{ id: string; status: string }> = [];
  for (const job of jobs) {
    try {
      await prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.PROCESSING } });
      await handleJob(job);
      await prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.COMPLETED } });
      results.push({ id: job.id, status: 'COMPLETED' });
    } catch (err) {
      const attempts = job.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? JobStatus.FAILED : JobStatus.SCHEDULED;
      const nextSchedule = new Date(Date.now() + backoffMs(attempts));
      await prisma.job.update({
        where: { id: job.id },
        data: { status, attempts, error: (err as Error).message, scheduledAt: status === JobStatus.SCHEDULED ? nextSchedule : undefined }
      });
      results.push({ id: job.id, status });
    }
  }
  return results;
}
