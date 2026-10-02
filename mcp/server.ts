// Empire Jarvis MCP server (stdio). Gives Claude Code, Claude Desktop or any MCP client the agent team,
// each agent's skill and data, and the swarm. Registered for this repo in .mcp.json.
// Logs go to stderr: stdout carries the MCP protocol.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { answer as ruleAnswer } from '../lib/jarvis';
import { llmConfig, llmReady } from '../jarvis/llm';
import { SCOPES, dataFor, dataSource, getData, type Scope } from '../jarvis/data';
import { findAgent, loadTeam, teamSource } from '../jarvis/team';
import { askAgent, runSwarm } from '../jarvis/swarm';

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] });
const agentIds = () => loadTeam().map(a => a.id).join(', ');

const server = new McpServer({ name: 'empire-jarvis', version: '0.1.0' });

server.registerTool('jarvis_status', {
  description: 'Show whether the swarm is on (LLM key present), which provider and models it uses, the data source (sample or real local) and the team source.',
  annotations: { readOnlyHint: true }
}, async () => {
  const c = llmConfig();
  return text({ swarm: llmReady(), provider: c.baseUrl, lead_model: c.lead, agent_model: c.agent, data: dataSource(), team: `${loadTeam().length} agents (${teamSource()})` });
});

server.registerTool('list_agents', {
  description: 'List the Empire Stays agent team: id, name, seat, mission, autonomy level, model tier and the data scopes each one reads.',
  annotations: { readOnlyHint: true }
}, async () => text(loadTeam().map(a => ({ id: a.id, name: a.name, seat: a.seat, mission: a.mission, autonomy: a.autonomy, tier: a.tier, reads: a.reads }))));

server.registerTool('get_agent_skill', {
  description: 'Get one agent\'s full skill: role card (prompt) and SOP (inputs, actions, hard rules, escalation, KPIs, output format).',
  inputSchema: { agent: z.string().describe('Agent id, e.g. maya, ishaan, kavya') },
  annotations: { readOnlyHint: true }
}, async ({ agent }) => {
  const a = findAgent(agent);
  return a ? text(`# ${a.name} · ${a.seat}\n\n## Role card\n${a.card}\n\n${a.sop}`) : text(`Unknown agent. Use one of: ${agentIds()}`);
});

server.registerTool('get_agent_data', {
  description: 'Get exactly the data slices one agent is allowed to read, each labelled with its source (sample or real).',
  inputSchema: { agent: z.string().describe('Agent id') },
  annotations: { readOnlyHint: true }
}, async ({ agent }) => (findAgent(agent) ? text(dataFor(agent.toLowerCase())) : text(`Unknown agent. Use one of: ${agentIds()}`)));

server.registerTool('get_data', {
  description: `Get one portfolio data scope. Scopes: ${SCOPES.join(', ')}.`,
  inputSchema: { scope: z.enum(SCOPES as [Scope, ...Scope[]]) },
  annotations: { readOnlyHint: true }
}, async ({ scope }) => text(getData(scope)));

server.registerTool('jarvis_quick_answer', {
  description: 'Instant answer from the built-in rule brain (sample data, no LLM, no cost): money, RevPAR, occupancy, a listing, or pending decisions.',
  inputSchema: { question: z.string() },
  annotations: { readOnlyHint: true }
}, async ({ question }) => text(ruleAnswer(question)));

server.registerTool('ask_agent', {
  description: 'Give one agent a task. It answers in its own role with its own data via the configured LLM. Agents only propose; nothing is sent or published.',
  inputSchema: { agent: z.string().describe('Agent id'), task: z.string() }
}, async ({ agent, task }) => {
  if (!llmReady()) return text('Swarm is off: add LLM_API_KEY to .env (see .env.example).');
  return text(await askAgent(agent, task));
});

server.registerTool('run_swarm', {
  description: 'Ask Jarvis. Maya routes the question to the right agents, they work in parallel on their own data, and Maya merges one answer. Returns the plan, each agent\'s output and the final reply.',
  inputSchema: { question: z.string() }
}, async ({ question }) => text(await runSwarm(question)));

server.connect(new StdioServerTransport()).then(() =>
  console.error(`empire-jarvis MCP ready · ${loadTeam().length} agents · data ${dataSource()} · swarm ${llmReady() ? 'on' : 'off'}`));
