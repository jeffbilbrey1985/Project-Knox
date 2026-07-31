# getprojectknox.com — the rebuilt site

Drop-in replacement for the current `index.html`. No build step, no dependencies,
no server. GitHub Pages will ship it about 40 seconds after you commit.

## How to put it live

1. In your `jeffbilbrey1985/Project-Knox` repo, replace `index.html` with the one
   in this folder.
2. Copy the whole `assets/` folder into the repo root.
3. **Keep your existing `CNAME` file** — don't delete it, that's what holds the
   custom domain.
4. Commit and push to `main`.

Your repo root should end up looking like this:

```
CNAME
index.html          ← replaced
robots.txt          ← keep yours
sitemap.xml         ← keep yours
assets/
  fonts/    7 files   228 KB   self-hosted Cinzel, Cormorant Garamond, Inter
  img/      4 files   180 KB   vault door + interior, landscape and portrait
  motion/   9 files   604 KB   three Remotion pieces (webm + mp4 + poster each)
  vo/       5 files   3.0 MB   Arthur's voiceover clips
```

Old files you can delete once it's live: `knox-logo.png`, `vault-frame.jpg`,
`knox-demos-poster.jpg`, `knox-vault-reveal.mp4`.

## Weight

**309 KB on first load on a phone.** The 3 MB of voiceover only downloads when
someone actually taps a listen button, and the motion graphics only download
when they scroll into view. A visitor with reduced motion turned on, or with
JavaScript off, fetches **zero** video bytes and zero door-plate bytes — the
posters and the interior photograph are the whole graphic.

## The one thing to check

The contact form posts to your CRM at
`https://knox-crm.higgsfield.app/api/demo-lead`. I matched the payload to the
pattern the demos use, but **I could not verify the field names against the
live endpoint**, so please submit the form once and confirm the row lands in the
CRM the way you expect.

If it fails for any reason, the form falls back to opening a prefilled email to
`jeffbilbrey@getprojectknox.com` — so a lead is never silently lost — but you'd
want the CRM path working properly.

## Ask Knox

The chatbot answers from a fixed knowledge base of ~35 questions written into
`index.html`. It is **deterministic** — it cannot invent a client, quote a price
that isn't $250/$500/$1,000, or promise you a Google ranking. When it doesn't
know something it says so and hands off to your phone number.

That's a deliberate choice for a static site: there's no server here to run a
language model, and for a marketing FAQ the guaranteed-correct version is worth
more than the clever one. When the site moves to Cloudflare (per the migration
plan) it becomes a one-file swap to put Claude behind it — the knowledge base
and the guardrails are already written, in
`ask-knox-chatbot-brain.md` in the project.

To edit an answer: search `index.html` for `var KB = [`. Each entry is a list of
trigger keywords and the answer text.

## Things I still need from you

Everything on the page is true as it stands. These would each make it stronger:

1. **Your Fortune 500 years.** The copy says "I spent my career building systems
   inside Fortune 500 companies." If you want a number in there, say the word.
2. **The exit terms.** The 12-month band says what it says. If you'd let someone
   out early, that converts *better* than a defended term — tell me the real
   policy and I'll write it.
3. **Two updates a month:** what happens on the third? Ask Knox punts to you on
   that one right now, deliberately.
4. **What "24/7" means on Enterprise.** The A.I. phone line answers around the
   clock — but if a human callback has a stated window, the bot should say so.

**No client is named anywhere on this site, and no photograph of you appears on
it.** The page makes its case with the six working demos, the written agreement,
and a phone number that rings a person. That's the whole argument, and every
word of it is checkable.

## What changed from the old site

Gone: the six emoji service cards, the seven industry chips, the three stat
counters that said "0", the "Fortune 500 pedigree" badges, the spinning 3D
object, the autoplay hero video, the `$500` headline that contradicted the
pricing, and the personal Gmail address.

Added: your phone number in four places, a sticky Call / Enter the Vault bar on
mobile, real ownership language, and a hero that makes the argument instead of
decorating it.

Twelve sections became six. The Vault is now the single biggest moment on the
page after the hero — one door, one button, no way to skip past it into a demo
list.
