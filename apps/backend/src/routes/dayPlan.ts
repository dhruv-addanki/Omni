import { Router } from 'express';
import { AlarmEventType } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange, parseLocalDateString } from '../utils/dates';

const dayPlanRouter = Router();
dayPlanRouter.use(requireSupabaseAuth);

const dateOrToday = (dateString?: string) => {
  if (dateString) {
    const parsed = parseLocalDateString(dateString);
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const topTaskSchema = z.object({
  taskId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  order: z.number().int().optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional()
});

const confirmSchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD
  topTasks: z.array(topTaskSchema).min(3)
});

function isLate(alarmTime: Date | null, confirmTime: Date, graceMinutes = 30) {
  if (!alarmTime) return false;
  const graceMs = graceMinutes * 60 * 1000;
  return confirmTime.getTime() - alarmTime.getTime() > graceMs;
}

async function compressDayPlanIfLate(
  userId: string,
  date: Date,
  planId: string,
  alarmTime: Date | null,
  confirmTime: Date
) {
  const compressed = isLate(alarmTime, confirmTime);
  if (!compressed) return false;

  // TODO: Implement real block compression; placeholder sets flag.
  await prisma.dayPlan.update({
    where: { id: planId },
    data: { compressed: true }
  });
  return true;
}

dayPlanRouter.post('/confirm', async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const date = dateOrToday(parsed.data.date);
  const { start, end } = getDayRange(date);
  const userId = req.user!.userId;

  // Find alarm for the morning to detect lateness.
  const alarm = await prisma.alarmSetting.findFirst({
    where: { userId, nextAlarmAt: { gte: start, lte: end } },
    orderBy: { nextAlarmAt: 'asc' }
  });

  // Ensure tasks exist or create them, then attach as top tasks.
  const tasksToLink = [];
  for (const entry of parsed.data.topTasks) {
    if (entry.taskId) {
      const task = await prisma.task.findFirst({ where: { id: entry.taskId, userId } });
      if (!task) {
        return res.status(400).json({ error: 'Task not found for user', code: 'TASK_NOT_FOUND' });
      }
      tasksToLink.push({
        id: task.id,
        title: task.title,
        plannedStart: entry.plannedStart ? new Date(entry.plannedStart) : undefined,
        plannedEnd: entry.plannedEnd ? new Date(entry.plannedEnd) : undefined,
        order: entry.order ?? 0
      });
    } else if (entry.title) {
      const task = await prisma.task.create({
        data: {
          userId,
          title: entry.title,
          status: 'TODO',
          source: 'OMNI',
          scheduledStart: entry.plannedStart ? new Date(entry.plannedStart) : undefined,
          scheduledEnd: entry.plannedEnd ? new Date(entry.plannedEnd) : undefined
        }
      });
      tasksToLink.push({
        id: task.id,
        title: task.title,
        plannedStart: entry.plannedStart ? new Date(entry.plannedStart) : undefined,
        plannedEnd: entry.plannedEnd ? new Date(entry.plannedEnd) : undefined,
        order: entry.order ?? 0
      });
    } else {
      return res.status(400).json({ error: 'Each top task needs a taskId or title' });
    }
  }

  const plan = await prisma.dayPlan.upsert({
    where: { userId_date: { userId, date: start } },
    update: { confirmedAt: new Date(), compressed: false },
    create: {
      userId,
      date: start,
      confirmedAt: new Date(),
      compressed: false
    }
  });

  // Replace existing top task links.
  await prisma.dayPlanTask.deleteMany({ where: { dayPlanId: plan.id } });
  await prisma.dayPlanTask.createMany({
    data: tasksToLink.map((t, idx) => ({
      dayPlanId: plan.id,
      taskId: t.id,
      isTopTask: true,
      order: t.order ?? idx,
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd
    }))
  });

  // Mark compressed if late.
  await compressDayPlanIfLate(userId, date, plan.id, alarm?.nextAlarmAt || null, new Date());

  // Log the morning plan confirmation event.
  await prisma.alarmLog.create({
    data: {
      userId,
      alarmId: alarm?.id,
      type: AlarmEventType.MORNING_PLAN_CONFIRMED,
      metadata: { date: start.toISOString().split('T')[0] }
    }
  });

  const updatedPlan = await prisma.dayPlan.findUnique({
    where: { id: plan.id },
    include: { tasks: { include: { task: true }, orderBy: { order: 'asc' } } }
  });

  return res.status(201).json({
    plan: updatedPlan,
    confirmed: !!updatedPlan?.confirmedAt
  });
});

dayPlanRouter.get('/status', async (req, res) => {
  const dateParam = req.query.date as string | undefined;
  const date = dateOrToday(dateParam);
  const { start } = getDayRange(date);

  const plan = await prisma.dayPlan.findUnique({
    where: { userId_date: { userId: req.user!.userId, date: start } },
    include: { tasks: { include: { task: true }, orderBy: { order: 'asc' } } }
  });

  return res.json({
    confirmed: !!plan?.confirmedAt,
    wakeConfirmedAt: plan?.wakeConfirmedAt,
    compressed: !!plan?.compressed,
    plan
  });
});

export default dayPlanRouter;
