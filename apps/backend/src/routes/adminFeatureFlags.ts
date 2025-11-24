import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

// TODO: protect with admin auth/role
router.get('/admin/feature-flags', async (_req, res) => {
  const flags = await prisma.featureFlag.findMany();
  return res.json(flags);
});

router.patch('/admin/feature-flags/:name', async (req, res) => {
  const schema = z.object({ enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const flag = await prisma.featureFlag.upsert({
    where: { name: req.params.name },
    update: { enabled: parsed.data.enabled },
    create: { name: req.params.name, enabled: parsed.data.enabled }
  });
  return res.json(flag);
});

export default router;
