import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import prisma from '../lib/prisma';

export async function requireSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.split(' ')[1];

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Ensure user exists in our DB
  const userId = data.user.id;
  const email = data.user.email || '';
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email, passwordHash: '' }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to sync user', err);
  }

  req.user = { userId, email };
  return next();
}
