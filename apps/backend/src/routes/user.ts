import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange } from '../utils/dates';

const userRouter = Router();

userRouter.use(requireSupabaseAuth);

userRouter.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, createdAt: true }
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

userRouter.get('/me/dashboard', async (req, res) => {
  const { start, end } = getDayRange();
  const userId = req.user!.userId;

  const [tasks, alarms, focusBlocks, screenTimeEvents, reflection] = await Promise.all([
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
    prisma.alarmSetting.findMany({ where: { userId, nextAlarmAt: { gte: start, lte: end } } }),
    prisma.focusBlock.findMany({
      where: {
        userId,
        OR: [
          { plannedStart: { gte: start, lte: end } },
          { actualStart: { gte: start, lte: end } }
        ]
      }
    }),
    prisma.screenTimeEvent.findMany({ where: { userId, startedAt: { gte: start, lte: end } } }),
    prisma.dailyReflection.findFirst({ where: { userId, date: start } })
  ]);

  const screenTimeTotalMs = screenTimeEvents.reduce((acc, evt) => {
    const duration = new Date(evt.endedAt).getTime() - new Date(evt.startedAt).getTime();
    return acc + Math.max(duration, 0);
  }, 0);

  return res.json({
    tasks,
    alarms,
    focusBlocks,
    screenTime: { totalMs: screenTimeTotalMs },
    reflection
  });
});

export default userRouter;
