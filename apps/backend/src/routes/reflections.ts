import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { generateDailySummary } from '../services/aiSummary';

const reflectionsRouter = Router();

reflectionsRouter.use(requireSupabaseAuth);

const createReflectionSchema = z.object({
  rating: z.number().int().min(1).max(10),
  notes: z.string().min(1),
  aiSummary: z.string().optional()
});

reflectionsRouter.post('/', async (req, res) => {
  const parsed = createReflectionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { start } = getDayRange();

  const reflection = await prisma.dailyReflection.upsert({
    where: {
      userId_date: {
        userId: req.user!.userId,
        date: start
      }
    },
    update: {
      rating: parsed.data.rating,
      notes: parsed.data.notes,
      aiSummary: parsed.data.aiSummary
    },
    create: {
      userId: req.user!.userId,
      date: start,
      rating: parsed.data.rating,
      notes: parsed.data.notes,
      aiSummary: parsed.data.aiSummary
    }
  });

  return res.status(201).json(reflection);
});

reflectionsRouter.get('/:date', async (req, res) => {
  const { date } = req.params;
  const parsedDate = parseLocalDateString(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format, use YYYY-MM-DD' });
  }

  const reflection = await prisma.dailyReflection.findFirst({
    where: { userId: req.user!.userId, date: parsedDate }
  });

  if (!reflection) {
    return res.status(404).json({ error: 'Reflection not found' });
  }

  return res.json(reflection);
});

reflectionsRouter.post('/:date/generate-summary', async (req, res) => {
  const { date } = req.params;
  const parsedDate = parseLocalDateString(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format, use YYYY-MM-DD' });
  }

  try {
    const summary = await generateDailySummary(req.user!.userId, date);
    return res.json({ aiSummary: summary });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default reflectionsRouter;
