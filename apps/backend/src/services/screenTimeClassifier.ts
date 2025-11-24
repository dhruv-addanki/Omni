import { AppCategory } from '@prisma/client';
import prisma from '../lib/prisma';

const SOCIAL = ['instagram', 'tiktok', 'facebook', 'messenger', 'whatsapp', 'snapchat', 'twitter', 'x', 'threads', 'reddit'];
const PRODUCTIVITY = ['notion', 'google docs', 'docs', 'sheets', 'gmail', 'outlook', 'slack', 'asana', 'linear'];
const ENTERTAINMENT = ['youtube', 'netflix', 'spotify', 'hulu'];

export async function categorizeApp(
  userId: string,
  appName: string,
  bundleId?: string | null
): Promise<AppCategory> {
  const normalized = appName.toLowerCase();

  const mapping = await prisma.appCategoryMap.findFirst({
    where: {
      userId,
      OR: [
        bundleId ? { bundleId } : undefined,
        { appName: { equals: appName, mode: 'insensitive' } }
      ].filter(Boolean) as any
    }
  });
  if (mapping?.category) return mapping.category;

  if (bundleId) {
    const globalBundle = await prisma.appCategoryMap.findFirst({ where: { bundleId } });
    if (globalBundle?.category) return globalBundle.category;
  }

  if (SOCIAL.some((s) => normalized.includes(s))) return AppCategory.SOCIAL;
  if (PRODUCTIVITY.some((s) => normalized.includes(s))) return AppCategory.PRODUCTIVITY;
  if (ENTERTAINMENT.some((s) => normalized.includes(s))) return AppCategory.ENTERTAINMENT;
  return AppCategory.OTHER;
}
