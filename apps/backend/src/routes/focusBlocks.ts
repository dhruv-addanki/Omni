import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { computeDistractionForFocusBlock } from '../services/distraction';

const router = Router();
router.use(requireSupabaseAuth);

const startSchema = z.object({
  blockId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  expectedApp: z.string().optional(),
  expectedCategory: z.enum(['SOCIAL', 'PRODUCTIVITY', 'ENTERTAINMENT', 'OTHER']).optional()
});

router.post('/start', async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { blockId, taskId, expectedApp, expectedCategory } = parsed.data;
  const userId = req.user!.userId;

  // Ensure no other ACTIVE block.
  const active = await prisma.focusBlock.findFirst({
    where: { userId, status: 'ACTIVE' }
  });
  if (active) {
    return res.status(400).json({ error: 'Another focus block is already active', code: 'BLOCK_ACTIVE' });
  }

  let block = null;
  if (blockId) {
    block = await prisma.focusBlock.findFirst({ where: { id: blockId, userId } });
  }

  if (!block) {
    block = await prisma.focusBlock.create({
      data: {
        userId,
        taskId,
        plannedStart: new Date(),
        plannedEnd: new Date(new Date().getTime() + 30 * 60000),
        expectedApp,
        expectedCategory,
        status: 'ACTIVE',
        actualStart: new Date()
      }
    });
  } else {
    block = await prisma.focusBlock.update({
      where: { id: block.id },
      data: {
        expectedApp,
        expectedCategory,
        status: 'ACTIVE',
        actualStart: new Date()
      }
    });
  }

  return res.status(200).json(block);
});

const endSchema = z.object({
  blockId: z.string().uuid()
});

router.post('/end', async (req, res) => {
  const parsed = endSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }
  const userId = req.user!.userId;
  const block = await prisma.focusBlock.findFirst({ where: { id: parsed.data.blockId, userId } });
  if (!block || block.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'No active focus block found', code: 'NO_ACTIVE_BLOCK' });
  }

  const updated = await prisma.focusBlock.update({
    where: { id: block.id },
    data: { status: 'COMPLETED', actualEnd: new Date() }
  });

  const withDistraction = await computeDistractionForFocusBlock(updated.id);
  return res.json(withDistraction || updated);
});

router.post('/:id/recompute-distraction', async (req, res) => {
  const { id } = req.params;
  const block = await prisma.focusBlock.findFirst({ where: { id, userId: req.user!.userId } });
  if (!block) return res.status(404).json({ error: 'Focus block not found' });
  if (!block.actualStart || !block.actualEnd) {
    return res.status(400).json({ error: 'Cannot compute distraction without actualStart/end' });
  }
  const result = await computeDistractionForFocusBlock(block.id);
  return res.json(result);
});

router.get('/current-status', async (req, res) => {
  const userId = req.user!.userId;
  const active = await prisma.focusBlock.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { actualStart: 'desc' }
  });
  if (!active) return res.json({ active: null, onPlan: true });

  const lastEvent = await prisma.screenTimeEvent.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' }
  });

  let onPlan = true;
  if (lastEvent) {
    if (active.expectedCategory && lastEvent.appCategory !== active.expectedCategory) onPlan = false;
    if (active.expectedApp && lastEvent.appName !== active.expectedApp) onPlan = false;
    if (lastEvent.appCategory === 'SOCIAL') onPlan = false;
  }

  return res.json({ active, lastEvent, onPlan });
});

export default router;
