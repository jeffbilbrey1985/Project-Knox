# getprojectknox.com

The live site. **Cloudflare Workers is the origin now — not GitHub Pages.**

## Where the site actually runs

| | |
|---|---|
| Origin | Cloudflare Worker `knox-site` (Workers Static Assets) |
| Account | `9947123923527e8d6dbb9c5b80c19ead` |
| Zone | `getprojectknox.com` (`30a5e3c67a844963f1dea00844d42725`) |
| Custom domains | `getprojectknox.com`, `www.getprojectknox.com` |
| DNS | Cloudflare-managed `AAAA 100::` placeholders, proxied — created and owned by wrangler |

This repo is the **source of truth and the hot standby**. Every page here uses
`.html` links, so if Cloudflare ever has to be abandoned you can re-point the
apex at GitHub Pages and the site works unchanged. The Cloudflare build rewrites
those to clean URLs at deploy time.

## Deploying a change

```
# 1. edit the page here
# 2. build the clean-URL copy and ship it
node cf/build.mjs          # reads this repo, writes cf-site/dist
cd cf-site && npx wrangler deploy
```

`cf/build.mjs` rewrites `privacy.html` → `/privacy` (and the same for
`sms-terms`, `thevault`, `index`) in both `href`s and the absolute canonical /
`og:url` tags, then **throws if a single stale `.html` link survives**. That
check is the whole point of the script: the site used to exist as two
hand-maintained copies and they drifted.

`cf/wrangler.jsonc` sets `html_handling: "auto-trailing-slash"` (so `/privacy`
is canonical and `/privacy.html` 307s to it) and `not_found_handling:
"404-page"` (so a bad URL gets the branded 404, not Cloudflare's).

## Routes

| URL | File |
|---|---|
| `/` | `index.html` |
| `/thevault` | `thevault.html` |
| `/privacy` | `privacy.html` |
| `/sms-terms` | `sms-terms.html` |
| anything else | `404.html`, with a real 404 status |

## The Vault

`/thevault` is the only way into the demos. The homepage links **no demo
directly** — the door button and all four teaser chips land on `/thevault`
(the chips deep-link to `#chops`, `#guac`, `#knocks`, `#crm`). That's enforced
by a test, because the demo list on the homepage was exactly the thing that let
visitors skip the vault.

## Tests

```
node test/verify.mjs           # 41 assertions on the homepage
node test/verify-vault.mjs     # 12 assertions on /thevault + the funnel
VERIFY_ROOT=/home/claude/cf-site/dist node test/verify.mjs   # test what ships
```

Both run headless Chromium against a local static server that mimics the
Worker's URL handling. They cover the failure modes that actually bit this site:

- reveals must read `armed` **before** any scrolling — a dead reveal engine
  leaves cards invisible *and unclickable*
- with JavaScript off, **nothing** may be hidden (all copy is CSS-visible by
  default; `:root[data-js]` opts into the animation)
- with reduced motion on, **zero** video bytes are fetched
- no motion graphic sits letterboxed in a too-tall box
- the form posts to `/api/leads`, never the mail relay that writes no rows
- both consent boxes ship unchecked and neither is required to submit
- no "AI" wording, no solo-operator framing, no old phone number

## Weight

**309 KB on first load on a phone.** The 3 MB of voiceover streams only when
Knox actually speaks; the motion graphics load when scrolled into view. Reduced
motion or JS off fetches zero video bytes.

## Ask Knox

A deterministic knowledge base of ~37 questions, written into `index.html`.
It cannot invent a client, quote a price that isn't $250/$500/$1,000, or promise
a Google ranking. When it doesn't know, it says so and hands off to the phone.

To edit an answer, search `index.html` for `var KB = [` — each entry is a list of
trigger keywords and the answer text.

Now that the site is on Workers, putting a real model behind it is a one-file
change; the knowledge base and the guardrails are already written, in
`ask-knox-chatbot-brain.md` in the project.

## The contact form

Posts to `https://knox-crm.higgsfield.app/api/leads` with
`{name, business, type, email, phone, message, source, website, sms_consent, email_consent}`.
Verified end to end — a test lead landed in the CRM. If the POST fails it falls
back to a prefilled email so a lead is never silently lost.

The SMS consent disclosure string in the page is **byte-identical** to
`SMS_CONSENT_DISCLOSURE` in the CRM (`app/src/routes/api.leads.ts`, version
`2026-08-03b`). If you change one, change the other — the stored consent record
is only a defense if it quotes what the person actually saw.

## Still open

1. **Fortune 500 years** — the copy doesn't state a number. Say the word.
2. **Exit terms before month 12** — a real early-exit policy converts better
   than a defended term.
3. **Two updates a month** — what happens on the third? Ask Knox punts today.
4. **What "24/7" means on Enterprise** — if a human callback has a window, say so.
5. **Registered legal entity name** for the 10DLC campaign registration.
6. **Does the Enterprise phone line record calls?** Illinois is an all-party
   consent state (720 ILCS 5/14-2) and getting this wrong is a Class 4 felony.
   If it records, it must announce that it records.

No client is named anywhere on this site and no photograph of Jeff appears on it.
