import { Router } from 'express';
import prisma from '../lib/prisma';
import { parseLocalDateString } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';

const router = Router();
router.use(requireSupabaseAuth);

router.get('/day', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = parseLocalDateString(dateParam) || new Date(dateParam);

  const [reflection, planCritique, deviation] = await Promise.all([
    prisma.dailyReflection.findFirst({ where: { userId, date } }),
    prisma.planCritique.findUnique({ where: { userId_date: { userId, date } } }),
    // deviation fetched via analytics route; reuse logic here minimal
    (async () => {
      const resp = await prisma.focusBlock.findMany({
        where: { userId, plannedStart: { gte: date, lte: new Date(date.getTime() + 24 * 60 * 60 * 1000) } }
      });
      return resp.length;
    })()
  ]);

  return res.json({
    reflection,
    planCritique,
    deviation
  });
});

export default router;
