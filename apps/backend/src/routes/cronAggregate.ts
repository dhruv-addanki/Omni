import { Router } from 'express';
import prisma from '../lib/prisma';
import { aggregateDailyMetrics } from '../services/dailyMetrics';
import { getDayRange } from '../utils/dates';

const router = Router();
// Protect with a simple secret header; avoid requiring Supabase auth for cron.
router.use((req, res, next) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) return next();
  const provided = req.header('x-cron-secret');
  if (provided !== expected) return res.status(401).json({ error: 'unauthorized' });
  next();
});

router.post('/aggregate-daily', async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id: true } });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { start } = getDayRange(yesterday);

  let processed = 0;
  for (const user of users) {
    await aggregateDailyMetrics(user.id, start);
    processed += 1;
  }
  return res.json({ status: 'ok', processed });
});

export default router;
