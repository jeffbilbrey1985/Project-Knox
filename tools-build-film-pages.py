#!/usr/bin/env python3
"""Generate the three Vault film pages + the Screening Room hub.
Run from repo root: python3 tools-build-film-pages.py (writes thevaultfilms/), then cf/build.mjs"""
import html as H

FILMS = [
 dict(slug="get-found-first", num="01", title="Get Found First",
  tag="Why SEO puts your business in front of the customers already looking for you",
  desc="What is SEO, really? This forty-second film explains it in plain English: how Google learns your business exists, why the first result takes one click in four, and how every helpful page you publish becomes another way to outrank the shop across town.",
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

# The feature presentation — the full Project Knox story. No stats section
# (it's a story, not a lesson), no caption track yet, its own duration and
# billing. Shares the same page template through the .get() defaults below.
LEDGER = dict(slug="the-great-ledger", num="&#9733;", title="The Great Ledger",
 tag="The whole Project Knox story &mdash; what we build, how it works, and why your shop belongs in the ledger",
 desc="The full Project Knox story in five minutes. Step inside the vault with the Keeper: the website that's actually yours, the Google profile that gets you found, the bookings, reminders and reviews that keep the ledger full — and what it all costs, in plain English.",
 upload="2026-08-19",
 stats=[],
 cta_line="Everything in the film — the site, the profile, the bookings, the reviews — is one system, built and run by Knox from $250 a month.",
 eyebrow="The Feature Presentation",
 iso_dur="PT5M4S",
 card_label="The Story &middot; 5 minutes",
 meta_html="<span><b>5 minutes</b> &middot; sound on &mdash; anything else playing on the page steps aside</span>\n      <span>Share this page: <b>getprojectknox.com/ledger</b></span>",
 vtt=False,
)

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
.filmHero.withScene::before{content:"";position:absolute;inset:0;z-index:0;
 background:url('/assets/img/vault/cinema-backdrop.webp') center 38%/cover no-repeat;
 opacity:.42;filter:saturate(.9)}
.filmHero.withScene::after{content:"";position:absolute;inset:0;z-index:0;
 background:radial-gradient(120% 100% at 50% 0%,rgba(11,16,38,.2) 0%,rgba(11,16,38,.82) 62%,var(--night) 100%)}
.filmHero .stage{position:absolute;top:0;left:0;right:0;height:clamp(200px,40vw,330px);z-index:1;pointer-events:none}
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
.playCover{position:absolute;inset:0;display:grid;place-items:center;cursor:pointer;border:0;padding:0;
 background:radial-gradient(80% 80% at 50% 50%,rgba(5,7,15,0) 40%,rgba(5,7,15,.42) 100%);
 transition:opacity .4s var(--ease)}
.playCover span{width:86px;height:86px;border-radius:50%;display:grid;place-items:center;
 background:rgba(11,16,38,.58);border:2px solid var(--gold);backdrop-filter:blur(4px);
 box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 30px rgba(201,169,97,.35);transition:transform .3s var(--ease)}
.playCover:hover span,.playCover:focus-visible span{transform:scale(1.1)}
.playCover svg{width:30px;height:30px;fill:var(--struck);margin-left:5px}
.playCover[data-gone]{opacity:0;pointer-events:none}
.playCover[hidden]{display:none}   /* explicit display beats the hidden attribute */
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
.filmCard .thumb{position:relative}
.filmCard .playBadge{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.filmCard .playBadge span{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;
 background:rgba(11,16,38,.58);border:2px solid var(--gold);backdrop-filter:blur(3px);
 transition:transform .3s var(--ease)}
.filmCard:hover .playBadge span{transform:scale(1.12)}
.filmCard .playBadge svg{width:20px;height:20px;fill:var(--struck);margin-left:3px}
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
    cinema_js = CINEMA_JS.replace("window.innerWidth >= 900 ? '/assets/3d/knox-emblem.glb' : null", 'null')
    url = f"https://getprojectknox.com/thevaultfilms/{f['slug']}"
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
      "duration": f.get("iso_dur", "PT40S"),
      "inLanguage": "en-US",
      "publisher": {"@id": "https://getprojectknox.com/#business"},
      "isPartOf": {"@id": "https://getprojectknox.com/thevaultfilms/#page"},
    }
    import json
    ld_json = json.dumps(ld, indent=2)
    srcs = "\n".join(
      f'      <li><p>{esc(claim)}</p><a href="{link}" target="_blank" rel="noopener">{esc(label)} &rarr;</a></li>'
      for claim, label, link in f["stats"])
    sources_html = f"""
<section class="sources">
  <div class="wrap">
    <h2>The receipts</h2>
    <p class="note">The statistics in this film, with the original research they come from.</p>
    <ul class="srcList">
{srcs}
    </ul>
  </div>
</section>
""" if f["stats"] else ""
    other_cards = "\n".join(f'''      <a class="filmCard" href="/thevaultfilms/{o['slug']}">
        <div class="thumb"><img src="/assets/films/{o['slug']}-poster.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async">
        <div class="playBadge" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div></div>
        <div class="cardCopy"><i>{o.get('card_label', "Film " + o['num'] + " &middot; 40 seconds")}</i><b>{esc(o['title'])}</b><span>{esc(o['tag'])}</span></div>
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
<script src="/assets/js/knox-audio.js"></script>
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
    <p class="eyebrow">{f.get('eyebrow', "The Vault Films &middot; " + f['num'] + " of 03")}</p>
    <h1>{esc(f['title'])}</h1>
    <p class="tag">{esc(f['tag'])}.</p>
  </div>
</section>

<section class="screen">
  <div class="wrap">
    <div class="player">
      <video controls preload="metadata" playsinline{' crossorigin="anonymous"' if f.get('vtt', True) else ''}
             poster="/assets/films/{f['slug']}-poster.jpg">
        <source src="/assets/films/{f['slug']}.mp4" type="video/mp4">
        {f'<track kind="captions" src="/assets/films/{f["slug"]}.vtt" srclang="en" label="English">' if f.get('vtt', True) else ''}
        Your browser can&rsquo;t play this video. <a href="/assets/films/{f['slug']}.mp4">Download it instead.</a>
      </video>
      <button class="playCover" id="playCover" hidden aria-label="Play {esc(f['title'])}">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
      </button>
    </div>
    <div class="filmMeta">
      {f.get('meta_html', '<span><b>40 seconds</b> &middot; captions on screen &middot; CC toggle in the player</span>' + chr(10) + '      <span>Every number in this film is real research &mdash; the sources are right below.</span>')}
    </div>
  </div>
</section>
{sources_html}
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

<script>
(function(){{
  var v = document.querySelector('.player video');
  var c = document.getElementById('playCover');
  if(!v || !c) return;
  /* JS present: swap native controls for the branded cover. Without JS the
     cover stays hidden and the native player works untouched. */
  v.removeAttribute('controls');
  c.hidden = false;
  function dismiss(){{
    c.setAttribute('data-gone','');
    v.setAttribute('controls','');
    setTimeout(function(){{ c.hidden = true; }}, 420); /* after the fade */
  }}
  c.addEventListener('click', function(){{
    dismiss();
    v.focus();
    var p = v.play(); if(p && p.catch) p.catch(function(){{}});
  }});
  v.addEventListener('play', dismiss);
}})();
</script>
<script>{cinema_js}</script>
</body>
</html>
"""

def hub_page():
    cinema_js = CINEMA_JS.replace("window.innerWidth >= 900 ? '/assets/3d/knox-emblem.glb' : null", 'null')
    import json
    cards = "\n".join(f'''      <a class="filmCard" href="/thevaultfilms/{f['slug']}">
        <div class="thumb"><img src="/assets/films/{f['slug']}-poster.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async">
        <div class="playBadge" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></div></div>
        <div class="cardCopy"><i>Film {f['num']} &middot; 40 seconds</i><b>{esc(f['title'])}</b><span>{esc(f['tag'])}</span></div>
      </a>''' for f in FILMS)
    ld = {
      "@context": "https://schema.org", "@type": "CollectionPage",
      "@id": "https://getprojectknox.com/thevaultfilms/#page",
      "url": "https://getprojectknox.com/thevaultfilms/",
      "name": "The Vault Films — the Project Knox story plus three 40-second films",
      "isPartOf": {"@id": "https://getprojectknox.com/#website"},
      "publisher": {"@id": "https://getprojectknox.com/#business"},
      "inLanguage": "en-US",
      "mainEntity": {"@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": i+1, "name": f["title"],
         "url": f"https://getprojectknox.com/thevaultfilms/{f['slug']}"} for i, f in enumerate([LEDGER] + FILMS)]},
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
<title>The Vault Films &mdash; The Project Knox Story + Three 40&#8209;Second Films</title>
<meta name="description" content="The Great Ledger — the whole Project Knox story in five minutes — plus three 40-second films on what actually grows a local business: getting found on Google, text reminders, and reviews. Real research, cited under every film.">
<link rel="canonical" href="https://getprojectknox.com/thevaultfilms/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://getprojectknox.com/thevaultfilms/">
<meta property="og:title" content="The Vault Films | Project Knox">
<meta property="og:description" content="The whole Project Knox story in five minutes, plus three 40-second films — with the research to back every number.">
<meta property="og:image" content="https://getprojectknox.com/assets/films/the-great-ledger-poster.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:site_name" content="Project Knox">
<link rel="icon" href="/favicon.png" sizes="180x180">
<link rel="apple-touch-icon" href="/favicon.png">
<script type="application/ld+json">
{json.dumps(ld, indent=2)}
</script>
<style>{HEAD_CSS}</style>
<script src="/assets/js/knox-audio.js"></script>
</head>
<body>
<header>
  <a class="brand" href="/"><img src="/knox-logo.png" alt="" width="32" height="32"><b>Project Knox</b></a>
  <a class="call" href="tel:+13312917400">(331) 291&#8209;7400</a>
</header>
<main>
<section class="filmHero withScene">
  <div class="stage" id="cinemaStage" aria-hidden="true"></div>
  <div class="heroInner">
    <div class="wordmark" aria-hidden="true"><span>Project</span><b>KNOX</b></div>
    <p class="eyebrow">The Vault &middot; Screening Room</p>
    <h1>First the story. Then the lessons.</h1>
    <p class="tag">The Great Ledger tells the whole Project Knox story in five minutes. Below it, three forty-second films on why the work matters &mdash; every number cited.</p>
  </div>
</section>

<section class="screen" aria-label="The Great Ledger — the feature presentation">
  <div class="wrap">
    <p class="eyebrow" style="text-align:center">The Feature Presentation &middot; 5 minutes</p>
    <div class="player">
      <video controls preload="metadata" playsinline
             poster="/assets/films/the-great-ledger-poster.jpg">
        <source src="/assets/films/the-great-ledger.mp4" type="video/mp4">
        Your browser can&rsquo;t play this video. <a href="/assets/films/the-great-ledger.mp4">Download it instead.</a>
      </video>
      <button class="playCover" id="playCover" hidden aria-label="Play The Great Ledger">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
      </button>
    </div>
    <div class="filmMeta">
      <span><b>The Great Ledger</b> &middot; the whole Project Knox story &middot; sound on</span>
      <span>Its own page to share: <a href="/thevaultfilms/the-great-ledger"><b>getprojectknox.com/ledger</b></a></span>
    </div>
  </div>
</section>

<section class="others" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <h2>The three lessons &mdash; forty seconds each</h2>
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

<script>
(function(){{
  var v = document.querySelector('.player video');
  var c = document.getElementById('playCover');
  if(!v || !c) return;
  v.removeAttribute('controls');
  c.hidden = false;
  function dismiss(){{
    c.setAttribute('data-gone','');
    v.setAttribute('controls','');
    setTimeout(function(){{ c.hidden = true; }}, 420);
  }}
  c.addEventListener('click', function(){{
    dismiss();
    v.focus();
    var p = v.play(); if(p && p.catch) p.catch(function(){{}});
  }});
  v.addEventListener('play', dismiss);
}})();
</script>
<script>{cinema_js}</script>
</body>
</html>
"""

import os
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'thevaultfilms')
os.makedirs(here, exist_ok=True)
for i, f in enumerate(FILMS):
    # each short cross-sells its two siblings, then the feature presentation
    others = [o for o in FILMS if o is not f] + [LEDGER]
    open(os.path.join(here, f["slug"] + ".html"), "w").write(film_page(f, others))
open(os.path.join(here, LEDGER["slug"] + ".html"), "w").write(film_page(LEDGER, FILMS))
open(os.path.join(here, "index.html"), "w").write(hub_page())
print("wrote", ", ".join(f["slug"] + ".html" for f in FILMS + [LEDGER]), "and index.html")
