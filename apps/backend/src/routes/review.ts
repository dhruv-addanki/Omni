import { Router } from 'express';
import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { requireSupabaseAuth } from '../middleware/authSupabase';

const router = Router();
router.use(requireSupabaseAuth);

router.get('/day', async (req, res) => {
  const userId = req.user!.userId;
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = parseLocalDateString(dateParam) || new Date(dateParam);
  const { start, end } = getDayRange(date);

  const [reflection, planCritique, plannedBlocks, actualBlocks, planTasks, completedTasks] =
    await Promise.all([
      prisma.dailyReflection.findFirst({ where: { userId, date: start } }),
      prisma.planCritique.findUnique({ where: { userId_date: { userId, date: start } } }),
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

  const deviation = {
    plannedFocusMinutes: Math.round(plannedMinutes),
    actualFocusMinutes: Math.round(actualMinutes),
    deltaFocusMinutes: Math.round(actualMinutes - plannedMinutes),
    plannedTasksCount: planTasks.length,
    completedTasksCount: completedTasks,
    deltaTasksCount: completedTasks - planTasks.length
  };

  return res.json({
    reflection,
    planCritique,
    deviation
  });
});

export default router;
