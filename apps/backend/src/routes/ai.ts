import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import {
  generateDailySummary,
  generatePlanCritique,
  generateHabitInsights,
  generateNextBestAction,
  rewriteTasks,
  runJob
} from '../services/aiCoach';
import { AIJobStatus, AIJobType } from '@prisma/client';
import { generateWeeklyChangeBrief } from '../services/aiCoach';

const router = Router();
router.use(requireSupabaseAuth);

const rateLimits: Record<string, { windowStart: number; count: number }> = {};
const MAX_NEXT_BEST_PER_HOUR = 5;

function checkRateLimit(userId: string) {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const entry = rateLimits[userId];
  if (!entry || entry.windowStart < windowStart) {
    rateLimits[userId] = { windowStart: now, count: 1 };
    return true;
  }
  if (entry.count >= MAX_NEXT_BEST_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

router.post('/daily-summary', async (req, res) => {
  const schema = z.object({ date: z.string(), sync: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { date, sync } = parsed.data;
  if (sync) {
    const summary = await generateDailySummary(req.user!.userId, date);
    return res.json({ summary });
  }
  const job = await prisma.aIJob.create({
    data: { userId: req.user!.userId, type: AIJobType.DAILY_SUMMARY, status: AIJobStatus.PENDING, payload: { date } }
  });
  return res.status(202).json({ jobId: job.id });
});

router.get('/daily-summary', async (req, res) => {
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = new Date(dateParam);
  date.setHours(0, 0, 0, 0);
  const reflection = await prisma.dailyReflection.findFirst({
    where: { userId: req.user!.userId, date }
  });
  return res.json({ aiSummary: reflection?.aiSummary || null });
});

router.post('/plan-critique', async (req, res) => {
  const schema = z.object({ date: z.string(), sync: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { date, sync } = parsed.data;
  if (sync) {
    const critique = await generatePlanCritique(req.user!.userId, date);
    return res.json({ critique });
  }
  const job = await prisma.aIJob.create({
    data: { userId: req.user!.userId, type: AIJobType.PLAN_CRITIQUE, status: AIJobStatus.PENDING, payload: { date } }
  });
  return res.status(202).json({ jobId: job.id });
});

router.get('/plan-critique', async (req, res) => {
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = new Date(dateParam);
  date.setHours(0, 0, 0, 0);
  const critique = await prisma.planCritique.findUnique({
    where: { userId_date: { userId: req.user!.userId, date } }
  });
  return res.json({ critique: critique?.critique || null });
});

router.post('/habit-insights', async (req, res) => {
  const schema = z.object({ endDate: z.string(), days: z.number().int().optional(), sync: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { endDate, days = 7, sync } = parsed.data;
  if (sync) {
    const insight = await generateHabitInsights(req.user!.userId, endDate, days);
    return res.json({ insight });
  }
  const job = await prisma.aIJob.create({
    data: {
      userId: req.user!.userId,
      type: AIJobType.HABIT_INSIGHTS,
      status: AIJobStatus.PENDING,
      payload: { endDate, days }
    }
  });
  return res.status(202).json({ jobId: job.id });
});

router.get('/habit-insights', async (req, res) => {
  const last = await prisma.habitInsight.findFirst({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' }
  });
  return res.json({ insight: last?.insight || null, rangeStart: last?.rangeStart, rangeEnd: last?.rangeEnd });
});

router.post('/next-best-action', async (req, res) => {
  if (!checkRateLimit(req.user!.userId)) {
    return res.status(429).json({ error: 'Rate limited. Try again later.' });
  }
  const date = new Date().toISOString().split('T')[0];
  try {
    const text = await generateNextBestAction(req.user!.userId, date);
    return res.json({ action: text });
  } catch (err) {
    return res.status(503).json({ error: 'Insight unavailable right now.' });
  }
});

router.post('/tasks/rewrite', async (req, res) => {
  const schema = z.object({ taskIds: z.array(z.string().uuid()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  try {
    const text = await rewriteTasks(req.user!.userId, parsed.data.taskIds);
    return res.json({ rewrites: text });
  } catch (err) {
    return res.status(503).json({ error: 'Rewrite unavailable right now.' });
  }
});

router.post('/jobs/run-once', async (_req, res) => {
  const jobs = await prisma.aIJob.findMany({
    where: { status: AIJobStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    take: 5
  });
  const results: Array<{ id: string; status: string }> = [];
  for (const job of jobs) {
    try {
      await prisma.aIJob.update({ where: { id: job.id }, data: { status: AIJobStatus.PROCESSING } });
      const output = await runJob(job.userId, job.type, job.payload);
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { status: AIJobStatus.COMPLETED, result: output }
      });
      results.push({ id: job.id, status: 'COMPLETED' });
    } catch (err) {
      const attempts = job.attempts + 1;
      const status = attempts >= 3 ? AIJobStatus.FAILED : AIJobStatus.PENDING;
      await prisma.aIJob.update({
        where: { id: job.id },
        data: { attempts, status, error: (err as Error).message }
      });
      results.push({ id: job.id, status });
    }
  }
  return res.json({ processed: results.length, results });
});

router.get('/weekly-change-brief', async (req, res) => {
  const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
  try {
    const brief = await generateWeeklyChangeBrief(req.user!.userId, endDate);
    return res.json({ brief });
  } catch (err) {
    return res.status(503).json({ error: 'Unavailable' });
  }
});

export default router;
