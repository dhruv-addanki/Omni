import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { categorizeApp } from '../services/screenTimeClassifier';

const router = Router();
router.use(requireSupabaseAuth);

const batchSchema = z.object({
  events: z.array(
    z.object({
      platform: z.enum(['MOBILE', 'DESKTOP']).default('MOBILE'),
      appName: z.string(),
      bundleId: z.string().optional(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime()
    })
  )
});

router.post('/events/batch', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const inserts = [];
  for (const evt of parsed.data.events) {
    const category = await categorizeApp(req.user!.userId, evt.appName, evt.bundleId);
    inserts.push({
      userId: req.user!.userId,
      platform: evt.platform,
      appName: evt.appName,
      bundleId: evt.bundleId,
      appCategory: category,
      startedAt: new Date(evt.startedAt),
      endedAt: new Date(evt.endedAt)
    });
  }

  if (inserts.length) {
    await prisma.screenTimeEvent.createMany({ data: inserts });
  }

  return res.status(201).json({ inserted: inserts.length });
});

export default router;
