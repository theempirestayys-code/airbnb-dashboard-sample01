// One client for any OpenAI-compatible chat API: OpenRouter (default, Grok models), xAI, OpenAI, or a local server.
// Switch provider by changing LLM_BASE_URL + LLM_API_KEY + model names in .env. No other code changes.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envFile = join(process.cwd(), '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export type Tier = 'lead' | 'agent';
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export function llmConfig() {
  return {
    baseUrl: (process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    apiKey: process.env.LLM_API_KEY || '',
    lead: process.env.LLM_MODEL_LEAD || 'x-ai/grok-4.7',
    agent: process.env.LLM_MODEL_AGENT || 'x-ai/grok-4.3'
  };
}

// A local server (Ollama, LM Studio) needs no key.
export const llmReady = () => {
  const c = llmConfig();
  return Boolean(c.apiKey) || /localhost|127\.0\.0\.1/.test(c.baseUrl);
};

export async function chat(messages: ChatMessage[], opts: { tier?: Tier; maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const c = llmConfig();
  const res = await fetch(`${c.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}),
      'X-Title': 'Empire Command Jarvis'
    },
    body: JSON.stringify({
      model: opts.tier === 'lead' ? c.lead : c.agent,
      messages,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.3
    }),
    signal: AbortSignal.timeout(60_000)
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json() as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content?.trim() ?? '';
}

// Models sometimes wrap JSON in prose or code fences; take the first {...} block.
export function parseJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
