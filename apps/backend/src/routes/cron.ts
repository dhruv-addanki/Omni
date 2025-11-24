import { Router } from 'express';
import prisma from '../lib/prisma';
import { generateDailySummary } from '../services/aiSummary';
import { getDayRange } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';

const cronRouter = Router();

// Note: protect this with auth/secret in production. Left open here for simplicity.
cronRouter.post('/daily-summaries', requireSupabaseAuth, async (_req, res) => {
  const { start } = getDayRange(new Date());
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    const reflection = await prisma.dailyReflection.findFirst({
      where: { userId: user.id, date: start }
    });
    if (reflection && reflection.aiSummary) continue;

    await generateDailySummary(user.id, start.toISOString().split('T')[0]);
  }

  return res.json({ status: 'ok', processed: users.length });
});

export default cronRouter;
