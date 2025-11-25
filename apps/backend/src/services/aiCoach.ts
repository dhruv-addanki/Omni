import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { computeDailyStats } from './analytics';
import { generateText } from './aiClient';
import { AIJobType } from '@prisma/client';
import { getHabitStreak } from './dailyMetrics';

interface DayContext {
  date: Date;
  tasks: Array<{ title: string; status: string }>;
  focus: { plannedMinutes: number; actualMinutes: number; distractionMinutes: number };
  reflection?: { rating: number; notes: string; aiSummary?: string | null } | null;
  screenTimeMs: number;
}

export async function getDayContext(userId: string, dateInput: string | Date): Promise<DayContext> {
  const date = typeof dateInput === 'string' ? parseLocalDateString(dateInput) || new Date(dateInput) : dateInput;
  const { start, end } = getDayRange(date);

  const [tasks, focusBlocks, screenTimeEvents, reflection] = await Promise.all([
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
    prisma.dailyReflection.findFirst({ where: { userId, date: start } })
  ]);

  const focusActualMinutes = focusBlocks.reduce((acc, b) => {
    if (b.actualStart && b.actualEnd) {
      return acc + Math.max((b.actualEnd.getTime() - b.actualStart.getTime()) / 60000, 0);
    }
    return acc;
  }, 0);
  const focusPlannedMinutes = focusBlocks.reduce(
    (acc, b) => acc + Math.max((b.plannedEnd.getTime() - b.plannedStart.getTime()) / 60000, 0),
    0
  );
  const distractionMinutes = focusBlocks.reduce((acc, b) => acc + (b.distractionMinutes || 0), 0);
  const screenTimeMs = screenTimeEvents.reduce((acc, evt) => {
    return acc + Math.max(evt.endedAt.getTime() - evt.startedAt.getTime(), 0);
  }, 0);

  return {
    date: start,
    tasks: tasks.map((t) => ({ title: t.title, status: t.status })),
    focus: {
      plannedMinutes: Math.round(focusPlannedMinutes),
      actualMinutes: Math.round(focusActualMinutes),
      distractionMinutes
    },
    reflection: reflection ? { rating: reflection.rating, notes: reflection.notes, aiSummary: reflection.aiSummary } : null,
    screenTimeMs
  };
}

export async function getWeekContext(userId: string, endDate: Date, days = 7) {
  const results = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    const stats = await computeDailyStats(userId, date.toISOString());
    results.push({ date: date.toISOString().split('T')[0], stats });
  }
  return results.reverse();
}

function safetyInstructions() {
  return [
    'Stay within productivity coaching. Avoid medical, legal, or financial advice.',
    'Be concise, supportive, non-judgmental.'
  ].join('\n');
}

export async function generateDailySummary(userId: string, date: string) {
  const ctx = await getDayContext(userId, date);
  const prompt = [
    'You are Omni, a concise productivity coach. Generate a brief summary for the day.',
    `Date: ${ctx.date.toISOString().split('T')[0]}`,
    `Tasks: ${ctx.tasks.length} tasks (sample: ${ctx.tasks.slice(0, 5).map((t) => `${t.title} [${t.status}]`).join('; ') || 'none'})`,
    `Focus planned/actual (min): ${ctx.focus.plannedMinutes}/${ctx.focus.actualMinutes}; Distraction minutes: ${ctx.focus.distractionMinutes}`,
    `Screen time total (min): ${Math.round(ctx.screenTimeMs / 60000)}`,
    `Reflection: ${ctx.reflection ? `rating ${ctx.reflection.rating}; notes: ${ctx.reflection.notes}` : 'missing'}`,
    safetyInstructions(),
    'Return 2-3 bullet points; keep it under 100 words.'
  ].join('\n');

  const aiSummary = await generateText(prompt, { maxTokens: 200 });
  // Upsert onto reflection
  await prisma.dailyReflection.upsert({
    where: { userId_date: { userId, date: ctx.date } },
    update: { aiSummary },
    create: { userId, date: ctx.date, rating: ctx.reflection?.rating || 0, notes: ctx.reflection?.notes || '', aiSummary }
  });
  return aiSummary;
}

export async function generatePlanCritique(userId: string, date: string) {
  const ctx = await getDayContext(userId, date);
  const prompt = [
    'You are Omni, a concise productivity coach. Critique today’s plan.',
    `Date: ${ctx.date.toISOString().split('T')[0]}`,
    `Tasks planned/completed: ${ctx.tasks.length} listed.`,
    `Focus planned/actual (min): ${ctx.focus.plannedMinutes}/${ctx.focus.actualMinutes}; Distraction minutes: ${ctx.focus.distractionMinutes}`,
    safetyInstructions(),
    'Return 3 bullets: realism, risks, and adjustments (what to drop/shorten). <120 words.'
  ].join('\n');
  const critique = await generateText(prompt, { maxTokens: 220 });
  await prisma.planCritique.upsert({
    where: { userId_date: { userId, date: ctx.date } },
    update: { critique },
    create: { userId, date: ctx.date, critique }
  });
  return critique;
}

export async function generateHabitInsights(userId: string, endDate: string, days = 7) {
  const end = parseLocalDateString(endDate) || new Date(endDate);
  const week = await getWeekContext(userId, end, days);
  const statsText = week
    .map(
      (d) =>
        `${d.date}: tasks planned ${d.stats.tasksPlanned}, completed ${d.stats.tasksCompleted}, focus min ${d.stats.focusMinutes}`
    )
    .join('\n');
  const prompt = [
    'You are Omni, a concise productivity coach. Provide habit insights based on the last week.',
    statsText,
    safetyInstructions(),
    'Return 3-4 bullets: patterns, risks, and one experiment to try next week. <140 words.'
  ].join('\n');
  const insight = await generateText(prompt, { maxTokens: 260 });
  const rangeStart = new Date(end);
  rangeStart.setDate(end.getDate() - (days - 1));
  await prisma.habitInsight.create({
    data: { userId, rangeStart, rangeEnd: end, insight }
  });
  return insight;
}

function buildNextActionFallback(ctx: DayContext) {
  const inProgress = ctx.tasks.find((t) => t.status === 'IN_PROGRESS');
  const todo = ctx.tasks.find((t) => t.status === 'TODO');
  if (inProgress) {
    return `Pick back up "${inProgress.title}" for a focused 25-minute block. Minimize distractions.`;
  }
  if (todo) {
    return `Start "${todo.title}" now and work on it for the next 20-30 minutes.`;
  }
  if (ctx.focus.actualMinutes < ctx.focus.plannedMinutes) {
    const gap = Math.min(Math.max(ctx.focus.plannedMinutes - ctx.focus.actualMinutes, 15), 60);
    return `Use the next ${gap} minutes for focused work to close your plan for today.`;
  }
  return 'No urgent tasks remain. Take five minutes to tidy your notes or set up tomorrow’s plan.';
}

export async function generateNextBestAction(userId: string, date: string) {
  const ctx = await getDayContext(userId, date);
  const prompt = [
    'You are Omni, a concise productivity coach. Suggest the next best action right now.',
    `Tasks (sample): ${ctx.tasks.slice(0, 5).map((t) => `${t.title} [${t.status}]`).join('; ') || 'none'}`,
    `Focus remaining (planned vs actual): ${ctx.focus.plannedMinutes}/${ctx.focus.actualMinutes}; Distraction minutes: ${ctx.focus.distractionMinutes}`,
    safetyInstructions(),
    'Return 1-2 bullets with a single concrete action and a short why. <60 words.'
  ].join('\n');
  try {
    return await generateText(prompt, { maxTokens: 120, temperature: 0.5 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('generateNextBestAction failed, returning fallback', err);
    return buildNextActionFallback(ctx);
  }
}

export async function rewriteTasks(userId: string, taskIds: string[]) {
  const tasks = await prisma.task.findMany({ where: { userId, id: { in: taskIds } } });
  const prompt = [
    'You are Omni, rewrite tasks to be clear and actionable.',
    ...tasks.map((t, idx) => `${idx + 1}. ${t.title}`),
    safetyInstructions(),
    'Return numbered rewrites only.'
  ].join('\n');
  const text = await generateText(prompt, { maxTokens: 200 });
  return text;
}

export async function runJob(userId: string, type: AIJobType, payload: any) {
  switch (type) {
    case 'DAILY_SUMMARY':
      return generateDailySummary(userId, payload.date);
    case 'PLAN_CRITIQUE':
      return generatePlanCritique(userId, payload.date);
    case 'HABIT_INSIGHTS':
      return generateHabitInsights(userId, payload.endDate, payload.days || 7);
    case 'NEXT_BEST_ACTION':
      return generateNextBestAction(userId, payload.date);
    case 'TASK_REWRITE':
      return rewriteTasks(userId, payload.taskIds || []);
    default:
      throw new Error('Unknown job type');
  }
}

export async function generateWeeklyChangeBrief(userId: string, endDate: string) {
  const end = parseLocalDateString(endDate) || new Date(endDate);
  const startPrev = new Date(end);
  startPrev.setDate(end.getDate() - 13);

  const metrics = await prisma.dailyMetrics.findMany({
    where: { userId, date: { gte: startPrev, lte: end } },
    orderBy: { date: 'asc' }
  });

  const lastWeek = metrics.slice(-7);
  const prevWeek = metrics.slice(-14, -7);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const summarize = (ms: typeof metrics) => ({
    tasksCompleted: avg(ms.map((m) => m.tasksCompleted)),
    focus: avg(ms.map((m) => m.focusMinutes)),
    distraction: avg(ms.map((m) => m.distractionMinutes)),
    reflections: avg(ms.map((m) => (m.reflectionDone ? 1 : 0))) * 100,
    plans: avg(ms.map((m) => (m.dayPlanConfirmed ? 1 : 0))) * 100
  });

  const last = summarize(lastWeek);
  const prev = summarize(prevWeek);

  const prompt = [
    'You are Omni, generate a concise “what changed this week?” brief.',
    `Last week (avg): tasks ${last.tasksCompleted.toFixed(1)}, focus min ${last.focus.toFixed(1)}, distraction min ${last.distraction.toFixed(1)}, reflection adherence ${last.reflections.toFixed(0)}%, day-plan adherence ${last.plans.toFixed(0)}%.`,
    `Prev week (avg): tasks ${prev.tasksCompleted.toFixed(1)}, focus min ${prev.focus.toFixed(1)}, distraction min ${prev.distraction.toFixed(1)}, reflection adherence ${prev.reflections.toFixed(0)}%, day-plan adherence ${prev.plans.toFixed(0)}%.`,
    'Call out notable increases/decreases and one suggestion. Keep under 100 words. Avoid judgmental tone.',
    safetyInstructions()
  ].join('\n');

  return generateText(prompt, { maxTokens: 200, temperature: 0.5 });
}
