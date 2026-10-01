'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { answer } from '@/lib/jarvis';
import { MicIcon } from './ui';

type Line = { who: 'Meet' | 'Jarvis'; text: string };
type Mode = 'idle' | 'listening' | 'thinking' | 'speaking';

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere).
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

const SUGGESTIONS = ['Anything urgent?', 'How did we do in September?', 'RevPAR in Thane', 'How is Paradise 144 doing?'];

export default function JarvisVoice() {
  const [lines, setLines] = useState<Line[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Ctor) {
      const r = new Ctor();
      r.lang = 'en-IN';
      r.interimResults = false;
      r.continuous = false;
      recRef.current = r;
      setSupported(true);
    }
  }, []);

  const respond = useCallback((question: string) => {
    setLines(prev => [...prev, { who: 'Meet' as const, text: question }].slice(-6));
    setMode('thinking');
    const reply = answer(question);
    window.setTimeout(() => {
      setLines(prev => [...prev, { who: 'Jarvis' as const, text: reply }].slice(-6));
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(reply);
        u.lang = 'en-IN';
        u.rate = 1.02;
        u.onend = () => setMode('idle');
        setMode('speaking');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } else {
        setMode('idle');
      }
    }, 450);
  }, []);

  const listen = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel(); // barge-in: talking over Jarvis stops it
    const r = recRef.current;
    if (!r) { respond(SUGGESTIONS[lines.length / 2 % SUGGESTIONS.length | 0]); return; }
    if (mode === 'listening') { r.stop(); return; }
    r.onresult = e => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      if (text) respond(text);
    };
    r.onend = () => setMode(m => (m === 'listening' ? 'idle' : m));
    r.onerror = () => setMode('idle');
    setMode('listening');
    r.start();
  }, [mode, respond, lines.length]);

  const thinking = mode === 'thinking';
  const orbColor = thinking ? 'var(--ec-gold)' : 'var(--ec-voice)';
  const stateLabel = { idle: 'Tap · speak', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' }[mode];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <button type="button" className="orb" onClick={listen} aria-label={mode === 'listening' ? 'Stop listening' : 'Talk to Jarvis'} style={{ ['--orb' as string]: orbColor }}>
        <span className="orb-ring" />
        <span className="orb-ring late" />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid var(--ec-border)' }} />
        <span
          className="orb-core"
          style={{
            background: thinking ? 'radial-gradient(circle at 35% 30%, #e8d5b0, #a8853d 70%)' : 'radial-gradient(circle at 35% 30%, #22d3ee, #0e7490 70%)',
            boxShadow: `0 0 80px ${thinking ? 'rgba(201,169,110,0.45)' : 'rgba(6,182,212,0.45)'}`,
            color: '#f9fafb'
          }}
        >
          <MicIcon size={40} />
          <span className="mono" style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{stateLabel}</span>
        </span>
      </button>

      <div style={{ width: '100%', maxWidth: 560, background: 'var(--ec-glass)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--ec-shadow)' }} aria-live="polite">
        <div className="row between">
          <span className="label">{supported ? 'Live voice · en-IN' : 'Demo · voice not supported in this browser'}</span>
          <span className="mono faint" style={{ fontSize: 12 }}>sample data</span>
        </div>
        {lines.length === 0 && <span className="faint" style={{ fontSize: 15 }}>Tap the orb and say &ldquo;Hey Jarvis, anything urgent?&rdquo;</span>}
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: l.who === 'Meet' ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: l.who === 'Meet' ? 'var(--ec-gold-200)' : 'var(--ec-voice-fg)' }}>{l.who}</span>
            <span style={{ maxWidth: '92%', padding: '10px 14px', borderRadius: 14, fontSize: 15, lineHeight: 1.5, background: l.who === 'Meet' ? 'rgba(201,169,110,0.18)' : 'rgba(6,182,212,0.12)' }}>{l.text}</span>
          </div>
        ))}
        <div className="row wrap" style={{ gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" className="btn btn-ghost" style={{ height: 36, fontSize: 13 }} onClick={() => respond(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
