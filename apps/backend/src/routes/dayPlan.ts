import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange, parseLocalDateString } from '../utils/dates';

const dayPlanRouter = Router();
dayPlanRouter.use(requireSupabaseAuth);

const confirmSchema = z.object({
  date: z.string().optional() // ISO date string YYYY-MM-DD optional; default today
});

dayPlanRouter.post('/confirm', async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const date =
    parsed.data.date && parseLocalDateString(parsed.data.date)
      ? parseLocalDateString(parsed.data.date)!
      : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const confirmation = await prisma.dayPlanConfirmation.upsert({
    where: {
      userId_date: {
        userId: req.user!.userId,
        date
      }
    },
    update: { confirmedAt: new Date() },
    create: { userId: req.user!.userId, date }
  });

  return res.status(201).json(confirmation);
});

dayPlanRouter.get('/status', async (req, res) => {
  const dateParam = req.query.date as string | undefined;
  const parsed = dateParam ? parseLocalDateString(dateParam) : null;
  const date =
    parsed ||
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (!date || isNaN(date.getTime())) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  const confirmation = await prisma.dayPlanConfirmation.findUnique({
    where: {
      userId_date: { userId: req.user!.userId, date }
    }
  });

  return res.json({ confirmed: !!confirmation, confirmation });
});

export default dayPlanRouter;
