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
  const parsedDate = parseLocalDateString(parsed.data.date) || new Date(parsed.data.date);
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
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
  const spanByTask = new Map<string, { start: Date; end: Date }>();
  for (const b of blocks) {
    if (!b.taskId) continue;
    const startDate = new Date(b.start);
    const endDate = new Date(b.end);
    const existing = spanByTask.get(b.taskId);
    if (!existing) {
      spanByTask.set(b.taskId, { start: startDate, end: endDate });
    } else {
      spanByTask.set(b.taskId, {
        start: existing.start < startDate ? existing.start : startDate,
        end: existing.end > endDate ? existing.end : endDate
      });
    }
  }
  if (taskIds.length) {
    await prisma.dayPlanTask.createMany({
      data: taskIds.map((id, idx) => ({
        dayPlanId: plan.id,
        taskId: id,
        isTopTask: true,
        order: idx,
        plannedStart: spanByTask.get(id)?.start,
        plannedEnd: spanByTask.get(id)?.end
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

// Fetch day planning info for UI consumption
planningRouter.get('/day', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = parseLocalDateString(dateParam) || new Date(dateParam);
  const { start, end } = getDayRange(date);

  const [plan, tasks, focusBlocks, events] = await Promise.all([
    prisma.dayPlan.findFirst({
      where: { userId, date: start },
      include: { tasks: { include: { task: true }, orderBy: { order: 'asc' } } }
    }),
    prisma.task.findMany({
      where: {
        userId,
        OR: [
          { scheduledStart: { gte: start, lte: end } },
          { scheduledEnd: { gte: start, lte: end } },
          { actualStart: { gte: start, lte: end } },
          { actualEnd: { gte: start, lte: end } }
        ]
      }
    }),
    prisma.focusBlock.findMany({
      where: {
        userId,
        OR: [
          { plannedStart: { gte: start, lte: end } },
          { actualStart: { gte: start, lte: end } }
        ]
      }
    }),
    prisma.externalCalendarEvent.findMany({
      where: { userId, start: { gte: start, lte: end } },
      orderBy: { start: 'asc' }
    })
  ]);

  return res.json({ date: dateParam, plan, tasks, focusBlocks, events });
});

// Update day plan/focus blocks after drag/drop adjustments
planningRouter.patch('/day', async (req, res) => {
  const schema = z.object({
    date: z.string(),
    tasks: z.array(z.object({ taskId: z.string().uuid(), order: z.number().int().optional() })).optional(),
    focusBlocks: z
      .array(
        z.object({
          id: z.string().uuid(),
          plannedStart: z.string().datetime(),
          plannedEnd: z.string().datetime()
        })
      )
      .optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { date, tasks = [], focusBlocks = [] } = parsed.data;
  const parsedDate = parseLocalDateString(date) || new Date(date);
  const { start } = getDayRange(parsedDate);
  const userId = req.user!.userId;

  // Update task ordering in day plan
  if (tasks.length) {
    const plan = await prisma.dayPlan.findFirst({ where: { userId, date: start } });
    if (plan) {
      for (const t of tasks) {
        await prisma.dayPlanTask.updateMany({
          where: { dayPlanId: plan.id, taskId: t.taskId },
          data: { order: t.order ?? 0 }
        });
      }
    }
  }

  // Update focus blocks planned times
  for (const fb of focusBlocks) {
    await prisma.focusBlock.updateMany({
      where: { id: fb.id, userId },
      data: { plannedStart: new Date(fb.plannedStart), plannedEnd: new Date(fb.plannedEnd) }
    });
  }

  return res.json({ ok: true });
});

planningRouter.post('/resolve-conflicts', async (req, res) => {
  const schema = z.object({
    date: z.string(),
    focusBlocks: z.array(
      z.object({
        id: z.string().uuid().optional(),
        plannedStart: z.string().datetime(),
        plannedEnd: z.string().datetime(),
        taskId: z.string().uuid().optional()
      })
    )
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { date, focusBlocks } = parsed.data;
  const parsedDate = parseLocalDateString(date) || new Date(date);
  const { start, end } = getDayRange(parsedDate);
  const userId = req.user!.userId;

  // Simple conflict detection against calendar events and overlapping blocks
  const events = await prisma.externalCalendarEvent.findMany({
    where: { userId, start: { gte: start, lte: end } },
    orderBy: { start: 'asc' }
  });

  const overlaps = [];
  for (let i = 0; i < focusBlocks.length; i++) {
    for (let j = i + 1; j < focusBlocks.length; j++) {
      const a = focusBlocks[i];
      const b = focusBlocks[j];
      if (new Date(a.plannedStart) < new Date(b.plannedEnd) && new Date(b.plannedStart) < new Date(a.plannedEnd)) {
        overlaps.push({ a: a.id, b: b.id });
      }
    }
  }

  const eventConflicts = focusBlocks
    .map((fb) => ({
      id: fb.id,
      conflicts: events.filter(
        (evt) =>
          new Date(fb.plannedStart) < evt.end &&
          new Date(fb.plannedEnd) > evt.start
      )
    }))
    .filter((c) => c.conflicts.length > 0);

  const suggestions = [];
  if (overlaps.length) {
    suggestions.push('Some focus blocks overlap; consider shortening or moving the later block.');
  }
  if (eventConflicts.length) {
    suggestions.push('Move conflicting blocks around calendar events.');
  }
  if (!suggestions.length) suggestions.push('No conflicts detected. You can proceed.');

  return res.json({ overlaps, eventConflicts, suggestions });
});

export default planningRouter;
