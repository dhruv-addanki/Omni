import { Router } from 'express';
import { runPendingJobs } from '../services/jobRunner';
import prisma from '../lib/prisma';
import { AIJobStatus } from '@prisma/client';
import { runJob } from '../services/aiCoach';

const router = Router();
router.post('/run-jobs', async (_req, res) => {
  const results = await runPendingJobs(5);

  // Also process AIJob queue to keep AI work flowing through the same cron trigger.
  const aiJobs = await prisma.aIJob.findMany({
    where: { status: AIJobStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    take: 5
  });
  const aiResults: Array<{ id: string; status: string }> = [];
  for (const job of aiJobs) {
    try {
      await prisma.aIJob.update({ where: { id: job.id }, data: { status: AIJobStatus.PROCESSING } });
      const output = await runJob(job.userId, job.type, job.payload);
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: AIJobStatus.COMPLETED, result: output }
      });
      aiResults.push({ id: job.id, status: 'COMPLETED' });
    } catch (err) {
      const attempts = job.attempts + 1;
      const status = attempts >= 3 ? AIJobStatus.FAILED : AIJobStatus.PENDING;
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { attempts, status, error: (err as Error).message }
      });
      aiResults.push({ id: job.id, status });
    }
  }

  return res.json({ processed: results.length, results, aiProcessed: aiResults.length, aiResults });
});

export default router;
