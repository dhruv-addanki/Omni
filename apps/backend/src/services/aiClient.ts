import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client: OpenAI | null = null;
if (apiKey) {
  client = new OpenAI({ apiKey });
}

export async function generateText(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!client) {
    throw new Error('AI client not configured. Set OPENAI_API_KEY.');
  }
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options?.maxTokens ?? 300,
    temperature: options?.temperature ?? 0.6
  });
  return response.choices[0]?.message?.content?.trim() || '';
}
