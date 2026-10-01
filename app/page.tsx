import Link from 'next/link';
import JarvisVoice from '@/components/JarvisVoice';
import { Chip, MicIcon, Nav } from '@/components/ui';
import { AGENTS } from '@/lib/agents';

const LADDER = [
  { level: 'CRITICAL', tone: 'crit' as const, channel: 'Phone call within a minute', examples: 'Safety or emergency, guest locked out, no power or water at night' },
  { level: 'URGENT', tone: 'crit' as const, channel: 'Phone call + WhatsApp', examples: 'Refund asked, angry guest, broken AC mid-stay, checkout past 11:30' },
  { level: 'REVIEW', tone: 'warn' as const, channel: 'WhatsApp card: reply send or hold', examples: 'Discount beyond tier, rate cut over 25%, Maya draft awaiting you' },
  { level: 'ROUTINE', tone: 'ok' as const, channel: 'Spoken brief at 9:00 AM', examples: 'Arrivals, turnovers, yesterday’s money in and out' }
];

const FLOW = [
  { n: '01', title: 'Booking email lands', body: 'Airbnb “Reservation confirmed” email arrives in Gmail.' },
  { n: '02', title: 'Claude reads it', body: 'Listing, dates, guests and code are saved to the bookings table.' },
  { n: '03', title: 'Jarvis asks you', body: 'WhatsApp: send the guest’s name and number, or a screenshot.' },
  { n: '04', title: 'Maya takes over', body: 'Welcome message, then every question answered with the booking in mind.' },
  { n: '05', title: 'Urgent? It calls you', body: 'You answer by voice and Jarvis sends your decision.' },
  { n: '06', title: 'Logged everywhere', body: 'Postgres audit trail and a line in #all-the-empire-stayys.' }
];

export default function Home() {
  return (
    <main className="container" style={{ gap: 72 }}>
      <Nav current="/" />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: 48, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="label" style={{ color: 'var(--ec-gold)', letterSpacing: '0.16em' }}>One voice for every team at The Empire Stays</div>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 1 }}>Hey Jarvis.</h1>
          <p className="muted" style={{ maxWidth: 560, fontSize: 19, lineHeight: 1.6 }}>
            Guests, turnovers, pricing and money all report to one assistant. When something is urgent it calls you, reads you the situation and Maya&rsquo;s suggested reply, and acts on what you say.
          </p>
          <div className="row wrap">
            <Link href="/dashboard/" className="btn btn-primary" style={{ height: 52, fontSize: 16 }}><MicIcon size={18} /> Open the command dashboard</Link>
            <Link href="/m/" className="btn btn-ghost" style={{ height: 52, fontSize: 16 }}>Field app</Link>
          </div>
          <div className="row wrap faint" style={{ gap: 20, fontSize: 13 }}>
            <Chip tone="ok">5 agents running</Chip>
            <Chip tone="warn">Refunds and legal issues always come to you</Chip>
            <Chip tone="voice">Answer by voice or WhatsApp</Chip>
          </div>
        </div>
        <JarvisVoice />
      </section>

      <section id="teams" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="display" style={{ fontSize: 36 }}>Five teams, one voice</h2>
          <p className="muted" style={{ maxWidth: 680, fontSize: 16, lineHeight: 1.6 }}>Each agent owns its work and reports up. Jarvis brings it to you in two or three sentences, never as a wall of data.</p>
        </div>
        <div className="grid-auto" style={{ ['--min' as string]: '220px' }}>
          {AGENTS.slice(1).map(a => (
            <div key={a.name} className="panel" style={{ padding: 20, gap: 12 }}>
              <div className="row between">
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,169,110,0.16)', color: 'var(--ec-gold-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ec-font-display)', fontWeight: 700, fontSize: 18 }}>{a.initial}</span>
                <Chip tone={a.tone}>{a.status}</Chip>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{a.name}</div>
              <div className="muted" style={{ fontSize: 14, lineHeight: 1.55 }}>{a.doing}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--ec-gold-200)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>&ldquo;{a.ask}&rdquo;</div>
            </div>
          ))}
        </div>
      </section>

      <section id="calls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="display" style={{ fontSize: 36 }}>When Jarvis calls you</h2>
          <p className="muted" style={{ fontSize: 16, lineHeight: 1.6 }}>Urgency decides the channel. Everything else waits for your morning brief. On the call, say &ldquo;approve&rdquo;, &ldquo;hold&rdquo;, or tell it what to say, and it is sent.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LADDER.map(r => (
            <div key={r.level} className="panel" style={{ padding: 16, display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', alignItems: 'center' }}>
              <span className={`chip ${r.tone}`} style={{ justifySelf: 'start', fontWeight: 600 }}>{r.level}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{r.channel}</span>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{r.examples}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="automation" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="panel-head">
          <h2 className="display" style={{ fontSize: 36 }}>Automation 01 · booking to WhatsApp</h2>
          <Chip tone="warn">BUILT · WAITING ON CREDENTIALS</Chip>
        </div>
        <div className="grid-auto" style={{ ['--min' as string]: '200px', gap: 12 }}>
          {FLOW.map(f => (
            <div key={f.n} className="tile">
              <span className="mono" style={{ fontSize: 13, color: 'var(--ec-gold)' }}>{f.n}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{f.title}</span>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{f.body}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
