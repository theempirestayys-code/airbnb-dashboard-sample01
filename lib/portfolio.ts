// Sample portfolio model for The Empire Stays.
// Listing names and codes are real; nightly rates, nights sold and costs are SAMPLE inputs.
// Replace with the nightly ledger (see app/data-builder) to go live.

export type City = 'Mumbai' | 'Thane';
export type CityFilter = 'All' | City | 'Ahmedabad · Gandhinagar';
export type MonthKey = 'jul' | 'aug' | 'sep';
export type PeriodKey = MonthKey | 'q3';

export interface Listing {
  code: string;
  name: string;
  type: string;
  city: City;
  area: string;
  adr: number;     // base nightly rate, ₹ (sample)
  sold: number;    // nights sold in a 30-day month at full season (sample)
  lease: number;   // monthly owner lease, ₹ (sample)
  fwd: number;     // forward 14-day occupancy, % (sample)
}

export const LISTINGS: Listing[] = [
  { code: 'OS A2106', name: 'White Island*21', type: '1BHK', city: 'Mumbai', area: 'Goregaon East', adr: 5200, sold: 24, lease: 38000, fwd: 72 },
  { code: 'Sol C 2103', name: 'Coastline Studio*21', type: 'Studio', city: 'Thane', area: 'Hiranandani', adr: 3100, sold: 25, lease: 22000, fwd: 64 },
  { code: 'PCR T5 1901', name: 'Heaven*19', type: '1BHK', city: 'Thane', area: 'Nr Korum Mall', adr: 3900, sold: 22, lease: 28000, fwd: 58 },
  { code: 'PCR T4 3507', name: 'NYC*35', type: '2BHK', city: 'Thane', area: 'Nr Korum Mall', adr: 6400, sold: 21, lease: 42000, fwd: 50 },
  { code: 'JG T1 1402', name: 'Paradise*142', type: '2BHK Luxe', city: 'Thane', area: 'Nr TheWalk', adr: 7900, sold: 23, lease: 48000, fwd: 79 },
  { code: 'JG T1 1404', name: 'Paradise*144', type: '2BHK Luxe', city: 'Thane', area: 'Nr TheWalk', adr: 7700, sold: 24, lease: 48000, fwd: 86 },
  { code: 'PCE T4 3006', name: 'Sky*30', type: '1BHK', city: 'Thane', area: 'Nr Korum Mall', adr: 4100, sold: 20, lease: 28000, fwd: 55 },
  { code: 'PRP3 S2 1701', name: 'Sky Escape', type: 'Apartment', city: 'Thane', area: 'Thane', adr: 4300, sold: 17, lease: 28000, fwd: 43 },
  { code: 'RBA1704', name: 'Terra Blush*17', type: '1BHK', city: 'Thane', area: 'Nr G-Corp', adr: 3800, sold: 19, lease: 28000, fwd: 61 },
  { code: 'SKYLINE', name: 'Skyline Hideaway', type: 'Apartment', city: 'Thane', area: 'Thane', adr: 4500, sold: 16, lease: 28000, fwd: 47 }
];

export interface Month { key: MonthKey; label: string; short: string; days: number; occ: number; adr: number; startDow: number }

export const MONTHS: Record<MonthKey, Month> = {
  jul: { key: 'jul', label: 'Jul 2026', short: 'Jul', days: 31, occ: 0.8, adr: 0.9, startDow: 3 },
  aug: { key: 'aug', label: 'Aug 2026', short: 'Aug', days: 31, occ: 0.88, adr: 0.94, startDow: 6 },
  sep: { key: 'sep', label: 'Sep 2026', short: 'Sep', days: 30, occ: 1, adr: 1, startDow: 2 }
};

export const PRIOR: Partial<Record<PeriodKey, MonthKey>> = { sep: 'aug', aug: 'jul' };
export const COMP_REVPAR: Record<City, number> = { Mumbai: 4100, Thane: 3300 };
export const CHANNELS = [
  { name: 'Airbnb', share: 0.7, fee: 0.15 },
  { name: 'Booking.com', share: 0.2, fee: 0.18 },
  { name: 'Direct', share: 0.1, fee: 0.02 }
];
const DOW_FACTOR = [1.15, 0.8, 0.78, 0.82, 0.9, 1.25, 1.3]; // Sun..Sat

export interface Totals {
  avail: number; sold: number; stays: number;
  room: number; anc: number; gross: number;
  fees: number; lease: number;
  clean: number; laundry: number; util: number; supp: number; maint: number;
  ops: number; opex: number; gop: number;
  comp: number; ch: number[]; chFees: number[];
  adr: number; occ: number; revpar: number; trevpar: number; nrevpar: number; goppar: number; cpor: number; rgi: number; margin: number;
}

export function monthsFor(period: PeriodKey): Month[] {
  return period === 'q3' ? [MONTHS.jul, MONTHS.aug, MONTHS.sep] : [MONTHS[period]];
}

export function filterListings(city: CityFilter): Listing[] {
  return LISTINGS.filter(l => city === 'All' || l.city === city);
}

export function calc(list: Listing[], months: Month[]): Totals {
  const t = { avail: 0, sold: 0, stays: 0, room: 0, anc: 0, fees: 0, lease: 0, clean: 0, laundry: 0, util: 0, supp: 0, maint: 0, comp: 0, ch: [0, 0, 0], chFees: [0, 0, 0] };
  for (const p of list) {
    for (const m of months) {
      const sold = Math.min(m.days, Math.round(p.sold * m.occ * m.days / 30));
      const adr = Math.round(p.adr * m.adr / 10) * 10;
      const room = sold * adr;
      const stays = Math.round(sold / 2.4);
      t.avail += m.days; t.sold += sold; t.stays += stays; t.room += room; t.anc += Math.round(room * 0.06);
      CHANNELS.forEach((c, i) => { t.ch[i] += room * c.share; t.chFees[i] += room * c.share * c.fee; t.fees += room * c.share * c.fee; });
      t.lease += p.lease; t.clean += stays * 600; t.laundry += sold * 250; t.util += 4400; t.supp += sold * 120; t.maint += 1500;
      t.comp += COMP_REVPAR[p.city] * m.days;
    }
  }
  const a = t.avail || 1, s = t.sold || 1;
  const gross = t.room + t.anc;
  const ops = t.clean + t.laundry + t.util + t.supp + t.maint;
  const opex = t.lease + ops;
  const gop = gross - t.fees - opex;
  const revpar = t.room / a;
  return {
    ...t, gross, ops, opex, gop,
    adr: t.room / s,
    occ: t.sold / a,
    revpar,
    trevpar: gross / a,
    nrevpar: (t.room - t.fees) / a,
    goppar: gop / a,
    cpor: (t.clean + t.laundry + t.supp + t.util) / s,
    rgi: t.comp ? revpar / (t.comp / a) * 100 : 0,
    margin: gross ? gop / gross : 0
  };
}

export function dailyRoomRevenue(list: Listing[], m: Month): { day: number; value: number; weekend: boolean }[] {
  const t = calc(list, [m]);
  let avg = 0;
  for (let i = 0; i < m.days; i++) avg += DOW_FACTOR[(m.startDow + i) % 7];
  avg /= m.days;
  return Array.from({ length: m.days }, (_, i) => {
    const dow = (m.startDow + i) % 7;
    return { day: i + 1, value: t.room / m.days * DOW_FACTOR[dow] / avg, weekend: dow === 5 || dow === 6 };
  });
}

export const inr = (n: number) => (n < 0 ? '−₹' : '₹') + Math.round(Math.abs(n)).toLocaleString('en-IN');
export const lakh = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 100000 ? '₹' + (a / 100000).toFixed(2) + ' L' : '₹' + Math.round(a).toLocaleString('en-IN');
  return (n < 0 ? '−' : '') + s;
};
export const pct = (x: number, digits = 1) => (x * 100).toFixed(digits) + '%';

export type Tone = 'ok' | 'warn' | 'crit' | 'voice';

export function listingSignal(p: Listing, r: Totals): { tone: Tone; label: string } {
  if (p.fwd < 60) return { tone: r.rgi < 85 ? 'crit' : 'warn', label: 'Gap pricing' };
  if (r.rgi >= 100) return { tone: 'ok', label: 'Beating comp' };
  if (r.rgi >= 85) return { tone: 'warn', label: 'Watch rate' };
  return { tone: 'crit', label: 'Below comp' };
}
