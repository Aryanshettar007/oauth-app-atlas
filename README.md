# OAuth App Atlas (for Composio)

For any Composio toolkit, it answers two questions. Can I ship on Composio's managed OAuth app? If I need my own OAuth app, what does it take to get it approved: how hard, how much hands-on time, how long a wait, what can block me, and which steps can an agent do for me?

The library lists Composio's 100 most popular OAuth toolkits. For any other app (a name or a website), an agent researches the provider live, checks its real OAuth endpoints, and writes a guide you can share.

- **Live app:** https://oauth-app-atlas.vercel.app · reviewed guides: [Gmail](https://oauth-app-atlas.vercel.app/apps/gmail) (Hard), [GitHub](https://oauth-app-atlas.vercel.app/apps/github) (Easy)
- **Source:** https://github.com/Aryanshettar007/oauth-app-atlas
- **Author:** Aryan Shettar (aryanshettar007@gmail.com, [aryanshettar.tech](https://aryanshettar.tech)). Short Technical Assessment, Product Intern, Composio

---

## 1. The problem

A developer building an AI agent on Composio wants their users to connect Gmail, Slack, Salesforce and so on. Each connection is an OAuth grant to an **OAuth app**, a client ID and secret registered with the provider. One OAuth app serves all of the developer's users, and Composio stores and refreshes each user's tokens as a *connected account*.

Composio provides that OAuth app for many toolkits. In the snapshot used here, **75 of the top 100 OAuth toolkits are Composio-managed and 25 need you to bring your own**, including X/Twitter, Shopify, Snowflake and DocuSign. Even on a managed toolkit, Composio's docs say developers move to their own app for four reasons:
- their own brand on the consent screen
- their own provider quota, since managed apps share it
- custom scopes
- triggers faster than the 2-minute managed polling

Registering the app is usually a ten-minute form. The time goes into getting it **out of its restricted starting state**:
- test-user lists and user caps
- installs limited to your own workspace
- "unverified app" warnings

What lifts those restrictions is a review, verification, Google's CASA security assessment, a marketplace listing, or a partner program. That can take weeks, and the docs rarely say up front how long. This is the gap the product targets.

## 2. What it does

- **Toolkit library** (`/`). Composio's top 100 OAuth toolkits, pulled from the Composio API, each marked "Composio-managed" or "Bring your own". Filter by that, or by own-app difficulty.
- **Guide page** (`/apps/<toolkit>`). Each guide has:
  - **Verdict:** difficulty (Easy, Moderate, Hard, Gated), hands-on setup time, approval wait, cost, and the exact thing that triggers a review.
  - **On Composio:**
    - whether you can ship on the managed app and when you'd outgrow it
    - Composio's redirect URI to register, with a copy button
    - Composio's default scopes, flagged when they would trigger the provider's review
    - a working `@composio/core` snippet that passes your own auth config to a session
  - **Who does what:** what an agent can do, and what needs a person with company authority.
  - **Steps:** grouped into Build, Review and Launch. Each is tagged *Agent can do*, *You* or *Wait on provider*, with an estimate and a link.
  - **Blockers,** each with what to do if it happens; the **OAuth reference** details; and **gotchas**.
  - **Evidence:** every key claim is labelled *Tested*, *Documented*, *Community* or *Inferred*. The **What we tested** log lists the real HTTP checks, and **Not confirmed** lists the open questions.
  - **Review notes:** what a human checked or corrected.
- **Live research** (`/generate?q=...`). Type any app or website and the agent's steps stream in: searches, pages read, endpoint checks. When it finishes you get the guide.
- **Sharing.** Every guide has a permanent link, **Copy as Markdown** for a ticket or PR, and **JSON** at `/api/guides/<slug>` so another agent can read it.

## 3. Key decisions

1. **Frame everything around the Composio decision, not generic OAuth.** The first question a Composio developer has is "do I even need my own app?" The second is "when will I?" Only then does the provider's approval process matter. The guide follows that order.
2. **Use Composio's own data as the base.** The library, the managed/bring-your-own flag, the redirect URI, the default scopes and the known endpoints come from `GET /api/v3.1/toolkits` and `/toolkits/{slug}`. The agent then checks those against the provider. One finding came out of this: Composio's default Gmail scopes include `https://mail.google.com/`, a restricted scope. So a developer who copies those defaults into their own Gmail app takes on Google's CASA assessment without realising it.
3. **Lead with hands-on time versus calendar time.** Developers can plan around an hour of work. What hurts is a six-week review they didn't see coming.
4. **Make evidence first-class.**
   - Endpoint checks are recorded by our server code, not by the model, so the "What we tested" log can't be made up.
   - The model may only label a claim *Tested* if one of those recorded checks supports it.
   - Unknowns go to "Not confirmed" instead of being guessed.
5. **Test without creating anything.** The agent probes the provider's real endpoints:
   - OAuth discovery documents
   - the authorize URL, with a deliberately invalid client ID
   - the token URL, with an invalid code
   - the developer console URL

   That confirms the endpoints exist and shows how the provider rejects unknown apps. It never registers apps, signs in or obtains tokens, so it is safe to run on any provider, unattended.
6. **Split the agent into two phases.** The research loop uses tool calls. A separate structured-output call then turns the research log into a guide that is validated against the schema (one retry if it fails). This keeps the guide format stable while the research stays open-ended.
7. **Build it as a Composio feature, not a generic directory.** Using Composio's toolkit API as the base makes this a useful application for Composio itself. It answers the exact question a developer has when they open **Create Auth Config** for a toolkit, with Composio's own redirect URI, default scopes and SDK snippet in the guide. I approached this as a product manager first: who hits this problem (a developer moving from prototype to production), what decision they're making (managed app or own app), what they fear (an unplanned multi-week review), and where the answer should appear (in the dashboard flow, in docs, and as JSON for coding agents).
8. **Search provider: pick what's free and built for agents.** Gemini's Google Search grounding needs a paid tier, and the Brave Search API needs a card on file, so I couldn't use either. I looked for free web-search APIs and chose **Tavily**: a free tier, results built for LLM agents, and an official SDK (`@tavily/core`). The agent first tries **Composio's own `composio_search` toolkit** (`COMPOSIO_SEARCH_TAVILY`, version pinned as Composio's docs recommend), which itself exposes Tavily. That needs a Composio key with the `tool_execution` permission; without it, the agent calls Tavily directly.

## 4. How it works

```
input (toolkit, app name or URL)
  │
  ├─ resolveToolkit()  Composio API: managed OAuth? redirect URI, default scopes, endpoints
  ▼
Research loop (Gemini function calling, ≤10 turns, ~3 min budget)
  search_web ............ Composio composio_search → Tavily → Gemini grounding (first available)
  fetch_page ............ read docs and policy pages as text
  check_oauth_discovery . /.well-known/openid-configuration, oauth-authorization-server
  probe_authorize_endpoint  GET with a fake client_id; record redirects and error text
  probe_token_endpoint .. POST an invalid code; record the error format
  check_url ............. console and policy pages: do they exist, is there a login wall?
  (probe results are recorded by our code and streamed to the browser)
  ▼
Synthesis (Gemini structured output → zod-validated Guide)
  + Composio facts attached by code (not by the model)
  ▼
Stored: curated guides in data/guides/*.json (in the repo);
        live guides in Vercel Blob (or .data/ locally)
```

| File | Purpose |
|---|---|
| `src/lib/agent.ts` | Research loop, synthesis, search providers, Gemini model failover |
| `src/lib/tools.ts` | Probe tools. They block private and loopback addresses, because the model chooses the URLs. |
| `src/lib/composio.ts` | Composio toolkit API client and app-name resolution |
| `src/lib/schema.ts` | Guide schema. It drives the UI, the JSON API and Gemini's structured output. |
| `scripts/sync-composio.ts` | Snapshots the top 100 OAuth toolkits to `data/composio-toolkits.json` |
| `scripts/generate.ts` | Runs the same agent from the command line to produce curated guides and transcripts |

## 5. Verification: what was tested, corrected and left uncertain

**Method.** A separate research agent built an independent fact sheet from primary sources for seven apps (`data/reference-facts.md`). I spot-checked its key facts against official pages, then compared agent-written guides against it.

**Endpoint checks run against real providers:**

| Provider | Observed |
|---|---|
| Google | Discovery document found; PKCE S256 advertised. Authorize with a fake client ID returns *"Error 401: invalid_client"*. |
| GitHub | Authorize redirects to login before it checks the client ID. Token endpoint returns `404 {"error":"Not Found"}` for an unknown client. A discovery document exists at `github.com/login/oauth`. |
| Slack | Token endpoint returns `{"ok":false,"error":"invalid_code"}`. The authorize page is rendered in the browser, so its error text can't be read server-side. |
| SSRF guard | Requests to `127.0.0.1` are blocked. |

**Corrections and findings:**

| App | What the agent said | What sources say | Outcome |
|---|---|---|---|
| Gmail | Narrower scopes like `gmail.readonly` might need only free standard verification | `gmail.readonly` is a **restricted** scope ([Google restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)). Only send-only access (`gmail.send`) avoids CASA. | Corrected in the guide, with a review note |
| Gmail | `mail.google.com` is restricted and triggers CASA; refresh tokens expire after 7 days in Testing; PKCE S256 | Matches Google's docs and our probe | Confirmed |
| Gmail | CASA costs $540–$1,000 | Comes only from community and assessor sources; Google publishes no fee | Labelled *Community*; listed as not confirmed |
| GitHub (run without web search) | "PKCE not supported" | PKCE (S256) supported since 2025-07-14 ([GitHub changelog](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication)) | Wrong. This is why web search was added. |
| GitHub (run without web search) | No mention of org access | New organizations block OAuth app access by default until an owner approves | Missed blocker |
| GitHub (run live on production, with search) | GitHub has no OAuth discovery document (labelled *Tested*) | It exists at `github.com/login/oauth/.well-known/openid-configuration`; the agent probed only the site root | Corrected; evidence-label lesson |
| GitHub (run live on production) | Organization OAuth access restrictions: medium likelihood | Enabled by default for every new organization ([GitHub docs](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions)) | Raised to high |
| GitHub (run live on production) | Own app gives "2,000 token requests per hour" | No source; GitHub documents 10 new tokens/hour and 5,000 API requests/hour per user | Removed and replaced |
| GitHub (run live on production) | PKCE S256, no review, 8 h / 6-month tokens, 10-token cap | Matches GitHub docs | Confirmed. With search, the earlier PKCE error didn't recur. |
| Slack (run with search) | Since May 2025, apps not in the Marketplace get 1 request/min on `conversations.history`; Marketplace review takes up to 10 weeks and needs 10 active workspace installs; PKCE supported | Matches [Slack's changelog](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps) and the fact sheet | Confirmed |
| HubSpot (fact sheet) | n/a | Apps on developer platform 2025.2 are capped at 25 installs until the Marketplace listing is approved ([HubSpot changelog](https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits)) | Spot-checked; guide not generated yet |

**Live-generated guide check.** I generated a guide live for X (Twitter), a toolkit where Composio has no managed OAuth app, and reviewed it against X's developer documentation myself. Its guidance was correct.

**What I learned.** Without web search, the agent read the right docs but got recent changes wrong: GitHub PKCE, and organization access restrictions. With search, it found changelogs and policy updates (Slack's 2025 rate limit). Most errors are recent policy changes the model doesn't know about. So the research date is shown on every guide and "Re-run research" is one click.

**Not verified:**
- No real approval times. We did not submit any app for review, so wait times come from docs and developer reports.
- The CASA price and the Salesforce AppExchange review fee.
- Salesforce redirect URI rules (its docs returned errors).
- Notion token lifetimes.
- The managed/bring-your-own flag comes from the API field `composio_managed_auth_schemes`, which Composio's managed-auth docs say to check. I did not cross-check it against the directory page, because that page loads its list in the browser.

## 6. Setup

```bash
npm install
cp .env.example .env      # fill in the keys below
npm run dev               # http://localhost:3000
```

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Agent model (default `gemini-3.6-flash`, with failover across models) |
| `COMPOSIO_API_KEY` | yes | Toolkit metadata; web search via `composio_search`. Needs the **tool_execution** permission for search; without it, Tavily is used. |
| `TAVILY_API_KEY` | recommended | Search fallback (free tier) |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Saves live-generated guides so their links work for everyone |
| `GENERATIONS_PER_HOUR` | no | Per-IP limit on live research (default 10) |

Other commands:
```bash
npm run sync-composio                  # refresh the top-100 toolkit snapshot
npm run generate -- slack hubspot      # write curated guides with the same agent
npm run index-guides                   # register curated guides with the app
```

## 7. Deploy to Vercel

1. Push the repo to GitHub, then **Import Project** in Vercel. It detects Next.js; no `vercel.json` is needed.
2. Add the environment variables `GEMINI_API_KEY`, `COMPOSIO_API_KEY` and `TAVILY_API_KEY`.
3. Go to **Storage → Create → Blob** and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`.
4. Deploy. The research route sets `maxDuration = 300`, and research stops after about 3 minutes, then writes the guide from what it found.

Or from the command line: `npx vercel link && npx vercel env add GEMINI_API_KEY && npx vercel --prod`.

## 8. Product thinking beyond the build

- **User and moment:** a developer moving a Composio integration from prototype to production, usually when a customer asks for their brand on the consent screen, or when shared quota or a missing managed app blocks them.
- **Job to be done:** decide between staying on the managed app and bringing their own, then get their own approved without a surprise.
- **Success metrics for Composio:**
  - time from "Create Auth Config" to a working production auth config
  - fewer support tickets about "unverified app", rate-limit and review problems
  - fewer customers stuck on the managed app past the point where they should have moved
- **Where it ships:**
  - inline in the dashboard when a toolkit has no managed app
  - a linked guide from each toolkit's docs page
  - a JSON endpoint that coding agents (Claude Code, Cursor) can read while they wire up the integration
- **Deliberately not built:**
  - automatic app registration with providers, which needs the developer's identity and legal acceptance
  - user accounts

## 9. Limitations and next steps

- **Gemini's free tier is the bottleneck.** It allows about 20 requests per model per day, and one guide uses about 10–15. The agent fails over across models, but a paid key is needed for a dependable live demo and for generating the library in bulk.
- **Connect Vercel Blob for durable live guides.** Without `BLOB_READ_WRITE_TOKEN`, guides generated on Vercel go to `/tmp` and are lost when the instance recycles.
- **Two reviewed guides so far: Gmail (Hard) and GitHub (Easy).** Next: Slack (Moderate), a gated or bring-your-own toolkit (LinkedIn, Shopify or X), HubSpot and Salesforce, each reviewed against `data/reference-facts.md`.
- **Probes confirm endpoints, not approval.** Many consoles and authorize pages render in the browser or require a login, so error text often can't be read.
- **Review is manual.** Next step: a second checker agent that re-verifies each *Documented* claim against its cited URL before a guide is published.
- **Composio integration ideas:**
  - Show the guide inside the dashboard's **Create Auth Config** flow, when a developer picks a toolkit without a managed app.
  - Pre-fill a trimmed scope set when a default scope would trigger the provider's review.
