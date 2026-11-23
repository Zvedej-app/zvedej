// Vygeneruje ikony aplikace (iOS, Android, web/PWA): logo „Zve / dej“ s červeným kotoučem místo tečky nad j, bílé pozadí.
// Obrázek pro nativní úvodní obrazovku (splash) je činka jako v animované úvodní obrazovce.
// Spuštění: node scripts/make-icons.mjs   (potřebuje Playwright s Chromiem)
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FONT = readFileSync(join(root, 'scripts/fonts/jost-latin-800-normal.woff2')).toString('base64');
// rozšířená latinka kvůli „j“ bez tečky (U+0237)
const FONT_EXT = readFileSync(join(root, 'scripts/fonts/jost-latin-ext-800-normal.woff2')).toString('base64');

const RED = '#C0000C';
const BLUE_PLATE = '#1E5AA8';

/** jeden konec činky (stejná kresba jako BarbellEnd v src/components/Logo.tsx), souřadnice 0–120 */
function end(color = '#FFFFFF', mono = false) {
  const plate = (x, fill) =>
    `<rect x="${x}" y="5" width="14" height="110" rx="4" fill="${mono ? color : fill}" ${mono ? '' : 'stroke="rgba(255,255,255,0.55)" stroke-width="1"'}/>`;
  return `
    <rect x="0" y="55" width="12" height="10" rx="2" fill="${color}"/>
    <rect x="10" y="43" width="7" height="34" rx="2" fill="${mono ? color : '#FFFFFF'}" ${mono ? '' : 'stroke="#C9D2DE" stroke-width="1"'}/>
    <rect x="19" y="47" width="11" height="26" rx="3" fill="${mono ? color : '#DDE3EA'}" ${mono ? '' : 'stroke="#8E99A8" stroke-width="1.5"'}/>
    ${mono ? '' : '<rect x="23" y="51" width="3" height="3" rx="1.5" fill="#5D6878"/>'}
    ${plate(32, BLUE_PLATE)}${plate(48, RED)}${plate(64, RED)}
    <rect x="78" y="50" width="6" height="20" rx="2" fill="${mono ? color : '#DDE3EA'}"/>
    <rect x="84" y="56" width="36" height="8" rx="3" fill="${color}"/>`;
}

/**
 * Celá kresba: činka přes šířku `w`, uprostřed nápis Zvedej nad osou.
 * `inset` = okraj v jednotkách plátna 1024.
 */
function art({ inset, mono = false, text = true }) {
  const W = 1024;
  // střed osy je delší než u úvodní obrazovky, aby se nápis vešel mezi kotouče
  const mid = text ? 120 : 60;
  const total = 240 + mid; // 2× konec (120) + střed osy
  const s = (W - 2 * inset) / total;
  const cy = W / 2 + (text ? 22 * s : 0);
  const color = mono ? '#FFFFFF' : '#FFFFFF';
  const ox = inset;
  const oy = cy - 60 * s;
  // šířka mezery mezi kotouči a velikost písma tak, aby se tam „Zvedej“ vešlo
  const gap = (total - 2 * 80) * s;
  const fs = Math.min(gap / 3.55, 52 * s);
  return `
    <g transform="translate(${ox} ${oy}) scale(${s})">
      ${end(color, mono)}
      <rect x="118" y="56" width="${mid + 4}" height="8" rx="3" fill="${color}"/>
      <g transform="translate(${total} 0) scale(-1 1)">${end(color, mono)}</g>
    </g>
    ${
      text
        ? `<text x="${W / 2}" y="${cy - 9 * s}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Arial, sans-serif"
            font-weight="900" font-size="${fs}" letter-spacing="${0.5 * s}" fill="#FFFFFF"
            ${mono ? '' : 'style="filter: drop-shadow(0 ' + 2 * s + 'px ' + 4 * s + 'px rgba(5,15,46,0.55))"'}>Zvedej</text>`
        : ''
    }`;
}

// bílé pozadí, tmavě modrý nápis
const BG = `<rect width="1024" height="1024" fill="#FFFFFF"/>`;
const TEXT = '#0A3666';

/**
 * Logo „Zve / dej“: dva řádky písmem Jost 800, velké je jen Z, místo tečky nad j je červený kotouč
 * s bílou obručí a otvorem. Kotouč a vycentrování se dopočítají v prohlížeči (viz layoutLogo).
 * `width` = maximální šířka loga jako podíl plátna, `mono` = jednobarevná bílá verze (Android).
 */
function logo({ width = 0.7, height = 0.72, color = TEXT, mono = false } = {}) {
  const c = mono ? '#FFFFFF' : color;
  return `<g class="logo" data-w="${width}" data-h="${height}" data-mono="${mono ? 1 : 0}">
    <text x="0" y="470" font-family="Jost" font-weight="800" font-size="330" letter-spacing="-6" fill="${c}">Zve</text>
    <text class="dej" x="0" y="800" font-family="Jost" font-weight="800" font-size="330" letter-spacing="-6" fill="${c}">de\u0237</text>
    <g class="plate"></g></g>`;
}

/** v prohlížeči: umístí kotouč nad j (bez tečky) a logo vycentruje a zvětší */
function layoutLogo(RED) {
  for (const g of document.querySelectorAll('.logo')) {
    const t = g.querySelector('.dej');
    const bb = t.getBBox();
    const last = t.getSubStringLength(t.getNumberOfChars() - 1, 1);
    const cx = bb.x + bb.width - last + last * 0.6;
    const cy = 800 - 330 * 0.47 - 330 * 0.24;
    const s = 330 * 0.2 * 1.3;
    const mono = g.dataset.mono === '1';
    // kotouč: červený (v mono verzi bílý), bílá obruč a otvor jsou vyříznuté maskou, aby byly průhledné
    const id = 'm' + Math.random().toString(36).slice(2);
    g.querySelector('.plate').innerHTML = `
      <mask id="${id}"><rect x="-2000" y="-2000" width="6000" height="6000" fill="white"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.45}" fill="none" stroke="black" stroke-width="${s * 0.09}"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.15}" fill="black"/></mask>
      <circle cx="${cx}" cy="${cy}" r="${s * 0.66}" fill="${mono ? '#FFFFFF' : RED}" mask="url(#${id})"/>`;
    const b = g.getBBox();
    const k = Math.min((1024 * +g.dataset.w) / b.width, (1024 * +g.dataset.h) / b.height);
    g.setAttribute('transform', `translate(${512 - (b.x + b.width / 2) * k} ${512 - (b.y + b.height / 2) * k}) scale(${k})`);
  }
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

const files = [
  // iOS / obecná ikona – bez průhlednosti, iOS si rohy zaoblí sám
  { out: 'assets/icon.png', size: 1024, svg: svg(BG + logo()) },
  { out: 'public/apple-touch-icon.png', size: 180, svg: svg(BG + logo()) },
  { out: 'public/logo192.png', size: 192, svg: svg(BG + logo()) },
  { out: 'public/logo512.png', size: 512, svg: svg(BG + logo()) },
  { out: 'assets/favicon.png', size: 64, svg: svg(BG + logo({ width: 0.86, height: 0.9 })) },
  // Android adaptivní ikona: popředí musí být v bezpečné zóně (střední 66 %)
  { out: 'assets/android-icon-background.png', size: 1024, svg: svg(BG), opaque: true },
  { out: 'assets/android-icon-foreground.png', size: 1024, svg: svg(logo({ width: 0.46, height: 0.5 })), transparent: true },
  // monochromatickou ikonu si Android přebarví sám – stačí bílý tvar
  { out: 'assets/android-icon-monochrome.png', size: 1024, svg: svg(logo({ width: 0.46, height: 0.5, mono: true })), transparent: true },
  // splash: kresba na průhledném pozadí (barvu pozadí nastavuje app.json)
  { out: 'assets/splash-icon.png', size: 1024, svg: svg(art({ inset: 20 })), transparent: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of files) {
  await page.setViewportSize({ width: f.size, height: f.size });
  await page.setContent(
    `<html><head><style>
      @font-face { font-family: 'Jost'; font-weight: 800; src: url(data:font/woff2;base64,${FONT}) format('woff2'); unicode-range: U+0000-00FF; }
      @font-face { font-family: 'Jost'; font-weight: 800; src: url(data:font/woff2;base64,${FONT_EXT}) format('woff2'); unicode-range: U+0100-024F; }
      svg { display: block; width: ${f.size}px; height: ${f.size}px; }
    </style></head><body style="margin:0;background:transparent">${f.svg}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(`(${layoutLogo.toString()})(${JSON.stringify(RED)})`);
  await page.waitForTimeout(150);
  const buf = await page.screenshot({ omitBackground: !!f.transparent, clip: { x: 0, y: 0, width: f.size, height: f.size } });
  mkdirSync(dirname(join(root, f.out)), { recursive: true });
  writeFileSync(join(root, f.out), buf);
  console.log('✓', f.out, f.size);
}
await browser.close();
