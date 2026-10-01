import type { Tone } from './portfolio';

export interface Agent { initial: string; name: string; doing: string; tone: Tone; status: string; ask: string }

export const AGENTS: Agent[] = [
  { initial: 'J', name: 'JARVIS · Supervisor', doing: 'Routes every event, enforces SOPs and the human-approval gates', tone: 'voice', status: 'Listening', ask: 'Hey Jarvis, anything urgent?' },
  { initial: 'M', name: 'Maya · Guests', doing: 'Answers WhatsApp and Airbnb in your voice; welcomes each new booking', tone: 'ok', status: 'Running', ask: 'What did the Paradise guest ask?' },
  { initial: 'T', name: 'Turnover', doing: '11:00 checkout → 14:00 guest-ready: cleaners, linen, inspections', tone: 'ok', status: 'Running', ask: 'Is Sky*30 ready for tonight?' },
  { initial: 'P', name: 'Pricing', doing: 'Fills gap nights; Paradise °142/°144 anchored ₹200 under comp', tone: 'warn', status: '1 gate', ask: 'Why is Sky Escape so empty?' },
  { initial: 'A', name: 'Access', doing: 'Door code = last 4 digits of the guest phone; lock health', tone: 'ok', status: 'Running', ask: 'Send the code for NYC*35.' },
  { initial: 'F', name: 'Finance', doing: 'Matches OTA payouts to bookings in Zoho Books; profit per listing', tone: 'warn', status: 'Reconciling', ask: 'How much did we keep in September?' }
];

export interface Decision { id: string; tag: string; tone: Tone; rule: string; title: string; why: string; primary: string }

// Sample human-in-the-loop queue, following the real Empire Stays escalation matrix.
export const DECISIONS: Decision[] = [
  { id: 'refund', tag: 'REFUND · ESCALATE', tone: 'crit', rule: 'never auto-reply', title: 'Guest asks for a partial refund at NYC*35 (AC down 4 hrs)', why: 'Maya held the reply, as policy sends refunds to Meet. Finance suggests 20% of one night against the maintenance ticket.', primary: 'Approve 20%' },
  { id: 'disc', tag: 'DISCOUNT · REVIEW', tone: 'warn', rule: 'tier 7% (7–13 n)', title: '10-night inquiry for Paradise*142 asks for 18% off', why: 'Above the autonomous 7% tier. Pricing suggests 10% because forward occupancy is 79%.', primary: 'Offer 10%' },
  { id: 'rate', tag: 'PRICING · REVIEW', tone: 'warn', rule: 'gate > 25%', title: 'Cut Sky Escape rate by 28% for 4 gap nights', why: 'Forward 14-day occupancy is 43%, under the 60% trigger. Stays above the floor rate.', primary: 'Approve' },
  { id: 'checkout', tag: 'CHECKOUT · LEVEL 3', tone: 'crit', rule: '11:30 hard stop', title: 'Terra Blush*17 guest has not checked out', why: 'Level 3 notice sent and automation stopped. The 14:00 arrival needs a 3-hour turnover.', primary: 'Call guest' }
];
