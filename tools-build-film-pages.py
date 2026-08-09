#!/usr/bin/env python3
"""Generate the three Vault film pages + the Screening Room hub.
Run from repo root: python3 thevault/films/build_pages.py"""
import html as H

FILMS = [
 dict(slug="get-found-first", num="01", title="Get Found First",
  tag="Why SEO puts your business in front of the customers already looking for you",
  desc="Over half of trackable website visits start with a search. This forty-second film shows why the first result wins, how every page Google reads becomes another doorway to your business, and why seventy-six percent of nearby searchers visit a business within a day.",
  upload="2026-08-09",
  stats=[
   ("Over half of trackable website visits come from organic search (53.3%).",
    "BrightEdge — Channel Share Report", "https://www.brightedge.com/resources/research-reports/channel_share"),
   ("The #1 Google result averages 27.6% of clicks; only 0.63% of searchers click anything on page two.",
    "Backlinko / Semrush — Google CTR Stats (4M results)", "https://backlinko.com/google-ctr-stats"),
   ("76% of people who search for something nearby on their phone visit a business within a day; 28% of those searches end in a purchase.",
    "Google / Purchased Digital Diary (2016)", "https://www.thinkwithgoogle.com/_qs/documents/620/mobile-search-trends-consumers-to-stores.pdf"),
  ],
  cta_line="Project Knox builds the pages Google reads — the site, the profile, the booking engine, all behind one door.",
 ),
 dict(slug="the-text-that-shows-up", num="02", title="The Text That Shows Up",
  tag="Why customers who get a text reminder actually show up for their appointments",
  desc="About one booked appointment in five never shows. This forty-second film shows what the no-show really costs, why a single friendly text cuts no-shows by about a quarter, and how Project Knox sends every reminder automatically while you run the shop.",
  upload="2026-08-09",
  stats=[
   ("Text reminders cut no-shows by about a quarter — from 21% to 15% across twenty-one clinical trials with more than 16,000 patients.",
    "Robotham et al., BMJ Open (2016)", "https://bmjopen.bmj.com/content/6/10/e012116"),
   ("74% of people read a new text within five minutes of receiving it.",
    "SimpleTexting — Texting & SMS Marketing Statistics (2026 survey)", "https://simpletexting.com/blog/texting-and-sms-marketing-statistics/"),
   ("Missed appointments cost England's NHS more than 15 million GP visits and £216M+ every year — the scale of the empty-chair problem.",
    "NHS England (2019)", "https://www.england.nhs.uk/2019/01/missed-gp-appointments-costing-nhs-millions/"),
  ],
  cta_line="Project Knox texts every customer automatically — booked, reminded, remembered — so more of your schedule stays paid.",
 ),
 dict(slug="say-it-back", num="03", title="Say It Back",
  tag="How Google reviews get you found — and why answering them fast wins the customer",
  desc="Ninety-seven percent of people read reviews for local businesses. This forty-second film shows how the words inside your reviews work like search signals, why customers watch how you reply, and how instant review responses turn readers into callers.",
  upload="2026-08-09",
  stats=[
   ("97% of consumers read reviews for local businesses, and Google is the review platform they use most (71%).",
    "BrightLocal — Local Consumer Review Survey (2026)", "https://www.brightlocal.com/research/local-consumer-review-survey/"),
   ("Local-search experts rate review signals among the top local ranking factors — star rating, review count, recency, and the keywords inside reviews.",
    "Whitespark — Local Search Ranking Factors (2026)", "https://whitespark.ca/local-search-ranking-factors/"),
   ("Google's own guidance: “More reviews and positive ratings can help your business's local ranking.” 80% of consumers say they would use a business that responds to all its reviews.",
    "Google Business Profile Help · BrightLocal (2026)", "https://support.google.com/business/answer/7091?hl=en"),
  ],
  cta_line="Project Knox asks for the review and posts your reply within minutes, day and night.",
 ),
]

HEAD_CSS = """
@font-face{font-family:'Cinzel';src:url('/assets/fonts/Cinzel-600.woff2') format('woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-300.woff2') format('woff2');font-weight:300;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-400.woff2') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Inter';src:url('/assets/fonts/Inter-500.woff2') format('woff2');font-weight:500;font-display:swap}
:root{--night:#0B1026;--black:#05070F;--gold:#C9A961;--struck:#E8CE93;--ivory:#F2EFE8;--steel:#8A93A8;
 --line:rgba(201,169,97,.24);--ease:cubic-bezier(.2,.7,.2,1);--pad:clamp(20px,5vw,48px)}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--night);color:var(--ivory);font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
 font-weight:300;font-size:16.5px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img,video{max-width:100%;display:block;height:auto}
a{color:var(--gold);text-decoration:none}
.wrap{max-width:980px;margin:0 auto;padding:0 var(--pad)}
:focus-visible{outline:2px solid var(--struck);outline-offset:3px;border-radius:6px}
header{position:sticky;top:0;z-index:30;height:56px;display:flex;align-items:center;justify-content:space-between;
 padding:0 var(--pad);background:rgba(11,16,38,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.brand{display:inline-flex;align-items:center;gap:10px;color:var(--ivory)}
.brand img{width:32px;height:32px;border-radius:8px}
.brand b{font-family:'Cinzel',serif;font-weight:600;font-size:13px;letter-spacing:.2em;text-transform:uppercase}
header a.call{font-size:13px;color:var(--struck);display:inline-flex;align-items:center;min-height:44px}
.eyebrow{font-weight:500;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin:0 0 14px}
/* ── the gold wordmark hero (the WebGL type that used to float on the homepage) ── */
.filmHero{position:relative;overflow:hidden;background:
 radial-gradient(120% 90% at 50% 8%,#141b3a 0%,var(--night) 58%,var(--black) 100%)}
.filmHero .stage{position:absolute;inset:0;z-index:1;pointer-events:none}
.filmHero .stage canvas{position:absolute;inset:0;width:100%;height:100%}
.filmHero .heroInner{position:relative;z-index:2;text-align:center;padding:clamp(40px,7vw,84px) var(--pad) clamp(26px,4vw,44px)}
.wordmark{display:flex;flex-direction:column;align-items:center;line-height:.95;transition:opacity .9s var(--ease)}
.wordmark span{font-family:'Cinzel',serif;font-weight:600;font-size:clamp(12px,2.4vw,17px);letter-spacing:.58em;
 text-indent:.58em;color:var(--struck);text-transform:uppercase}
.wordmark b{font-family:'Cinzel',serif;font-weight:600;font-size:clamp(64px,15vw,140px);letter-spacing:.06em;
 background:linear-gradient(168deg,#F4E3B2 8%,#C9A961 38%,#8a6f35 62%,#E8CE93 88%);
 -webkit-background-clip:text;background-clip:text;color:transparent;
 filter:drop-shadow(0 10px 34px rgba(201,169,97,.30))}
.stage[data-cinema]~.heroInner .wordmark{opacity:0}
.filmHero h1{font-family:'Cinzel',serif;font-weight:600;margin:18px 0 8px;font-size:clamp(24px,5vw,40px);letter-spacing:.04em}
.filmHero .tag{color:#cfd4e0;max-width:640px;margin:0 auto}
@media (prefers-reduced-motion:reduce){.filmHero .stage{display:none}}
/* ── the player ── */
.screen{padding:clamp(18px,3vw,34px) 0 clamp(30px,5vw,52px)}
.player{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);
 box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 0 1px rgba(201,169,97,.06);background:#000}
.player video{width:100%;aspect-ratio:16/9;display:block}
.filmMeta{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin-top:14px;color:var(--steel);font-size:14px}
.filmMeta b{color:var(--struck);font-weight:500}
/* ── sources ── */
.sources{border-top:1px solid var(--line);padding:clamp(26px,4vw,44px) 0}
.sources h2{font-family:'Cinzel',serif;font-weight:600;font-size:20px;letter-spacing:.06em;margin:0 0 6px}
.sources p.note{color:var(--steel);font-size:14px;margin:0 0 18px}
.srcList{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.srcList li{border:1px solid rgba(138,147,168,.2);border-radius:12px;padding:14px 18px;background:rgba(255,255,255,.02)}
.srcList li p{margin:0 0 4px}
.srcList li a{font-size:14px;word-break:break-word}
/* ── CTA + other films ── */
.filmCta{border-top:1px solid var(--line);padding:clamp(26px,4vw,44px) 0;text-align:center}
.filmCta p{max-width:620px;margin:0 auto 18px;color:#cfd4e0}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 26px;border-radius:12px;
 background:linear-gradient(168deg,#F4E3B2,#C9A961 55%,#a8853f);color:#241a05;font-weight:500;letter-spacing:.02em}
.btn.ghost{background:none;border:1px solid var(--line);color:var(--struck)}
.ctaRow{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.others{border-top:1px solid var(--line);padding:clamp(26px,4vw,44px) 0 clamp(40px,6vw,64px)}
.others h2{font-family:'Cinzel',serif;font-weight:600;font-size:20px;letter-spacing:.06em;margin:0 0 18px}
.filmGrid{display:grid;gap:18px}
@media(min-width:760px){.filmGrid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}
.filmCard{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.02);
 transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s var(--ease)}
.filmCard:hover{transform:translateY(-4px);border-color:var(--gold);box-shadow:0 20px 60px rgba(201,169,97,.22)}
.filmCard img{width:100%;aspect-ratio:16/9;object-fit:cover}
.filmCard .cardCopy{padding:14px 16px 18px}
.filmCard i{font-style:normal;font-size:11px;letter-spacing:.24em;color:var(--gold);text-transform:uppercase}
.filmCard b{display:block;font-family:'Cinzel',serif;font-weight:600;font-size:18px;margin:6px 0 4px;color:var(--ivory)}
.filmCard span{color:var(--steel);font-size:14px}
footer{border-top:1px solid var(--line);padding:26px var(--pad) 44px;text-align:center;color:var(--steel);font-size:13.5px}
footer a{color:var(--struck)}
"""

CINEMA_JS = """
(function(){
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stage = document.getElementById('cinemaStage');
  if(!stage || RM || (navigator.connection && navigator.connection.saveData)) return;
  var probe = document.createElement('canvas');
  var gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if(!gl) return;
  var lose = gl.getExtension('WEBGL_lose_context'); if(lose) lose.loseContext();
  function loadEngine(){
    var sc = document.createElement('script');
    sc.src = '/assets/js/knox-cinema.min.js';
    sc.async = true;
    sc.onload = function(){
      if(window.KnoxCinema){
        window.__knoxCinema = window.KnoxCinema(stage, {
          fontUrl: '/assets/js/cinzel600.typeface.json',
          glbUrl: window.innerWidth >= 900 ? '/assets/3d/knox-emblem.glb' : null,
          dracoPath: '/assets/js/draco/'
        });
      }
    };
    document.head.appendChild(sc);
  }
  if('requestIdleCallback' in window) requestIdleCallback(loadEngine, {timeout:1800});
  else setTimeout(loadEngine, 900);
})();
"""

def esc(s): return H.escape(s, quote=True)

def film_page(f, others):
    url = f"https://getprojectknox.com/thevault/films/{f['slug']}"
    mp4 = f"https://getprojectknox.com/assets/films/{f['slug']}.mp4"
    poster = f"https://getprojectknox.com/assets/films/{f['slug']}-poster.jpg"
    ld = {
      "@context": "https://schema.org", "@type": "VideoObject",
      "@id": url + "#video",
      "name": f"{f['title']} — a Project Knox film",
      "description": f["desc"],
      "thumbnailUrl": poster,
      "contentUrl": mp4,
      "uploadDate": f["upload"],
      "duration": "PT40S",
      "inLanguage": "en-US",
      "publisher": {"@id": "https://getprojectknox.com/#business"},
      "isPartOf": {"@id": "https://getprojectknox.com/thevault#page"},
    }
    import json
    ld_json = json.dumps(ld, indent=2)
    srcs = "\n".join(
      f'      <li><p>{esc(claim)}</p><a href="{link}" target="_blank" rel="noopener">{esc(label)} &rarr;</a></li>'
      for claim, label, link in f["stats"])
    other_cards = "\n".join(f'''      <a class="filmCard" href="/thevault/films/{o['slug']}">
        <img src="/assets/films/{o['slug']}-poster.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async">
        <div class="cardCopy"><i>Film {o['num']} &middot; 40 seconds</i><b>{esc(o['title'])}</b><span>{esc(o['tag'])}</span></div>
      </a>''' for o in others)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8LBV2N9FTC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-8LBV2N9FTC');
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(f['title'])} &mdash; The Vault Films | Project Knox</title>
<meta name="description" content="{esc(f['desc'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="video.other">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(f['title'])} &mdash; The Vault Films | Project Knox">
<meta property="og:description" content="{esc(f['tag'])}">
<meta property="og:image" content="{poster}">
<meta property="og:video" content="{mp4}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="Project Knox">
<link rel="icon" href="/favicon.png" sizes="180x180">
<link rel="apple-touch-icon" href="/favicon.png">
<script type="application/ld+json">
{ld_json}
</script>
<style>{HEAD_CSS}</style>
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/knox-logo.png" alt="" width="32" height="32"><b>Project Knox</b></a>
  <a class="call" href="tel:+13312917400">(331) 291&#8209;7400</a>
</header>
<main>
<section class="filmHero">
  <div class="stage" id="cinemaStage" aria-hidden="true"></div>
  <div class="heroInner">
    <div class="wordmark" aria-hidden="true"><span>Project</span><b>KNOX</b></div>
    <p class="eyebrow">The Vault Films &middot; {f['num']} of 03</p>
    <h1>{esc(f['title'])}</h1>
    <p class="tag">{esc(f['tag'])}.</p>
  </div>
</section>

<section class="screen">
  <div class="wrap">
    <div class="player">
      <video controls preload="metadata" playsinline crossorigin="anonymous"
             poster="/assets/films/{f['slug']}-poster.jpg">
        <source src="/assets/films/{f['slug']}.mp4" type="video/mp4">
        <track kind="captions" src="/assets/films/{f['slug']}.vtt" srclang="en" label="English">
        Your browser can&rsquo;t play this video. <a href="/assets/films/{f['slug']}.mp4">Download it instead.</a>
      </video>
    </div>
    <div class="filmMeta">
      <span><b>40 seconds</b> &middot; captions on screen &middot; CC toggle in the player</span>
      <span>Every number in this film is real research &mdash; the sources are right below.</span>
    </div>
  </div>
</section>

<section class="sources">
  <div class="wrap">
    <h2>The receipts</h2>
    <p class="note">The statistics in this film, with the original research they come from.</p>
    <ul class="srcList">
{srcs}
    </ul>
  </div>
</section>

<section class="filmCta">
  <div class="wrap">
    <p>{esc(f['cta_line'])}</p>
    <div class="ctaRow">
      <a class="btn" href="/#contact">Talk to Knox &mdash; free consult</a>
      <a class="btn ghost" href="/thevault">Walk the Vault &mdash; six live demos</a>
      <a class="btn ghost" href="/#plans">Plans from $250/mo</a>
    </div>
  </div>
</section>

<section class="others">
  <div class="wrap">
    <h2>The other films</h2>
    <div class="filmGrid">
{other_cards}
    </div>
  </div>
</section>
</main>
<footer>
  Project Knox &middot; Glen Ellyn, Illinois &middot; <a href="tel:+13312917400">(331) 291&#8209;7400</a> &middot;
  <a href="https://getprojectknox.com/">getprojectknox.com</a>
</footer>
<script>{CINEMA_JS}</script>
</body>
</html>
"""

def hub_page():
    import json
    cards = "\n".join(f'''      <a class="filmCard" href="/thevault/films/{f['slug']}">
        <img src="/assets/films/{f['slug']}-poster.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async">
        <div class="cardCopy"><i>Film {f['num']} &middot; 40 seconds</i><b>{esc(f['title'])}</b><span>{esc(f['tag'])}</span></div>
      </a>''' for f in FILMS)
    ld = {
      "@context": "https://schema.org", "@type": "CollectionPage",
      "@id": "https://getprojectknox.com/thevault/films#page",
      "url": "https://getprojectknox.com/thevault/films",
      "name": "The Vault Films — three 40-second films on growing a local business",
      "isPartOf": {"@id": "https://getprojectknox.com/#website"},
      "publisher": {"@id": "https://getprojectknox.com/#business"},
      "inLanguage": "en-US",
      "mainEntity": {"@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": i+1, "name": f["title"],
         "url": f"https://getprojectknox.com/thevault/films/{f['slug']}"} for i, f in enumerate(FILMS)]},
    }
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8LBV2N9FTC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-8LBV2N9FTC');
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Vault Films &mdash; Three 40&#8209;Second Films | Project Knox</title>
<meta name="description" content="Three 40-second films on what actually grows a local business: getting found on Google, text reminders that keep appointments full, and reviews that ring your phone. Real research, cited under every film.">
<link rel="canonical" href="https://getprojectknox.com/thevault/films">
<meta property="og:type" content="website">
<meta property="og:url" content="https://getprojectknox.com/thevault/films">
<meta property="og:title" content="The Vault Films | Project Knox">
<meta property="og:description" content="Three 40-second films on what actually grows a local business — with the research to back every number.">
<meta property="og:image" content="https://getprojectknox.com/assets/films/get-found-first-poster.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="Project Knox">
<link rel="icon" href="/favicon.png" sizes="180x180">
<link rel="apple-touch-icon" href="/favicon.png">
<script type="application/ld+json">
{json.dumps(ld, indent=2)}
</script>
<style>{HEAD_CSS}</style>
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/knox-logo.png" alt="" width="32" height="32"><b>Project Knox</b></a>
  <a class="call" href="tel:+13312917400">(331) 291&#8209;7400</a>
</header>
<main>
<section class="filmHero">
  <div class="stage" id="cinemaStage" aria-hidden="true"></div>
  <div class="heroInner">
    <div class="wordmark" aria-hidden="true"><span>Project</span><b>KNOX</b></div>
    <p class="eyebrow">The Vault &middot; Screening Room</p>
    <h1>Three films. Forty seconds each.</h1>
    <p class="tag">Why customers can&rsquo;t find you, why they don&rsquo;t show up, and why they pick the other shop &mdash; and what fixes all three. Every number cited below its film.</p>
  </div>
</section>

<section class="others" style="border-top:0">
  <div class="wrap">
    <div class="filmGrid">
{cards}
    </div>
  </div>
</section>

<section class="filmCta">
  <div class="wrap">
    <p>Everything the films describe &mdash; the pages Google reads, the reminders that show up, the reviews answered in minutes &mdash; is what Project Knox runs for local businesses, from $250 a month.</p>
    <div class="ctaRow">
      <a class="btn" href="/#contact">Talk to Knox &mdash; free consult</a>
      <a class="btn ghost" href="/thevault">Walk the Vault &mdash; six live demos</a>
    </div>
  </div>
</section>
</main>
<footer>
  Project Knox &middot; Glen Ellyn, Illinois &middot; <a href="tel:+13312917400">(331) 291&#8209;7400</a> &middot;
  <a href="https://getprojectknox.com/">getprojectknox.com</a>
</footer>
<script>{CINEMA_JS}</script>
</body>
</html>
"""

import os
here = os.path.dirname(os.path.abspath(__file__))
for i, f in enumerate(FILMS):
    others = [o for o in FILMS if o is not f]
    open(os.path.join(here, f["slug"] + ".html"), "w").write(film_page(f, others))
open(os.path.join(here, "index.html"), "w").write(hub_page())
print("wrote", ", ".join(f["slug"] + ".html" for f in FILMS), "and index.html")
