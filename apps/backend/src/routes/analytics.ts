import { Router } from 'express';
import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';

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

  const results = await Promise.all(
    days.map(async (date) => {
      const { start, end } = getDayRange(date);
      const [tasksPlanned, tasksCompleted, focusBlocks, reflection] = await Promise.all([
        prisma.task.count({
          where: {
            userId,
            OR: [
              { scheduledStart: { gte: start, lte: end } },
              { scheduledEnd: { gte: start, lte: end } }
            ]
          }
        }),
        prisma.task.count({
          where: {
            userId,
            status: 'DONE',
            OR: [
              { completedAt: { gte: start, lte: end } },
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
        prisma.dailyReflection.findFirst({ where: { userId, date: start } })
      ]);

      const focusMinutes = focusBlocks.reduce((acc, block) => {
        if (block.actualStart && block.actualEnd) {
          const diff = new Date(block.actualEnd).getTime() - new Date(block.actualStart).getTime();
          return acc + Math.max(Math.round(diff / 60000), 0);
        }
        return acc;
      }, 0);

      return {
        date: start.toISOString().split('T')[0],
        tasksPlanned,
        tasksCompleted,
        focusMinutes,
        reflectionRating: reflection ? reflection.rating : null,
        aiSummary: reflection?.aiSummary || null
      };
    })
  );

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

export default analyticsRouter;
