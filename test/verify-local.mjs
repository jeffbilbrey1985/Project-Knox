#!/usr/bin/env node
/**
 * verify-local.mjs — checks the DuPage local landing pages.
 *
 * The headline check is UNIQUENESS. Google treats near-duplicate local pages
 * as doorway content and can suppress rankings sitewide, so "did we
 * accidentally build a template with the town name swapped" is not a style
 * question here, it is the thing most likely to make the whole exercise
 * counterproductive. Everything else is ordinary correctness.
 *
 * Run:  KNOX_DIST=/tmp/dist node test/verify-local.mjs
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";

const DIST = process.env.KNOX_DIST || "/tmp/dist";
const PORT = 8097;
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  ok   ${n}`); };
const no = (n, d) => { fail++; console.log(`  FAIL ${n}${d ? " — " + d : ""}`); };

/* ── collect the local pages ──────────────────────────────────────────── */
const TOWNS = { "glen-ellyn": "Glen Ellyn", wheaton: "Wheaton", lombard: "Lombard" };
const LOCAL = [];
for (const slug of Object.keys(TOWNS)) {
  (function walk(dir, base) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), base + "/" + e.name);
      else if (e.name === "index.html") LOCAL.push({ url: base + "/", file: path.join(dir, e.name), town: slug });
    }
  })(path.join(DIST, slug), "/" + slug);
}
(function walkCounty(dir, base) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walkCounty(path.join(dir, e.name), base + "/" + e.name);
    else if (e.name === "index.html") LOCAL.push({ url: base + "/", file: path.join(dir, e.name), town: null });
  }
})(path.join(DIST, "dupage-county"), "/dupage-county");
LOCAL.forEach((p) => (p.html = fs.readFileSync(p.file, "utf8")));

console.log(`\nverify-local — ${LOCAL.length} pages\n`);

/* ═══ A · uniqueness ═══════════════════════════════════════════════════ */
console.log("A · uniqueness (the doorway-content check)");

/** Body text with chrome stripped. Nav, footer and the consent block are
 *  identical by design and would swamp any similarity measure. */
function bodyText(html) {
  let s = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/g, " ").replace(/<footer[\s\S]*?<\/footer>/g, " ");
  /* Template furniture is identical on every page by design — the button rows,
     the FAQ header, the consent block, the whole form section. Leaving it in
     would both inflate similarity and produce false "repeated sentence" hits. */
  s = s.replace(/<section class="formSec"[\s\S]*?<\/section>/g, " ");
  s = s.replace(/<div class="ctaRow"[\s\S]*?<\/div>/g, " ");
  s = s.replace(/<div class="titleCta">[\s\S]*?<\/div>/g, " ");
  s = s.replace(/<p class="eyebrow">[\s\S]*?<\/p>/g, " ");
  s = s.replace(/<h2 style="margin-bottom:26px">[\s\S]*?<\/h2>/g, " ");
  s = s.replace(/<i>[\s\S]*?<\/i>/g, " ");
  s = s.replace(/<nav class="crumbs"[\s\S]*?<\/nav>/g, " ");
  s = s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}
const shingles = (t, n = 8) => {
  const w = t.split(" ").filter(Boolean), out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
};
const texts = LOCAL.map((p) => ({ url: p.url, sh: shingles(bodyText(p.html)) }));

let worst = { j: 0 };
for (let i = 0; i < texts.length; i++)
  for (let k = i + 1; k < texts.length; k++) {
    const a = texts[i].sh, b = texts[k].sh;
    let inter = 0;
    for (const s of a) if (b.has(s)) inter++;
    const j = inter / (a.size + b.size - inter);
    if (j > worst.j) worst = { j, a: texts[i].url, b: texts[k].url, inter };
  }
/* Independently written pages on one topic land ~0.00-0.02. A templated set
   with swapped nouns lands north of 0.30. 0.06 is a generous ceiling. */
worst.j < 0.06
  ? ok(`max 8-gram overlap ${(worst.j * 100).toFixed(2)}% (${worst.a} vs ${worst.b}, ${worst.inter} shared)`)
  : no(`pages too similar: ${(worst.j * 100).toFixed(2)}%`, `${worst.a} vs ${worst.b}`);

/* no whole sentence may repeat across pages */
/* The site has a few signature lines it repeats on purpose — they are the
   brand's own promises, quoted from the homepage. A handful of these across 12
   pages is voice, not doorway content. Anything not on this list must be
   written once. */
const BRAND_LINES = [
  "whatever happens, what's yours stays yours.",
];
const seen = new Map(); let dupSent = 0, example = "";
for (const p of LOCAL)
  for (const s of bodyText(p.html).split(/(?<=[.?!])\s+/)) {
    const t = s.trim();
    if (t.split(" ").length < 6) continue;
    /* An FAQ QUESTION may legitimately repeat — "do you work with businesses in
       Glen Ellyn" belongs on more than one page. A repeated ANSWER would be
       duplicate content, and that is checked separately below. */
    if (t.endsWith("?")) continue;
    if (BRAND_LINES.includes(t)) continue;
    if (seen.has(t) && seen.get(t) !== p.url) { dupSent++; if (!example) example = t.slice(0, 70); }
    else seen.set(t, p.url);
  }
dupSent === 0 ? ok("no sentence repeated across pages") : no(`${dupSent} repeated sentences`, example);

/* FAQ answers must never repeat, even where the question does */
{
  const seenA = new Map(); const dup = [];
  for (const p of LOCAL)
    for (const [, a] of p.html.matchAll(/"acceptedAnswer": \{\s*"@type": "Answer",\s*"text": "((?:[^"\\]|\\.)*)"/g)) {
      if (seenA.has(a) && seenA.get(a) !== p.url) dup.push(`${seenA.get(a)} = ${p.url}`);
      else seenA.set(a, p.url);
    }
  dup.length === 0
    ? ok(`${seenA.size} FAQ answers, all distinct`)
    : no("duplicate FAQ answer", dup.join("; "));
}

/* every page carries its own H1, title and description */
const uniq = (re) => new Set(LOCAL.map((p) => (p.html.match(re) || [])[1]));
uniq(/<h1[^>]*>([^<]+)</).size === LOCAL.length ? ok("every H1 unique") : no("duplicate H1");
uniq(/<title>([^<]+)</).size === LOCAL.length ? ok("every title unique") : no("duplicate title");
uniq(/name="description" content="([^"]+)"/).size === LOCAL.length ? ok("every meta description unique") : no("duplicate description");
uniq(/<div class="local rv">\s*<i>[^<]*<\/i>\s*<p>([^<]+)</).size === LOCAL.length
  ? ok("every town paragraph unique") : no("duplicate town paragraph");

/* ═══ B · content rules from the brief ═════════════════════════════════ */
console.log("\nB · content rules");
const all = LOCAL.map((p) => bodyText(p.html)).join(" ");
const allRaw = LOCAL.map((p) => p.html).join(" ");

/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(all) ? no("emoji found") : ok("no emoji anywhere");
/* the site has zero exclamation marks; ignore JS/CSS operators by using bodyText */
all.includes("!") ? no("exclamation mark in body copy") : ok("no exclamation marks");

/* only sanctioned prices */
const prices = [...new Set((all.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || []))];
const allowed = ["$250", "$500", "$2,550", "$5,100", "$100", "$130", "$212.50", "$425", "$180"];
const badPrice = prices.filter((p) => !allowed.includes(p));
badPrice.length === 0 ? ok(`prices all sanctioned (${prices.join(" ")})`) : no("unsanctioned price", badPrice.join(" "));
/(\$1,?000|enterprise)/.test(all) ? no("references a retired Enterprise/$1,000 tier") : ok("no retired Enterprise tier");

/* no ranking guarantee — allow the refusals, catch the promises */
{
  /* The site talks about the #1 spot constantly — always to refuse it. Match the
     claim, then look back for the negation that makes it a refusal. */
  const claims = [...all.matchAll(/(guarantee|promise)[^.]{0,40}(#1|number one|top spot|first page|page one)/g)];
  const naked = claims.filter((c) => !/\b(no|nobody|never|cannot|can't|won't|doesn't|isn't|anyone who|rather than)\b/
    .test(all.slice(Math.max(0, c.index - 90), c.index + 20)));
  naked.length === 0
    ? ok(`no ranking guarantee (${claims.length} mentions, all refusals)`)
    : no("appears to guarantee a ranking", naked[0][0]);
}

/* ═══ C · SEO plumbing ═════════════════════════════════════════════════ */
console.log("\nC · SEO plumbing");
let bad = [];
for (const p of LOCAL) {
  const t = (p.html.match(/<title>([^<]+)</) || [])[1] || "";
  const d = (p.html.match(/name="description" content="([^"]+)"/) || [])[1] || "";
  const c = (p.html.match(/rel="canonical" href="([^"]+)"/) || [])[1] || "";
  if (!t.endsWith("| Project Knox")) bad.push(`${p.url} title suffix`);
  if (d.length < 120 || d.length > 170) bad.push(`${p.url} desc ${d.length}c`);
  if (c !== "https://getprojectknox.com" + p.url) bad.push(`${p.url} canonical ${c}`);
  if ((p.html.match(/<h1[\s>]/g) || []).length !== 1) bad.push(`${p.url} h1 count`);
}
bad.length === 0 ? ok("title suffix, description length, canonical, single H1") : no("head problems", bad.join("; "));

/* JSON-LD parses, and carries the nodes we promised */
bad = [];
for (const p of LOCAL) {
  const blocks = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) { bad.push(`${p.url} no ld+json`); continue; }
  let g;
  try { g = JSON.parse(blocks[0][1])["@graph"]; } catch (e) { bad.push(`${p.url} invalid: ${e.message}`); continue; }
  const types = g.map((n) => n["@type"]);
  for (const need of ["WebPage", "Service", "BreadcrumbList"]) if (!types.includes(need)) bad.push(`${p.url} missing ${need}`);
  const svc = g.find((n) => n["@type"] === "Service");
  const areas = (svc.areaServed || []).map((a) => a.name);
  if (!areas.some((a) => /DuPage/.test(a))) bad.push(`${p.url} areaServed missing county`);
  if (p.town && !areas.includes(TOWNS[p.town])) bad.push(`${p.url} areaServed missing ${TOWNS[p.town]}`);
  /* never LocalBusiness with a per-town address — we have one real location */
  if (types.includes("LocalBusiness")) bad.push(`${p.url} must not emit LocalBusiness`);
}
bad.length === 0 ? ok("JSON-LD: WebPage + Service + BreadcrumbList, areaServed correct, no LocalBusiness") : no("schema", bad.join("; "));

/* FAQ schema exactly where the brief asked for it */
{
  const want = [...Object.keys(TOWNS), "dupage-county"].flatMap((t) => [`/${t}/crm/`, `/${t}/seo/`]);
  const miss = want.filter((u) => {
    const pg = LOCAL.find((p) => p.url === u);
    return !pg || !/"@type": "FAQPage"/.test(pg.html);
  });
  miss.length === 0 ? ok(`FAQPage on all ${want.length} CRM and SEO pages`) : no("FAQPage missing", miss.join(", "));
}

/* the CRM callout is on every page in the system */
LOCAL.every((p) => /class="crmCard/.test(p.html)) ? ok(`CRM callout on all ${LOCAL.length} pages`) : no("CRM callout missing somewhere");
LOCAL.every((p) => p.html.includes('href="/thevault/crm/"')) ? ok("every page links to Drive the CRM") : no("a page does not link the CRM demo");

/* ═══ D · links resolve ════════════════════════════════════════════════ */
console.log("\nD · internal links");
const ROUTES = new Set(["/", "/thevault", "/privacy", "/sms-terms", "/how", "/getting-found", "/thevaultfilms/"]);
for (const s of ["barbershop", "restaurant", "auto-repair", "nail-salon", "chiropractor", "lawn-care", "crm"]) ROUTES.add(`/thevault/${s}/`);
LOCAL.forEach((p) => ROUTES.add(p.url));
bad = [];
for (const p of LOCAL)
  for (const [, href] of p.html.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)) {
    if (href.startsWith("/assets/") || href === "/favicon.png") continue;
    if (!ROUTES.has(href)) bad.push(`${p.url} -> ${href}`);
  }
bad.length === 0 ? ok(`every internal link resolves (${ROUTES.size} known routes)`) : no("dead internal links", bad.join(", "));

/* the crawl path Google needs: homepage -> county hub -> town -> leaves */
const home = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
home.includes('href="/dupage-county/"') ? ok("homepage links the county hub (crawl path exists)") : no("county hub is orphaned from the homepage");
const county = LOCAL.find((p) => p.url === "/dupage-county/").html;
{
  const want = [...Object.keys(TOWNS).map((t) => `/${t}/`),
    ...["website-design", "seo", "crm", "booking-payments"].map((s2) => `/dupage-county/${s2}/`)];
  const miss = want.filter((u) => !county.includes(`href="${u}"`));
  miss.length === 0
    ? ok(`county hub links 3 town hubs and 4 county service pages`)
    : no("county hub misses a link", miss.join(", "));
}
bad = [];
for (const t of Object.keys(TOWNS)) {
  const hub = LOCAL.find((p) => p.url === `/${t}/`);
  if (!hub) { bad.push(`${t} hub missing`); continue; }
  const leaves = LOCAL.filter((p) => p.town === t && p.url.split("/").length === 4);
  if (leaves.length !== 10) bad.push(`${t} has ${leaves.length} leaves, expected 10`);
  for (const l of leaves) {
    if (!hub.html.includes(`href="${l.url}"`)) bad.push(`${t} hub misses ${l.url}`);
    if (!l.html.includes(`href="/${t}/"`)) bad.push(`${l.url} does not link up`);
  }
}
bad.length === 0 ? ok(`all 3 town hubs link their 10 leaves, every leaf links up`) : no("crawl path", bad.join("; "));

/* Carol Stream was deferred until Jeff plans it — meaning NO PAGES, not a ban on
   the word. Naming it as a neighbouring town, or as somewhere Knox serves, is
   true and useful. What must not exist is a link to a page that isn't there, or
   a sentence promising one. */
{
  const linked = LOCAL.filter((p) => /href="\/carol-stream/.test(p.html));
  const promised = LOCAL.filter((p) =>
    /carol[\s-]?stream[^.]{0,60}\b(page|pages|coming soon|shortly|next)\b/i.test(p.html));
  const mentions = LOCAL.filter((p) => /carol[\s-]?stream/i.test(p.html)).length;
  linked.length === 0 && promised.length === 0
    ? ok(`no Carol Stream pages linked or promised (${mentions} passing mentions, all as a neighbouring town)`)
    : no("Carol Stream", [...linked, ...promised].map((p) => p.url).join(", "));
}

/* sitemap */
const sm = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
const missing = LOCAL.filter((p) => !sm.includes(`<loc>https://getprojectknox.com${p.url}</loc>`));
missing.length === 0 ? ok(`all ${LOCAL.length} pages in sitemap.xml`) : no("sitemap missing", missing.map((m) => m.url).join(", "));
/existing/.test("") ;
sm.includes("<loc>https://getprojectknox.com/thevault</loc>") ? ok("sitemap kept its pre-existing entries") : no("sitemap lost existing entries");

/* ═══ E · in a real browser ════════════════════════════════════════════ */
console.log("\nE · browser");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".xml": "application/xml" };
/* mimic Workers Static Assets html_handling:"auto-trailing-slash" */
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  else if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f = f + ".html";
  else if (!fs.existsSync(f) && fs.existsSync(path.join(f, "index.html"))) f = path.join(f, "index.html");
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors = [], armedFail = [], overflow = [], missingForm = [];

for (const p of LOCAL) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(`${p.url}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_|Failed to load resource/.test(m.text())) errors.push(`${p.url}: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${PORT}${p.url}`, { waitUntil: "domcontentloaded" });

  /* THE reveal trap: read state BEFORE scrolling. Everything already marked
     data-in at load means the engine is dead and content only looks fine. */
  const st = await page.evaluate(() => {
    const rv = [...document.querySelectorAll(".rv")];
    return { total: rv.length, inAtLoad: rv.filter((e) => e.hasAttribute("data-in")).length };
  });
  if (st.total && st.inAtLoad === st.total) armedFail.push(`${p.url} all ${st.total} revealed at load`);

  /* scroll-behavior is smooth, so one scrollTo + a short wait would measure the
     animation rather than the reveal engine. Step down the page like a reader. */
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += innerHeight * 0.8) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });
  await page.waitForTimeout(120);
  const stuck = await page.evaluate(() => [...document.querySelectorAll(".rv")].filter((e) => !e.hasAttribute("data-in")).length);
  if (stuck) armedFail.push(`${p.url} ${stuck} stuck after scrolling`);

  for (const w of [390, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) overflow.push(`${p.url} @${w} +${over}px`);
  }

  const form = await page.evaluate(() => {
    const g = document.getElementById("glass");
    return { present: !!g, endpoint: document.documentElement.innerHTML.includes("meridianfiling.com/api/leads"),
             consentGates: !!document.querySelector("#cSms[required], #cEmail[required]") };
  });
  if (!form.present || !form.endpoint || form.consentGates) missingForm.push(p.url);
  await page.close();
}

errors.length === 0 ? ok(`zero JS errors across all ${LOCAL.length} pages`) : no("JS errors", errors.slice(0, 3).join(" | "));
armedFail.length === 0 ? ok("reveal engine armed at load and clears after scrolling") : no("reveal engine", armedFail.join("; "));
overflow.length === 0 ? ok("zero horizontal overflow at 390px and 1440px") : no("overflow", overflow.join("; "));
missingForm.length === 0 ? ok("glass form present, correct endpoint, consent never gates submit") : no("form", missingForm.join(", "));

/* the overlay actually opens, traps focus and closes on Escape */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/wheaton/crm/`, { waitUntil: "domcontentloaded" });
  await page.click("[data-open-form]");
  await page.waitForTimeout(160);
  const opened = await page.evaluate(() => document.getElementById("scrim").classList.contains("overlay")
    && document.activeElement === document.querySelector("#glass input:not(.hp)"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(160);
  const closed = await page.evaluate(() => !document.getElementById("scrim").classList.contains("overlay")
    && document.body.style.overflow === "");
  opened && closed ? ok("overlay opens, focuses the first field, closes on Escape and restores scroll")
                   : no("overlay behaviour", `opened=${opened} closed=${closed}`);
  await page.close();
}

/* with JavaScript off, nothing may be hidden and the form must still be there */
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/lombard/barbershop/`, { waitUntil: "domcontentloaded" });
  const vis = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".rv, #glass")];
    return els.filter((e) => getComputedStyle(e).opacity === "0" || getComputedStyle(e).display === "none").length;
  });
  vis === 0 ? ok("no-JS: every section and the form remain visible") : no("no-JS", `${vis} hidden`);
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
