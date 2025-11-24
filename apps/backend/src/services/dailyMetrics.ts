import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';

export async function aggregateDailyMetrics(userId: string, dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? parseLocalDateString(dateInput) || new Date(dateInput) : dateInput;
  const { start, end } = getDayRange(date);

  const [tasks, focusBlocks, screenTimeEvents, reflection, plan] = await Promise.all([
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
    prisma.screenTimeEvent.findMany({ where: { userId, startedAt: { gte: start, lte: end } } }),
    prisma.dailyReflection.findFirst({ where: { userId, date: start } }),
    prisma.dayPlan.findFirst({ where: { userId, date: start, confirmedAt: { not: null } } })
  ]);

  const tasksPlanned = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === 'DONE').length;

  const focusMinutes = focusBlocks.reduce((acc, b) => {
    if (b.actualStart && b.actualEnd) {
      return acc + Math.max((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000, 0);
    }
    return acc;
  }, 0);

  const distractionMinutes = focusBlocks.reduce((acc, b) => acc + (b.distractionMinutes || 0), 0);

  // Sleep not implemented; leave null.
  const sleepMinutes: number | null = null;

  const reflectionDone = !!reflection;
  const dayPlanConfirmed = !!plan;

  const metrics = await prisma.dailyMetrics.upsert({
    where: { userId_date: { userId, date: start } },
    update: {
      tasksPlanned,
      tasksCompleted,
      focusMinutes: Math.round(focusMinutes),
      distractionMinutes: Math.round(distractionMinutes),
      sleepMinutes,
      reflectionDone,
      dayPlanConfirmed
    },
    create: {
      userId,
      date: start,
      tasksPlanned,
      tasksCompleted,
      focusMinutes: Math.round(focusMinutes),
      distractionMinutes: Math.round(distractionMinutes),
      sleepMinutes,
      reflectionDone,
      dayPlanConfirmed
    }
  });

  // Habit statuses for built-in habits
  const habits = [
    { key: 'REFLECTION_DONE', met: reflectionDone },
    { key: 'DAY_PLAN_CONFIRMED', met: dayPlanConfirmed },
    { key: 'FOCUS_60', met: focusMinutes >= 60 }
  ];
  for (const h of habits) {
    await prisma.habitStatus.upsert({
      where: { userId_habitKey_date: { userId, habitKey: h.key, date: start } },
      update: { met: h.met },
      create: { userId, habitKey: h.key, date: start, met: h.met }
    });
  }

  return metrics;
}

export async function getHabitStreak(userId: string, habitKey: string) {
  const statuses = await prisma.habitStatus.findMany({
    where: { userId, habitKey },
    orderBy: { date: 'desc' },
    take: 60
  });
  let streak = 0;
  for (const s of statuses) {
    if (s.met) streak += 1;
    else break;
  }
  return streak;
}
