// Po `expo export`: seznam souborů aplikace pro service worker (otevření bez signálu)
// a verze mezipaměti podle obsahu sestavení (nová verze webu = nová mezipaměť).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = 'dist';
const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(dist, p).split('\\').join('/'));
  }
};
walk(dist);

// předem: kód aplikace, styly, písma a zvuky; obrázky (loga klubů…) se uloží až při zobrazení
const pre = files.filter(
  (f) => f.startsWith('_expo/static/') || /\.(ttf|otf|woff2?|mp3|wav|m4a)$/i.test(f) || /^(logo192|logo512|apple-touch-icon)\.png$|^manifest\.json$/.test(f),
);
const hash = createHash('sha1');
for (const f of pre) hash.update(f + statSync(join(dist, f)).size);
const version = hash.digest('hex').slice(0, 10);

writeFileSync(join(dist, 'sw-assets.json'), JSON.stringify({ version, files: ['./', ...pre.map((f) => './' + f)] }));
const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replace("const CACHE = 'zvedej-v1';", `const CACHE = 'zvedej-${version}';`);
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw: ${pre.length} souborů, verze ${version}`);
