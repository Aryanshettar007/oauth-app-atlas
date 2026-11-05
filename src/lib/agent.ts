import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import { tavily } from "@tavily/core";
import { functionDeclarations, runLocalTool, type ToolContext } from "./tools";
import { resolveToolkit, type ComposioToolkit } from "./composio";
import { Composio } from "@composio/core";
import { GuideSchema, ModelGuideSchema, modelGuideJsonSchema, slugify, type Guide, type Probe } from "./schema";

/**
 * Two-phase agent:
 *   1. RESEARCH  – a Gemini tool-use loop. The model searches (Google Search grounding),
 *                  reads primary docs, and probes the provider's real OAuth endpoints.
 *   2. SYNTHESIS – a single structured-output call that turns the research log into a Guide
 *                  that matches our schema. Probes are attached by our code, not the model.
 */

export const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
/**
 * Each Gemini model has its own quota (on the free tier: ~5 requests/min and 20/day per model),
 * so when one model is exhausted for the day we move down this list instead of failing.
 */
const MODEL_POOL = [
  MODEL,
  ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.8-flash,gemini-3-flash-preview,gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(","),
].filter((m, i, a) => m && a.indexOf(m) === i);
const exhausted = new Map<string, number>(); // model -> epoch ms when its daily quota resets
let lastModelUsed = MODEL;
const MAX_TURNS = Number(process.env.MAX_TURNS || 10);
const RESEARCH_DEADLINE_MS = Number(process.env.RESEARCH_DEADLINE_MS || 170_000);

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "tool"; id: string; name: string; label: string }
  | { type: "tool_done"; id: string; ok: boolean; summary: string }
  | { type: "probe"; probe: Probe }
  | { type: "note"; message: string }
  | { type: "done"; slug: string }
  | { type: "error"; message: string };

const ai = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

const RESEARCH_SYSTEM = `You are an OAuth integration researcher. A developer is building an AI agent product and wants THEIR users to connect a third-party app via OAuth. To do that they must register an OAuth app (client) with the provider and get it approved for production use. Your job: investigate exactly what that takes for the app you're given, so we can write an accurate, actionable setup guide.

The developer uses Composio (an integration platform for AI agents). Composio either provides a shared, Composio-managed OAuth app for a toolkit, or the developer must bring their own OAuth app (client ID/secret) and register Composio's redirect URI with the provider. Even where a managed app exists, developers switch to their own app for branding on the consent screen, their own rate-limit quota, custom scopes, or faster triggers. When you are given Composio facts (managed status, redirect URI, default scopes), check them against the provider: e.g. would the default scopes trigger the provider's app review or a security assessment? Does the provider accept that redirect URI?

Find out, from primary sources wherever possible:
- Where developers register an OAuth app (developer console URL), what account type is needed (free account? paid plan? partner program? business verification?).
- The OAuth endpoints (authorize, token), PKCE support, refresh-token behaviour, token lifetimes, redirect URI rules (https only? localhost allowed? exact match?).
- Whether the app can be used by OTHER people's accounts/workspaces immediately, or only by the developer's own account/org until something happens (app review, marketplace listing, verification, security assessment, partner approval, user caps). Note the precise triggers (e.g. specific scopes, user count thresholds).
- Typical wait times for any review, and what commonly causes rejection.
- Cost: is API access free, or tied to a paid tier?
- Anything that changed recently (deprecations, new review programs).

Method:
1. Start with search_web (if available) to locate the official OAuth/app-registration docs and any review/verification policy.
2. Read the key pages with fetch_page. Prefer the provider's own docs over blog posts. Use community sources (forums, Stack Overflow) only for real-world wait times and rejection reasons, and label them as such.
3. Actually test what you can: check_oauth_discovery on the issuer; probe_authorize_endpoint and probe_token_endpoint on the endpoints you found; check_url on the developer console and key policy pages. These probes are evidence we show the developer, so run them on the real endpoints.
4. Be efficient: you have only ${MAX_TURNS} turns. In each turn, call several independent tools in parallel (e.g. 2-3 searches at once, or all probes at once).

When you have enough, stop calling tools and write your research notes: concise bullet points with every fact followed by its source URL or "(probe)" if you observed it directly, plus a list of what you could NOT confirm. Do not invent URLs.`;

const SYNTHESIS_SYSTEM = `You turn OAuth research notes into a setup guide for a developer building an AI agent product. Their users will connect this app through the developer's OAuth app. Write for a busy engineer who needs to know: how hard is this, how long will it take including any approval wait, what exactly to do next, what could block them, and what an agent can do for them versus what they must do themselves.

Rules:
- Use only facts in the research log. If something is unknown, say so in openQuestions rather than guessing.
- difficulty rubric:
  easy = self-serve; working credentials in < 1 hour; other users can connect without any review.
  moderate = self-serve to build, but a review / listing / verification / plan requirement applies before broad public use, usually days.
  hard = formal review, verification or security assessment with multi-week waits or significant paperwork/cost.
  gated = access depends on partner approval, a paid contract, or an application that can be denied.
- setupTime is the hands-on time to get a working dev connection. approvalWait is calendar wait before arbitrary external users can connect ("None" if no review).
- steps: ordered, concrete, imperative. actor = "agent" only for things an AI agent with web access and code execution could genuinely do (research, fill config, generate privacy policy draft, write integration code, run test flows, draft review submission text). actor = "you" for anything needing the developer's identity, account login, legal acceptance, payment, business documents, or recorded demos. actor = "provider" for waiting on the provider. phase = build | review | launch. Include the URL for the step if known.
- claims: 6-12 key facts. evidence = "tested" ONLY when an entry in the PROBES list directly supports it; "documented" when an official provider page says it; "community" for forums/blogs; "inferred" when you reasoned it. Put the supporting URL in sourceUrl.
- handoff.agentCanDo / youMustDo: short, specific bullets.
- blockers: realistic, with a concrete howToUnblock for each.
- sources: the URLs actually used, with short titles.
- composioAdvice: 2-4 sentences for a developer using Composio. If Composio provides a managed OAuth app, say whether they can ship on it and what would make them need their own (branding, shared quota, custom scopes, trigger speed, provider review rules tied to the app owner). If not, say they must create their own. If Composio's default scopes include ones that trigger provider review, name them and suggest a narrower set.
- Keep each string tight. No marketing language.`;

type Turn = { label: string; result: string };

type GenParams = Parameters<ReturnType<typeof ai>["models"]["generateContent"]>[0];

/**
 * generateContent across the model pool.
 *  - daily quota exhausted (429 "per day")  -> mark the model exhausted, move to the next one
 *  - per-minute limit (429)                 -> wait the delay Gemini asks for, retry same model
 *  - overloaded (503/500)                   -> short backoff, then try the next model
 */
async function generate(params: Omit<GenParams, "model">) {
  let lastErr: unknown;
  const candidates = MODEL_POOL.filter((m) => (exhausted.get(m) ?? 0) < Date.now());
  if (!candidates.length) throw new Error("All Gemini models have hit their daily free-tier quota. Try again tomorrow, or enable billing on the Gemini API key.");
  for (const model of candidates) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await ai().models.generateContent({ ...params, model });
        lastModelUsed = model;
        return res;
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        const msg = String((e as Error).message);
        if (status === 429 && /per day/i.test(msg)) {
          const secs = Number(msg.match(/retryDelay":"(\d+)s/)?.[1] ?? 3600);
          exhausted.set(model, Date.now() + secs * 1000);
          break; // next model
        }
        if (status === 429) {
          const asked = msg.match(/retry in ([\d.]+)s/i);
          await new Promise((r) => setTimeout(r, asked ? Math.min(Number(asked[1]) * 1000 + 500, 65_000) : 5000));
          continue;
        }
        if (status === 503 || status === 500 || status === 404) break; // overloaded or unavailable: next model
        throw e;
      }
    }
  }
  throw lastErr;
}

type SearchResult = { provider: string; answer?: string; sources: { title: string; url: string; snippet?: string }[] };

/**
 * Web search is pluggable because Google Search grounding needs a paid Gemini tier.
 * Order: Tavily (TAVILY_API_KEY) → Brave (BRAVE_SEARCH_API_KEY) → Gemini grounding.
 * If none is available the tool returns an error that tells the agent to navigate from the official site.
 */
let groundingUnavailable = false;
export const searchMode = () =>
  process.env.COMPOSIO_API_KEY && !composioSearchUnavailable ? "composio_search" : process.env.TAVILY_API_KEY ? "tavily" : process.env.BRAVE_SEARCH_API_KEY ? "brave" : groundingUnavailable ? "none" : "gemini-grounding";

// Composio's own no-auth search toolkit. Pinned version, as Composio recommends for manual execution.
const COMPOSIO_SEARCH_VERSION = process.env.COMPOSIO_SEARCH_VERSION || "20261101_00";
let composioSearchUnavailable = false;
let composioClient: Composio | null = null;

async function composioSearch(query: string): Promise<SearchResult> {
  composioClient ??= new Composio({ apiKey: process.env.COMPOSIO_API_KEY, toolkitVersions: { composio_search: COMPOSIO_SEARCH_VERSION } });
  const r = await composioClient.tools.execute("COMPOSIO_SEARCH_TAVILY", {
    userId: "oauth-atlas-research",
    arguments: { query, max_results: 8, search_depth: "advanced", include_answer: true },
  });
  if (!r.successful) throw new Error(r.error || "Composio search failed");
  const d = (r.data ?? {}) as { answer?: string; results?: { title: string; url: string; content?: string }[]; response_data?: { answer?: string; results?: { title: string; url: string; content?: string }[] } };
  const body = d.response_data ?? d;
  return {
    provider: "composio_search",
    answer: body.answer,
    sources: (body.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 500) })),
  };
}

async function searchWeb(query: string): Promise<SearchResult> {
  if (process.env.COMPOSIO_API_KEY && !composioSearchUnavailable) {
    try {
      return await composioSearch(query);
    } catch (e) {
      // e.g. API key without the tool_execution permission: fall back for the rest of this process.
      composioSearchUnavailable = true;
      console.warn(`Composio search unavailable (${String((e as { cause?: { message?: string } }).cause?.message ?? e).slice(0, 160)}); falling back to the next search provider.`);
    }
  }
  if (process.env.TAVILY_API_KEY) {
    const res = await tavily({ apiKey: process.env.TAVILY_API_KEY }).search(query, {
      maxResults: 8,
      includeAnswer: true,
      searchDepth: "advanced",
      timeout: 30,
    });
    return {
      provider: "tavily",
      answer: res.answer,
      sources: res.results.map((x) => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 500) })),
    };
  }
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?count=8&q=${encodeURIComponent(query)}`, {
      headers: { accept: "application/json", "x-subscription-token": process.env.BRAVE_SEARCH_API_KEY },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`Brave search failed: HTTP ${r.status}`);
    const j = (await r.json()) as { web?: { results?: { title: string; url: string; description: string }[] } };
    return { provider: "brave", sources: (j.web?.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: x.description?.replace(/<[^>]+>/g, "") })) };
  }
  if (groundingUnavailable) throw new Error("NO_SEARCH");
  try {
    const res = await ai().models.generateContent({
      model: MODEL,
      contents: `Search the web and answer factually and specifically, quoting numbers, dates and policy names where available. Prefer official provider documentation. Question: ${query}`,
      config: { tools: [{ googleSearch: {} }], thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const raw = chunks.map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" })).filter((s) => s.url);
    // Grounding returns redirect URLs; resolve them so the agent can fetch and cite real pages.
    const sources = await Promise.all(
      raw.slice(0, 8).map(async (s) => {
        try {
          const r = await fetch(s.url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) });
          return { title: s.title, url: r.headers.get("location") || s.url };
        } catch {
          return s;
        }
      }),
    );
    return { provider: "gemini-grounding", answer: res.text ?? "", sources };
  } catch (e) {
    if ((e as { status?: number }).status === 429 || (e as { status?: number }).status === 403) {
      groundingUnavailable = true; // this key has no grounding quota; stop trying for this process
      throw new Error("NO_SEARCH");
    }
    throw e;
  }
}

const NO_SEARCH_MSG =
  "Web search is not available in this deployment. Navigate instead: fetch_page the provider's homepage or likely developer hubs (e.g. https://developers.<domain>, https://<domain>/developers, https://docs.<domain>, https://api.<domain>), then follow the links returned in the page text to OAuth, app registration and app review docs.";

const searchDecl = {
  name: "search_web",
  description: "Web search. Returns source URLs with snippets (and sometimes a synthesized answer). Use to find official docs, policies, and real-world reports.",
  parametersJsonSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
};

function labelFor(name: string, args: Record<string, unknown>) {
  const a = (k: string) => String(args[k] ?? "");
  switch (name) {
    case "search_web":
      return `Searching (${searchMode()}): ${a("query")}`;
    case "fetch_page":
      return `Reading ${a("url")}`;
    case "check_url":
      return `Checking ${a("url")}`;
    case "check_oauth_discovery":
      return `Looking for OAuth discovery at ${a("issuer")}`;
    case "probe_authorize_endpoint":
      return `Probing authorize endpoint ${a("authorizeUrl")}`;
    case "probe_token_endpoint":
      return `Probing token endpoint ${a("tokenUrl")}`;
    default:
      return name;
  }
}

function summarize(name: string, r: Record<string, unknown>) {
  if (r.error) return `Failed: ${r.error}`;
  if (name === "search_web") return `${(r.sources as unknown[])?.length ?? 0} sources`;
  if (name === "fetch_page") return `HTTP ${r.status} · ${String(r.title || "").slice(0, 80)}`;
  if (name === "check_oauth_discovery") return r.found ? "Discovery document found" : "No discovery document";
  return `HTTP ${r.status}`;
}

function composioFacts(t: ComposioToolkit | null) {
  if (!t) return "COMPOSIO: this app did not match a Composio toolkit. The developer would need a custom integration (Composio custom tools / proxy) and their own OAuth app.";
  return `COMPOSIO TOOLKIT: ${t.name} (slug ${t.slug}), ${t.toolsCount} tools, ${t.triggersCount} triggers.
- Auth schemes: ${t.authSchemes.join(", ")}
- Composio-managed OAuth app available: ${t.managedOAuth ? "YES (developers can start without registering their own app)" : "NO (developer must bring their own OAuth app)"}
- Redirect URI to register with the provider when bringing your own app: ${t.redirectUri || "unknown"}
- Default scopes Composio requests: ${t.defaultScopes.join(" ") || "none listed"}
- Provider endpoints known to Composio: authorize=${t.authorizeUrl || "?"} token=${t.tokenUrl || "?"}`;
}

export async function generateGuide(input: string, emit: (e: AgentEvent) => void, toolkit?: ComposioToolkit | null): Promise<Guide> {
  const started = Date.now();
  const ctx: ToolContext = { probes: [] };
  const log: Turn[] = [];
  let toolCalls = 0;

  if (toolkit === undefined) toolkit = await resolveToolkit(input);
  emit({
    type: "status",
    message: toolkit
      ? `Matched Composio toolkit “${toolkit.name}” · ${toolkit.managedOAuth ? "Composio-managed OAuth available" : "bring your own OAuth app"}`
      : "No matching Composio toolkit; researching the provider directly",
  });
  emit({ type: "status", message: `Researching “${toolkit?.name ?? input}”` });
  const facts = composioFacts(toolkit);

  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: `App to investigate: ${input}\n\n${facts}\n\nToday's date: ${new Date().toISOString().slice(0, 10)}\nIf the input is a website, first figure out which product it is.${searchMode() === "none" ? `\n${NO_SEARCH_MSG}` : ""}` }],
    },
  ];

  let notes = "";
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const overDeadline = Date.now() - started > RESEARCH_DEADLINE_MS;
    if (overDeadline) {
      contents.push({ role: "user", parts: [{ text: "Time is up. Do not call any more tools. Write your research notes now." }] });
    }
    const res = await generate({
      contents,
      config: {
        systemInstruction: RESEARCH_SYSTEM,
        tools: overDeadline ? [] : [{ functionDeclarations: searchMode() === "none" ? [...functionDeclarations] : [searchDecl, ...functionDeclarations] }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });
    const modelContent = res.candidates?.[0]?.content;
    if (!modelContent) throw new Error(`Model returned no content (finishReason=${res.candidates?.[0]?.finishReason ?? "unknown"})`);
    // Keep the model turn verbatim so thought signatures are preserved.
    contents.push(modelContent);

    const calls = res.functionCalls ?? [];
    if (calls.length === 0) {
      notes = res.text ?? "";
      break;
    }

    const responses: Part[] = await Promise.all(
      calls.map(async (fc, i) => {
        const name = fc.name ?? "";
        const args = (fc.args ?? {}) as Record<string, unknown>;
        const id = `${turn}-${i}`;
        toolCalls++;
        emit({ type: "tool", id, name, label: labelFor(name, args) });
        const local: ToolContext = { probes: [] }; // per-call, so parallel calls don't double-report
        let result: Record<string, unknown>;
        if (name === "search_web") {
          try {
            result = await searchWeb(String(args.query ?? ""));
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            result = { error: msg === "NO_SEARCH" ? NO_SEARCH_MSG : msg };
          }
        } else {
          result = await runLocalTool(name, args, local);
        }
        local.probes.forEach((probe) => {
          ctx.probes.push(probe);
          emit({ type: "probe", probe });
        });
        emit({ type: "tool_done", id, ok: !result.error, summary: summarize(name, result) });
        const serialized = JSON.stringify(result);
        log.push({ label: `${name}(${JSON.stringify(args)})`, result: serialized.slice(0, 5000) });
        return { functionResponse: { id: fc.id, name, response: { output: result } } };
      }),
    );
    contents.push({ role: "user", parts: responses });
  }

  if (!notes) {
    // Hit MAX_TURNS while still calling tools: ask for notes explicitly.
    contents.push({ role: "user", parts: [{ text: "Stop researching and write your research notes now." }] });
    const res = await generate({ contents, config: { systemInstruction: RESEARCH_SYSTEM } });
    notes = res.text ?? "";
  }

  emit({ type: "status", message: "Writing the guide from what was found" });
  emit({ type: "note", message: notes.slice(0, 1200) });

  const probesText = ctx.probes.map((p, i) => `P${i + 1}. [${p.ok ? "ok" : "fail"}] ${p.kind} — ${p.target}: ${p.finding}`).join("\n") || "(none)";
  const logText = log.map((t) => `### ${t.label}\n${t.result}`).join("\n\n").slice(0, 300_000);
  const synthesisPrompt = `APP: ${input}\n\n${facts}\n\nRESEARCH NOTES:\n${notes}\n\nPROBES (run by our server; only these may justify evidence="tested"):\n${probesText}\n\nRAW TOOL LOG:\n${logText}`;

  let parsed: ReturnType<typeof ModelGuideSchema.safeParse> | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await generate({
      contents: attempt === 0 ? synthesisPrompt : `${synthesisPrompt}\n\nYour previous output failed validation: ${lastErr}. Fix it.`,
      config: {
        systemInstruction: SYNTHESIS_SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: modelGuideJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });
    try {
      parsed = ModelGuideSchema.safeParse(JSON.parse(res.text ?? ""));
      if (parsed.success) break;
      lastErr = parsed.error.message.slice(0, 1500);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  if (!parsed?.success) throw new Error(`Could not produce a valid guide: ${lastErr}`);

  const g = parsed.data;
  return GuideSchema.parse({
    ...g,
    slug: toolkit?.slug ?? slugify(input),
    probes: ctx.probes,
    composio: toolkit
      ? {
          slug: toolkit.slug,
          name: toolkit.name,
          logo: toolkit.logo,
          managedOAuth: toolkit.managedOAuth,
          authSchemes: toolkit.authSchemes,
          redirectUri: toolkit.redirectUri,
          defaultScopes: toolkit.defaultScopes,
          authorizeUrl: toolkit.authorizeUrl,
          tokenUrl: toolkit.tokenUrl,
          toolsCount: toolkit.toolsCount,
          triggersCount: toolkit.triggersCount,
        }
      : null,
    meta: {
      input,
      generatedAt: new Date().toISOString(),
      model: lastModelUsed,
      durationSec: Math.round((Date.now() - started) / 1000),
      toolCalls,
      review: { status: "unreviewed", notes: [] },
    },
  });
}
