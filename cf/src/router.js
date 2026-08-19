/**
 * knox-site — the marketing site, plus the front door for the seven demos.
 *
 * Every demo used to live on its own *.higgsfield.app host. They now run as
 * separate Workers in Jeff's account and are mounted as PATHS under this one
 * site, because Google treats a subdomain as a separate property that builds
 * authority from zero while a path pools it all onto getprojectknox.com.
 *
 * The demos are reached through SERVICE BINDINGS, not public hostnames. That
 * is deliberate:
 *   - the apex is a Custom Domain for this Worker, and a Custom Domain claims
 *     the whole hostname — a Route on the same host for a different Worker
 *     conflicts, so there is no route-precedence answer here;
 *   - a service binding is same-runtime dispatch, so there is no extra network
 *     hop and no second TLS handshake;
 *   - the demo Workers need no public hostname at all, so there is no second
 *     URL for a visitor (or a crawler) to find the same content at.
 *
 * Each demo is BUILT with its mount as its basepath, so it already emits
 * /thevault/<slug>/... for every asset and every server-function call. This
 * router therefore forwards the request UNCHANGED — no prefix stripping, no
 * URL rewriting, nothing to keep in sync.
 */

/** Mount prefix → service binding. Order does not matter; prefixes are disjoint. */
const MOUNTS = [
  ["/thevault/barbershop", "BARBERSHOP"],
  ["/thevault/restaurant", "RESTAURANT"],
  ["/thevault/auto-repair", "AUTO_REPAIR"],
  ["/thevault/nail-salon", "NAIL_SALON"],
  ["/thevault/chiropractor", "CHIROPRACTOR"],
  ["/thevault/lawn-care", "LAWN_CARE"],
  ["/thevault/crm", "CRM_DEMO"],
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // The share link Jeff hands to prospects: short enough to say on a phone
    // call, permanent home on the film's real page. 301 keeps one canonical URL.
    if (pathname === "/ledger" || pathname === "/ledger/") {
      url.pathname = "/thevaultfilms/the-great-ledger";
      return Response.redirect(url.toString(), 301);
    }

    // The Screening Room moved out of the Vault: /thevault/films* → /thevaultfilms*.
    // 301 so search engines transfer the old URLs' standing to the new home.
    if (pathname === "/thevault/films" || pathname.startsWith("/thevault/films/")) {
      const rest = pathname.slice("/thevault/films".length).replace(/\/+$/, "");
      url.pathname = rest ? "/thevaultfilms" + rest : "/thevaultfilms/";
      return Response.redirect(url.toString(), 301);
    }

    for (const [prefix, binding] of MOUNTS) {
      // Match the mount root itself and everything under it, but never a
      // sibling that merely starts with the same characters.
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        const service = env[binding];
        if (!service) break; // binding missing — fall through to the site 404
        return service.fetch(request);
      }
    }

    // Not a demo path: the marketing site itself. ASSETS applies the same
    // html_handling and not_found_handling configured in wrangler.jsonc, so
    // /privacy still resolves and an unknown URL still gets the branded 404.
    return env.ASSETS.fetch(request);
  },
};
