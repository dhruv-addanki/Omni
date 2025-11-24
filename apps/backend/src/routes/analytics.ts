import { Router } from 'express';
import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { aggregateDailyMetrics, getHabitStreak } from '../services/dailyMetrics';

const analyticsRouter = Router();
analyticsRouter.use(requireSupabaseAuth);

// Weekly summary for last 7 days (including today)
analyticsRouter.get('/weekly', async (req, res) => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(date);
  }

  const results = [];
  for (const date of days) {
    const { start } = getDayRange(date);
    let dm = await prisma.dailyMetrics.findUnique({
      where: { userId_date: { userId, date: start } }
    });
    if (!dm) {
      dm = await aggregateDailyMetrics(userId, start);
    }
    const reflection = await prisma.dailyReflection.findFirst({ where: { userId, date: start } });
    results.push({
      date: start.toISOString().split('T')[0],
      tasksPlanned: dm.tasksPlanned,
      tasksCompleted: dm.tasksCompleted,
      focusMinutes: dm.focusMinutes,
      reflectionRating: reflection ? reflection.rating : null,
      aiSummary: reflection?.aiSummary || null
    });
  }

  return res.json(results.reverse());
});

// Tasks for a specific date (used by daily detail)
analyticsRouter.get('/tasks', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = req.query.date as string | undefined;
  if (!dateParam) return res.status(400).json({ error: 'date required' });

  const parsed = parseLocalDateString(dateParam) || new Date(dateParam);
  const date = parsed;
  if (isNaN(date.getTime())) return res.status(400).json({ error: 'invalid date' });
  const { start, end } = getDayRange(date);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { scheduledStart: { gte: start, lte: end } },
        { scheduledEnd: { gte: start, lte: end } },
        { actualStart: { gte: start, lte: end } },
        { actualEnd: { gte: start, lte: end } }
      ]
    }
  });

  return res.json({ tasks });
});

// Day timeline: planned/actual focus blocks and screen time
analyticsRouter.get('/day-timeline', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = (req.query.date as string) || '';
  const parsed = parseLocalDateString(dateParam) || new Date(dateParam);
  if (!parsed || isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'invalid date' });
  }
  const { start, end } = getDayRange(parsed);

  const [focusBlocks, screenTimeEvents] = await Promise.all([
    prisma.focusBlock.findMany({
      where: {
        userId,
        OR: [
          { plannedStart: { gte: start, lte: end } },
          { actualStart: { gte: start, lte: end } }
        ]
      }
    }),
    prisma.screenTimeEvent.findMany({
      where: { userId, startedAt: { gte: start, lte: end } }
    })
  ]);

  const plannedBlocks = focusBlocks
    .filter((b) => b.plannedStart && b.plannedEnd)
    .map((b) => ({
      id: b.id,
      start: b.plannedStart,
      end: b.plannedEnd,
      taskId: b.taskId
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const actualBlocks = focusBlocks
    .filter((b) => b.actualStart && b.actualEnd)
    .map((b) => ({
      id: b.id,
      start: b.actualStart!,
      end: b.actualEnd!,
      taskId: b.taskId
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const screenTime = screenTimeEvents
    .map((e) => ({
      id: e.id,
      appName: e.appName,
      category: e.appCategory,
      start: e.startedAt,
      end: e.endedAt
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Compute distraction minutes during actual focus (SOCIAL category overlapping actual blocks)
  let distractionMs = 0;
  for (const evt of screenTime) {
    if (evt.category !== 'SOCIAL') continue;
    for (const block of actualBlocks) {
      const overlapStart = Math.max(evt.start.getTime(), block.start.getTime());
      const overlapEnd = Math.min(evt.end.getTime(), block.end.getTime());
      if (overlapEnd > overlapStart) distractionMs += overlapEnd - overlapStart;
    }
  }

  const totalPlannedMinutes = plannedBlocks.reduce(
    (acc, b) => acc + Math.max((b.end.getTime() - b.start.getTime()) / 60000, 0),
    0
  );
  const totalActualMinutes = actualBlocks.reduce(
    (acc, b) => acc + Math.max((b.end.getTime() - b.start.getTime()) / 60000, 0),
    0
  );
  const totalDistractionMinutes = Math.round(distractionMs / 60000);

  return res.json({
    plannedBlocks,
    actualBlocks,
    screenTimeEvents: screenTime,
    summary: {
      plannedMinutes: Math.round(totalPlannedMinutes),
      actualMinutes: Math.round(totalActualMinutes),
      distractionMinutesDuringFocus: totalDistractionMinutes
    }
  });
});

// Monthly summary (last 30 days)
analyticsRouter.get('/monthly', async (req, res) => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);

  const metrics = await prisma.dailyMetrics.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: today }
    },
    orderBy: { date: 'asc' }
  });

  const aggregates = metrics.reduce(
    (acc, m) => {
      acc.tasksCompleted += m.tasksCompleted;
      acc.tasksPlanned += m.tasksPlanned;
      acc.focusMinutes += m.focusMinutes;
      acc.distractionMinutes += m.distractionMinutes;
      acc.reflections += m.reflectionDone ? 1 : 0;
      acc.dayPlans += m.dayPlanConfirmed ? 1 : 0;
      acc.count += 1;
      return acc;
    },
    { tasksCompleted: 0, tasksPlanned: 0, focusMinutes: 0, distractionMinutes: 0, reflections: 0, dayPlans: 0, count: 0 }
  );

  return res.json({ metrics, aggregates });
});

// Deviation report planned vs actual for a given date
analyticsRouter.get('/deviation', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = req.query.date as string;
  if (!dateParam) return res.status(400).json({ error: 'date required' });
  const parsed = parseLocalDateString(dateParam) || new Date(dateParam);
  if (!parsed || isNaN(parsed.getTime())) return res.status(400).json({ error: 'invalid date' });
  const { start, end } = getDayRange(parsed);

  const [plannedBlocks, actualBlocks, planTasks, completedTasks] = await Promise.all([
    prisma.focusBlock.findMany({ where: { userId, plannedStart: { gte: start, lte: end } } }),
    prisma.focusBlock.findMany({ where: { userId, actualStart: { gte: start, lte: end } } }),
    prisma.dayPlanTask.findMany({
      where: { dayPlan: { userId, date: start } },
      include: { task: true }
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'DONE',
        OR: [
          { actualEnd: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end } }
        ]
      }
    })
  ]);

  const plannedMinutes = plannedBlocks.reduce(
    (acc, b) => acc + Math.max((b.plannedEnd.getTime() - b.plannedStart.getTime()) / 60000, 0),
    0
  );
  const actualMinutes = actualBlocks.reduce((acc, b) => {
    if (b.actualStart && b.actualEnd) {
      return acc + Math.max((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000, 0);
    }
    return acc;
  }, 0);

  return res.json({
    plannedFocusMinutes: Math.round(plannedMinutes),
    actualFocusMinutes: Math.round(actualMinutes),
    deltaFocusMinutes: Math.round(actualMinutes - plannedMinutes),
    plannedTasksCount: planTasks.length,
    completedTasksCount: completedTasks,
    deltaTasksCount: completedTasks - planTasks.length
  });
});

analyticsRouter.get('/habits', async (req, res) => {
  const userId = req.user!.userId;
  const reflection = await getHabitStreak(userId, 'REFLECTION_DONE');
  const dayPlan = await getHabitStreak(userId, 'DAY_PLAN_CONFIRMED');
  const focus60 = await getHabitStreak(userId, 'FOCUS_60');
  return res.json({
    habits: [
      { key: 'REFLECTION_DONE', streak: reflection },
      { key: 'DAY_PLAN_CONFIRMED', streak: dayPlan },
      { key: 'FOCUS_60', streak: focus60 }
    ]
  });
});

export default analyticsRouter;
