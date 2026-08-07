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

  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
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

  // The drawers are alive: six cinemagraphs, wired lazily, each with its
  // photograph underneath as poster/fallback. Scroll the page so the sweep
  // passes every drawer, then require the wiring to have actually happened.
  const liveCount = await page.$$eval('video[data-live]', els => els.length);
  ok(liveCount === 6, 'all six drawers carry a live cinemagraph', String(liveCount));
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y); await new Promise(r => setTimeout(r, 90));
    }
  });
  await page.waitForTimeout(900);
  const wired = await page.$$eval('video[data-live]', els =>
    els.filter(v => v.dataset.wired === '1').length);
  ok(wired === 6, 'every drawer cinemagraph wired its sources after scrolling', `${wired}/6`);
  ok(reqs.some(u => /assets\/live\/drawer-.*\.(webm|mp4)/.test(u)),
     'drawer video bytes actually fetched under motion');
  ok(reqs.some(u => /assets\/live\/vault-hero-.*\.(webm|mp4)/.test(u)),
     'the arrival hero fetched its living plate');
  const playing = await page.$$eval('video[data-live]', els =>
    els.filter(v => !v.paused || v.currentTime > 0).length);
  ok(playing >= 1, 'at least one drawer cinemagraph is playing in view', `${playing} playing`);

  /* Internal links must not 404 and must not point back at .html URLs.
   *
   * The seven demo paths are the exception, and they need explaining. They are
   * not files: cf/src/router.js dispatches them to separate Workers over
   * SERVICE BINDINGS, so nothing under /thevault/<slug>/ exists in dist and a
   * static file server is right to 404 them. This check used to fail on all
   * seven, every run, for that reason — and a test that is always red is a test
   * nobody reads, which is worse than not having it.
   *
   * So the assertion is split by what is actually knowable here. A demo link is
   * checked against the router's own MOUNTS table, which is the thing that
   * would really break if a slug were mistyped. Everything else still has to
   * resolve on disk. */
  const routerPath = new URL('../cf/src/router.js', import.meta.url).pathname;
  const mounts = [...fs.readFileSync(routerPath, 'utf8')
    .matchAll(/\["(\/thevault\/[a-z-]+)",/g)].map(m => m[1]);
  ok(mounts.length === 7, 'the router still declares seven demo mounts', String(mounts.length));

  const internal = await page.$$eval('a[href^="/"]', a => [...new Set(a.map(x => x.getAttribute('href')))]);
  const bad = [];
  for (const href of internal) {
    if (/\.html$/.test(href)) { bad.push(href + ' (stale .html)'); continue; }
    const clean = href.split('#')[0];
    const mounted = mounts.find(m => clean === m || clean === m + '/' || clean.startsWith(m + '/'));
    if (mounted) continue;
    const r = await page.request.get(BASE + clean);
    if (!r.ok()) bad.push(`${href} → ${r.status()}`);
  }
  ok(bad.length === 0, 'every internal link on the vault page resolves', bad.join(', ') || internal.join(' '));

  // And every mount must be reachable FROM this page, or a demo is orphaned.
  const linked = internal.map(h => h.split('#')[0]);
  const orphan = mounts.filter(m => !linked.some(h => h === m || h === m + '/' || h.startsWith(m + '/')));
  ok(orphan.length === 0, 'every demo the router mounts is linked from the vault', orphan.join(', ') || 'all seven');

  const phone = await page.$$eval('a[href^="tel:"], a[href^="sms:"]', a => a.map(x => x.getAttribute('href')));
  ok(phone.length >= 2 && phone.every(h => h.includes('13312917400')),
     'vault page offers call and text on the current number', phone.join(' '));

  ok(/G-8LBV2N9FTC/.test(await page.content()), 'Google tag present on the vault page');
  await ctx.close();
}

/* ── Reduced motion pays for no video ──────────────────────────────
   The page claims in its own comments that a visitor who has asked for less
   movement downloads none of the motion. `preload="none"` plus a script that
   never calls load() is what makes that true, and it is exactly the kind of
   thing that survives a refactor in appearance only. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const media = [];
  page.on('request', r => { if (/\.(webm|mp4|mp3)$/.test(r.url())) media.push(r.url()); });
  await page.goto(BASE + '/thevault', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  ok(media.length === 0, 'reduced motion fetches ZERO video bytes on the vault',
     media.map(u => u.split('/').pop()).join(', ') || 'none');
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
