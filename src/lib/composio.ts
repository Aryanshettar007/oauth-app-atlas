import snapshot from "../../data/composio-toolkits.json";

/**
 * Composio toolkit metadata. The library is built from Composio's own toolkit catalog:
 * the 100 most popular toolkits that support OAuth2, with whether Composio provides a
 * managed OAuth app, the redirect URI to register, and the default scopes it requests.
 *
 * A snapshot lives in data/composio-toolkits.json (npm run sync-composio) so the site works
 * without a key; lookups for apps outside the snapshot go to the live API.
 */

export type ComposioToolkit = {
  slug: string;
  name: string;
  logo: string;
  appUrl: string;
  description: string;
  categories: string[];
  authSchemes: string[];
  managedOAuth: boolean;
  toolsCount: number;
  triggersCount: number;
  redirectUri: string;
  defaultScopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  popularityRank: number;
};

export const COMPOSIO_API = "https://backend.composio.dev/api/v3.1";
export const TOOLKITS: ComposioToolkit[] = (snapshot as { toolkits: ComposioToolkit[] }).toolkits;
export const SNAPSHOT_DATE: string = (snapshot as { syncedAt: string }).syncedAt;

type RawListItem = {
  name: string;
  slug: string;
  auth_schemes?: string[];
  composio_managed_auth_schemes?: string[];
  no_auth?: boolean;
  meta?: {
    logo?: string;
    app_url?: string;
    description?: string;
    categories?: { name: string }[];
    tools_count?: number;
    triggers_count?: number;
  };
};

type RawDetail = RawListItem & {
  auth_config_details?: {
    mode: string;
    fields?: { auth_config_creation?: { optional?: { name: string; default?: string }[] } };
    deprecated_auth_provider_details?: { authorization_url?: string; token_url?: string };
  }[];
};

const headers = () => {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("COMPOSIO_API_KEY is not set");
  return { "x-api-key": key };
};

export function toToolkit(d: RawDetail, rank = 0): ComposioToolkit {
  const oauth = d.auth_config_details?.find((a) => a.mode === "OAUTH2");
  const opt = oauth?.fields?.auth_config_creation?.optional ?? [];
  const get = (n: string) => opt.find((f) => f.name === n)?.default ?? "";
  return {
    slug: d.slug,
    name: d.name,
    logo: d.meta?.logo ?? "",
    appUrl: d.meta?.app_url ?? "",
    description: d.meta?.description ?? "",
    categories: (d.meta?.categories ?? []).map((c) => c.name),
    authSchemes: d.auth_schemes ?? (d.auth_config_details ?? []).map((a) => a.mode),
    managedOAuth: (d.composio_managed_auth_schemes ?? []).includes("OAUTH2"),
    toolsCount: d.meta?.tools_count ?? 0,
    triggersCount: d.meta?.triggers_count ?? 0,
    redirectUri: get("oauth_redirect_uri"),
    defaultScopes: get("scopes").split(/[,\s]+/).filter(Boolean),
    authorizeUrl: oauth?.deprecated_auth_provider_details?.authorization_url ?? "",
    tokenUrl: oauth?.deprecated_auth_provider_details?.token_url ?? "",
    popularityRank: rank,
  };
}

export async function fetchToolkitDetail(slug: string): Promise<RawDetail | null> {
  const r = await fetch(`${COMPOSIO_API}/toolkits/${encodeURIComponent(slug)}`, { headers: headers(), signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return null;
  return (await r.json()) as RawDetail;
}

export async function listToolkits(params: Record<string, string>): Promise<{ items: RawListItem[]; next_cursor?: string }> {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${COMPOSIO_API}/toolkits?${qs}`, { headers: headers(), signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Composio toolkits list failed: HTTP ${r.status}`);
  return (await r.json()) as { items: RawListItem[]; next_cursor?: string };
}

const norm = (s: string) =>
  s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/[^a-z0-9]/g, "");

/**
 * Resolve free text ("Salesforce", "https://attio.com", "google drive") to a Composio toolkit.
 * Snapshot first (exact slug/name/domain), then the live search API.
 */
export async function resolveToolkit(input: string): Promise<ComposioToolkit | null> {
  const q = norm(input);
  const host = input.match(/^https?:\/\//) ? input.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : "";
  const local = TOOLKITS.find(
    (t) => t.slug === q || norm(t.name) === q || (host && t.appUrl && t.appUrl.includes(host.split(".").slice(-2).join("."))),
  );
  if (local) return local;
  if (!process.env.COMPOSIO_API_KEY) return null;
  try {
    const term = host ? host.split(".").slice(-2, -1)[0] : input;
    const { items } = await listToolkits({ search: term, limit: "5" });
    const hit =
      items.find((i) => i.slug === q || norm(i.name) === q) ??
      items.find((i) => (i.auth_schemes ?? []).includes("OAUTH2") && (norm(i.name).includes(q) || q.includes(norm(i.name))));
    if (!hit) return null;
    const d = await fetchToolkitDetail(hit.slug);
    return d ? toToolkit(d) : null;
  } catch {
    return null;
  }
}

export const getToolkit = (slug: string) => TOOLKITS.find((t) => t.slug === slug) ?? null;
