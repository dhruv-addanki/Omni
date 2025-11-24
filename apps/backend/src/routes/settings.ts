import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';

// Simple in-memory settings fallback; in production, persist via DB.
const settingsStore: Record<string, any> = {};

const router = Router();
router.use(requireSupabaseAuth);

router.get('/settings', async (req, res) => {
  const userId = req.user!.userId;
  const stored = settingsStore[userId] || {
    notifications: { reflectionReminder: true, focusOffTrack: true },
    alarmRules: { strictMode: false, minTopTasks: 3 }
  };
  return res.json(stored);
});

router.patch('/settings', async (req, res) => {
  const schema = z.object({
    notifications: z.any().optional(),
    alarmRules: z.any().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const userId = req.user!.userId;
  settingsStore[userId] = { ...(settingsStore[userId] || {}), ...parsed.data };
  return res.json(settingsStore[userId]);
});

router.get('/integrations', async (req, res) => {
  const connections = await prisma.integrationConnection.findMany({
    where: { userId: req.user!.userId }
  });
  return res.json(connections);
});

router.post('/integrations/connect', async (req, res) => {
  // Stub: In production, handle OAuth.
  const schema = z.object({ provider: z.string(), accessToken: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { provider, accessToken } = parsed.data;
  const conn = await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId: req.user!.userId, provider: provider as any } },
    update: { accessToken: accessToken || 'token', refreshToken: '' },
    create: { userId: req.user!.userId, provider: provider as any, accessToken: accessToken || 'token', refreshToken: '' }
  });
  return res.json(conn);
});

router.post('/integrations/disconnect', async (req, res) => {
  const schema = z.object({ provider: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  await prisma.integrationConnection.deleteMany({
    where: { userId: req.user!.userId, provider: parsed.data.provider as any }
  });
  return res.json({ ok: true });
});

export default router;
