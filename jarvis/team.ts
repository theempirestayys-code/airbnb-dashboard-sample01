// The agent team. Role cards and SOPs are read at runtime from the local ERA 2.0 folder (04_Agents),
// so they never get copied into this public repo. Without that folder, a names-only roster is used.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tier } from './llm';
import type { Scope } from './data';

export interface AgentDef {
  id: string; name: string; seat: string; mission: string; speaksLike: string;
  autonomy: number; tier: Tier; reads: Scope[]; card: string; sop: string;
}

const LEAD = new Set(['maya', 'arjun']);

// What each agent may read through the data layer (jarvis/data.ts).
export const READS: Record<string, Scope[]> = {
  maya: ['kpis', 'approvals', 'team'],
  arjun: ['kpis', 'listings', 'pipeline'],
  riya: ['team', 'approvals', 'feeds'],
  kavya: ['kpis', 'money', 'channels'],
  ananya: ['approvals', 'compliance'],
  neil: ['feeds'],
  rohan: ['listings', 'today'],
  tara: ['today', 'approvals'],
  vikram: ['money', 'listings'],
  ishaan: ['listings', 'kpis', 'channels'],
  dev: ['pipeline', 'kpis'],
  sameer: ['pipeline'],
  meera: ['listings'],
  priya: ['team']
};

const FALLBACK: [string, string, string][] = [
  ['maya', 'Maya', 'AI CEO · Chief Orchestrator'],
  ['arjun', 'Arjun', 'Strategy & Expansion'],
  ['riya', 'Riya', 'Chief of Staff · Watchdog'],
  ['kavya', 'Kavya', 'CFO · Ledger'],
  ['ananya', 'Ananya', 'Legal & Compliance'],
  ['neil', 'Neil', 'Tech · Live feeds'],
  ['rohan', 'Rohan', 'COO · Operations'],
  ['tara', 'Tara', 'Guest Care'],
  ['vikram', 'Vikram', 'Purchase & Inventory'],
  ['ishaan', 'Ishaan', 'Revenue & Pricing'],
  ['dev', 'Dev', 'Sales · Owner acquisition'],
  ['sameer', 'Sameer', 'Outreach'],
  ['meera', 'Meera', 'Brand & Listings'],
  ['priya', 'Priya', 'People & Admin']
];

export const agentsDir = () => process.env.ERA2_AGENTS_DIR || '/Users/tes/Documents/_ERA 2.0 (29 Sep 2026)/ERA2_Build/04_Agents';

let cache: AgentDef[] | null = null;

export function loadTeam(): AgentDef[] {
  if (cache) return cache;
  const dir = agentsDir();
  const read = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');
  const teamFile = join(dir, 'team.json');

  if (existsSync(teamFile)) {
    const team = JSON.parse(readFileSync(teamFile, 'utf8')) as { id: string; name: string; seat: string; mission: string; speaks_like: string; autonomy: number }[];
    cache = team.map(a => ({
      id: a.id, name: a.name, seat: a.seat, mission: a.mission, speaksLike: a.speaks_like, autonomy: a.autonomy,
      tier: LEAD.has(a.id) ? 'lead' : 'agent',
      reads: READS[a.id] ?? [],
      card: read(join(dir, 'prompts', `${a.id}.prompt`)),
      sop: read(join(dir, 'sops', `${a.id}.md`))
    }));
  } else {
    cache = FALLBACK.map(([id, name, seat]) => ({
      id, name, seat, mission: seat, speaksLike: 'Short and factual', autonomy: 0,
      tier: LEAD.has(id) ? 'lead' : 'agent', reads: READS[id] ?? [],
      card: `ROLE: ${name}, ${seat}, The Empire Stays (Thane+Mumbai STR). Suggest only. Never invent facts or numbers.`,
      sop: ''
    }));
  }
  return cache;
}

export const teamSource = () => (existsSync(join(agentsDir(), 'team.json')) ? 'era2' : 'fallback');
export const findAgent = (id: string) => loadTeam().find(a => a.id === id.toLowerCase().trim());
