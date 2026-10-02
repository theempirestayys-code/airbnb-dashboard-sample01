// The swarm: Maya plans → the agents she picks work in parallel on their own data → Maya merges
// one spoken answer for Meet. Without an API key it falls back to the built-in rule brain.
import { answer as ruleAnswer } from '../lib/jarvis';
import { chat, llmReady, parseJson } from './llm';
import { dataFor } from './data';
import { findAgent, loadTeam, type AgentDef } from './team';

export interface AgentResult { id: string; name: string; task: string; output: string; ok: boolean }
export interface SwarmResult { reply: string; mode: 'swarm' | 'rules'; plan: { id: string; task: string }[]; results: AgentResult[]; error?: string }

const GUARD = 'Hard limits for every agent: never move money, publish prices, issue refunds, pay owners or message guests/owners directly — propose it as an APPROVE item for Meet. Use only the numbers in the data given; say which source (sample or real). Never invent facts.';

function agentSystem(a: AgentDef): string {
  const data = JSON.stringify(dataFor(a.id));
  return [a.card, a.sop ? a.sop.slice(0, 2500) : '', GUARD, `DATA (JSON): ${data}`].filter(Boolean).join('\n\n');
}

export async function askAgent(id: string, task: string): Promise<AgentResult> {
  const a = findAgent(id);
  if (!a) return { id, name: id, task, output: `No agent called "${id}".`, ok: false };
  try {
    const output = await chat([{ role: 'system', content: agentSystem(a) }, { role: 'user', content: task }], { tier: a.tier, maxTokens: 500 });
    return { id: a.id, name: a.name, task, output, ok: true };
  } catch (e) {
    return { id: a.id, name: a.name, task, output: (e as Error).message, ok: false };
  }
}

export async function runSwarm(question: string): Promise<SwarmResult> {
  if (!llmReady()) return { reply: ruleAnswer(question), mode: 'rules', plan: [], results: [] };

  const team = loadTeam();
  const maya = findAgent('maya')!;
  const roster = team.filter(a => a.id !== 'maya').map(a => `${a.id}: ${a.seat} — ${a.mission}`).join('\n');

  try {
    // 1. Plan
    const planText = await chat([
      { role: 'system', content: `${maya.card}\n\nYou are routing a question from Meet to your team. Team:\n${roster}\n\nReply with JSON only: {"agents":[{"id":"<agent id>","task":"<one-line task>"}]}. Pick 1–4 agents, fewest that can answer. For small talk or greetings use {"agents":[]}.` },
      { role: 'user', content: question }
    ], { tier: 'lead', maxTokens: 300, temperature: 0 });
    const plan = (parseJson<{ agents: { id: string; task: string }[] }>(planText)?.agents ?? [])
      .filter(p => findAgent(p.id) && p.id !== 'maya')
      .slice(0, 4);

    // 2. Agents work in parallel
    const results = await Promise.all(plan.map(p => askAgent(p.id, p.task)));

    // 3. Maya merges one spoken answer
    const findings = results.map(r => `${r.name} (${r.ok ? 'ok' : 'failed'}): ${r.output}`).join('\n\n') || 'No agents were needed.';
    const reply = await chat([
      { role: 'system', content: `${maya.card}\n\n${GUARD}\n\nYou speak aloud to Meet as Jarvis. Plain sentences, no markdown, no lists, at most 4 sentences. Rupees in Indian format (₹1.2 L). If something needs approval, end with the one decision you need from Meet. Say "sample data" when the figures are sample.${plan.length ? '' : `\nDATA (JSON): ${JSON.stringify(dataFor('maya'))}`}` },
      { role: 'user', content: `Meet asked: ${question}\n\nTeam findings:\n${findings}` }
    ], { tier: 'lead', maxTokens: 350 });

    return { reply, mode: 'swarm', plan, results };
  } catch (e) {
    return { reply: ruleAnswer(question), mode: 'rules', plan: [], results: [], error: (e as Error).message };
  }
}
