// Local Jarvis brain for the prototype: answers spoken questions from the sample portfolio.
// In production the transcript goes to the n8n / Claude supervisor instead (see automation/).
import { DECISIONS } from './agents';
import { LISTINGS, MONTHS, calc, filterListings, inr, lakh, pct, type CityFilter, type MonthKey } from './portfolio';

function pickMonth(q: string): MonthKey {
  if (/\bjul/.test(q)) return 'jul';
  if (/\baug/.test(q)) return 'aug';
  return 'sep';
}

function pickCity(q: string): CityFilter {
  if (/mumbai|goregaon/.test(q)) return 'Mumbai';
  if (/thane/.test(q)) return 'Thane';
  if (/ahmedabad|gandhinagar|gift/.test(q)) return 'Ahmedabad · Gandhinagar';
  return 'All';
}

// "Paradise 144" → Paradise*144; "sky escape" → Sky Escape (longest base name wins over "sky").
function findListing(q: string) {
  const candidates = LISTINGS.map(l => {
    const base = l.name.toLowerCase().replace(/\*\d+/, '').trim();
    const num = l.name.match(/\d+/)?.[0];
    return { l, base, num };
  })
    .filter(c => q.includes(c.base) && (!c.num || q.includes(c.num)))
    .sort((a, b) => b.base.length - a.base.length);
  return candidates[0]?.l;
}

export function answer(raw: string): string {
  const q = raw.toLowerCase().replace(/hey jarvis[,!.]?/, '').trim();
  const m = MONTHS[pickMonth(q)];
  const city = pickCity(q);
  const list = filterListings(city);
  const where = city === 'All' ? 'the portfolio' : city;

  if (city === 'Ahmedabad · Gandhinagar') return 'Ahmedabad and Gandhinagar have no live listings yet. They are in the expansion pipeline.';

  const listing = findListing(q);
  if (listing && /how|revpar|occupancy|doing|perform|money/.test(q)) {
    const r = calc([listing], [m]);
    return `${listing.name} in ${m.label}: ${pct(r.occ, 0)} occupancy, ADR ${inr(r.adr)}, RevPAR ${inr(r.revpar)}, and ${lakh(r.gop)} gross operating profit. Forward 14-day occupancy is ${listing.fwd}%.`;
  }
  if (/urgent|attention|approve|decision|pending|anything/.test(q)) {
    const crit = DECISIONS.filter(d => d.tone === 'crit');
    return `${DECISIONS.length} items need you, ${crit.length} of them urgent. First: ${DECISIONS[0].title}. ${DECISIONS[0].why}`;
  }
  if (/revpar/.test(q)) {
    const t = calc(list, [m]);
    return `RevPAR for ${where} in ${m.label} is ${inr(t.revpar)}, at ${pct(t.occ, 0)} occupancy and an ADR of ${inr(t.adr)}. RGI is ${t.rgi.toFixed(0)} against the comp set.`;
  }
  if (/occupan/.test(q)) {
    const t = calc(list, [m]);
    return `Occupancy for ${where} in ${m.label} was ${pct(t.occ, 0)}: ${t.sold} of ${t.avail} nights sold.`;
  }
  if (/expens|cost|spend|money out/.test(q)) {
    const t = calc(list, [m]);
    return `Money out for ${where} in ${m.label}: ${lakh(t.lease)} in leases, ${lakh(t.ops)} in operations and ${lakh(t.fees)} in OTA fees.`;
  }
  if (/how did|how are|revenue|money|profit|month|week|doing/.test(q)) {
    const t = calc(list, [m]);
    return `${m.label} for ${where}: ${lakh(t.gross)} came in, ${lakh(t.fees + t.opex)} went out, and we kept ${lakh(t.gop)}, a ${pct(t.margin, 0)} margin. RevPAR was ${inr(t.revpar)}.`;
  }
  if (/book|arriv|check.?in/.test(q)) return 'Today: NYC*35 has a 2 PM arrival with the door code sent at noon, and Paradise*144 turns over after the 11 AM checkout.';
  return 'I can tell you about money in and out, RevPAR, occupancy, any listing, or what needs your decision. Try "How did we do in September?"';
}
