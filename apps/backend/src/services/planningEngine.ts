import { Task } from '@prisma/client';
import prisma from '../lib/prisma';
import { getDayRange, parseLocalDateString } from '../utils/dates';
import { upsertExternalTaskIntoOmniTask } from './externalTasks';

interface DraftBlock {
  start: Date;
  end: Date;
  taskId?: string;
  taskTitle?: string;
  conflict?: boolean;
}

interface DraftResult {
  date: Date;
  tasks: Task[];
  blocks: DraftBlock[];
  warnings: string[];
}

function toWorkingHours(date: Date) {
  const start = new Date(date);
  start.setHours(8, 0, 0, 0);
  const end = new Date(date);
  end.setHours(18, 0, 0, 0);
  return { start, end };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function generateDraftDayPlan(userId: string, dateString: string): Promise<DraftResult> {
  const parsed = parseLocalDateString(dateString) || new Date(dateString);
  const { start, end } = getDayRange(parsed);
  const { start: workingStart, end: workingEnd } = toWorkingHours(start);

  const [events, externalTasks] = await Promise.all([
    prisma.externalCalendarEvent.findMany({
      where: {
        userId,
        OR: [
          { start: { gte: start, lte: end } },
          { end: { gte: start, lte: end } }
        ]
      },
      orderBy: { start: 'asc' }
    }),
    prisma.externalTask.findMany({
      where: { userId },
      orderBy: [{ due: 'asc' }, { createdAt: 'asc' }]
    })
  ]);

  // Ensure external tasks are mirrored into the Task table for planning.
  for (const ext of externalTasks) {
    await upsertExternalTaskIntoOmniTask(userId, ext.provider, {
      externalId: ext.externalId,
      title: ext.title,
      status: ext.status,
      due: ext.due || undefined,
      projectName: ext.projectName || undefined,
      dataJSON: (ext.dataJSON as Record<string, unknown> | null) || undefined
    });
  }

  const tasks = await prisma.task.findMany({
    where: { userId, status: 'TODO' },
    orderBy: [{ scheduledEnd: 'asc' }, { createdAt: 'asc' }]
  });

  // Build free windows from calendar events within working hours.
  const windows: Array<{ start: Date; end: Date }> = [];
  let cursor = workingStart;
  for (const evt of events) {
    if (evt.end <= cursor) continue;
    if (evt.start > cursor) {
      windows.push({ start: cursor, end: new Date(Math.min(evt.start.getTime(), workingEnd.getTime())) });
    }
    cursor = new Date(Math.max(cursor.getTime(), evt.end.getTime()));
    if (cursor >= workingEnd) break;
  }
  if (cursor < workingEnd) {
    windows.push({ start: cursor, end: workingEnd });
  }

  const blocks: DraftBlock[] = [];
  const blockMinutes = 60;
  let taskIdx = 0;

  for (const window of windows) {
    let blockStart = window.start;
    while (taskIdx < tasks.length) {
      const blockEnd = new Date(blockStart.getTime() + blockMinutes * 60000);
      if (blockEnd > window.end) break;
      const task = tasks[taskIdx];
      blocks.push({
        start: blockStart,
        end: blockEnd,
        taskId: task.id,
        taskTitle: task.title,
        conflict: events.some((evt) => overlaps(blockStart, blockEnd, evt.start, evt.end))
      });
      blockStart = blockEnd;
      taskIdx += 1;
    }
  }

  const plannedMinutes = blocks.reduce((acc, b) => acc + (b.end.getTime() - b.start.getTime()) / 60000, 0);
  const warnings: string[] = [];
  if (tasks.length > blocks.length) {
    warnings.push('Too many tasks for available focus blocks; consider deferring some tasks.');
  }
  if (plannedMinutes > (workingEnd.getTime() - workingStart.getTime()) / 60000) {
    warnings.push('Plan exceeds working hours.');
  }

  return { date: start, tasks, blocks, warnings };
}
