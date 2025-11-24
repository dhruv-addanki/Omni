import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { generateDraftDayPlan } from '../services/planningEngine';
import { getDayRange, parseLocalDateString } from '../utils/dates';

const planningRouter = Router();
planningRouter.use(requireSupabaseAuth);

const draftSchema = z.object({
  date: z.string()
});

planningRouter.post('/draft', async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const draft = await generateDraftDayPlan(req.user!.userId, parsed.data.date);
  return res.json(draft);
});

const applySchema = z.object({
  date: z.string(),
  blocks: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        taskId: z.string().uuid().optional(),
        title: z.string().optional()
      })
    )
    .optional(),
  tasks: z
    .array(
      z.object({
        taskId: z.string().uuid().optional(),
        title: z.string().optional()
      })
    )
    .optional()
});

planningRouter.post('/apply', async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const { date, tasks = [], blocks = [] } = parsed.data;
  const parsedDate = parseLocalDateString(date) || new Date(date);
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  const userId = req.user!.userId;
  const existing = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId, date: parsedDate } }
  });

  if (existing?.confirmedAt) {
    return res.status(400).json({ error: 'Plan already confirmed for this date', code: 'PLAN_ALREADY_CONFIRMED' });
  }

  const taskIds: string[] = [];
  for (const t of tasks) {
    if (t.taskId) {
      taskIds.push(t.taskId);
      continue;
    }
    if (!t.title) {
      return res.status(400).json({ error: 'Each task needs a taskId or title' });
    }
    const created = await prisma.task.create({
      data: {
        userId,
        title: t.title,
        status: 'TODO',
        source: 'OMNI'
      }
    });
    taskIds.push(created.id);
  }

  const plan = await prisma.dayPlan.upsert({
    where: { userId_date: { userId, date: parsedDate } },
    update: { confirmedAt: new Date(), compressed: false },
    create: { userId, date: parsedDate, confirmedAt: new Date(), compressed: false }
  });

  await prisma.dayPlanTask.deleteMany({ where: { dayPlanId: plan.id } });
  if (taskIds.length) {
    await prisma.dayPlanTask.createMany({
      data: taskIds.map((id, idx) => ({
        dayPlanId: plan.id,
        taskId: id,
        isTopTask: true,
        order: idx
      }))
    });
  }

  const { start, end } = getDayRange(parsedDate);
  await prisma.focusBlock.deleteMany({ where: { userId, plannedStart: { gte: start, lte: end } } });
  if (blocks.length) {
    await prisma.focusBlock.createMany({
      data: blocks.map((b) => ({
        userId,
        taskId: b.taskId,
        plannedStart: new Date(b.start),
        plannedEnd: new Date(b.end)
      }))
    });
  }

  const fullPlan = await prisma.dayPlan.findUnique({
    where: { id: plan.id },
    include: { tasks: { include: { task: true }, orderBy: { order: 'asc' } } }
  });

  return res.status(201).json({ plan: fullPlan });
});

export default planningRouter;
