// Local brain for the voice UI. Listens on 127.0.0.1 only, so real data never leaves this Mac
// except as the trimmed slices sent to the model provider.
//   npm run jarvis   → http://127.0.0.1:8787/health
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { llmConfig, llmReady } from './llm';
import { dataSource } from './data';
import { loadTeam, teamSource } from './team';
import { runSwarm } from './swarm';

const PORT = Number(process.env.JARVIS_PORT || 8787);
const ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000', 'https://theempirestayys-code.github.io', 'null']); // "null" = file:// single-file build

function send(req: IncomingMessage, res: ServerResponse, status: number, body: unknown) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === null ? '' : JSON.stringify(body));
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, null);

  if (req.method === 'GET' && req.url === '/health') {
    const c = llmConfig();
    return send(req, res, 200, {
      ok: true, swarm: llmReady(), provider: c.baseUrl, lead: c.lead, agent: c.agent,
      data: dataSource(), team: `${loadTeam().length} agents (${teamSource()})`
    });
  }

  if (req.method === 'POST' && req.url === '/ask') {
    // JSON content type forces a CORS preflight, so other websites can't spend your tokens with a blind POST.
    if (!req.headers['content-type']?.startsWith('application/json')) return send(req, res, 415, { error: 'application/json required' });
    if (req.headers.origin && !ORIGINS.has(req.headers.origin)) return send(req, res, 403, { error: 'origin not allowed' });
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 10_000) return send(req, res, 413, { error: 'too long' }); }
    const text = (() => { try { return String(JSON.parse(raw).text ?? '').trim(); } catch { return ''; } })();
    if (!text) return send(req, res, 400, { error: 'text required' });
    const t0 = Date.now();
    const out = await runSwarm(text);
    console.log(`[${out.mode}] ${Date.now() - t0}ms · ${out.plan.map(p => p.id).join(', ') || '-'} · ${text}${out.error ? ` · ERROR ${out.error}` : ''}`);
    return send(req, res, 200, out);
  }

  send(req, res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1', () => {
  const c = llmConfig();
  console.log(`Jarvis brain on http://127.0.0.1:${PORT}`);
  console.log(`  swarm: ${llmReady() ? `ON · ${c.baseUrl} · lead ${c.lead} · agents ${c.agent}` : 'OFF (no LLM_API_KEY in .env) → rule brain'}`);
  console.log(`  data:  ${dataSource()}   team: ${loadTeam().length} agents (${teamSource()})`);
});
