#!/usr/bin/env node
// Stáhne aktuální seznam klubů z evidence ČSV a přegeneruje
//   src/data/clubs.ts
//   supabase/migrations/20261120000100_clubs.sql
// Použití: npm run update:clubs

import { writeFileSync } from 'node:fs';

const BASE = 'https://evidence.vzpirani.cz';

async function get(url, init) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

const post = { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'sort=&group=&filter=' };
const all = await get(`${BASE}/api/clubs?filter=`);
const cechy = (await get(`${BASE}/Home/GetPublicClubs?location=%C4%8Cechy`, post)).Data;
const morava = (await get(`${BASE}/Home/GetPublicClubs?location=Morava`, post)).Data;

const region = new Map();
for (const c of cechy) region.set(c.Id, 'cechy');
for (const c of morava) region.set(c.Id, 'morava');

const clubs = all
  .filter((c) => c.Id !== 0)
  .map((c) => {
    const m = (c.WeightliftingGymGps ?? '').match(/([0-9.]+)([NS]),\s*([0-9.]+)([EW])/);
    let reg = region.get(c.Id);
    if (!reg) {
      // klub bez zařazení – podle zeměpisné délky (Morava ~ východně od 15.6° E)
      reg = m && Number(m[3]) > 15.6 ? 'morava' : 'cechy';
      console.warn(`Klub bez regionu: ${c.Name} -> ${reg}`);
    }
    return {
      id: c.Id,
      name: c.Name.trim(),
      region: reg,
      city: (c.AddressDisplay ?? '').split(',')[0].trim(),
      address: c.WeightliftingGymAddress ?? c.AddressDisplay ?? '',
      lat: m ? Math.round(Number(m[1]) * 1e5) / 1e5 : null,
      lng: m ? Math.round(Number(m[3]) * 1e5) / 1e5 : null,
      web: c.Www ?? null,
      facebook: c.Facebook ?? null,
      instagram: c.Instagram ?? null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  'src/data/clubs.ts',
  `// Zdroj: https://evidence.vzpirani.cz/Home/SeznamKlubu (Český svaz vzpírání), staženo ${today}.\n` +
    `// Aktualizace: npm run update:clubs\nimport type { Club } from '../lib/types';\n\n` +
    `export const CLUBS: Club[] = ${JSON.stringify(clubs, null, 2)};\n`,
);

const q = (v) =>
  v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
const rows = clubs
  .map(
    (c) => `  (${[c.id, c.name, c.region, c.city, c.address, c.lat, c.lng, c.web, c.facebook, c.instagram].map(q).join(', ')})`,
  )
  .join(',\n');
writeFileSync(
  'supabase/migrations/20261120000100_clubs.sql',
  `-- Kluby ČSV (zdroj evidence.vzpirani.cz, ${today}). Generováno: npm run update:clubs\n` +
    `insert into public.clubs (id, name, region, city, address, lat, lng, web, facebook, instagram) values\n${rows}\n` +
    `on conflict (id) do update set name = excluded.name, region = excluded.region, city = excluded.city,\n` +
    `  address = excluded.address, lat = excluded.lat, lng = excluded.lng, web = excluded.web,\n` +
    `  facebook = excluded.facebook, instagram = excluded.instagram;\n`,
);
console.log(`Uloženo ${clubs.length} klubů.`);
