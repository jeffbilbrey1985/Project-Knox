import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.VERIFY_ROOT || '/home/claude/build';
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.webm': 'video/webm', '.mp4': 'video/mp4',   // MUST be in the map or sources never play
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let f = path.join(ROOT, p);
  // Mirror the Worker's html_handling:"auto-trailing-slash" — /thevault
  // resolves to thevault.html — so the suite exercises the URLs that ship.
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(8099, r));
const URL_ = 'http://127.0.0.1:8099/';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const fail = [];
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
  if (!cond) fail.push(label);
};

/* ── A · motion enabled, phone ───────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Chromium in this container cannot reach third-party HTTPS hosts
    // (ERR_CONNECTION_RESET). A failed googletagmanager fetch is a sandbox
    // limitation, not a page defect — and gtag is written so the page works
    // whether or not it loads. Real page errors still fail the build.
    if (/net::ERR_|Failed to load resource/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });

  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  ok(errors.length === 0, 'no JS errors', errors.slice(0, 3).join(' | '));

  // THE test that catches the dead-reveal bug: check phase BEFORE scrolling.
  const phases = await page.$$eval('.rv, .bolt-row, .seam', els => els.map(e => e.getAttribute('data-phase')));
  const armed = phases.filter(p => p === 'armed').length;
  ok(armed > 10, 'reveals read "armed" before scrolling (not silently dead)', `${armed}/${phases.length} armed`);

  // The vault film must load when motion is allowed.
  const gotFilm = reqs.some(u => /vault-open(-p)?\.mp4/.test(u));
  ok(gotFilm, 'vault film fetched when motion is allowed');

  // The cinema: with WebGL available the 3D wordmark engine and its font are
  // fetched immediately; the plates only load after the film hands over.
  const glOK2 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  if (glOK2) {
    ok(reqs.some(u => /knox-cinema\.min\.js/.test(u)), '3D wordmark engine fetched on load');
    ok(reqs.some(u => /cinzel600\.typeface\.json/.test(u)), '3D type face fetched');
    ok(!reqs.some(u => /knox-emblem\.glb/.test(u)),
       'phone cinema skips the 1.3MB emblem mesh — background props are not worth cellular bytes');
  }
  const plaqueHrefs = await page.$$eval('.plaques .plaque', a => a.map(x => x.getAttribute('href')));
  ok(plaqueHrefs.length === 4 && /^\/thevault(\.html)?$/.test(plaqueHrefs[0]),
     'four plaques, the vault door first', plaqueHrefs.join(' '));
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('knox:film-ended')));
  await page.waitForTimeout(1200);
  ok(reqs.some(u => /assets\/cinema\/plate-.*\.(webm|mp4)/.test(u)),
     'cinematic plates fetched after the film hands over');

  // No horizontal overflow at 390px.
  const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(ovf <= 0, 'zero horizontal overflow at 390px', `overflow ${ovf}px`);

  await page.screenshot({ path: '/home/claude/shots/m-01-hero.png' });

  // The headline must appear well before the 12s film ends.
  await page.waitForTimeout(6400);
  const copyIn = await page.$eval('#heroCopy', e => e.hasAttribute('data-in'));
  ok(copyIn, 'hero copy revealed without waiting out the film');
  await page.screenshot({ path: '/home/claude/shots/m-02-hero-copy.png' });

  // No letterboxing: every motion clip must render at its true aspect ratio.
  const boxes = await page.$$eval('video[data-motion]:not([data-cover])', els => els.map(v => {
    const r = v.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), aw: +v.getAttribute('width'), ah: +v.getAttribute('height') };
  }));
  const letterboxed = boxes.filter(b => b.w > 0 && Math.abs((b.w / b.h) - (b.aw / b.ah)) > 0.25);
  ok(letterboxed.length === 0, 'no motion graphic is letterboxed in a too-tall box', JSON.stringify(boxes));

  // The hero pill must NOT be visible any more — the voice is automatic.
  const pillVisible = await page.$eval('.heroListen', e => {
    const s = getComputedStyle(e);
    return s.display !== 'none' && s.visibility !== 'hidden';
  });
  ok(pillVisible, 'hero listen pill is visible — Arthur is offered, not sprung');

  // The full sound sequence, driven the way a visitor drives it.
  //
  // Branch-aware on purpose: a secondary headless context under load can have
  // autoplay refused outright, which is ALSO a real visitor condition (iOS
  // low-power mode). If the film genuinely plays, the full choreography is
  // asserted; if the environment refuses it, the DESIGNED degradation is
  // asserted instead — copy revealed, plates take over, Arthur still offered
  // by the visible pill.
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx2.newPage();
    await pg.goto(URL_, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(2500);

    const filmState = await pg.evaluate(() => ({
      t: document.getElementById('film').currentTime,
      done: document.getElementById('film').hasAttribute('data-done'),
    }));

    if (!filmState.done && filmState.t >= 0) {
      const mutedBefore = await pg.$eval('#film', v => v.muted);
      const cueBefore = await pg.$eval('#soundCue', e => e.hidden ? null : e.textContent.trim());
      await pg.mouse.click(195, 260);                 // a real tap on the wordmark zone
      await pg.waitForTimeout(600);
      const mutedAfter = await pg.$eval('#film', v => v.muted);
      ok(mutedBefore === true && mutedAfter === false,
         'first tap unmutes the safe', `before ${mutedBefore} → after ${mutedAfter}`);
      ok(/Tap anywhere/.test(cueBefore || ''), 'sound is invited before the tap', String(cueBefore));

      const cueAfter = await pg.$eval('#soundCue', e => ({on: e.hasAttribute('data-on'), txt: e.textContent.trim(), hidden: e.hidden}));
      ok(cueAfter.on && /tap to mute/i.test(cueAfter.txt) && !cueAfter.hidden,
         'the invitation becomes a mute control', JSON.stringify(cueAfter));

      // Film finishes → Knox speaks with no button press anywhere.
      await pg.evaluate(() => document.dispatchEvent(new CustomEvent('knox:film-ended')));
      await pg.waitForTimeout(700);
      const lbl = await pg.$eval('.heroListen', e => e.querySelector('span:not(.bar)').textContent);
      ok(/Playing/.test(lbl), 'Knox speaks automatically once the safe has opened', lbl);

      // And the mute control genuinely stops him.
      await pg.click('#soundCue');
      await pg.waitForTimeout(400);
      const after = await pg.$eval('.heroListen', e => e.querySelector('span:not(.bar)').textContent);
      const muted = await pg.$eval('#film', v => v.muted);
      ok(!/Playing/.test(after) && muted === true, 'the mute control stops the voice and the film', `${after} | muted ${muted}`);
    } else {
      console.log('NOTE  autoplay refused in this context — asserting the designed degradation instead');
      const copyIn2 = await pg.$eval('#heroCopy', e => e.hasAttribute('data-in'));
      ok(copyIn2, 'autoplay refused: hero copy still revealed');
      const cueGone = await pg.$eval('#soundCue', e => e.hidden);
      ok(cueGone, 'autoplay refused: the sound invitation is withdrawn, not stranded');
      await pg.click('.heroListen');
      await pg.waitForTimeout(1500);
      const pill = await pg.$eval('.heroListen', e => ({
        lbl: e.querySelector('span:not(.bar)').textContent,
        paused: e.querySelector('svg path').getAttribute('d').indexOf('M7 5h3.5') === 0
      }));
      ok(/Playing/.test(pill.lbl) || pill.paused,
         'autoplay refused: Arthur still speaks from the visible pill', JSON.stringify(pill));
    }
    await ctx2.close();
  }

  // Consent: both boxes must ship UNCHECKED, and neither may gate submission.
  const consent = await page.evaluate(() => {
    const s = document.getElementById('cSms'), e = document.getElementById('cEmail');
    return { sms: s && s.checked, email: e && e.checked, smsReq: s && s.required, emailReq: e && e.required, exist: !!(s && e) };
  });
  ok(consent.exist && consent.sms === false && consent.email === false,
     'both consent boxes ship unchecked', JSON.stringify(consent));
  ok(consent.smsReq === false && consent.emailReq === false,
     'neither consent box is required to submit', JSON.stringify(consent));

  // The form must post to the endpoint that creates a lead, not the mail relay.
  const src = await page.content();
  ok(/knox-crm\.higgsfield\.app\/api\/leads/.test(src), 'form posts to /api/leads');
  ok(!/api\/demo-lead/.test(src.replace(/\/\*[\s\S]*?\*\//g,'')), 'form does not post to the demo mail relay');

  // The number must be the new one, everywhere.
  ok(!/992-8855|16159928855/.test(src), 'no trace of the old phone number');
  const tels = (src.match(/tel:\+13312917400/g) || []).length;
  const smss = (src.match(/sms:\+13312917400/g) || []).length;
  ok(tels >= 4 && smss >= 1, 'new number wired for call and text', `tel x${tels}, sms x${smss}`);

  // Analytics must be present AND the privacy policy must admit to it. A page
  // that runs GA4 while its policy says "no analytics pixels" is a false
  // statement to every visitor who reads it.
  const src0 = await page.content();
  ok(/G-8LBV2N9FTC/.test(src0), 'Google tag installed');
  {
    const pv = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pp = await pv.newPage();
    await pp.goto(URL_ + 'privacy.html', { waitUntil: 'load' });
    const txt = await pp.$eval('body', e => e.textContent);
    ok(/Google Analytics/.test(txt), 'privacy policy discloses Google Analytics');
    ok(!/We do not run advertising trackers, analytics pixels/.test(txt),
       'privacy policy no longer claims there is no analytics');
    ok(/Mobile information will not be shared/.test(txt), 'carrier-mandated SMS clause still present');
    await pv.close();
  }

  // Structured data must parse and must not claim things the page cannot show.
  const ld = await page.$eval('script[type="application/ld+json"]', e => e.textContent);
  let graphOk = false, ldBad = '';
  try {
    const parsed = JSON.parse(ld);
    graphOk = Array.isArray(parsed['@graph']) && parsed['@graph'].length >= 2;
    if (/aggregateRating|"review"|"award"/.test(ld)) ldBad = 'contains review/rating markup';
  } catch (e) { ldBad = 'JSON parse failed: ' + e.message; }
  ok(graphOk && !ldBad, 'JSON-LD parses as a @graph with no fabricated proof', ldBad);

  // areaServed cities must appear in visible text, or the markup is unsupported.
  const bodyTxt = await page.$eval('body', e => e.textContent);
  const cities = ['Glen Ellyn','Wheaton','Naperville','Lombard','Downers Grove'];
  const absent = cities.filter(c => !bodyTxt.includes(c));
  ok(absent.length === 0, 'every city in areaServed appears in visible copy', absent.join(', '));

  // The search demo must narrow the list on tap.
  await page.$eval('#serp', e => e.scrollIntoView({block:'center'}));
  await page.waitForTimeout(2400);
  const shown = () => page.$$eval('#serpList li', els => els.filter(e => e.getBoundingClientRect().height > 4).length);
  await page.click('.serpToggle button[data-q="broad"]');
  await page.waitForTimeout(700);
  const broad = await shown();
  await page.click('.serpToggle button[data-q="best"]');
  await page.waitForTimeout(800);
  const best = await shown();
  ok(broad === 7 && best === 3, 'search demo narrows seven results to three', `broad ${broad} → best ${best}`);
  await page.screenshot({ path: '/home/claude/shots/m-06-find.png' });

  // Walk the page, screenshotting each section.
  for (const [id, name] of [['what', '03-what'], ['mark', '03b-mark'], ['find', '06-find2'], ['vault', '04-vault'], ['plans', '05-plans'], ['boltons', '05b-boltons'], ['contact', '09-contact']]) {
    await page.evaluate(sel => document.getElementById(sel).scrollIntoView(), id);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/home/claude/shots/m-${name}.png` });
  }

  // Reveals must have settled, and no live clip-path may remain.
  const stuck = await page.$$eval('.rv, .bolt-row, .seam', els =>
    els.filter(e => {
      const r = e.getBoundingClientRect();
      const fullyPassed = r.bottom < innerHeight;   // already scrolled past
      return fullyPassed && e.getAttribute('data-phase') === 'armed';
    }).length);
  ok(stuck === 0, 'no reveal left stuck at "armed" after being scrolled past', `${stuck} stuck`);

  // A settled reveal must leave NO live clip behind. A rule that loses on
  // specificity leaves the card zero-width: invisible and unclickable.
  const clipped = await page.$$eval('.seam, .bolt-row', els => els
    .filter(e => e.getAttribute('data-phase') === 'done')
    .map(e => getComputedStyle(e).clipPath)
    .filter(c => c && c !== 'none' && c !== 'inset(0px)'));
  ok(clipped.length === 0, 'no settled reveal is left clipped to zero width', clipped.join(' | '));

  // Plan card: expander works. Centre it first — a sticky bottom bar sits over
  // anything at the very bottom edge, same as it would for a real thumb.
  await page.$eval('.expander[aria-controls="f1"]', e => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  await page.click('.expander[aria-controls="f1"]');
  await page.waitForTimeout(300);
  const openF1 = await page.$eval('#f1', e => e.hasAttribute('data-open'));
  ok(openF1, 'plan card expander opens');

  // Growth ships pre-expanded on phone.
  const f2open = await page.$eval('#f2', e => e.hasAttribute('data-open'));
  ok(f2open, 'Growth card ships pre-expanded on a phone');

  // Motion graphics fetched their bytes.
  ok(reqs.some(u => /\.webm|\.mp4/.test(u)), 'motion graphics loaded when in view');

  // Ask Knox.
  await page.click('#askBtn');
  await page.waitForTimeout(300);
  await page.fill('#askInput', 'why the 12 month contract?');
  await page.press('#askInput', 'Enter');
  await page.waitForTimeout(700);
  const botText = await page.$$eval('.msg.bot', els => els.map(e => e.textContent).join(' '));
  ok(/front-loaded|twelve|12/i.test(botText), 'Ask Knox answers the contract question');
  await page.screenshot({ path: '/home/claude/shots/m-10-askknox.png' });

  // The price guard: the bot must never state a price outside the published set.
  const prices = [...botText.matchAll(/\$([\d,]+)/g)].map(m => m[1].replace(',', ''));
  const bad = prices.filter(p => !['250', '500', '100', '130', '2550', '5100', '20', '99', '30'].includes(p));
  ok(bad.length === 0, 'Ask Knox quotes no invented prices', bad.join(','));

  // The ladder is two plans plus bolt-ons now. Enterprise must be gone
  // everywhere — card, chooser, structured data, knowledge base.
  const cardIds = await page.$$eval('.cards .card', els => els.map(e => e.id));
  ok(cardIds.length === 2 && cardIds.includes('c1') && cardIds.includes('c2'),
     'exactly two plan cards: Foundation and Growth', cardIds.join(','));
  const fullHtml = await page.content();
  ok(!/\$1,000|Enterprise/i.test(fullHtml), 'no $1,000 plan and no Enterprise anywhere on the page');
  const boltPrices = await page.$$eval('#boltons .boltPrice', els => els.map(e => e.textContent));
  ok(boltPrices.some(t => t.includes('$100')) && boltPrices.some(t => t.includes('$130')),
     'bolt-ons priced at $100 and $130', boltPrices.join(' | '));
  ok(await page.$('#boltons .listen[data-audio*="vo-06"]') !== null, 'bolt-ons narration pill present');
  ok(/15% off/.test(fullHtml) && /\$2,550/.test(fullHtml) && /\$5,100/.test(fullHtml),
     'annual prepay (15%) shown with both annual prices');

  // The 3D mark. WebGL availability decides which experience is correct:
  // with it, the engine and mesh are fetched after the stage nears the
  // viewport; without it, the poster stands in and NOTHING 3D is fetched.
  const glOK = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  const got3d = reqs.some(u => /knox-3d\.min\.js/.test(u));
  if (glOK) ok(got3d, '3D emblem engine fetched once the stage was scrolled to');
  else ok(!got3d, 'no WebGL: 3D engine not fetched, poster stands in');
  ok(await page.$('#markStage .markPoster') !== null, '3D stage carries its poster fallback');

  // Copy guard: nothing on the page may read as AI-scary or single-operator.
  const html = await page.content();
  const banned = [/\bA\.I\.\b/, /\bAI\b/, /one person/i, /one guy/i, /\bjust me\b/i, /I answer/i, /call him/i];
  const hitsRaw = banned.filter(re => re.test(html.replace(/var KB = \[[\s\S]*?\n  \];/, '')));
  ok(hitsRaw.length === 0, 'no AI wording and no solo-operator framing in the page', hitsRaw.map(String).join(' '));

  await ctx.close();
}

/* ── A2 · desktop motion: the emblem earns its bytes at 1440 ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const glOK = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  if (glOK) ok(reqs.some(u => /knox-emblem\.glb/.test(u)),
     'desktop cinema DOES fetch the emblem mesh', '');
  await ctx.close();
}

/* ── A3 · the entrance: door opens, curtain lifts, once per session ── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const entUp = await page.$eval('#entrance', e => !e.hidden).catch(() => false);
  ok(entUp, 'the entrance curtain is up on a first visit');
  // Whatever the film does in this environment, the curtain MUST lift by the backstop.
  await page.waitForFunction(() => {
    const e = document.getElementById('entrance');
    return !e || e.hidden || e.hasAttribute('data-done');
  }, { timeout: 18000 });
  ok(true, 'the curtain lifts on its own within the backstop window');
  // Second navigation in the same session: no entrance, cinema starts at once.
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const entGone = await page.evaluate(() => !document.getElementById('entrance'));
  ok(entGone, 'seen this session: the entrance is removed entirely');
  ok(reqs.some(u => /assets\/cinema\/plate-/.test(u)), 'seen this session: plates start immediately');
  await ctx.close();
}

/* ── A4 · /how: the editorial page behaves like the rest of the estate ── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_ + 'how', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  ok(errors.length === 0, '/how throws nothing', errors.slice(0,2).join(' | '));
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1500);
  const honest = await page.$('.honest');
  ok(honest !== null, '/how carries the "not going to show you" card');
  await ctx.close();

  const rmCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const pg = await rmCtx.newPage();
  const media = [];
  pg.on('request', r => { if (/\.(webm|mp4|mp3)/.test(r.url())) media.push(r.url()); });
  await pg.goto(URL_ + 'how', { waitUntil: 'domcontentloaded' });
  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(1200);
  ok(media.length === 0, '/how under reduced motion fetches ZERO media bytes', media.join(', ') || 'none');
  await rmCtx.close();
}

/* ── B · reduced motion: zero video, zero door bytes ─────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', r => reqs.push(r.url()));
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);

  ok(!reqs.some(u => /vault-open/.test(u)), 'reduced motion fetches ZERO vault-film bytes');
  ok(!reqs.some(u => /knox-cinema|cinzel600|assets\/cinema\//.test(u)), 'reduced motion fetches ZERO cinema bytes');
  ok(!reqs.some(u => /\.webm|\.mp4/.test(u)), 'reduced motion fetches ZERO video bytes');
  ok(!reqs.some(u => /knox-3d|\.glb/.test(u)), 'reduced motion fetches ZERO 3D bytes');
  ok(await page.$eval('#heroCopy', e => e.hasAttribute('data-in')), 'hero copy present under reduced motion');
  const vis = await page.$$eval('.rv', els => els.filter(e => getComputedStyle(e).opacity !== '1').length);
  ok(vis === 0, 'every section is fully visible under reduced motion', `${vis} hidden`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/home/claude/shots/rm-hero.png' });
  await ctx.close();
}

/* ── B2 · JS DISABLED: the page must still be fully readable ──── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'load' });
  const invisible = await page.$$eval('.rv, .seam, .bolt-row, .heroCopy', els =>
    els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9 || e.getBoundingClientRect().width < 4).length);
  ok(invisible === 0, 'with JS OFF nothing is hidden — no copy waits on a script', `${invisible} invisible`);
  const h1 = await page.$eval('h1', e => e.textContent.trim());
  ok(h1.length > 20, 'headline renders with JS off', h1.slice(0, 40));
  const wm = await page.$eval('.wordmark', e => getComputedStyle(e).opacity);
  ok(wm === '1', 'HTML wordmark stands in with JS off', 'opacity ' + wm);
  const rows = await page.$$eval('#serpList li', els => els.length);
  ok(rows === 7, 'search demo shows its full list with JS off', String(rows));
  await ctx.close();
}

/* ── C · desktop ─────────────────────────────────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/home/claude/shots/d-01-hero.png' });
  for (const [id, name] of [['find', '02-find'], ['vault', '03-vault'], ['plans', '04-plans'], ['contact', '05-contact']]) {
    await page.evaluate(sel => document.getElementById(sel).scrollIntoView(), id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/home/claude/shots/d-${name}.png` });
  }
  const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(ovf <= 0, 'zero horizontal overflow at 1440px', `overflow ${ovf}px`);
  await ctx.close();
}

await browser.close();
server.close();
console.log('\n' + (fail.length ? `${fail.length} FAILED: ${fail.join(' | ')}` : 'ALL CHECKS PASSED'));
process.exit(fail.length ? 1 : 0);
