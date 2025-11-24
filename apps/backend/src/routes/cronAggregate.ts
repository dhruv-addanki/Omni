import { Router } from 'express';
import prisma from '../lib/prisma';
import { aggregateDailyMetrics } from '../services/dailyMetrics';
import { getDayRange } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';

const router = Router();
// Protect cron route with auth; in production, use secret/role.
router.use(requireSupabaseAuth);

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
