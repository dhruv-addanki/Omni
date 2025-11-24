import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange, parseLocalDateString } from '../utils/dates';

const tasksRouter = Router();

tasksRouter.use(requireSupabaseAuth);

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  actualStart: z.string().datetime().optional(),
  actualEnd: z.string().datetime().optional()
});

tasksRouter.post('/', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { title, description, scheduledStart, scheduledEnd, actualStart, actualEnd } = parsed.data;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      source: 'OMNI',
      userId: req.user!.userId,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      actualStart: actualStart ? new Date(actualStart) : undefined,
      actualEnd: actualEnd ? new Date(actualEnd) : undefined
    }
  });

  return res.status(201).json(task);
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  actualStart: z.string().datetime().optional(),
  actualEnd: z.string().datetime().optional()
});

tasksRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const data = parsed.data;

  const owned = await prisma.task.findFirst({ where: { id, userId: req.user!.userId } });
  if (!owned) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const dataToUpdate = {
    ...('title' in data ? { title: data.title } : {}),
    ...('description' in data ? { description: data.description } : {}),
    ...('status' in data ? { status: data.status } : {}),
    ...('scheduledStart' in data
      ? { scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null }
      : {}),
    ...('scheduledEnd' in data
      ? { scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null }
      : {}),
    ...('actualStart' in data
      ? { actualStart: data.actualStart ? new Date(data.actualStart) : null }
      : {}),
    ...('actualEnd' in data ? { actualEnd: data.actualEnd ? new Date(data.actualEnd) : null } : {})
  };

  const result = await prisma.task.updateMany({
    where: { id, userId: req.user!.userId },
    data: dataToUpdate
  });

  if (result.count === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const updated = await prisma.task.findUnique({ where: { id } });
  return res.json(updated);
});

// Suggestions for top tasks: today's scheduled or recent TODOs.
tasksRouter.get('/suggestions', async (req, res) => {
  const dateParam = (req.query.date as string) || undefined;
  const date = dateParam ? parseLocalDateString(dateParam) : null;
  const target = date || new Date();
  const { start, end } = getDayRange(target);

  const tasks = await prisma.task.findMany({
    where: {
      userId: req.user!.userId,
      status: 'TODO',
      OR: [
        { scheduledStart: { gte: start, lte: end } },
        { scheduledEnd: { gte: start, lte: end } },
        { actualStart: { gte: start, lte: end } },
        { actualEnd: { gte: start, lte: end } }
      ]
    },
    orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'desc' }],
    take: 10
  });

  // If not enough tasks, supplement with most recent TODOs.
  if (tasks.length < 3) {
    const filler = await prisma.task.findMany({
      where: { userId: req.user!.userId, status: 'TODO' },
      orderBy: { createdAt: 'desc' },
      take: 10 - tasks.length
    });
    const merged = [...tasks];
    const existingIds = new Set(tasks.map((t) => t.id));
    for (const f of filler) {
      if (!existingIds.has(f.id)) merged.push(f);
    }
    return res.json({ suggestions: merged.slice(0, 10) });
  }

  return res.json({ suggestions: tasks });
});

export default tasksRouter;
