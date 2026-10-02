// Data each agent can read. Real data comes from the local ERA 2.0 portfolio.json when it exists;
// otherwise the sample portfolio from lib/portfolio.ts. Every slice says which one it is.
// Owner names and Airbnb listing IDs are dropped before anything is sent to the model provider.
import { existsSync, readFileSync } from 'node:fs';
import { DECISIONS } from '../lib/agents';
import { CHANNELS, LISTINGS, MONTHS, calc } from '../lib/portfolio';
import { READS, loadTeam } from './team';

export type Scope = 'kpis' | 'listings' | 'money' | 'channels' | 'approvals' | 'team' | 'today' | 'feeds' | 'pipeline' | 'compliance';
export const SCOPES: Scope[] = ['kpis', 'listings', 'money', 'channels', 'approvals', 'team', 'today', 'feeds', 'pipeline', 'compliance'];

const portfolioPath = () => process.env.TES_PORTFOLIO_JSON || '/Users/tes/Documents/_ERA 2.0 (29 Sep 2026)/ERA2_Build/00_Command/portfolio.json';

interface Real {
  _generated: string;
  properties: { name: string; city: string; unit_type: string; status: string; base_adr: number; cleaning_fee: number; owner_model: string; owner_share: number | null; duplicate_of: string | null; brand: string }[];
  channels: { channel: string; commission: number; payout_lag_days: number }[];
  airbnb_months: { month: string; gross: number; fee: number; tax: number; payout: number }[];
}

function real(): Real | null {
  if (process.env.TES_DATA === 'sample') return null;
  const p = portfolioPath();
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as Real : null;
}

export const dataSource = () => (real() ? 'real (local ERA 2.0 portfolio.json)' : 'sample');

const round = (n: number) => Math.round(n);

function sampleSlice(scope: Scope): unknown {
  const sep = calc(LISTINGS, [MONTHS.sep]);
  const aug = calc(LISTINGS, [MONTHS.aug]);
  switch (scope) {
    case 'kpis': return {
      month: 'Sep 2026', prior: 'Aug 2026',
      gross: round(sep.gross), gross_prior: round(aug.gross), gop: round(sep.gop), margin: +sep.margin.toFixed(3),
      occupancy: +sep.occ.toFixed(3), adr: round(sep.adr), revpar: round(sep.revpar), rgi: round(sep.rgi)
    };
    case 'listings': return LISTINGS.map(l => {
      const r = calc([l], [MONTHS.sep]);
      return { name: l.name, city: l.city, type: l.type, adr: round(r.adr), occupancy: +r.occ.toFixed(2), revpar: round(r.revpar), fwd14_occupancy_pct: l.fwd };
    });
    case 'money': return { month: 'Sep 2026', gross: round(sep.gross), ota_fees: round(sep.fees), leases: round(sep.lease), cleaning: round(sep.clean), laundry: round(sep.laundry), utilities: round(sep.util), supplies: round(sep.supp), maintenance: round(sep.maint), gop: round(sep.gop) };
    case 'channels': return CHANNELS;
    case 'today': return { note: 'Sample day', items: ['NYC*35: 2 PM arrival, door code sent at noon', 'Paradise*144: turnover after 11 AM checkout'] };
    default: return null;
  }
}

function realSlice(r: Real, scope: Scope): unknown {
  const live = r.properties.filter(p => p.status === 'Live');
  const months = r.airbnb_months.slice(-6);
  switch (scope) {
    case 'kpis': return {
      as_of: r._generated,
      units: { live: live.length, listed_idle: r.properties.filter(p => p.status === 'Listed-idle').length, exited: r.properties.filter(p => p.status === 'Exited').length },
      airbnb_last_3_months: months.slice(-3)
    };
    case 'listings': return r.properties.filter(p => p.status !== 'Exited').map(p => ({
      name: p.name, brand: p.brand, city: p.city, type: p.unit_type, status: p.status, base_adr: p.base_adr, cleaning_fee: p.cleaning_fee,
      owner_model: p.owner_model, owner_share: p.owner_share, duplicate_of: p.duplicate_of
    }));
    case 'money': return { source: 'Airbnb earnings by month', months };
    case 'channels': return r.channels;
    case 'today': return { note: 'Live arrivals and turnovers are not connected yet (Gmail feed lands in the ERA 2.0 DB).' };
    default: return null;
  }
}

export function getData(scope: Scope): { scope: Scope; source: string; data: unknown } {
  if (scope === 'approvals') return { scope, source: 'sample queue', data: DECISIONS.map(d => ({ tag: d.tag, title: d.title, why: d.why, suggested: d.primary })) };
  if (scope === 'team') return { scope, source: 'team', data: loadTeam().map(a => ({ id: a.id, name: a.name, seat: a.seat, autonomy: a.autonomy })) };
  if (scope === 'feeds') return { scope, source: 'configured (not health-checked)', data: [{ feed: 'Gmail → bookings', every: '5 min' }, { feed: 'iCal truth check', every: '10 min' }, { feed: 'Airbnb earnings CSV', every: 'manual' }] };
  if (scope === 'pipeline' || scope === 'compliance') return { scope, source: 'not connected', data: null };
  const r = real();
  return r ? { scope, source: dataSource(), data: realSlice(r, scope) } : { scope, source: 'sample', data: sampleSlice(scope) };
}

export const dataFor = (agentId: string) => (READS[agentId] ?? []).map(getData);
