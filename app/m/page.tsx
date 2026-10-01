'use client';

// Field app: the screen the Android APK opens on. Phone-first, one-handed, 44px+ touch targets.
import Link from 'next/link';
import { useState } from 'react';
import { Chip, MicIcon } from '@/components/ui';
import { AGENTS, DECISIONS } from '@/lib/agents';
import { CHANNELS, MONTHS, calc, filterListings, inr, lakh, listingSignal, pct, type CityFilter, type Tone } from '@/lib/portfolio';

type Tab = 'today' | 'money' | 'units' | 'agents';

const TODAY: { time: string; name: string; what: string; tone: Tone; status: string; city: CityFilter }[] = [
  { time: '11:00', name: 'Paradise*144', what: 'Checkout → turnover → 14:00 arrival', tone: 'ok', status: 'Cleaner in', city: 'Thane' },
  { time: '11:30', name: 'Terra Blush*17', what: 'Guest still in · Level 3 sent', tone: 'crit', status: 'Overdue', city: 'Thane' },
  { time: '12:00', name: 'White Island*21', what: 'Deep clean + linen swap', tone: 'warn', status: 'Pending', city: 'Mumbai' },
  { time: '14:00', name: 'NYC*35', what: 'Arrival · door code sent at 12:00', tone: 'ok', status: 'Ready', city: 'Thane' }
];

const TITLES: Record<Tab, string> = { today: 'Good evening, Meet', money: 'Money', units: 'Properties', agents: 'Agents & approvals' };

function TabIcon({ tab }: { tab: Tab }) {
  const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (tab === 'today') return <svg {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>;
  if (tab === 'money') return <svg {...p}><path d="M6 4h12" /><path d="M6 9h12" /><path d="M9 4c5 0 5 10 0 10H6l9 7" /></svg>;
  if (tab === 'units') return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-4h4v4" /></svg>;
  return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

export default function FieldApp() {
  const [tab, setTab] = useState<Tab>('today');
  const [city, setCity] = useState<CityFilter>('All');
  const [done, setDone] = useState<Record<string, string>>({});
  const list = filterListings(city);
  const t = calc(list, [MONTHS.sep]);
  const t0 = calc(list, [MONTHS.aug]);
  const delta = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : 0);
  const tiles = [
    { label: 'Money in', value: lakh(t.gross), d: delta(t.gross, t0.gross), color: 'var(--ec-gold-200)' },
    { label: 'GOP', value: lakh(t.gop), d: delta(t.gop, t0.gop), color: 'var(--ec-ok-fg)' },
    { label: 'Occupancy', value: pct(t.occ, 0), d: delta(t.occ, t0.occ) },
    { label: 'RevPAR', value: inr(t.revpar), d: delta(t.revpar, t0.revpar) }
  ];
  const gross = t.gross || 1;
  const flow = [
    { label: 'Kept as GOP', v: Math.max(t.gop, 0), color: 'var(--ec-ok)' },
    { label: 'Owner lease', v: t.lease, color: 'var(--ec-gold)' },
    { label: 'Operations', v: t.ops, color: 'var(--ec-slate)' },
    { label: 'OTA & gateway fees', v: t.fees, color: 'var(--ec-warn)' }
  ];
  const open = DECISIONS.filter(x => !done[x.id]).length;
  const maxCh = Math.max(...t.ch) || 1;

  return (
    <div style={{ minHeight: '100dvh', maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', background: 'var(--ec-bg)' }}>
      <header className="safe-top" style={{ padding: '16px 20px 12px', display: 'flex', flexDirection: 'column', gap: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'var(--ec-bg)', zIndex: 2 }}>
        <div className="row between">
          <div>
            <div className="faint" style={{ fontSize: 12 }}>{city === 'All' ? `All ${list.length} listings` : `${city} · ${list.length}`} · Sep 2026 · sample</div>
            <h1 className="display" style={{ fontSize: 24 }}>{TITLES[tab]}</h1>
          </div>
          <Link href="/" aria-label="Talk to Jarvis" style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(6,182,212,0.6)', background: 'radial-gradient(circle at 35% 30%, #22d3ee, #0e7490 70%)', boxShadow: '0 0 24px rgba(6,182,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f9fafb' }}><MicIcon size={20} /></Link>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {(['All', 'Mumbai', 'Thane'] as CityFilter[]).map(c => (
            <button key={c} type="button" aria-pressed={city === c} onClick={() => setCity(c)} style={{ flexGrow: 1, height: 36, borderRadius: 8, fontSize: 13, ...(city === c ? { border: 0, background: 'var(--ec-gold)', color: 'var(--ec-on-gold)', fontWeight: 600 } : { border: '1px solid rgba(255,255,255,0.1)', background: 'var(--ec-surface)', color: 'var(--ec-text-2)' }) }}>{c}</button>
          ))}
        </div>
      </header>

      <main style={{ flexGrow: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'today' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {tiles.map(k => (
                <div key={k.label} className="tile" style={{ padding: 14, gap: 6 }}>
                  <span className="label" style={{ fontSize: 11 }}>{k.label}</span>
                  <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: k.color }}>{k.value}</span>
                  <span className="mono" style={{ fontSize: 11, color: k.d >= 0 ? 'var(--ec-ok-fg)' : 'var(--ec-crit-fg)' }}>{k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d * 100).toFixed(1)}% vs Aug</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setTab('agents')} className="row" style={{ minHeight: 56, borderRadius: 12, border: '1px solid rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.08)', color: 'var(--ec-text)', padding: '12px 14px', textAlign: 'left' }}>
              <span className="mono" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ec-warn)', color: 'var(--ec-on-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>{open}</span>
              <span style={{ flexGrow: 1 }}><span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Decisions waiting for you</span><span className="muted" style={{ display: 'block', fontSize: 12 }}>Refund, discount, rate cut, checkout</span></span>
            </button>
            <div className="label" style={{ marginTop: 4 }}>Today&rsquo;s turnovers</div>
            {TODAY.filter(o => city === 'All' || o.city === city).map(o => (
              <div key={o.name} className="row" style={{ padding: 12, borderRadius: 12, background: 'var(--ec-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ec-gold-200)', width: 46, flexShrink: 0 }}>{o.time}</span>
                <div style={{ flexGrow: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{o.name}</div><div className="faint" style={{ fontSize: 12 }}>{o.what}</div></div>
                <Chip tone={o.tone}>{o.status}</Chip>
              </div>
            ))}
          </>
        )}

        {tab === 'money' && (
          <>
            <div className="tile hero" style={{ borderRadius: 20, gap: 10 }}>
              <span className="label">Money in · Sep 2026</span>
              <span className="mono" style={{ fontSize: 32, fontWeight: 500, color: 'var(--ec-gold-200)' }}>{lakh(t.gross)}</span>
              <div style={{ display: 'flex', height: 14, borderRadius: 6, overflow: 'hidden', gap: 2 }}>{flow.map(f => <div key={f.label} style={{ width: `${(f.v / gross) * 100}%`, background: f.color }} />)}</div>
              {flow.map(f => (
                <div key={f.label} className="row" style={{ fontSize: 13, gap: 10 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: f.color }} /><span className="muted" style={{ flexGrow: 1 }}>{f.label}</span><span className="mono">{lakh(f.v)}</span></div>
              ))}
            </div>
            <div className="label">Money out</div>
            <div className="tile" style={{ padding: '6px 14px', gap: 0 }}>
              {[['Owner lease', t.lease], ['OTA commissions', t.fees], ['Cleaning', t.clean], ['Laundry & linen', t.laundry], ['Utilities & Wi-Fi', t.util], ['Guest supplies', t.supp], ['Maintenance', t.maint]].map(([l, v]) => (
                <div key={l as string} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}><span>{l}</span><span className="mono">{inr(v as number)}</span></div>
              ))}
            </div>
            <div className="label">By channel</div>
            {CHANNELS.map((c, i) => (
              <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row between" style={{ fontSize: 13 }}><span>{c.name} <span className="faint">· fee {(c.fee * 100).toFixed(0)}%</span></span><span className="mono">{lakh(t.ch[i])}</span></div>
                <div className="bar-track" style={{ height: 8 }}><div className="bar-fill" style={{ width: `${(t.ch[i] / maxCh) * 100}%`, background: 'var(--ec-gold)' }} /></div>
              </div>
            ))}
          </>
        )}

        {tab === 'units' && list
          .map(p => { const r = calc([p], [MONTHS.sep]); return { p, r, s: listingSignal(p, r) }; })
          .sort((a, b) => b.r.revpar - a.r.revpar)
          .map(({ p, r, s }) => (
            <div key={p.code} className="tile" style={{ padding: 14, gap: 10 }}>
              <div className="row between" style={{ alignItems: 'flex-start', gap: 8 }}>
                <div><div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div><div className="faint" style={{ fontSize: 12 }}>{p.type} · {p.area}</div></div>
                <Chip tone={s.tone}>{s.label}</Chip>
              </div>
              <div className="bar-track" style={{ height: 6 }}><div className="bar-fill" style={{ width: `${r.occ * 100}%`, background: 'var(--ec-gold)' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, fontSize: 13 }} className="mono">
                <div><div className="faint" style={{ fontFamily: 'var(--ec-font-sans)', fontSize: 11 }}>Occ</div>{pct(r.occ, 0)}</div>
                <div><div className="faint" style={{ fontFamily: 'var(--ec-font-sans)', fontSize: 11 }}>RevPAR</div>{inr(r.revpar)}</div>
                <div><div className="faint" style={{ fontFamily: 'var(--ec-font-sans)', fontSize: 11 }}>GOP</div>{lakh(r.gop)}</div>
              </div>
            </div>
          ))}

        {tab === 'agents' && (
          <>
            {DECISIONS.map(h => {
              const res = done[h.id];
              return (
                <div key={h.id} style={{ background: 'var(--ec-glass)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${res ? 'var(--ec-border)' : h.tone === 'crit' ? 'rgba(244,63,94,0.5)' : 'rgba(245,158,11,0.45)'}` }}>
                  <span style={{ alignSelf: 'flex-start' }}><Chip tone={h.tone}>{h.tag}</Chip></span>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{h.title}</div>
                  {res ? (
                    <div className="row between"><span style={{ fontSize: 12, color: 'var(--ec-ok-fg)' }}>{res}</span><button type="button" className="btn btn-ghost" style={{ height: 36, fontSize: 12 }} onClick={() => setDone(p => { const n = { ...p }; delete n[h.id]; return n; })}>Undo</button></div>
                  ) : (
                    <div className="row">
                      <button type="button" className="btn btn-primary" style={{ flexGrow: 1 }} onClick={() => setDone(p => ({ ...p, [h.id]: 'Approved · logged' }))}>{h.primary}</button>
                      <button type="button" className="btn btn-danger" style={{ flexGrow: 1 }} onClick={() => setDone(p => ({ ...p, [h.id]: 'Rejected · agent notified' }))}>Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="label" style={{ marginTop: 4 }}>Agents</div>
            {AGENTS.map(a => (
              <div key={a.name} className="row" style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--ec-surface)', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(201,169,110,0.16)', color: 'var(--ec-gold-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ec-font-display)', fontWeight: 700, flexShrink: 0 }}>{a.initial}</span>
                <div style={{ flexGrow: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                <Chip tone={a.tone}>{a.status}</Chip>
              </div>
            ))}
          </>
        )}
      </main>

      <nav aria-label="App" className="safe-bottom" style={{ position: 'sticky', bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', borderTop: '1px solid var(--ec-border)', background: 'var(--ec-surface)', padding: '6px 8px 0' }}>
        {(['today', 'money', 'units', 'agents'] as Tab[]).map(k => (
          <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)} style={{ height: 56, border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: tab === k ? 'var(--ec-gold)' : 'var(--ec-text-3)' }}>
            <TabIcon tab={k} />
            <span style={{ textTransform: 'capitalize' }}>{k}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
