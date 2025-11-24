import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireSupabaseAuth } from '../middleware/authSupabase';
import { getDayRange } from '../utils/dates';
import { AlarmEventType } from '@prisma/client';

const alarmsRouter = Router();
alarmsRouter.use(requireSupabaseAuth);

alarmsRouter.get('/current', async (req, res) => {
  const alarm = await prisma.alarmSetting.findFirst({
    where: { userId: req.user!.userId },
    orderBy: { nextAlarmAt: 'desc' }
  });

  if (!alarm) return res.json({ nextAlarmAt: null, mode: null, wakeTime: null });
  return res.json(alarm);
});

const alarmSchema = z.object({
  wakeTime: z.string().datetime(),
  mode: z.enum(['STRICT', 'LIGHT'])
});

alarmsRouter.post('/', async (req, res) => {
  const parsed = alarmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { wakeTime, mode } = parsed.data;
  const { start, end } = getDayRange();

  const reflection = await prisma.dailyReflection.findFirst({
    where: { userId: req.user!.userId, date: start }
  });

  if (!reflection) {
    return res
      .status(400)
      .json({ error: 'Nightly review required before setting an alarm.', code: 'REFLECTION_REQUIRED' });
  }

  const alarm = await prisma.alarmSetting.upsert({
    where: { userId: req.user!.userId },
    update: { wakeTime: new Date(wakeTime), nextAlarmAt: new Date(wakeTime), mode },
    create: {
      userId: req.user!.userId,
      wakeTime: new Date(wakeTime),
      nextAlarmAt: new Date(wakeTime),
      mode
    }
  });

  await prisma.alarmLog.create({
    data: {
      userId: req.user!.userId,
      alarmId: alarm.id,
      type: AlarmEventType.SET,
      metadata: { wakeTime, mode }
    }
  });

  return res.status(201).json(alarm);
});

const alarmLogSchema = z.object({
  type: z.enum(['SET', 'SNOOZE', 'DISMISS']),
  timestamp: z.string().datetime().optional(),
  alarmId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

alarmsRouter.post('/log', async (req, res) => {
  const parsed = alarmLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { type, alarmId, timestamp, metadata } = parsed.data;
  const event = await prisma.alarmLog.create({
    data: {
      userId: req.user!.userId,
      alarmId,
      type: type as AlarmEventType,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      metadata
    }
  });

  return res.status(201).json(event);
});

export default alarmsRouter;
