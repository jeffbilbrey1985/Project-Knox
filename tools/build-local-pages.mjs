#!/usr/bin/env node
/**
 * build-local-pages.mjs — generates the DuPage County local landing pages.
 *
 * WHY A GENERATOR AND NOT 49 HAND-WRITTEN FILES
 * The site has no shared stylesheet — every page carries its own inline
 * <style> (see cf/build.mjs). That is deliberate: zero render-blocking
 * requests. But it means the chrome CSS would otherwise be copy-pasted 49
 * times and drift. Here the CSS and the page shell live in ONE place and get
 * inlined at build time, the same trick tools-build-film-pages.py already uses
 * for the Screening Room.
 *
 * WHERE THE OUTPUT GOES
 * Straight into repo-root directories — dupage-county/, glen-ellyn/, and one
 * per town. cf/build.mjs copies those wholesale via TREES, which means:
 *   - no mkdirSync problem (its PAGES loop cannot create nested dirs), and
 *   - NO LINK REWRITING RUNS ON THEM. Author clean URLs directly. The build's
 *     "unrewritten .html link" guard does not cover TREES, so a bad link would
 *     ship silently. assertClean() below is the replacement for that guard.
 *
 * ASSET PATHS MUST BE ROOT-ABSOLUTE. index.html is the only page allowed bare
 * relative asset paths, and it only works because it sits at depth 0 without a
 * trailing slash. Every page here is served at /town/leaf/ — a relative
 * "assets/..." would resolve to /town/leaf/assets/... and 404.
 *
 * Run:  node tools/build-local-pages.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
/* The page copy lives in the repo so a clean clone can regenerate every page —
   the same property cf/build.mjs guarantees for the rest of the site. Override
   with KNOX_COPY only when editing copy outside the repo. */
const COPY = process.env.KNOX_COPY || path.join(ROOT, "content");
const ORIGIN = "https://getprojectknox.com";

/* ── site constants, matched to the live site ─────────────────────────── */
const PHONE_HREF = "tel:+13312917400";
const PHONE_TEXT = "(331) 291-7400";
const EMAIL = "jeffbilbrey@getprojectknox.com";
const LEADS_ENDPOINT = "https://meridianfiling.com/api/leads";
const OG_IMAGE = `${ORIGIN}/assets/img/inside-w.webp`;

/* ── content ──────────────────────────────────────────────────────────── */
const pages = [];
for (const f of [
  "hubs.json", "trades.json", "services.json", "crm.json",
  "hubs2.json", "wheaton-trades.json", "wheaton-services.json",
  "lombard-trades.json", "lombard-services.json", "county-services.json",
]) {
  const p = path.join(COPY, f);
  if (!fs.existsSync(p)) throw new Error(`missing copy file: ${p}`);
  pages.push(...JSON.parse(fs.readFileSync(p, "utf8")).pages);
}

/* Adding a town means: an entry here, the directory in cf/build.mjs TREES, a
   line in cf/_headers, and a footer link. Miss any one and the pages either do
   not ship or ship uncached and unlinked. Carol Stream is deliberately absent —
   its own comprehensive plan says it has no walkable downtown, and the copy for
   it has not been planned yet. */
const TOWNS = { "glen-ellyn": "Glen Ellyn", wheaton: "Wheaton", lombard: "Lombard" };
const COUNTY = "DuPage County, Illinois";

/* ── helpers ──────────────────────────────────────────────────────────── */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** JSON-LD is inside a <script>, so only the closing-tag sequence is dangerous. */
const jsonld = (o) => JSON.stringify(o, null, 2).replace(/<\//g, "<\\/");

function meta(slug) {
  const parts = slug.split("/");
  if (slug === "dupage-county") return { kind: "county", town: null, url: `/dupage-county/` };
  /* County-wide service pages: /dupage-county/seo/ and friends. They target
     "[service] DuPage County" searches, so they have no town and their
     areaServed is the county alone. */
  if (parts[0] === "dupage-county")
    return { kind: "countyService", town: null, leaf: parts[1], url: `/dupage-county/${parts[1]}/` };
  if (!TOWNS[parts[0]])
    throw new Error(`${slug}: unknown town "${parts[0]}" — add it to TOWNS, TREES, _headers and the footer`);
  if (parts.length === 1) return { kind: "town", town: parts[0], url: `/${parts[0]}/` };
  return { kind: "leaf", town: parts[0], leaf: parts[1], url: `/${parts[0]}/${parts[1]}/` };
}

/* ═══════════════════════════════════════════════════════════════════════
   CSS — shared chrome lifted verbatim from getting-found.html, plus the
   landing-page furniture and the Struck Gold glass form.
   ═════════════════════════════════════════════════════════════════════ */
const CSS = `
@font-face{font-family:'Cinzel';src:url('/assets/fonts/Cinzel-600.woff2') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/CormorantGaramond-600.woff2') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-300.woff2') format('woff2');font-weight:300;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-400.woff2') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-500.woff2') format('woff2');font-weight:500;font-display:swap}
:root{
  --night:#0B1026; --black:#05070F; --gold:#C9A961; --struck:#E8CE93;
  --brass:#9C7F42; --ivory:#F2EFE8; --steel:#8A93A8;
  --line:rgba(201,169,97,.24); --line-soft:rgba(138,147,168,.20);
  --display:'Cormorant Garamond',Georgia,serif;
  --mark:'Cinzel',Georgia,serif;
  --ui:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --ease:cubic-bezier(.2,.7,.2,1);
  --navh:56px;
  --pad:clamp(20px,5vw,64px);
  --maxw:1180px;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--night);color:var(--ivory);font-family:var(--ui);font-weight:300;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img,video{max-width:100%;display:block;height:auto}
a{color:var(--gold);text-decoration:none}
h1,h2,h3{margin:0;font-family:var(--display);font-weight:600;line-height:1.06;letter-spacing:-.01em}
h1{font-size:clamp(34px,7.6vw,64px)}
h2{font-size:clamp(28px,6vw,44px)}
h3{font-size:clamp(20px,3.4vw,25px)}
p{margin:0 0 1em}
:focus-visible{outline:2px solid var(--struck);outline-offset:3px;border-radius:4px}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--pad)}
section{position:relative}
.eyebrow{font-family:var(--ui);font-weight:500;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:12px;margin-bottom:20px}
.eyebrow::before{content:"";width:26px;height:1px;background:var(--gold);flex:none}
.lede{color:#cfd4e0;font-size:clamp(16px,3.6vw,19px);max-width:64ch;margin-top:18px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:12px;top:12px;z-index:99;background:var(--gold);color:var(--black);padding:10px 16px;border-radius:6px}

/* ── nav (interior-page form) ─────────────────────────────────────────── */
.nav{position:fixed;inset:0 0 auto 0;height:var(--navh);z-index:60;display:flex;align-items:center;justify-content:space-between;padding:0 var(--pad);background:rgba(11,16,38,0);backdrop-filter:blur(0px);transition:background .3s var(--ease),backdrop-filter .3s var(--ease),border-color .3s var(--ease);border-bottom:1px solid transparent}
.nav[data-scrolled]{background:rgba(11,16,38,.9);backdrop-filter:blur(14px);border-bottom-color:var(--line-soft)}
.brand{display:flex;align-items:center;gap:10px}
.brand img{width:34px;height:34px;border-radius:8px}
.brand b{font-family:var(--mark);font-weight:600;font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--ivory)}
.navlinks{display:flex;align-items:center;gap:22px}
.navdesk{display:none}
.navlinks a:not(.btnGold){font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--steel);transition:color .2s var(--ease)}
.navlinks a:not(.btnGold):hover{color:var(--ivory)}
.navmob{display:flex;gap:14px}
.navcall{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center}
.navcall svg{width:17px;height:17px}
@media (min-width:900px){:root{--navh:70px}.navdesk{display:flex}.navmob{display:none}}

/* ── buttons ──────────────────────────────────────────────────────────── */
.btnGold{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(180deg,var(--struck),var(--gold));color:#241c07;border:none;border-radius:999px;padding:15px 30px;min-height:48px;font-family:var(--ui);font-size:14px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 6px 26px rgba(201,169,97,.22);transition:transform .18s var(--ease),box-shadow .18s var(--ease);cursor:pointer}
.btnGold:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(201,169,97,.34)}
.btnGhost{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);color:var(--ivory);background:transparent;border-radius:999px;padding:14px 26px;min-height:48px;font-family:var(--ui);font-size:13px;font-weight:500;letter-spacing:.08em;cursor:pointer;transition:border-color .2s var(--ease),background .2s var(--ease)}
.btnGhost:hover{border-color:var(--gold);background:rgba(201,169,97,.07)}

/* ── reveals — position test on scroll, never IntersectionObserver.
      An observer only fires on frames where the element is intersecting; a
      fast flick or an anchor jump can carry it past without such a frame,
      leaving content permanently invisible AND unclickable. ─────────────── */
.rv{opacity:1;transform:none}
:root[data-js] .rv{opacity:0;transform:translateY(14px);transition:opacity .55s var(--ease),transform .55s var(--ease)}
:root[data-js] .rv[data-in]{opacity:1;transform:none}

/* ── title block ──────────────────────────────────────────────────────── */
.titleBlock{padding:calc(var(--navh) + clamp(44px,8vw,88px)) 0 clamp(24px,4vw,40px);background:radial-gradient(120% 90% at 50% 0%,rgba(201,169,97,.09),transparent 62%)}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px;letter-spacing:.06em;color:var(--steel);margin-bottom:22px}
.crumbs a{color:var(--steel)}
.crumbs a:hover{color:var(--struck)}
.crumbs span{opacity:.5}
.titleCta{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}

/* ── content sections ─────────────────────────────────────────────────── */
.body{padding:clamp(40px,7vw,72px) 0;border-top:1px solid var(--line-soft)}
.body h2{margin-bottom:18px;max-width:22ch}
.body p{color:#D5DAE6;max-width:68ch}
.blk{max-width:820px}
.blk+.blk{margin-top:clamp(38px,6vw,60px);padding-top:clamp(38px,6vw,60px);border-top:1px solid var(--line-soft)}
.dia{list-style:none;padding:0;margin:20px 0 0;max-width:68ch}
.dia li{position:relative;padding-left:26px;margin:11px 0;color:#dfe3ec;font-size:16px}
.dia li::before{content:"";position:absolute;left:2px;top:9px;width:8px;height:8px;border:1px solid var(--gold);transform:rotate(45deg)}

/* ── the local block — the town-specific paragraph, given its own frame ── */
.local{margin:clamp(34px,5vw,52px) 0 0;padding:clamp(24px,4vw,34px);border:1px solid var(--line);border-radius:16px;background:linear-gradient(158deg,rgba(201,169,97,.07),rgba(5,7,15,.35));max-width:820px}
.local i{display:block;font-family:var(--display);font-style:normal;font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:var(--struck);margin-bottom:14px}
.local p{margin:0;color:#dfe3ec}

/* ── CRM callout — on every page in the system ────────────────────────── */
.crm{padding:clamp(40px,7vw,72px) 0;background:var(--black);border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)}
.crmCard{max-width:900px;border:1px solid var(--line);border-radius:16px;padding:clamp(26px,4vw,38px);background:linear-gradient(158deg,rgba(232,206,147,.08),rgba(11,16,38,.5))}
.crmCard i{display:block;font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:14px;font-style:normal}
.crmCard h2{font-size:clamp(24px,4vw,34px);margin-bottom:14px}
.crmCard p{color:#dfe3ec;margin:0 0 22px;max-width:68ch}

/* ── link grid (hub pages) ────────────────────────────────────────────── */
.grid{display:grid;gap:14px;grid-template-columns:1fr;margin-top:30px}
@media (min-width:760px){.grid{grid-template-columns:1fr 1fr}}
.gcard{display:block;border:1px solid var(--line-soft);border-radius:16px;padding:22px 24px;background:rgba(255,255,255,.02);transition:border-color .25s var(--ease),transform .25s var(--ease),background .25s var(--ease)}
.gcard:hover{border-color:var(--gold);transform:translateY(-2px);background:rgba(201,169,97,.05)}
.gcard b{display:block;font-family:var(--display);font-weight:600;font-size:21px;color:var(--ivory);letter-spacing:-.01em;margin-bottom:6px}
.gcard span{display:block;font-size:14.5px;color:var(--steel);line-height:1.5}

/* ── FAQ ──────────────────────────────────────────────────────────────── */
.faq{padding:clamp(40px,7vw,72px) 0;border-top:1px solid var(--line-soft)}
.q{border-bottom:1px solid var(--line-soft);max-width:820px}
.q summary{cursor:pointer;list-style:none;padding:20px 34px 20px 0;position:relative;font-family:var(--display);font-size:clamp(18px,3vw,22px);color:var(--ivory);letter-spacing:-.01em}
.q summary::-webkit-details-marker{display:none}
.q summary::after{content:"";position:absolute;right:6px;top:50%;width:9px;height:9px;border-right:1.5px solid var(--gold);border-bottom:1.5px solid var(--gold);transform:translateY(-70%) rotate(45deg);transition:transform .25s var(--ease)}
.q[open] summary::after{transform:translateY(-30%) rotate(-135deg)}
.q p{color:#D5DAE6;margin:0 0 22px;max-width:66ch;font-size:16px}

/* ── CTA band ─────────────────────────────────────────────────────────── */
.ctaBand{margin:clamp(38px,6vw,60px) 0 0;border:1px solid var(--line);border-radius:20px;padding:clamp(28px,4.5vw,44px);background:radial-gradient(120% 140% at 0% 0%,rgba(201,169,97,.12),transparent 60%),rgba(5,7,15,.5);max-width:900px}
.ctaBand h2{font-size:clamp(24px,4vw,34px);margin-bottom:12px}
.ctaBand p{color:#dfe3ec;max-width:60ch}
.ctaRow{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}

/* ══════════════════════════════════════════════════════════════════════
   THE GLASS FORM — "Struck Gold". One node, two placements: it sits in the
   page by default (so its copy is crawlable and one tap from conversion),
   and the same node is promoted to a fixed overlay when a CTA opens it.
   Never two copies — duplicate ids would break every label association.
   ════════════════════════════════════════════════════════════════════ */
.formSec{padding:clamp(48px,8vw,88px) 0;scroll-margin-top:calc(var(--navh) + 16px);position:relative;overflow:hidden;border-top:1px solid var(--line-soft)}
/* Glass needs something luminous behind it or it reads as a grey rectangle. */
.formSec::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(40% 44% at 50% 44%,rgba(232,206,147,.30),transparent 72%),radial-gradient(46% 52% at 16% 18%,rgba(232,206,147,.20),transparent 70%),radial-gradient(40% 46% at 86% 80%,rgba(201,169,97,.15),transparent 72%),radial-gradient(50% 40% at 68% 4%,rgba(120,150,220,.10),transparent 70%)}
.formSec .wrap{position:relative;z-index:1}
.formLede{max-width:60ch;margin:0 auto 34px;text-align:center;color:#cfd4e0}

.scrim{display:grid;place-items:center}
/* z-index alone is not enough: the scrim lives inside .formSec .wrap, which
   sets position:relative + z-index:1 and therefore creates a stacking context.
   Any z-index here is resolved INSIDE that context, so the overlay would render
   under the fixed nav no matter how high the number. The JS moves the node to
   <body> on open — this rule only has to be right once it is there. */
.scrim.overlay{position:fixed;inset:0;z-index:120;padding:24px 20px;background:rgba(5,7,15,.36);backdrop-filter:blur(26px) saturate(130%);-webkit-backdrop-filter:blur(26px) saturate(130%);overflow-y:auto;align-items:start;justify-items:center}
.glass{
  position:relative;width:min(470px,100%);border-radius:30px;padding:36px 32px 28px;
  overflow:hidden;isolation:isolate;
  background:linear-gradient(158deg,rgba(243,224,180,.40),rgba(201,169,97,.17) 46%,rgba(255,255,255,.13) 78%,rgba(232,206,147,.22));
  backdrop-filter:blur(40px) saturate(210%) brightness(1.06);-webkit-backdrop-filter:blur(40px) saturate(210%) brightness(1.06);
  box-shadow:0 50px 100px -28px rgba(0,0,0,.78),0 8px 26px -12px rgba(0,0,0,.5),inset 0 1px 0 rgba(245,228,186,.80),inset 0 -1px 0 rgba(255,255,255,.05);
}
/* specular sheen — tracks the pointer; this is what reads as liquid */
.glass::before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:
    radial-gradient(560px circle at var(--mx,28%) var(--my,4%),rgba(245,228,186,.38),transparent 52%),
    radial-gradient(300px circle at 8% -6%,rgba(245,228,186,.38),transparent 60%),
    /* a warm base that does NOT depend on the backdrop — over dark navy the
       backdrop-filter alone yields a muddy grey rather than gold */
    linear-gradient(158deg,rgba(232,206,147,.20),transparent 58%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
  transition:background .12s linear
}
/* refracted edge — bright top-left, dim bottom-right, drawn as a masked ring */
.glass::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;padding:1px;
  background:linear-gradient(150deg,rgba(245,228,186,.98),rgba(201,169,97,.30) 38%,rgba(255,255,255,.07) 60%,rgba(232,206,147,.52));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude
}
.glass i.gEyebrow{display:block;padding-right:40px;font-style:normal;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--struck);font-weight:500;margin-bottom:12px}
.glass h2{font-size:clamp(24px,4.4vw,30px);margin:0;padding-right:8px}
.gSub{margin:10px 0 24px;font-size:14.5px;line-height:1.55;color:rgba(245,235,214,.72)}
.field{position:relative;margin-bottom:13px}
.field input,.field textarea{
  width:100%;height:54px;border-radius:15px;padding:22px 16px 8px;
  background:rgba(255,255,255,.12);border:1px solid rgba(232,206,147,.34);
  color:var(--ivory);font-family:var(--ui);font-size:15px;font-weight:300;
  box-shadow:inset 0 1px 2px rgba(0,0,0,.18);
  transition:border-color .22s var(--ease),box-shadow .22s var(--ease),background .22s var(--ease);outline:none
}
.field textarea{height:92px;padding-top:24px;resize:none;line-height:1.5}
.field label{position:absolute;left:17px;top:17px;pointer-events:none;font-size:15px;font-weight:300;color:rgba(245,235,214,.66);transition:all .2s var(--ease)}
.field input:focus,.field textarea:focus{border-color:rgba(232,206,147,.85);background:rgba(255,255,255,.19);box-shadow:inset 0 1px 2px rgba(0,0,0,.18),0 0 0 3px rgba(201,169,97,.22)}
.field input:focus+label,.field input:not(:placeholder-shown)+label,
.field textarea:focus+label,.field textarea:not(:placeholder-shown)+label{top:8px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--struck);font-weight:500}
.two{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.gConsent{margin:4px 0 14px}
.gConsent label{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:12px;line-height:1.5;color:rgba(245,235,214,.66);cursor:pointer}
.gConsent input{margin:3px 0 0;width:15px;height:15px;flex:none;accent-color:var(--gold)}
.gConsent b{color:var(--struck);font-weight:500}
.gConsent a{color:rgba(232,206,147,.85);text-decoration:underline}
.glass .btnGold{width:100%;border-radius:16px;min-height:54px;margin-top:4px}
.gFoot{margin:14px 0 0;font-size:12px;line-height:1.5;color:rgba(245,235,214,.62);text-align:center}
.gFoot a{color:rgba(232,206,147,.85)}
.gClose{position:absolute;top:15px;right:15px;width:34px;height:34px;border-radius:50%;display:none;place-items:center;cursor:pointer;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26);color:rgba(255,255,255,.8);font-size:17px;line-height:1}
.scrim.overlay .gClose{display:grid}
.gDone{display:none;text-align:center;padding:14px 0 6px}
.gDone b{display:block;font-family:var(--display);font-size:26px;color:var(--struck);margin-bottom:8px;font-weight:600}
.gDone p{color:rgba(245,235,214,.72);font-size:14.5px;margin:0}
.glass[data-sent] form{display:none}
.glass[data-sent] .gDone{display:block}
@media (max-width:520px){.glass{padding:30px 22px 24px;border-radius:24px}.two{grid-template-columns:1fr}}
/* Without backdrop-filter (older Firefox), fall back to a solid, legible card */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .glass{background:linear-gradient(158deg,rgba(38,32,16,.97),rgba(11,16,38,.98))}
  .scrim.overlay{background:rgba(5,7,15,.88)}
}

/* ── footer ───────────────────────────────────────────────────────────── */
footer{padding:clamp(44px,7vw,72px) 0 40px;border-top:1px solid var(--line-soft);color:var(--steel);font-size:14px;background:var(--black)}
footer .tagline{font-family:var(--display);font-size:19px;color:var(--ivory);margin:14px 0 16px}
footer a{color:var(--gold)}
footer .foothub{margin:0 0 6px}

@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}
  :root[data-js] .rv{opacity:1;transform:none}
}
`;

/* ═══════════════════════════════════════════════════════════════════════
   Chrome
   ═════════════════════════════════════════════════════════════════════ */
const NAV = `<nav class="nav" id="nav">
  <a class="brand" href="/" aria-label="Project Knox, back to the homepage">
    <img src="/assets/img/knox-logo.webp" alt="" width="34" height="34" decoding="async">
    <b>Project Knox</b>
  </a>
  <div class="navlinks navdesk">
    <a href="/#what">What you get</a>
    <a href="/getting-found">Getting found on Google</a>
    <a href="/thevault">The Vault</a>
    <a href="/#plans">Plans</a>
    <a href="/#boltons">Bolt&#8209;Ons</a>
    <a href="${PHONE_HREF}" style="color:var(--struck)">${PHONE_TEXT}</a>
    <a class="btnGold" style="padding:11px 20px;font-size:12px" href="/#contact">Book a call</a>
  </div>
  <div class="navlinks navmob">
    <a href="/#plans">Plans</a>
    <a class="navcall" href="${PHONE_HREF}" aria-label="Call Project Knox">
      <svg viewBox="0 0 24 24" fill="none" stroke="#C9A961" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
    </a>
  </div>
</nav>`;

const FOOTER = `<footer>
  <div class="wrap">
    <div class="brand" style="display:inline-flex">
      <img src="/assets/img/knox-logo.webp" alt="Project Knox" width="40" height="40" decoding="async">
      <b style="color:var(--ivory)">Project Knox</b>
    </div>
    <div class="tagline">Built by hand. Run by Knox.</div>
    <p class="foothub"><a href="${PHONE_HREF}">${PHONE_TEXT}</a> &middot; <a href="mailto:${EMAIL}">${EMAIL}</a></p>
    <p class="foothub">Glen Ellyn, Illinois &middot; <a href="/thevault">The Vault</a> &middot; <a href="/dupage-county/">DuPage County</a></p>
    <p class="foothub"><a href="/privacy">Privacy Policy</a> &middot; <a href="/sms-terms">SMS Terms</a></p>
    <p style="opacity:.7;margin:0">&copy; 2026 Project Knox &middot; Websites, CRM &amp; automation for local businesses</p>
  </div>
</footer>`;

/* ── the glass form ───────────────────────────────────────────────────── */
function glassForm(p, m) {
  const place = m.town ? TOWNS[m.town] + ", Illinois" : COUNTY;
  return `<section class="formSec" id="start">
  <div class="wrap">
    <div class="scrim" id="scrim">
      <div class="glass" id="glass" role="dialog" aria-modal="false" aria-labelledby="gTitle">
        <button type="button" class="gClose" id="gClose" aria-label="Close">&times;</button>
        <i class="gEyebrow">${esc(place)}</i>
        <h2 id="gTitle">${esc(p.formHeading)}</h2>
        <p class="gSub">${esc(p.formSub)}</p>
        <form id="leadForm" novalidate>
          <div class="two">
            <div class="field"><input id="fname" name="name" placeholder=" " autocomplete="name" required><label for="fname">Your name</label></div>
            <div class="field"><input id="fphone" name="phone" type="tel" inputmode="tel" placeholder=" " autocomplete="tel"><label for="fphone">Phone</label></div>
          </div>
          <div class="field"><input id="femail" name="email" type="email" inputmode="email" placeholder=" " autocomplete="email" required><label for="femail">Email address</label></div>
          <div class="field"><input id="fbiz" name="business" placeholder=" " autocomplete="organization" required><label for="fbiz">Business name</label></div>
          <div class="field"><input id="ftype" name="type" placeholder=" " autocomplete="off"><label for="ftype">Type of business</label></div>
          <div class="field"><textarea id="fmsg" name="message" placeholder=" "></textarea><label for="fmsg">What's not working right now?</label></div>
          <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="gConsent">
            <label for="cSms"><input type="checkbox" id="cSms" name="sms_consent" value="yes"><span><b>Text me.</b> I agree that Project Knox may text me at the mobile number above, sent from ${PHONE_TEXT} &mdash; about my inquiry, and with marketing about Project Knox services and offers. Consent is not a condition of purchase. Message frequency varies (about 2&ndash;6 messages a month). Message and data rates may apply. Reply STOP to cancel or HELP for help. See <a href="/sms-terms">SMS Terms</a> and <a href="/privacy">Privacy Policy</a>.</span></label>
            <label for="cEmail"><input type="checkbox" id="cEmail" name="email_consent" value="yes"><span><b>Email me.</b> I agree to receive marketing emails from Project Knox about services and offers. You can unsubscribe from any email. See <a href="/privacy">Privacy Policy</a>.</span></label>
          </div>
          <button class="btnGold" type="submit" id="submitBtn">Send this to Knox</button>
          <p class="gFoot">Neither box is required &mdash; we'll reply either way. Or call <a href="${PHONE_HREF}">${PHONE_TEXT}</a>. No sales script, no discovery process, a real person within 24 hours.</p>
        </form>
        <div class="gDone">
          <b>Got it.</b>
          <p>A real person reads this and gets back to you within 24 hours. If it's urgent, ${PHONE_TEXT} rings a phone.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/* ── JSON-LD ──────────────────────────────────────────────────────────── */
function schema(p, m) {
  const url = ORIGIN + m.url;
  const townName = m.town ? TOWNS[m.town] : null;
  const areaServed = [{ "@type": "AdministrativeArea", name: COUNTY }];
  if (townName) areaServed.push({ "@type": "City", name: townName, address: { "@type": "PostalAddress", addressLocality: townName, addressRegion: "IL", addressCountry: "US" } });

  const crumbs = [{ name: "Home", item: `${ORIGIN}/` }, { name: "DuPage County", item: `${ORIGIN}/dupage-county/` }];
  if (m.town) crumbs.push({ name: townName, item: `${ORIGIN}/${m.town}/` });
  if (m.kind === "leaf" || m.kind === "countyService") crumbs.push({ name: p.h1, item: url });

  const graph = [
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: p.title,
      description: p.metaDescription,
      isPartOf: { "@id": `${ORIGIN}/#website` },
      publisher: { "@id": `${ORIGIN}/#business` },
      inLanguage: "en-US",
    },
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: p.h1,
      description: p.metaDescription,
      provider: { "@id": `${ORIGIN}/#business` },
      areaServed,
      /* Offers mirror the live plan table exactly. A price on a page that
         disagrees with the plan cards is worse than no price at all. */
      offers: [
        { "@type": "Offer", name: "Foundation", price: "250", priceCurrency: "USD", description: "Per month, plus a one-time $250 setup." },
        { "@type": "Offer", name: "Growth", price: "500", priceCurrency: "USD", description: "Per month, plus a one-time $500 setup." },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
    },
  ];

  if (p.faqs && p.faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: p.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/* ── page render ──────────────────────────────────────────────────────── */
function render(p) {
  const m = meta(p.slug);
  const url = ORIGIN + m.url;
  const townName = m.town ? TOWNS[m.town] : null;

  const crumbHtml = [`<a href="/">Home</a>`, `<span>/</span>`, `<a href="/dupage-county/">DuPage County</a>`];
  if (m.town) crumbHtml.push(`<span>/</span>`, `<a href="/${m.town}/">${esc(townName)}</a>`);

  const sections = p.sections
    .map(
      (s) => `      <div class="blk rv">
        <h2>${esc(s.h2)}</h2>
${s.paras.map((x) => `        <p>${esc(x)}</p>`).join("\n")}
${s.bullets && s.bullets.length ? `        <ul class="dia">\n${s.bullets.map((b) => `          <li>${esc(b)}</li>`).join("\n")}\n        </ul>` : ""}
      </div>`
    )
    .join("\n");

  const links =
    p.links && p.links.length
      ? `  <section class="body">
    <div class="wrap">
      <p class="eyebrow">Where to go next</p>
      <div class="grid">
${p.links.map((l) => `        <a class="gcard rv" href="${esc(l.href)}"><b>${esc(l.label)}</b><span>${esc(l.note)}</span></a>`).join("\n")}
      </div>
    </div>
  </section>`
      : "";

  const faqs =
    p.faqs && p.faqs.length
      ? `  <section class="faq">
    <div class="wrap">
      <p class="eyebrow">Questions people actually ask</p>
      <h2 style="margin-bottom:26px">Straight answers.</h2>
${p.faqs.map((f) => `      <details class="q"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}
    </div>
  </section>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8LBV2N9FTC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-8LBV2N9FTC');
</script>

<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.metaDescription)}">
<meta name="author" content="Project Knox">
<meta name="theme-color" content="#0B1026">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.metaDescription)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="Project Knox">
<meta name="geo.region" content="US-IL">
<meta name="geo.placename" content="${esc(townName ? townName + ", Illinois" : COUNTY)}">
<link rel="icon" href="/favicon.png" sizes="180x180">
<link rel="apple-touch-icon" href="/favicon.png">

<script type="application/ld+json">
${jsonld(schema(p, m))}
</script>

<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${NAV}

<main id="main">

  <section class="titleBlock">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb">${crumbHtml.join("")}</nav>
      <p class="eyebrow">${esc(p.eyebrow)}</p>
      <h1>${esc(p.h1)}</h1>
      <p class="lede">${esc(p.lede)}</p>
      <div class="titleCta">
        <button class="btnGold" type="button" data-open-form>Start the conversation</button>
        <a class="btnGhost" href="${PHONE_HREF}">${PHONE_TEXT}</a>
      </div>
    </div>
  </section>

  <section class="body">
    <div class="wrap">
${sections}
      <div class="local rv">
        <i>${esc(townName || "DuPage County")}</i>
        <p>${esc(p.townPara)}</p>
      </div>
    </div>
  </section>

${links}

  <section class="crm">
    <div class="wrap">
      <div class="crmCard rv">
        <i>The Knox CRM</i>
        <h2>${esc(p.crmCallout.heading)}</h2>
        <p>${esc(p.crmCallout.para)}</p>
        <div class="ctaRow" style="margin:0">
          <a class="btnGold" href="/thevault/crm/">Drive the CRM</a>
          <button class="btnGhost" type="button" data-open-form>Ask about it</button>
        </div>
      </div>
    </div>
  </section>

${faqs}

  <section class="body" style="border-top:0">
    <div class="wrap">
      <div class="ctaBand rv">
        <h2>${esc(p.cta.heading)}</h2>
        <p>${esc(p.cta.para)}</p>
        <div class="ctaRow">
          <a class="btnGold" href="${esc(p.cta.primaryHref)}">${esc(p.cta.primaryLabel)}</a>
          <a class="btnGhost" href="${esc(p.cta.secondaryHref)}">${esc(p.cta.secondaryLabel)}</a>
        </div>
      </div>
    </div>
  </section>

${glassForm(p, m)}

</main>
${FOOTER}

<script>
/* data-js must be the FIRST statement: every .rv is hidden only while it is
   set, so if anything below throws, the content is still on the page. */
document.documentElement.setAttribute('data-js','');
(function(){
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav background on scroll */
  var nav = document.getElementById('nav');
  function chrome(){ if(window.scrollY > 12) nav.setAttribute('data-scrolled',''); else nav.removeAttribute('data-scrolled'); }
  chrome(); addEventListener('scroll', chrome, {passive:true});

  /* reveals — a POSITION TEST every scroll frame, never an IntersectionObserver.
     An observer only fires on frames where the element is intersecting, so a
     hard flick or an anchor jump can carry an element from below the fold to
     above it without ever producing one, leaving it invisible forever. */
  var pending = [].slice.call(document.querySelectorAll('.rv'));
  function sweep(){
    var line = innerHeight * 0.92;
    for(var i=pending.length-1;i>=0;i--){
      if(pending[i].getBoundingClientRect().top < line){
        pending[i].setAttribute('data-in',''); pending.splice(i,1);
      }
    }
    if(!pending.length) removeEventListener('scroll', sweep);
  }
  if(RM){ pending.forEach(function(el){ el.setAttribute('data-in',''); }); pending = []; }
  else { sweep(); addEventListener('scroll', sweep, {passive:true}); addEventListener('resize', sweep, {passive:true}); }

  /* ── the glass form: one node, promoted to an overlay on demand ──────── */
  var scrim = document.getElementById('scrim'),
      glass = document.getElementById('glass'),
      last  = null;

  /* Remember where the scrim lives so it can go back. Opening MOVES it to
     <body>: .formSec .wrap is a stacking context, so an overlay left inside it
     paints under the fixed nav whatever its z-index. */
  var home = document.createComment('scrim');
  scrim.parentNode.insertBefore(home, scrim);

  function open(trigger){
    last = trigger || null;
    document.body.appendChild(scrim);
    scrim.classList.add('overlay');
    glass.setAttribute('aria-modal','true');
    document.body.style.overflow = 'hidden';
    var f = glass.querySelector('input:not(.hp)'); if(f) f.focus();
  }
  function close(){
    scrim.classList.remove('overlay');
    home.parentNode.insertBefore(scrim, home);
    glass.setAttribute('aria-modal','false');
    document.body.style.overflow = '';
    if(last) last.focus();
  }
  [].forEach.call(document.querySelectorAll('[data-open-form]'), function(b){
    b.addEventListener('click', function(){ open(b); });
  });
  document.getElementById('gClose').addEventListener('click', close);
  scrim.addEventListener('click', function(e){ if(e.target === scrim) close(); });
  addEventListener('keydown', function(e){
    if(e.key === 'Escape' && scrim.classList.contains('overlay')) close();
    /* keep tab focus inside the card while it is a modal */
    if(e.key === 'Tab' && scrim.classList.contains('overlay')){
      var f = glass.querySelectorAll('a[href],button,input,textarea,select');
      f = [].filter.call(f, function(el){ return el.offsetParent !== null; });
      if(!f.length) return;
      var first = f[0], lastEl = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); lastEl.focus(); }
      else if(!e.shiftKey && document.activeElement === lastEl){ e.preventDefault(); first.focus(); }
    }
  });

  /* specular tracking — rAF-throttled, one write per frame, off if reduced */
  if(!RM){
    var qx=0, qy=0, queued=false;
    glass.addEventListener('pointermove', function(e){
      var r = glass.getBoundingClientRect();
      qx = (e.clientX - r.left) / r.width * 100;
      qy = (e.clientY - r.top) / r.height * 100;
      if(queued) return; queued = true;
      requestAnimationFrame(function(){
        glass.style.setProperty('--mx', qx.toFixed(1)+'%');
        glass.style.setProperty('--my', qy.toFixed(1)+'%');
        queued = false;
      });
    });
    glass.addEventListener('pointerleave', function(){
      glass.style.setProperty('--mx','28%'); glass.style.setProperty('--my','4%');
    });
  }

  /* ── submit. Mirrors the homepage contract exactly: same endpoint, same
     field names, explicit consent booleans, honeypot, mailto fallback.
     Consent NEVER gates submission — a form that refuses without the SMS box
     ticked fails carrier registration and reads as coerced consent. ─────── */
  var f = document.getElementById('leadForm'), btn = document.getElementById('submitBtn');
  f.addEventListener('submit', function(e){
    e.preventDefault();
    if(f.website.value) return;                        /* honeypot */
    var need = ['name','business','email'];
    for(var i=0;i<need.length;i++){
      if(!f[need[i]].value.trim()){ f[need[i]].focus(); return; }
    }
    btn.disabled = true; btn.textContent = 'Sending…';
    var payload = {
      name: f.name.value.trim(), business: f.business.value.trim(),
      type: f.type.value.trim(), email: f.email.value.trim(),
      phone: f.phone.value.trim(), message: f.message.value.trim(),
      source: ${JSON.stringify("lp:" + p.slug)},
      website: '',
      sms_consent:   document.getElementById('cSms').checked === true,
      email_consent: document.getElementById('cEmail').checked === true
    };
    fetch(${JSON.stringify(LEADS_ENDPOINT)}, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    }).then(function(r){ return r.json().catch(function(){ return {ok:r.ok}; }); })
      .then(function(res){ if(!res || res.ok !== true) throw new Error('rejected'); done(); })
      .catch(function(){
        var lines = 'Name: '+payload.name+'\\nBusiness: '+payload.business+
          '\\nType: '+payload.type+'\\nPhone: '+payload.phone+'\\nEmail: '+payload.email+
          '\\nOK to text: '+(payload.sms_consent?'yes':'no')+
          '\\nOK to email: '+(payload.email_consent?'yes':'no')+
          '\\nPage: '+payload.source+'\\n\\n'+payload.message;
        location.href = 'mailto:${EMAIL}?subject='+encodeURIComponent('New inquiry from '+payload.source)+
          '&body='+encodeURIComponent(lines);
        done();
      });
    function done(){ glass.setAttribute('data-sent',''); }
  });
})();
</script>
</body>
</html>
`;
  return { m, html };
}

/* ── guards ───────────────────────────────────────────────────────────── */
function assertClean(slug, html) {
  /* TREES output is NOT link-rewritten by cf/build.mjs and NOT covered by its
     leftover-link guard, so this is the only thing standing between a stale
     .html href and production. */
  const bad = html.match(/(href|content)="[^"]*\.html(#[^"]*)?"/g);
  if (bad) throw new Error(`${slug}: .html links must be clean URLs — ${bad.join(", ")}`);
  const rel = html.match(/(src|href)="assets\//g);
  if (rel) throw new Error(`${slug}: relative asset path would 404 at nested depth — use /assets/...`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) throw new Error(`${slug}: expected exactly one h1, found ${h1}`);
  for (const [, block] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block); } catch (e) { throw new Error(`${slug}: invalid JSON-LD — ${e.message}`); }
  }
}

/* ── write ────────────────────────────────────────────────────────────── */
const written = [];
for (const p of pages) {
  const { m, html } = render(p);
  assertClean(p.slug, html);
  const dir = path.join(ROOT, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  written.push({ url: m.url, kb: (Buffer.byteLength(html) / 1024).toFixed(1) });
  console.log(`page  ${m.url.padEnd(34)} ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

/* ── sitemap: rewrite the local block, leave every existing entry alone ─── */
const smPath = path.join(ROOT, "sitemap.xml");
let sm = fs.readFileSync(smPath, "utf8");
const MARK_A = "  <!-- local:start -->";
const MARK_B = "  <!-- local:end -->";
const today = process.env.KNOX_DATE || new Date().toISOString().slice(0, 10);
const block = [
  MARK_A,
  ...written.map(
    (w) =>
      `  <url><loc>${ORIGIN}${w.url}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${
        w.url === "/dupage-county/" ? "0.8" : w.url.split("/").length === 3 ? "0.7" : "0.6"
      }</priority></url>`
  ),
  MARK_B,
].join("\n");

sm = sm.includes(MARK_A)
  ? sm.replace(new RegExp(`${MARK_A}[\\s\\S]*?${MARK_B}`), block)
  : sm.replace("</urlset>", block + "\n</urlset>");
fs.writeFileSync(smPath, sm);

console.log(`\n${written.length} pages written · sitemap updated (${today})`);
