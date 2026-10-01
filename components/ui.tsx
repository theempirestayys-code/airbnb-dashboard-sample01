import Link from 'next/link';
import type { Tone } from '@/lib/portfolio';

export function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

export function Delta({ value, invert = false, suffix = '' }: { value: number | null; invert?: boolean; suffix?: string }) {
  if (value === null || !isFinite(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={`delta ${good ? 'up' : 'down'}`}>
      {value >= 0 ? '▲' : '▼'} {Math.abs(value * 100).toFixed(1)}%{suffix}
    </span>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const LINKS = [
  { href: '/', label: 'Jarvis' },
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/data-builder/', label: 'Data builder' },
  { href: '/m/', label: 'Mobile app' }
];

export function Nav({ current }: { current: string }) {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="brand">
        <span className="brand-mark">E</span>
        <span className="display" style={{ fontSize: 20 }}>Empire Command</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ec-voice-fg)', border: '1px solid rgba(6,182,212,0.45)', borderRadius: 6, padding: '3px 8px' }}>JARVIS 2.0</span>
      </Link>
      <div className="nav-links">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} aria-current={l.href === current ? 'page' : undefined}>{l.label}</Link>
        ))}
      </div>
    </nav>
  );
}

export function SampleBadge() {
  return <span className="chip warn" style={{ fontWeight: 600 }}>SAMPLE DATA · connect Zoho Books + Airbnb to go live</span>;
}
