import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Probe } from "./schema";

/**
 * Tools the research agent can call. Everything here runs on our server, so the
 * results are facts we observed, not things the model said. Each probe is
 * recorded and shown in the guide's "What we tested" section.
 *
 * Probes only ever send obviously-invalid client credentials. They confirm that
 * endpoints exist and how the provider rejects unknown apps; they never create
 * accounts, apps or tokens.
 */

const UA = "OAuthGuideResearchBot/0.1 (+setup-guide research; contact via repo)";
const PROBE_CLIENT_ID = "oauth-guide-probe-invalid-client";
const PROBE_REDIRECT = "https://example.com/oauth/callback";
const TIMEOUT_MS = 12_000;

// ---------- SSRF guard: the model chooses URLs, so never hit private networks ----------
function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const l = ip.toLowerCase();
    return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:127.") || l === "::";
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) URLs are allowed");
  const host = u.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private host blocked");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Private address blocked");
  return u;
}

async function safeFetch(url: string, init: RequestInit = {}, maxRedirects = 5): Promise<{ res: Response; finalUrl: string; hops: string[] }> {
  let current = url;
  const hops: string[] = [];
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.8", ...(init.headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      hops.push(`${res.status} → ${loc}`);
      current = new URL(loc, current).toString();
      init = { ...init, method: "GET", body: undefined };
      continue;
    }
    return { res, finalUrl: current, hops };
  }
  throw new Error("Too many redirects");
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n")
    .replace(/<a [^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => `${txt.replace(/<[^>]+>/g, "")} [${href}]`)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const titleOf = (html: string) => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().slice(0, 140) ?? "";
const now = () => new Date().toISOString();

// ---------- tool implementations ----------

export type ToolContext = { probes: Probe[] };
type ToolResult = Record<string, unknown>;

async function fetchPage(args: { url: string }): Promise<ToolResult> {
  const { res, finalUrl, hops } = await safeFetch(args.url);
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  const text = ct.includes("html") ? htmlToText(body) : body;
  const max = 14_000;
  return {
    status: res.status,
    finalUrl,
    redirects: hops,
    title: ct.includes("html") ? titleOf(body) : "",
    text: text.slice(0, max),
    truncated: text.length > max,
    note: text.length < 400 ? "Very little text: the page may be rendered client-side or behind a login. Try a different docs URL or search." : undefined,
  };
}

async function checkUrl(args: { url: string; purpose?: string }, ctx: ToolContext): Promise<ToolResult> {
  const { res, finalUrl, hops } = await safeFetch(args.url);
  const body = (res.headers.get("content-type") || "").includes("html") ? await res.text() : "";
  const loginWall = /log ?in|sign ?in|auth/i.test(finalUrl) && finalUrl !== args.url;
  const finding = `HTTP ${res.status}${hops.length ? ` after ${hops.length} redirect(s)` : ""}; landed on ${new URL(finalUrl).host}${new URL(finalUrl).pathname}${loginWall ? " (login wall: an account is needed)" : ""}${titleOf(body) ? ` — “${titleOf(body)}”` : ""}`;
  ctx.probes.push({ kind: args.purpose || "URL reachable", target: args.url, ok: res.status < 400, finding, at: now() });
  return { status: res.status, finalUrl, redirects: hops, title: titleOf(body), loginWall };
}

async function checkDiscovery(args: { issuer: string }, ctx: ToolContext): Promise<ToolResult> {
  const base = args.issuer.replace(/\/$/, "");
  const candidates = [`${base}/.well-known/openid-configuration`, `${base}/.well-known/oauth-authorization-server`];
  for (const url of candidates) {
    try {
      const { res } = await safeFetch(url);
      if (!res.ok) continue;
      const j = (await res.json()) as Record<string, unknown>;
      const pick = {
        issuer: j.issuer,
        authorization_endpoint: j.authorization_endpoint,
        token_endpoint: j.token_endpoint,
        code_challenge_methods_supported: j.code_challenge_methods_supported,
        grant_types_supported: j.grant_types_supported,
        token_endpoint_auth_methods_supported: j.token_endpoint_auth_methods_supported,
        registration_endpoint: j.registration_endpoint,
        scopes_supported: Array.isArray(j.scopes_supported) ? (j.scopes_supported as string[]).slice(0, 40) : undefined,
      };
      ctx.probes.push({
        kind: "OAuth discovery document",
        target: url,
        ok: true,
        finding: `Found. authorize=${pick.authorization_endpoint ?? "?"}, token=${pick.token_endpoint ?? "?"}, PKCE methods=${JSON.stringify(pick.code_challenge_methods_supported ?? "not advertised")}${pick.registration_endpoint ? ", dynamic client registration advertised" : ""}`,
        at: now(),
      });
      return { found: true, url, ...pick };
    } catch {
      /* try next */
    }
  }
  ctx.probes.push({ kind: "OAuth discovery document", target: base, ok: false, finding: "No .well-known/openid-configuration or oauth-authorization-server document found (common for non-OIDC providers; not a problem by itself).", at: now() });
  return { found: false, tried: candidates };
}

async function probeAuthorize(args: { authorizeUrl: string; scope?: string; extraParams?: string }, ctx: ToolContext): Promise<ToolResult> {
  const u = new URL(args.authorizeUrl);
  u.searchParams.set("client_id", PROBE_CLIENT_ID);
  u.searchParams.set("redirect_uri", PROBE_REDIRECT);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", "probe");
  if (args.scope) u.searchParams.set("scope", args.scope);
  if (args.extraParams) new URLSearchParams(args.extraParams).forEach((v, k) => u.searchParams.set(k, v));

  // Follow redirects ourselves but stop if the provider tries to send us to the (fake) redirect URI.
  let current = u.toString();
  const hops: string[] = [];
  let res: Response | null = null;
  for (let i = 0; i < 6; i++) {
    await assertPublicUrl(current);
    res = await fetch(current, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, current);
      hops.push(`${res.status} → ${next.host}${next.pathname}${next.searchParams.get("error") ? `?error=${next.searchParams.get("error")}` : ""}`);
      if (next.toString().startsWith(PROBE_REDIRECT)) break;
      current = next.toString();
      continue;
    }
    break;
  }
  const body = res ? await res.text().catch(() => "") : "";
  const text = htmlToText(body).slice(0, 2500);
  const errorHints = text.match(/[^.\n]{0,120}(invalid|unknown|not found|error|doesn't exist|does not exist|client_id|application)[^.\n]{0,160}/gi)?.slice(0, 4) ?? [];
  const hintText = [...new Set(errorHints.map((h) => h.trim().replace(/\s+/g, " ")))].slice(0, 3).join(" / ").slice(0, 260);
  const finding = `HTTP ${res?.status}${hops.length ? `; redirects: ${hops.join(" | ")}` : ""}${titleOf(body) ? `; page “${titleOf(body)}”` : ""}${hintText ? `; says: “${hintText}”` : ""}${!text && res?.status === 200 ? "; empty or client-rendered page, error text not readable server-side" : ""}${hops.some((h) => /login|signin|session/i.test(h)) && !hintText.match(/client/i) ? "; asks for login before validating client_id" : ""}`;
  ctx.probes.push({ kind: "Authorize endpoint (fake client_id)", target: args.authorizeUrl, ok: !!res && res.status < 500, finding, at: now() });
  return {
    status: res?.status,
    redirects: hops,
    title: titleOf(body),
    errorHints,
    textSample: text.slice(0, 1500),
    interpretation:
      "An endpoint that responds with an 'invalid client'-style error or redirects to a login page exists and validates client_id. A 404 suggests the URL is wrong.",
  };
}

async function probeToken(args: { tokenUrl: string }, ctx: ToolContext): Promise<ToolResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: "invalid-probe-code",
    redirect_uri: PROBE_REDIRECT,
    client_id: PROBE_CLIENT_ID,
    client_secret: "invalid-probe-secret",
  });
  const { res } = await safeFetch(args.tokenUrl, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
  });
  const text = (await res.text()).slice(0, 800);
  ctx.probes.push({
    kind: "Token endpoint (invalid code)",
    target: args.tokenUrl,
    // A JSON error (even a 404) means the endpoint is live and rejecting our fake client.
    ok: res.status < 500 && (res.status !== 404 || /json/.test(res.headers.get("content-type") || "")),
    finding: `HTTP ${res.status}; ${res.headers.get("content-type") || "no content-type"}; body: ${text.replace(/\s+/g, " ").slice(0, 220)}`,
    at: now(),
  });
  return { status: res.status, contentType: res.headers.get("content-type"), body: text };
}

// ---------- declarations for Gemini function calling ----------

export const functionDeclarations = [
  {
    name: "fetch_page",
    description:
      "Fetch a public web page (docs, developer policy, review guidelines) and return its readable text plus links. Use for reading primary sources in detail.",
    parametersJsonSchema: {
      type: "object",
      properties: { url: { type: "string", description: "Absolute http(s) URL" } },
      required: ["url"],
    },
  },
  {
    name: "check_url",
    description:
      "Request a URL and record whether it exists and where it lands (e.g. a developer console that redirects to a login page). Recorded as test evidence in the guide.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        purpose: { type: "string", description: "Short label, e.g. 'Developer console reachable' or 'App review policy page'" },
      },
      required: ["url"],
    },
  },
  {
    name: "check_oauth_discovery",
    description:
      "Look for an OIDC/OAuth discovery document (/.well-known/openid-configuration or oauth-authorization-server) at an issuer base URL, e.g. https://accounts.google.com. Returns endpoints, PKCE support and registration endpoint if advertised.",
    parametersJsonSchema: {
      type: "object",
      properties: { issuer: { type: "string", description: "Issuer base URL, no path after the host unless the provider uses one" } },
      required: ["issuer"],
    },
  },
  {
    name: "probe_authorize_endpoint",
    description:
      "Send a browser-style GET to the provider's OAuth authorize URL using a deliberately invalid client_id and record how it responds. Confirms the endpoint is real and shows the provider's error behaviour. Never creates anything.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        authorizeUrl: { type: "string", description: "The authorize endpoint without query params" },
        scope: { type: "string", description: "Optional scope string to include" },
        extraParams: { type: "string", description: "Optional extra query params as a=b&c=d" },
      },
      required: ["authorizeUrl"],
    },
  },
  {
    name: "probe_token_endpoint",
    description:
      "POST an invalid authorization code to the token endpoint and record the error. Confirms the endpoint exists and shows the error format (JSON vs form, error codes).",
    parametersJsonSchema: {
      type: "object",
      properties: { tokenUrl: { type: "string" } },
      required: ["tokenUrl"],
    },
  },
] as const;

export async function runLocalTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  try {
    switch (name) {
      case "fetch_page":
        return await fetchPage(args as { url: string });
      case "check_url":
        return await checkUrl(args as { url: string; purpose?: string }, ctx);
      case "check_oauth_discovery":
        return await checkDiscovery(args as { issuer: string }, ctx);
      case "probe_authorize_endpoint":
        return await probeAuthorize(args as { authorizeUrl: string }, ctx);
      case "probe_token_endpoint":
        return await probeToken(args as { tokenUrl: string }, ctx);
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (name !== "fetch_page") {
      ctx.probes.push({ kind: name, target: String(args.url ?? args.authorizeUrl ?? args.tokenUrl ?? args.issuer ?? ""), ok: false, finding: `Request failed: ${msg}`, at: now() });
    }
    return { error: msg };
  }
}
