#!/usr/bin/env node
/**
 * build.mjs — assemble cf-site/dist from /home/claude/build.
 *
 * The Worker serves dist/ with html_handling:"auto-trailing-slash", so
 * /privacy is the canonical URL and /privacy.html 307s to it. Every
 * in-page link is rewritten to the clean form here, in one place, so the
 * two copies of the site can never drift apart by hand again.
 */
import fs from "node:fs";
import path from "node:path";

// SRC is the repo root (pages with .html links, the GitHub Pages standby).
// DIST is what wrangler uploads. Override either with an env var.
// ── HOW THIS RUNS IN WORKERS BUILDS ────────────────────────────────────────
// Cloudflare builds this repo on every push to main. The dashboard's build
// command sets BOTH variables explicitly:
//
//   KNOX_SRC=. KNOX_DIST=cf/dist node cf/build.mjs
//   npx wrangler deploy --config cf/wrangler.jsonc
//
// Neither is optional. The defaults below are absolute paths from the machine
// this script was written on and exist nowhere else, so a build that forgets
// them reads from a directory that is not there. And the deploy MUST carry
// --config: wrangler.jsonc lives in cf/, not at the repo root, and its
// `main` and `assets.directory` resolve relative to itself — pointing wrangler
// anywhere else silently drops src/router.js, which is what serves all seven
// /thevault/<demo> mounts.
const SRC = process.env.KNOX_SRC || "/home/claude/build";
const DIST = process.env.KNOX_DIST || "/home/claude/cf-site/dist";

/** Pages copied with link rewriting. */
const PAGES = ["index.html", "privacy.html", "sms-terms.html", "thevault.html", "404.html"];

/** Copied byte-for-byte. */
const VERBATIM = ["favicon.png", "robots.txt", "sitemap.xml", "_headers"];

/** Asset trees copied wholesale. */
const TREES = ["assets"];

const CLEAN = [
  // Absolute self-references first: canonical, og:url, sitemap entries.
  [/https:\/\/getprojectknox\.com\/index\.html/g, "https://getprojectknox.com/"],
  [/https:\/\/getprojectknox\.com\/(privacy|sms-terms|thevault)\.html/g, "https://getprojectknox.com/$1"],
  [/href="privacy\.html"/g, 'href="/privacy"'],
  [/href="\/privacy\.html"/g, 'href="/privacy"'],
  [/href="sms-terms\.html"/g, 'href="/sms-terms"'],
  [/href="\/sms-terms\.html"/g, 'href="/sms-terms"'],
  // Fragments matter: the homepage teaser chips deep-link to /thevault#chops.
  [/href="\/?thevault\.html(#[a-z-]*)?"/g, 'href="/thevault$1"'],
  [/href="index\.html"/g, 'href="/"'],
];

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyTree(a, b);
    else fs.copyFileSync(a, b);
  }
}

fs.mkdirSync(DIST, { recursive: true });

for (const p of PAGES) {
  const src = path.join(SRC, p);
  if (!fs.existsSync(src)) {
    console.warn(`skip (missing): ${p}`);
    continue;
  }
  let html = fs.readFileSync(src, "utf8");
  for (const [re, to] of CLEAN) html = html.replace(re, to);

  // A stale .html link left anywhere is a 307 the visitor pays for.
  const leftover = html.match(/(href|content)="[^"]*(privacy|sms-terms|thevault|index)\.html"/g);
  if (leftover) throw new Error(`${p}: unrewritten links ${leftover.join(", ")}`);

  fs.writeFileSync(path.join(DIST, p), html);
  console.log(`page     ${p}  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

for (const f of VERBATIM) {
  // _headers is Cloudflare-only config and lives in cf/ in the repo, but at
  // the source root in the working tree. Look in both, or a fresh clone
  // deploys without it and silently loses the immutable font caching.
  const src = [path.join(SRC, f), path.join(SRC, "cf", f)].find((p) => fs.existsSync(p));
  if (!src) {
    console.warn(`skip (missing): ${f}`);
    continue;
  }
  fs.copyFileSync(src, path.join(DIST, f));
  console.log(`verbatim ${f}`);
}

for (const t of TREES) {
  const src = path.join(SRC, t);
  if (!fs.existsSync(src)) continue;
  copyTree(src, path.join(DIST, t));
  console.log(`tree     ${t}/`);
}

console.log("dist ready");
