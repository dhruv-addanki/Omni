import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client: OpenAI | null = null;
if (apiKey) {
  client = new OpenAI({ apiKey });
}

export async function generateText(prompt: string): Promise<string> {
  if (!client) {
    throw new Error('AI client not configured. Set OPENAI_API_KEY.');
  }
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7
  });
  return response.choices[0]?.message?.content?.trim() || '';
}
