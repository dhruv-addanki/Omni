import prisma from '../lib/prisma';
import { getDayRange } from '../utils/dates';

export interface DailyStats {
  tasksPlanned: number;
  tasksCompleted: number;
  focusBlocks: number;
  focusMinutes: number;
  // TODO: add screen time totals once ScreenTimeEvent integration is in place
}

export async function computeDailyStats(userId: string, date: string): Promise<DailyStats> {
  const target = new Date(date);
  const { start, end } = getDayRange(target);

  const [plannedTasks, completedTasks, focusBlocks] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        OR: [
          { scheduledStart: { gte: start, lte: end } },
          { scheduledEnd: { gte: start, lte: end } }
        ]
      }
    }),
    prisma.task.count({
      where: {
        userId,
        status: 'DONE',
        OR: [
          { completedAt: { gte: start, lte: end } },
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
    })
  ]);

  const focusMinutes = focusBlocks.reduce((acc, block) => {
    if (block.actualStart && block.actualEnd) {
      const diff = new Date(block.actualEnd).getTime() - new Date(block.actualStart).getTime();
      return acc + Math.max(Math.round(diff / 60000), 0);
    }
    return acc;
  }, 0);

  return {
    tasksPlanned: plannedTasks,
    tasksCompleted: completedTasks,
    focusBlocks: focusBlocks.length,
    focusMinutes
  };
}
