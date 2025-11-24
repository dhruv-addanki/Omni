import { AppCategory, FocusBlockStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { getDayRange } from '../utils/dates';

export async function computeDistractionForFocusBlock(blockId: string) {
  const block = await prisma.focusBlock.findUnique({ where: { id: blockId } });
  if (!block || !block.actualStart || !block.actualEnd) {
    return null;
  }

  const events = await prisma.screenTimeEvent.findMany({
    where: {
      userId: block.userId,
      startedAt: { lte: block.actualEnd },
      endedAt: { gte: block.actualStart }
    }
  });

  let distractionMs = 0;
  for (const evt of events) {
    const overlapStart = Math.max(evt.startedAt.getTime(), block.actualStart.getTime());
    const overlapEnd = Math.min(evt.endedAt.getTime(), block.actualEnd.getTime());
    if (overlapEnd <= overlapStart) continue;

    const isSocial = evt.appCategory === AppCategory.SOCIAL;
    const expectedAppMismatch = block.expectedApp && evt.appName !== block.expectedApp;
    const expectedCategoryMismatch =
      block.expectedCategory && evt.appCategory !== block.expectedCategory;

    if (isSocial || expectedAppMismatch || expectedCategoryMismatch) {
      distractionMs += overlapEnd - overlapStart;
    }
  }

  const distractionMinutes = Math.round(distractionMs / 60000);

  const updated = await prisma.focusBlock.update({
    where: { id: block.id },
    data: { distractionMinutes }
  });

  return updated;
}
