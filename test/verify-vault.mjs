import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.VERIFY_ROOT || '/home/claude/cf-site/dist';
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.xml': 'application/xml', '.txt': 'text/plain',
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let f = path.join(ROOT, p);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(8098, r));
const BASE = 'http://127.0.0.1:8098';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const fail = [];
const ok = (c, label, extra = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
  if (!c) fail.push(label);
};

/* ── The homepage must funnel through the vault, not around it ── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  const offsite = await page.$$eval('a[href]', a => a
    .map(x => x.getAttribute('href'))
    .filter(h => /knox-(chops|guac|knocks|nails|pops|vault)\.higgsfield\.app/.test(h)));
  ok(offsite.length === 0, 'homepage links no demo directly — every route runs through the vault',
     offsite.join(', ') || 'none');

  const vaultCta = await page.$eval('.btnVault', el => el.getAttribute('href'));
  ok(vaultCta === '/thevault', 'Enter the Vault points at /thevault', vaultCta);

  const chips = await page.$$eval('.vaultChips a', a => a.map(x => x.getAttribute('href')));
  ok(chips.length > 0 && chips.every(h => h.startsWith('/thevault#')),
     'every teaser chip lands inside the vault', chips.join(' '));
  await ctx.close();
}

/* ── The vault page itself ─────────────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/net::ERR_|Failed to load resource/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });

  await page.goto(BASE + '/thevault', { waitUntil: 'networkidle' });
  ok(errors.length === 0, '/thevault throws nothing', errors.slice(0, 3).join(' | '));

  // Every anchor the homepage chips reference must exist on this page.
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const wanted = [...home.matchAll(/href="\/thevault#([a-z]+)"/g)].map(m => m[1]);
  const missing = [];
  for (const id of wanted) if (!(await page.$('#' + id))) missing.push(id);
  ok(missing.length === 0, 'every chip anchor exists in the vault', missing.join(', ') || wanted.join(' '));

  // An anchored target must clear the sticky header, not hide under it.
  await page.goto(BASE + '/thevault#knocks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const clear = await page.$eval('#knocks', el => {
    const r = el.getBoundingClientRect();
    const h = document.querySelector('header').getBoundingClientRect().height;
    return { top: Math.round(r.top), header: Math.round(h) };
  });
  ok(clear.top >= clear.header, 'anchored drawer clears the sticky header',
     `top ${clear.top} vs header ${clear.header}`);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 0, 'zero horizontal overflow at 390px', `overflow ${overflow}px`);

  // Internal links must not 404 and must not point back at .html URLs.
  const internal = await page.$$eval('a[href^="/"]', a => [...new Set(a.map(x => x.getAttribute('href')))]);
  const bad = [];
  for (const href of internal) {
    if (/\.html$/.test(href)) { bad.push(href + ' (stale .html)'); continue; }
    const r = await page.request.get(BASE + href.split('#')[0]);
    if (!r.ok()) bad.push(`${href} → ${r.status()}`);
  }
  ok(bad.length === 0, 'every internal link on the vault page resolves', bad.join(', ') || internal.join(' '));

  const phone = await page.$$eval('a[href^="tel:"], a[href^="sms:"]', a => a.map(x => x.getAttribute('href')));
  ok(phone.length >= 2 && phone.every(h => h.includes('13312917400')),
     'vault page offers call and text on the current number', phone.join(' '));

  ok(/G-8LBV2N9FTC/.test(await page.content()), 'Google tag present on the vault page');
  await ctx.close();
}

/* ── JS off: nothing may be hidden ─────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE + '/thevault', { waitUntil: 'domcontentloaded' });
  const invisible = await page.$$eval('.rv', els =>
    els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length);
  ok(invisible === 0, 'with JS off the vault hides nothing', `${invisible} invisible`);
  const drawers = await page.$$eval('.drawer', els => els.length);
  ok(drawers === 6, 'all six demos listed with JS off', String(drawers));
  await ctx.close();
}

await browser.close();
server.close();
console.log(fail.length ? `\n${fail.length} FAILED:\n- ` + fail.join('\n- ') : '\nALL VAULT CHECKS PASSED');
process.exit(fail.length ? 1 : 0);
