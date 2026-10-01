'use client';

import { useState } from 'react';
import { Chip, Nav, Segmented } from '@/components/ui';
import { LISTINGS, MONTHS, calc, inr, type Listing, type Tone, type Totals } from '@/lib/portfolio';

type MetricKey = 'adr' | 'occ' | 'revpar' | 'trevpar' | 'nrevpar' | 'goppar' | 'cpor' | 'rgi';
type Group = 'portfolio' | 'city' | 'listing';

const METRICS: Record<MetricKey, { label: string; formula: string; why: string; trigger: string; value: (t: Totals) => number; work: (t: Totals) => string; fmt: (v: number) => string; lowerBetter?: boolean }> = {
  adr: { label: 'ADR', formula: 'ADR = room revenue ÷ nights sold', why: 'Pricing power per sold night. It ignores empty nights, so read it with occupancy.', trigger: 'ADR more than 10% under its seasonal baseline → pricing agent reviews demand pacing.', value: t => t.adr, work: t => `${inr(t.room)} ÷ ${t.sold} nights`, fmt: inr },
  occ: { label: 'Occupancy', formula: 'Occ = nights sold ÷ nights available', why: 'Calendar use. Owner-blocked and maintenance nights come out of "available".', trigger: 'Forward 14-day occupancy under 60% → test a 5–10% cut or relax minimum stay, never below the floor rate.', value: t => t.occ, work: t => `${t.sold} ÷ ${t.avail}`, fmt: v => (v * 100).toFixed(1) + '%' },
  revpar: { label: 'RevPAR', formula: 'RevPAR = room revenue ÷ nights available', why: 'The headline health KPI: price and demand in one number (ADR × occupancy).', trigger: 'RevPAR diverging from the comp set for 2+ weeks → re-anchor the pricing rules.', value: t => t.revpar, work: t => `${inr(t.room)} ÷ ${t.avail}`, fmt: inr },
  trevpar: { label: 'TRevPAR', formula: 'TRevPAR = (rooms + extras) ÷ nights available', why: 'Total guest wallet: early check-in, extra guest, late checkout.', trigger: 'TRevPAR under 5% above RevPAR → upsell journeys in Maya need work.', value: t => t.trevpar, work: t => `${inr(t.gross)} ÷ ${t.avail}`, fmt: inr },
  nrevpar: { label: 'NRevPAR', formula: 'NRevPAR = (rooms − OTA & gateway fees) ÷ available', why: 'What distribution really costs. Direct bookings lift this the most.', trigger: 'Fees over 15% of room revenue → push direct booking on the Empire Stays website.', value: t => t.nrevpar, work: t => `${inr(t.room - t.fees)} ÷ ${t.avail}`, fmt: inr },
  goppar: { label: 'GOPPAR', formula: 'GOPPAR = (money in − fees − lease − ops) ÷ available', why: 'The bottom line per available night.', trigger: 'GOPPAR falling while RevPAR holds → costs are running away; open the expense lines.', value: t => t.goppar, work: t => `${inr(t.gop)} ÷ ${t.avail}`, fmt: inr },
  cpor: { label: 'CPOR', formula: 'CPOR = (cleaning + laundry + supplies + utilities) ÷ nights sold', why: 'What it costs to serve each occupied night.', trigger: 'CPOR above 30% of ADR → re-tender cleaning and laundry vendors.', value: t => t.cpor, work: t => `${inr(t.clean + t.laundry + t.supp + t.util)} ÷ ${t.sold}`, fmt: inr, lowerBetter: true },
  rgi: { label: 'RGI', formula: 'RGI = our RevPAR ÷ comp-set RevPAR × 100', why: 'Fair share of the market. Above 100 means we take more than our share.', trigger: 'RGI under 95 → recalibrate dynamic pricing against the comp listings.', value: t => t.rgi, work: t => `${inr(t.revpar)} ÷ ${inr(t.comp / (t.avail || 1))}`, fmt: v => v.toFixed(0) }
};

const SOURCES: { abbr: string; name: string; feeds: string; cadence: string; tone: Tone; status: string }[] = [
  { abbr: 'AB', name: 'Airbnb host account', feeds: 'Reservations, payouts, host fees, reviews, guest messages', cadence: 'confirmation emails via Gmail · earnings CSV daily', tone: 'warn', status: 'Suggested' },
  { abbr: 'BK', name: 'Booking.com extranet', feeds: 'Reservations, commission invoices', cadence: 'reservation export daily', tone: 'warn', status: 'Suggested' },
  { abbr: 'ZB', name: 'Zoho Books', feeds: 'Expenses, vendor bills, bank feed, owner payouts, GST', cadence: 'connector available · hourly sync', tone: 'ok', status: 'Connector' },
  { abbr: 'WA', name: 'WhatsApp Cloud API', feeds: 'Guest conversations for Maya, alerts to Meet', cadence: 'webhook · automation/01b', tone: 'warn', status: 'Built' },
  { abbr: 'RP', name: 'Razorpay', feeds: 'Direct bookings, deposits, upsell payments', cadence: 'webhook · payment.captured', tone: 'warn', status: 'Suggested' },
  { abbr: 'BN', name: 'Bank statement', feeds: 'Truth for money that actually landed', cadence: '[YOUR BANK] statement feed · daily', tone: 'crit', status: 'Missing' },
  { abbr: 'PL', name: 'Comp set & pricing', feeds: 'Comp RevPAR for RGI, forward pacing', cadence: 'PriceLabs API or nightly scrape', tone: 'warn', status: 'Suggested' },
  { abbr: 'RG', name: 'Empire knowledge base', feeds: 'Policies, discount tiers, escalation matrix', cadence: 'TES Airsynk RAG connector', tone: 'ok', status: 'Connector' }
];

const ENTITIES = [
  { name: 'properties', grain: '1 row per unit', fields: 'code · name · city · area · address · wifi · checkin_guide · house_rules · floor_rate' },
  { name: 'bookings', grain: '1 row per booking', fields: 'confirmation_code · listing_code · guest_name · guest_phone · check_in · check_out · guests · payout_inr · status' },
  { name: 'night_ledger', grain: 'listing × night', fields: 'date · listing_code · state(sold|open|blocked) · room_rev · extras · booking_id' },
  { name: 'expenses', grain: '1 row per bill', fields: 'date · listing_code · bucket · amount · zoho_id' },
  { name: 'messages', grain: '1 row per WhatsApp', fields: 'phone · direction · body · wa_msg_id · created_at' },
  { name: 'escalations', grain: '1 row per decision', fields: 'id · phone · intent · urgency · summary · draft_reply · status · final_reply' }
];

const SUGGESTIONS = [
  { goal: 'G1', title: 'Money truth', body: 'Land Airbnb and Booking.com payouts plus Zoho Books expenses daily. Match each payout to its reservations and tag every bill with a listing code.', unlocks: 'Money in, fees, expenses, GOP per listing' },
  { goal: 'G2', title: 'Nightly ledger + KPIs', body: 'Expand bookings into one row per listing per night (sold, open, blocked). Every ADR, occupancy and RevPAR number derives from it.', unlocks: 'ADR · Occ · RevPAR · TRevPAR · NRevPAR · GOPPAR · CPOR' },
  { goal: 'G3', title: 'Comp set + pacing', body: 'Store comp RevPAR per city each night and forward 14-day occupancy per listing. Pricing and RGI read from here.', unlocks: 'RGI · gap-pricing triggers · approval gates' },
  { goal: 'G4', title: 'Agent audit + expansion', body: 'Log every agent action and decision. Add Ahmedabad and Gandhinagar listings as pipeline rows with a pro-forma lease and ADR.', unlocks: 'Trust in automation · city roll-out view' }
];

const RULES = [
  'Every expense carries a listing code (or "portfolio", split by nights available).',
  'Owner-blocked nights leave "available"; they never count as vacant.',
  'GST collected stays in its own column, never in revenue.',
  'Payout ≠ revenue: book revenue on stay nights, cash on payout date.'
];

export default function DataBuilder() {
  const [metric, setMetric] = useState<MetricKey>('revpar');
  const [group, setGroup] = useState<Group>('listing');
  const m = METRICS[metric];
  const sep = [MONTHS.sep];
  const buckets: { name: string; list: Listing[] }[] =
    group === 'portfolio' ? [{ name: 'All 10 listings', list: LISTINGS }]
      : group === 'city' ? (['Mumbai', 'Thane'] as const).map(c => ({ name: c, list: LISTINGS.filter(l => l.city === c) }))
        : LISTINGS.map(l => ({ name: l.name, list: [l] }));
  const rows = buckets
    .map(b => { const t = calc(b.list, sep); return { name: b.name, v: m.value(t), work: m.work(t) }; })
    .sort((a, b) => (m.lowerBetter ? a.v - b.v : b.v - a.v));
  const max = Math.max(...rows.map(r => Math.abs(r.v))) || 1;

  return (
    <main className="container">
      <Nav current="/data-builder/" />
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="label" style={{ color: 'var(--ec-gold)' }}>Data builder</div>
        <h1 className="display" style={{ fontSize: 40 }}>One ledger behind every rupee and every KPI</h1>
        <p className="muted" style={{ maxWidth: 820, fontSize: 15, lineHeight: 1.6 }}>Connect the sources and land everything on a nightly ledger, one row per listing per night. Every metric on the dashboard then becomes a formula you can audit. Pick a metric to see its maths on the sample portfolio.</p>
      </header>

      <section className="grid-auto" style={{ ['--min' as string]: 'min(100%, 400px)', gap: 20 }}>
        <div className="panel" style={{ gap: 12 }}>
          <div className="panel-head"><h2>1 · Sources</h2><span className="faint" style={{ fontSize: 12 }}>what feeds what</span></div>
          {SOURCES.map(s => (
            <div key={s.abbr} className="row" style={{ alignItems: 'flex-start', padding: 12, borderRadius: 12, background: 'var(--ec-raised)' }}>
              <span className="mono" style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(201,169,110,0.16)', color: 'var(--ec-gold-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.abbr}</span>
              <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div className="row between" style={{ gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span><Chip tone={s.tone}>{s.status}</Chip></div>
                <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{s.feeds}</span>
                <span className="mono faint" style={{ fontSize: 11 }}>{s.cadence}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ gap: 12 }}>
          <div className="panel-head"><h2>2 · Unified model</h2><span className="faint" style={{ fontSize: 12 }}>Postgres · automation/db/schema.sql</span></div>
          {ENTITIES.map(e => (
            <div key={e.name} style={{ border: '1px solid var(--ec-border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="row between" style={{ padding: '9px 12px', background: 'var(--ec-raised)' }}><span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ec-gold-200)' }}>{e.name}</span><span className="faint" style={{ fontSize: 11 }}>{e.grain}</span></div>
              <div className="mono muted" style={{ padding: '9px 12px', fontSize: 12, lineHeight: 1.6 }}>{e.fields}</div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ borderColor: 'rgba(201,169,110,0.35)', gap: 14 }}>
          <div className="panel-head"><h2>3 · Metric builder</h2><span className="faint" style={{ fontSize: 12 }}>Sep 2026 · sample</span></div>
          <Segmented label="Metric" value={metric} onChange={setMetric} options={(Object.keys(METRICS) as MetricKey[]).map(k => ({ value: k, label: METRICS[k].label }))} />
          <Segmented label="Group by" value={group} onChange={setGroup} options={[{ value: 'portfolio', label: 'Portfolio' }, { value: 'city', label: 'City' }, { value: 'listing', label: 'Listing' }]} />
          <div style={{ background: 'var(--ec-raised)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>Formula</span>
            <span className="mono" style={{ fontSize: 15, color: 'var(--ec-gold-200)' }}>{m.formula}</span>
            <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{m.why}</span>
          </div>
          {rows.map(r => (
            <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="row between" style={{ fontSize: 13, gap: 8 }}><span>{r.name}</span><span className="mono" style={{ fontWeight: 600 }}>{m.fmt(r.v)}</span></div>
              <div className="bar-track" style={{ height: 6, background: 'var(--ec-surface)' }}><div className="bar-fill" style={{ width: `${(Math.abs(r.v) / max) * 100}%`, background: r.v < 0 ? 'var(--ec-crit)' : 'var(--ec-gold)' }} /></div>
              <span className="mono faint" style={{ fontSize: 11 }}>{r.work}</span>
            </div>
          ))}
          <div className="row" style={{ alignItems: 'flex-start', borderTop: '1px solid var(--ec-border)', paddingTop: 12 }}>
            <Chip tone="warn">TRIGGER</Chip><span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{m.trigger}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>4 · Build suggestions, in priority order</h2><span className="faint" style={{ fontSize: 13 }}>Goal 1 → 4 · re-rank on the 5-day goal check-in</span></div>
        <div className="grid-auto" style={{ ['--min' as string]: 'min(100%, 300px)' }}>
          {SUGGESTIONS.map(s => (
            <div key={s.goal} style={{ background: 'var(--ec-raised)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row"><span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ec-on-gold)', background: 'var(--ec-gold)', padding: '3px 8px', borderRadius: 6 }}>{s.goal}</span><span style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</span></div>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.body}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ec-gold-200)' }}>Unlocks → {s.unlocks}</span>
            </div>
          ))}
        </div>
        <div className="grid-auto" style={{ ['--min' as string]: 'min(100%, 300px)', gap: 10, borderTop: '1px solid var(--ec-border)', paddingTop: 14 }}>
          {RULES.map(r => (
            <div key={r} className="row muted" style={{ alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ec-ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
