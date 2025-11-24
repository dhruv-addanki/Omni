import prisma from '../lib/prisma';
import { computeDailyStats } from './analytics';
import { parseLocalDateString } from '../utils/dates';

// Placeholder AI client. Replace with real implementation later.
const aiClient = {
  async generateText(prompt: string): Promise<string> {
    // TODO: integrate with actual AI provider (OpenAI, etc.)
    return `AI Summary:\n${prompt.slice(0, 200)}...`;
  }
};

export async function generateDailySummary(userId: string, dateString: string) {
  const date = parseLocalDateString(dateString) || new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  const reflection = await prisma.dailyReflection.findFirst({
    where: { userId, date }
  });

  const stats = await computeDailyStats(userId, date.toISOString());

  const prompt = buildPrompt({ reflection, stats, date });
  const aiSummary = await aiClient.generateText(prompt);

  if (!reflection) {
    // If no reflection exists, create a placeholder one to store the summary.
    await prisma.dailyReflection.create({
      data: {
        userId,
        date,
        rating: 0,
        notes: '',
        aiSummary
      }
    });
    return aiSummary;
  }

  await prisma.dailyReflection.update({
    where: { id: reflection.id },
    data: { aiSummary }
  });

  return aiSummary;
}

function buildPrompt({
  reflection,
  stats,
  date
}: {
  reflection: {
    rating: number;
    notes: string;
    summary?: string | null;
  } | null;
  stats: Awaited<ReturnType<typeof computeDailyStats>>;
  date: Date;
}) {
  const dateStr = date.toISOString().split('T')[0];
  const reflectionPart = reflection
    ? `Reflection rating: ${reflection.rating}\nNotes: ${reflection.notes || 'N/A'}\n`
    : 'No reflection submitted.\n';

  return [
    `You are an assistant generating a concise daily summary for the user.`,
    `Date: ${dateStr}`,
    `Tasks planned: ${stats.tasksPlanned}`,
    `Tasks completed: ${stats.tasksCompleted}`,
    `Focus blocks: ${stats.focusBlocks}`,
    `Focus minutes: ${stats.focusMinutes}`,
    `Screen time: TODO integration later.`,
    reflectionPart,
    `Provide 2-3 bullet points that are actionable and supportive.`
  ].join('\n');
}
