'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Chip, Delta, MicIcon, Nav, SampleBadge, Segmented } from '@/components/ui';
import { AGENTS, DECISIONS } from '@/lib/agents';
import {
  CHANNELS, MONTHS, PRIOR, calc, dailyRoomRevenue, filterListings, inr, lakh, listingSignal, monthsFor, pct,
  type CityFilter, type PeriodKey, type Totals
} from '@/lib/portfolio';

const CITY_OPTIONS: { value: CityFilter; label: string }[] = [
  { value: 'All', label: 'All' }, { value: 'Mumbai', label: 'Mumbai' }, { value: 'Thane', label: 'Thane' }, { value: 'Ahmedabad · Gandhinagar', label: 'Ahmedabad · Gandhinagar' }
];
const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'jul', label: 'Jul' }, { value: 'aug', label: 'Aug' }, { value: 'sep', label: 'Sep' }, { value: 'q3', label: 'Q3 2026' }
];

type Key = keyof Totals;

export default function Dashboard() {
  const [city, setCity] = useState<CityFilter>('All');
  const [period, setPeriod] = useState<PeriodKey>('sep');
  const [done, setDone] = useState<Record<string, string>>({});

  const list = useMemo(() => filterListings(city), [city]);
  const months = monthsFor(period);
  const last = months[months.length - 1];
  const t = useMemo(() => calc(list, months), [list, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const priorKey = PRIOR[period];
  const t0 = useMemo(() => (priorKey ? calc(list, [MONTHS[priorKey]]) : null), [list, priorKey]);
  const d = (k: Key) => {
    if (!t0) return null;
    const a = t[k] as number, b = t0[k] as number;
    return b ? (a - b) / Math.abs(b) : null;
  };
  const vs = priorKey ? ` vs ${MONTHS[priorKey].short}` : '';

  const money = [
    { label: 'Money in', value: lakh(t.gross), note: `rooms ${lakh(t.room)} + extras ${lakh(t.anc)}`, delta: d('gross'), color: 'var(--ec-gold-200)' },
    { label: 'OTA & gateway fees', value: lakh(t.fees), note: `${pct(t.fees / (t.room || 1))} of room revenue`, delta: d('fees'), invert: true },
    { label: 'Operating expenses', value: lakh(t.opex), note: `lease ${lakh(t.lease)} + ops ${lakh(t.ops)}`, delta: d('opex'), invert: true },
    { label: 'Gross operating profit', value: lakh(t.gop), note: 'money in − fees − expenses', delta: d('gop'), hero: true, color: t.gop >= 0 ? 'var(--ec-ok-fg)' : 'var(--ec-crit-fg)' },
    { label: 'GOP margin', value: pct(t.margin), note: `${t.sold} of ${t.avail} nights sold`, delta: d('margin') }
  ];
  const perf = [
    { label: 'ADR', value: inr(t.adr), formula: 'room revenue ÷ nights sold', delta: d('adr') },
    { label: 'OCCUPANCY', value: pct(t.occ), formula: 'nights sold ÷ nights available', delta: d('occ') },
    { label: 'RevPAR', value: inr(t.revpar), formula: 'ADR × occupancy', delta: d('revpar') },
    { label: 'TRevPAR', value: inr(t.trevpar), formula: '(rooms + extras) ÷ available', delta: d('trevpar') },
    { label: 'NRevPAR', value: inr(t.nrevpar), formula: '(rooms − OTA fees) ÷ available', delta: d('nrevpar') },
    { label: 'GOPPAR', value: inr(t.goppar), formula: 'GOP ÷ available nights', delta: d('goppar') },
    { label: 'CPOR', value: inr(t.cpor), formula: 'variable cost ÷ nights sold', delta: d('cpor'), invert: true },
    { label: 'RGI', value: t.rgi.toFixed(0), formula: 'RevPAR ÷ comp-set × 100', delta: d('rgi') }
  ];
  const gross = t.gross || 1;
  const flow = [
    { label: 'Kept as GOP', v: Math.max(t.gop, 0), color: 'var(--ec-ok)' },
    { label: 'Owner lease', v: t.lease, color: 'var(--ec-gold)' },
    { label: 'Operations', v: t.ops, color: 'var(--ec-slate)' },
    { label: 'OTA & gateway fees', v: t.fees, color: 'var(--ec-warn)' }
  ];
  const expenses = [
    { label: 'Owner lease', v: t.lease, color: 'var(--ec-gold)' },
    { label: 'OTA commissions', v: t.fees, color: 'var(--ec-warn)' },
    { label: 'Cleaning (per stay)', v: t.clean, color: 'var(--ec-slate)' },
    { label: 'Laundry & linen', v: t.laundry, color: 'var(--ec-slate)' },
    { label: 'Utilities & Wi-Fi', v: t.util, color: 'var(--ec-slate)' },
    { label: 'Guest supplies', v: t.supp, color: 'var(--ec-slate)' },
    { label: 'Maintenance', v: t.maint, color: 'var(--ec-slate)' }
  ];
  const maxE = Math.max(...expenses.map(e => e.v)) || 1;
  const daily = dailyRoomRevenue(list, last);
  const maxD = Math.max(...daily.map(x => x.value)) || 1;
  const maxCh = Math.max(...t.ch) || 1;
  const rows = list
    .map(p => { const r = calc([p], months); return { p, r, s: listingSignal(p, r) }; })
    .sort((a, b) => b.r.revpar - a.r.revpar);
  const open = DECISIONS.filter(x => !done[x.id]).length;

  return (
    <main className="container">
      <Nav current="/dashboard/" />
      <div className="row wrap between">
        <div>
          <h1 className="display" style={{ fontSize: 28 }}>Command dashboard</h1>
          <p className="faint" style={{ fontSize: 13, marginTop: 4 }}>The Empire Stays · {list.length} listings · {period === 'q3' ? 'Q3 2026 (Jul–Sep)' : MONTHS[period].label}</p>
        </div>
        <div className="row wrap">
          <SampleBadge />
          <Link href="/" className="voice-btn" style={{ textDecoration: 'none' }}><span className="voice-dot"><MicIcon /></span><span style={{ fontSize: 14, fontWeight: 500 }}>Ask Jarvis</span></Link>
        </div>
      </div>
      <div className="row wrap between">
        <Segmented label="City" options={CITY_OPTIONS} value={city} onChange={setCity} />
        <Segmented label="Period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </div>

      {list.length === 0 ? (
        <div className="panel" style={{ alignItems: 'center', textAlign: 'center', padding: '48px 32px', borderStyle: 'dashed', borderColor: 'rgba(201,169,110,0.45)' }}>
          <h2 className="display" style={{ fontSize: 28 }}>Ahmedabad · Gandhinagar is in the pipeline</h2>
          <p className="muted" style={{ maxWidth: 560, lineHeight: 1.6 }}>No live listings yet. Onboard the first unit (for example near GIFT City) and this view fills in from the same data model.</p>
          <span className="mono" style={{ color: 'var(--ec-gold-200)', fontSize: 13 }}>[ADD FIRST LISTING · target ADR ₹ ____ · lease ₹ ____ ]</span>
        </div>
      ) : (
        <>
          <section className="grid-auto" style={{ ['--min' as string]: '210px' }}>
            {money.map(k => (
              <div key={k.label} className={`tile${k.hero ? ' hero' : ''}`}>
                <div className="row between" style={{ gap: 8 }}><span className="label">{k.label}</span><Delta value={k.delta} invert={k.invert} suffix={vs} /></div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 500, color: k.color }}>{k.value}</div>
                <div className="mono faint" style={{ fontSize: 12 }}>{k.note}</div>
              </div>
            ))}
          </section>

          <section className="grid-auto" style={{ ['--min' as string]: '150px', gap: 12 }}>
            {perf.map(k => (
              <div key={k.label} className="tile" title={k.formula}>
                <div className="row between" style={{ gap: 6 }}><span className="label" style={{ letterSpacing: '0.1em' }}>{k.label}</span><Delta value={k.delta} invert={k.invert} /></div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{k.value}</div>
                <div className="mono faint" style={{ fontSize: 11 }}>{k.formula}</div>
              </div>
            ))}
          </section>

          <section className="grid-auto" style={{ ['--min' as string]: 'min(100%, 560px)', gap: 20 }}>
            <div className="panel">
              <div className="panel-head"><h2>Where every rupee goes</h2><span className="mono faint" style={{ fontSize: 13 }}>of {lakh(t.gross)} money in</span></div>
              <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                {flow.map(f => <div key={f.label} title={`${f.label} ${lakh(f.v)}`} style={{ width: `${(f.v / gross) * 100}%`, background: f.color }} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {flow.map(f => (
                  <div key={f.label} className="row" style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--ec-raised)', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                    <div style={{ flexGrow: 1 }}><div className="muted" style={{ fontSize: 13 }}>{f.label}</div><div className="mono" style={{ fontSize: 15 }}>{lakh(f.v)}</div></div>
                    <span className="mono faint" style={{ fontSize: 13 }}>{((f.v / gross) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <h3 className="muted" style={{ fontSize: 14, fontWeight: 600 }}>Expense lines</h3>
              {expenses.map(e => (
                <div key={e.label} style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr) 110px', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13 }}>{e.label}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(e.v / maxE) * 100}%`, background: e.color }} /></div>
                  <span className="num" style={{ fontSize: 13 }}>{inr(e.v)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="panel">
                <div className="panel-head"><h2>Daily room revenue · {last.label}</h2><span className="mono faint" style={{ fontSize: 13 }}>peak {inr(maxD)}</span></div>
                <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: 3, borderBottom: '1px solid var(--ec-border)' }}>
                  {daily.map(x => <div key={x.day} title={`${last.short} ${x.day} · ${inr(x.value)}`} style={{ flexGrow: 1, height: `${(x.value / maxD) * 100}%`, background: x.weekend ? 'var(--ec-gold)' : 'var(--ec-slate)', borderRadius: '3px 3px 0 0' }} />)}
                </div>
                <div className="row between mono faint" style={{ fontSize: 11 }}><span>1</span><span>8</span><span>15</span><span>22</span><span>{last.days}</span></div>
                <div className="row muted" style={{ fontSize: 12, gap: 16 }}>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ec-gold)' }} />Fri–Sat</span>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--ec-slate)' }} />Sun–Thu</span>
                </div>
              </div>
              <div className="panel">
                <h2>Money in by channel</h2>
                {CHANNELS.map((c, i) => (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) 120px', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14 }}>{c.name}</span>
                    <div className="bar-track" style={{ height: 12 }}><div className="bar-fill" style={{ width: `${(t.ch[i] / maxCh) * 100}%`, background: 'var(--ec-gold)' }} /></div>
                    <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 14 }}>{lakh(t.ch[i])}</div><div className="mono faint" style={{ fontSize: 11 }}>fee {lakh(t.chFees[i])} · {(c.fee * 100).toFixed(0)}%</div></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Properties, ranked by RevPAR</h2><span className="faint" style={{ fontSize: 13 }}>RGI = our RevPAR ÷ comp-set RevPAR × 100 · forward 14-day occupancy under 60% triggers gap pricing</span></div>
            <div style={{ overflowX: 'auto' }}>
              <div className="table">
                <div className="table-row head">
                  <span>Listing</span><span>Area</span><span className="num">Occ</span><span className="num">ADR</span><span className="num">RevPAR</span><span className="num">Money in</span><span className="num">GOP</span><span className="num">RGI</span><span className="num">Fwd 14d</span><span>Signal</span>
                </div>
                {rows.map(({ p, r, s }) => (
                  <div key={p.code} className="table-row">
                    <div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="mono faint" style={{ fontSize: 12 }}>{p.code} · {p.type}</div></div>
                    <span className="muted">{p.area}, {p.city}</span>
                    <span className="num">{pct(r.occ)}</span>
                    <span className="num">{inr(r.adr)}</span>
                    <span className="num" style={{ color: 'var(--ec-gold-200)' }}>{inr(r.revpar)}</span>
                    <span className="num">{lakh(r.gross)}</span>
                    <span className="num">{lakh(r.gop)}</span>
                    <span className="num">{r.rgi.toFixed(0)}</span>
                    <span className="num">{p.fwd}%</span>
                    <div><Chip tone={s.tone}>{s.label}</Chip></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid-auto" style={{ ['--min' as string]: 'min(100%, 520px)', gap: 20 }}>
            <div className="panel" style={{ gap: 12 }}>
              <div className="panel-head"><h2>Agent swarm</h2><span className="faint" style={{ fontSize: 13 }}>Jarvis supervises 5 agents</span></div>
              {AGENTS.map(a => (
                <div key={a.name} className="row" style={{ padding: 12, borderRadius: 12, background: 'var(--ec-raised)' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(201,169,110,0.16)', color: 'var(--ec-gold-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ec-font-display)', fontWeight: 700, flexShrink: 0 }}>{a.initial}</span>
                  <div style={{ flexGrow: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div><div className="faint" style={{ fontSize: 12 }}>{a.doing}</div></div>
                  <Chip tone={a.tone}>{a.status}</Chip>
                </div>
              ))}
            </div>
            <div className="panel" style={{ gap: 12 }}>
              <div className="panel-head"><h2>Needs your decision</h2><span className="mono" style={{ fontSize: 13, color: 'var(--ec-warn-fg)' }}>{open} open</span></div>
              {DECISIONS.map(h => {
                const res = done[h.id];
                const set = (v: string) => setDone(prev => ({ ...prev, [h.id]: v }));
                return (
                  <div key={h.id} style={{ background: 'var(--ec-glass)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${res ? 'var(--ec-border)' : h.tone === 'crit' ? 'rgba(244,63,94,0.5)' : 'rgba(245,158,11,0.45)'}`, opacity: res ? 0.7 : 1 }}>
                    <div className="row between" style={{ gap: 8 }}><Chip tone={h.tone}>{h.tag}</Chip><span className="mono faint" style={{ fontSize: 12 }}>{h.rule}</span></div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{h.title}</div>
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{h.why}</div>
                    {res ? (
                      <div className="row between"><span style={{ fontSize: 13, color: 'var(--ec-ok-fg)' }}>{res}</span><button type="button" className="btn btn-ghost" style={{ height: 36, fontSize: 12 }} onClick={() => setDone(prev => { const n = { ...prev }; delete n[h.id]; return n; })}>Undo</button></div>
                    ) : (
                      <div className="row">
                        <button type="button" className="btn btn-primary" style={{ flexGrow: 1 }} onClick={() => set(`Approved: ${h.primary} · logged to audit trail`)}>{h.primary}</button>
                        <button type="button" className="btn btn-ghost" style={{ flexGrow: 1 }} onClick={() => set('Sent back to the agent with your adjustment')}>Adjust</button>
                        <button type="button" className="btn btn-danger" style={{ flexGrow: 1 }} onClick={() => set('Rejected · agent notified')}>Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
