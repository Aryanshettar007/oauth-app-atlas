# OAuth App Approval: Reference Fact Sheet (ground truth for grading)

Compiled 2026-11-05 from live primary sources. Scenario: multi-tenant SaaS / AI agent whose end users connect their own accounts via the developer's OAuth app; goal = arbitrary external users/workspaces can authorize in production.

Legend: **[official]** = vendor docs/changelog; **[community]** = forum / third-party blog / vendor-of-a-vendor; **[live]** = curl check run 2026-11-05 (no login, no registration).

---

## 1. GitHub: OAuth App

**Registration / account**
- Register at Settings > Developer settings > OAuth apps > New OAuth App (`https://github.com/settings/developers`). Free GitHub account (personal or org) is enough. A user or org can own up to 100 OAuth apps. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub itself recommends building a GitHub App instead ("Consider building a GitHub App instead of an OAuth app"; "In general, GitHub Apps are preferred over OAuth apps"); exception: enterprise-level resources need an OAuth app. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps

**Restricted / unreviewed state**
- There is no review state and no user cap: any GitHub user can authorize an OAuth app immediately after creation. (No review step is documented anywhere in the OAuth app docs.) [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Org-level gate (easily missed): "When you create a new organization, OAuth app access restrictions are enabled by default." Members cannot grant an OAuth app access to org resources; they can only request owner approval. So a user can authorize, but the token will not see that org's private data until an org owner approves. [official] https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions
- Token issuance limit: 10 tokens per user/application/scope combination (oldest/unused revoked beyond that), plus a rate limit of 10 tokens created per hour. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- API rate limit: OAuth tokens use the user's limit of 5,000 requests/hour. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps

**Mandatory review triggers**
- None for OAuth authorization. GitHub Marketplace listing is optional. Paid Marketplace listings need: org-owned app, verified publisher, and "OAuth apps should have a minimum of 200 users" (GitHub Apps: 100 installations). Free listings need no minimum. All listings need a privacy policy link, support link, webhook for plan changes, etc. [official] https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app

**Review duration**
- N/A (no review). Marketplace review duration is not published. [official] https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps

**Cost**
- Free. Marketplace fees/revenue share are not stated on the overview page. [official] same URL as above.

**OAuth specifics**
- Authorize: `GET https://github.com/login/oauth/authorize`; Token: `POST https://github.com/login/oauth/access_token`. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps ; [live] authorize returns 302, token endpoint reachable.
- PKCE: supported since 2025-07-14, `S256` only (`plain` rejected); not required. [official] https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
- Token expiry: classic OAuth-app tokens are long-lived (no expiry) by default. Since 2026-08-14, OAuth apps can opt in to expiring tokens: 8h access token plus 6-month refresh token, triggered by the `offline_access` scope or an app setting. The changelog says "Short-lived tokens are enabled by default for all new applications." [official] https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps/
- Redirect URIs: up to 10 callback URLs (new Aug 2026; older guides say one). With wildcard matching disabled, the redirect must match exactly. With it enabled, the host and port must match and the path can be a subdirectory. Apps with a single redirect URI have wildcard matching on by default (legacy behaviour). Loopback: the port may differ from the registered one; `127.0.0.1` is preferred over `localhost`. HTTPS is not explicitly required in the docs. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps ; https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps/
- Auth code expires after 10 minutes. Device flow is available (must be enabled per app). [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

**Recent changes (2024–2026)**
- 2025-07: PKCE (S256) support. [official] https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
- 2026-08: up to 10 redirect URIs, per-URI wildcard toggle, opt-in refresh tokens / `offline_access` for OAuth apps. [official] https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps/
- 2026-10: GitHub CLI opt-in expiring OAuth tokens (preview). [official] https://github.blog/changelog/2026-10-21-github-cli-opt-in-to-expiring-auto-refreshing-oauth-tokens/

**Couldn't confirm (GitHub OAuth App)**
- Whether "enabled by default for new apps" means new OAuth apps get expiring tokens without `offline_access`. The changelog sentence is ambiguous next to the "opt in" wording.
- Marketplace review timeline and revenue-share percentage.
- An explicit HTTPS requirement for non-loopback callback URLs.

---

## 2. GitHub: GitHub App

**Registration / account**
- Register at Settings (or Org settings) > Developer settings > GitHub Apps > New GitHub App. Free account. Up to 100 GitHub Apps per user/org. Name is limited to 34 characters. Up to 10 callback URLs. [official] https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app

**Restricted / unreviewed state**
- New apps are **private** by default: "can only be installed on the account that owns it." To let arbitrary users/orgs install, switch it to **public**. No review is needed. [official] https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/making-a-github-app-public-or-private
- Installing on an org requires an org owner or a repo admin. Org-level permissions, repository administration, and repository creation now require org-owner approval (2026-10). [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps ; https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management/
- Rate limits scale with the number of repositories and org users. Installation tokens expire after 1 hour. [official] https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps

**Mandatory review triggers**
- None to go public. Marketplace is optional. Paid listings need a verified-publisher org and at least 100 installations. [official] https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app

**Review duration / cost**
- N/A / free (same as the OAuth App section).

**OAuth specifics (user access tokens)**
- Same endpoints: `https://github.com/login/oauth/authorize`, `https://github.com/login/oauth/access_token`. PKCE is S256 only. [official] https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- User token: "By default, the user access token expires after 8 hours". Refresh token expires after 6 months. Expiration is an optional app setting ("currently an optional feature and are subject to change"). Since 2026-10, `offline_access` requests a refresh token per authentication. [official] same URL ; https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management/
- `scope` is ignored for GitHub Apps; permissions are fixed on the registration. [official] https://github.blog/changelog/2026-10-13-github-app-improvements-for-least-privilege-and-management/
- `redirect_uri` must match a registered callback URL and cannot contain extra parameters. [official] https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

**Couldn't confirm (GitHub App)**
- Exact numeric rate-limit ceilings for installation tokens (not on the page fetched).
- Marketplace review timeline.

---

## 3. Slack

**Registration / account**
- Create at `https://api.slack.com/apps`. Free Slack workspace is fine as the dev workspace. New **classic** apps can no longer be created; the classic-app deprecation is paused (2025-12-08). [official] https://docs.slack.dev/changelog/2025/12/08/classic-apps-deprecation-paused

**Restricted / unreviewed state**
- An undistributed app can only be installed on its own workspace (error `invalid_team_for_non_distributed_app`). [official] https://docs.slack.dev/authentication/installing-with-oauth
- **Public (unlisted) distribution**: after "Activate Public Distribution" (needs OAuth flow + HTTPS on all request/redirect URLs), the app "will allow your app to be installed to any workspace." No Slack review is needed. Workspace admins may still require approval. Slack positions this for pilots, not commercial distribution. [official] https://docs.slack.dev/distribution
- **Key restriction for unlisted commercial apps (since 2025-05-29):** `conversations.history` and `conversations.replies` drop to Tier 1, **1 request/minute, max 15 objects per request**. This applies to new non-Marketplace apps and to new installs of existing ones. Exempt: Marketplace-approved apps and "internal customer-built" apps (which keep 50+ req/min and 1,000 objects). The current page says existing installs of unlisted apps "will not be impacted." [official] https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps
  - Conflict: earlier versions of the changelog (as reported by third parties) gave Sept 2, 2025 and later **March 3, 2026** as the date existing installs would be hit. The live page fetched 2026-11-05 no longer contains either date. [community] https://github.com/zeroclaw-labs/zeroclaw/issues/1839
- The Terms of Service update took effect for apps created on or after 2025-05-29, and on 2025-06-30 for older apps. [official] https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps

**Mandatory review triggers**
- Review is needed only for a Slack Marketplace listing, which is the only way to escape the non-Marketplace rate limits.
- Prerequisites: the app is installed on **10 or more active workspaces** (active = used in the past 28 days) and must stay at 10+ throughout the review (raised July 2026, changelog 2026-09-01). [official] https://docs.slack.dev/changelog/2026/09/01/slack-marketplace-install-requirement ; https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide
- Low-usage rule (2026-11-02): submissions with fewer than 10 active workspaces **and** fewer than 20 MAU (previously 10 WAU) are not reviewed and can't resubmit for 30 days. [official] https://docs.slack.dev/changelog/2026/11/02/slack-marketplace-submission-criteria
- Review covers: listing info, a justification for each scope, OAuth/install/uninstall testing, a **demo video** (required for new submissions), and test accounts with dummy data. [official] https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide

**Review duration**
- Official: preliminary review "up to 10 business days"; functional review "up to 10 weeks for new submissions and 6 weeks for published apps resubmitting changes." [official] https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide
- The older guide said up to 1 week preliminary and up to 8 weeks functional. [official, superseded] https://api.slack.com/directory/app-review-guide

**Cost**
- No listing fee is mentioned in the review guide. [official] https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide

**OAuth specifics**
- Authorize: `https://slack.com/oauth/v2/authorize` (user-only flow: `/oauth/v2_user/authorize`). Token: `https://slack.com/api/oauth.v2.access`. [official] https://docs.slack.dev/authentication/installing-with-oauth
- OIDC (Sign in with Slack) endpoints are different: `https://slack.com/openid/connect/authorize` and `https://slack.com/api/openid.connect.token`. [live] https://slack.com/.well-known/openid-configuration
- Redirect URI: "The `redirect_uri` must use HTTPS." It must match, or be a subdirectory of, a configured Redirect URL. No `#`. [official] https://docs.slack.dev/authentication/installing-with-oauth
- Token expiry: "OAuth tokens do not expire" by default. With opt-in **token rotation**, access tokens expire every 12h (`expires_in` 43200), refresh tokens are single-use, and "Token rotation may not be turned off once it's turned on." [official] https://docs.slack.dev/authentication/using-token-rotation
- PKCE: **GA since 2026-03-30**. It can be enabled in app settings and makes the app a public client (one-way). Code exchange works without the client secret. Refresh tokens for PKCE apps expire after 30 days. Localhost and custom-scheme redirects are allowed for PKCE apps but cannot request bot scopes. [official] https://docs.slack.dev/changelog/2026/03/30/pkce

**Recent changes**
- 2025-05-29 rate-limit and ToS change (above). 2025-07-08 / 2026-09-01 / 2026-11-02 Marketplace install and usage criteria. 2026-03-16 optional scopes. 2026-03-30 PKCE GA. 2025-10-28 redesigned OAuth page. [official] https://docs.slack.dev/changelog/archive

**Couldn't confirm (Slack)**
- Whether the March 3, 2026 enforcement on existing unlisted installs actually happened. The current official page says existing installs are not impacted.
- Non-PKCE localhost redirect support (docs say HTTPS only).
- Whether Slack API Terms now restrict LLM training or bulk storage of Slack data (not verified on a primary source).
- Community-reported Marketplace review durations (none found beyond official figures).

---

## 4. Google (Gmail API)

**Registration / account**
- Google Cloud Console project > Google Auth Platform (OAuth consent screen / Branding / Audience / Data Access) > create OAuth client (`https://console.cloud.google.com/auth/overview`). A free Google account is enough. User type is **External** (any Google account) or **Internal** (only your Cloud/Workspace org; others get `org_internal`). [official] https://support.google.com/cloud/answer/15549945

**Restricted / unreviewed state**
- **Testing** status: "limited to up to 100 test users listed in the OAuth consent screen." Test-user authorizations and their refresh tokens **expire after 7 days**. Exception: basic name/email/profile scopes only. [official] https://support.google.com/cloud/answer/15549945 ; https://developers.google.com/identity/protocols/oauth2#expiration
- **In production but unverified** (sensitive/restricted scopes): users see the "unverified app" screen, with a **100 new-user lifetime cap**. [official] https://support.google.com/cloud/answer/7454865
- Verification isn't needed for internal apps, personal use with known users, dev/test/staging projects, or service-owned data only. [official] https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

**Mandatory review triggers: Gmail scope classes** [official] https://developers.google.com/workspace/gmail/api/auth/scopes
- Non-sensitive (brand verification only): `gmail.labels`, `gmail.addons.current.action.compose`, `gmail.addons.current.message.action`.
- Sensitive (sensitive-scope verification, no CASA): `gmail.send`, `gmail.addons.current.message.metadata`, `gmail.addons.current.message.readonly`.
- **Restricted** (restricted-scope verification plus CASA if data is stored or transmitted on servers): `https://mail.google.com/`, `gmail.readonly`, `gmail.compose`, `gmail.insert`, `gmail.modify`, `gmail.metadata`, `gmail.settings.basic`, `gmail.settings.sharing`.
- Gotcha: `gmail.compose` and `gmail.metadata` are **restricted**, not sensitive. Only `gmail.send` lets you send mail without CASA.

**What review involves**
- Brand verification: an automated review "usually completes in a few minutes" (or 2–3 business days if branding changed). Results are valid for 7 days. [official] https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification ; https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Sensitive: authorized domains verified in **Google Search Console**; privacy policy on the same domain as the homepage; **unlisted YouTube demo video** showing the consent screen with the client ID in the URL bar and the use of each scope; a per-scope justification explaining why a narrower scope won't do. [official] https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Restricted: all of the above, plus Limited Use compliance in the privacy policy, plus an **annual CASA security assessment** by a Google-empanelled third-party assessor (App Defense Alliance), at assurance level AL1 or AL2 based on users, scopes and other signals. Revalidate every 12 months. [official] https://support.google.com/cloud/answer/13465431 ; https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification ; https://appdefensealliance.dev/casa

**Review duration**
- Official: sensitive "can take up to 10 days"; restricted "can potentially take several weeks." [official] URLs above.
- Community: 2026 Google Developer Forum threads report sensitive-scope reviews stalled 5–12+ weeks. [community] https://discuss.google.dev/t/oauth-verification-stuck-for-12-weeks/391690 ; https://discuss.google.dev/t/sensitive-scope-verification-stuck-6-weeks-never-received-any-trust-safety-email/376936
- Nylas puts it at "a few weeks to (more commonly) multiple months." [community/vendor] https://www.nylas.com/?p=1231

**Cost**
- Gmail API: "All standard use of the Gmail API is available at no additional cost". Quota is 1,200,000 units/min per project and 6,000 units/min per user. **New:** "Exceeding the quota request limits is planned to incur charges to your Google Cloud billing account later in 2026." [official] https://developers.google.com/workspace/gmail/api/reference/quota
- CASA: the developer pays the assessor (Mimestream: "selected and paid for this assessment," Tier 2, must repay annually). [community] https://mimestream.com/blog/casa-verified
- Third-party figures range from roughly $500–$4,500 up to "$10k+". [community, unverified] https://community.latenode.com/t/is-casa-tier-2-assessment-necessary-for-all-gmail-api-apps-options-for-indie-developers/22861

**OAuth specifics**
- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`. Token: `https://oauth2.googleapis.com/token`. Revoke: `https://oauth2.googleapis.com/revoke`. PKCE `plain` and `S256` are supported. [live] https://accounts.google.com/.well-known/openid-configuration
- Refresh tokens: need `access_type=offline`. They are returned only on the first authorization; use `prompt=consent` to get another. [official] https://developers.google.com/identity/protocols/oauth2/web-server
- Refresh token expiry: unused for 6 months; Testing status means 7 days; a password change can revoke tokens with Gmail scopes; **100 refresh tokens per Google account per client ID** (the oldest is silently invalidated); time-based access grants. [official] https://developers.google.com/identity/protocols/oauth2#expiration
- Redirect URIs: HTTPS required except localhost. No raw IPs except loopback, no fragments, wildcards, userinfo or path traversal, no `googleusercontent.com`, and the TLD must be on the public suffix list. [official] https://developers.google.com/identity/protocols/oauth2/web-server
- DPoP is optional and supported (binds the refresh token to a key). [official] same URL.

**Recent changes**
- 2024: CASA third-party audit extended to non-cloud desktop clients (per Mimestream). [community] https://mimestream.com/blog/casa-verified
- 2026-05: Workspace "standardized tiering model for all agent tools inclusive of our APIs". Updated quotas for new projects roll out from May 1, 2026; existing projects get 60 days' notice. Workspace MCP server is in preview. [official] https://workspaceupdates.googleblog.com/2026/05/agent-tools-and-security-updates-for-workspace-developers.html
- Gmail quota overage billing planned for later in 2026. [official] https://developers.google.com/workspace/gmail/api/reference/quota

**Couldn't confirm (Google)**
- Official CASA price range or assessor-fee figures. No current Google page states $ amounts.
- Official CASA turnaround (the "2–3 weeks tier 2" figure in search snippets was not on the live page).
- Actual numbers in "Workspace developer API tiering".

---

## 5. HubSpot

**Registration / account**
- Free HubSpot **developer account**. Apps are now built as **projects** on the Developer Platform (2025.2 / 2026.03 / 2026.09), via the CLI (`hs project create`) or the UI. [official] https://developers.hubspot.com/docs/apps/developer-platform/build-apps/create-an-app
- Legacy public apps (pre-Projects, created before June 23, 2026) and legacy private apps are going unsupported. Legacy private app creation ended 2026-09-28 (new accounts) and 2026-10-26 (existing accounts). Enforcement is in September 2027. [official] https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when

**Restricted / unreviewed state**
- `distribution: marketplace` apps on 2025.2+ are **capped at 25 installs until listed** on the HubSpot Marketplace (effective 2025-09-22; also applies to migrated legacy public apps). [official] https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits
- `distribution: private` (OAuth) apps are allowlisted, max **10 accounts** (changelog: 100 for Solutions Partners; the current docs show only 10). Static-auth apps are limited to 1 standard account. Multi-account apps must use OAuth. [official] https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview

**Mandatory review triggers**
- Exceeding 25 installs requires a Marketplace listing. Requirements: **at least 3 active, unique installs** in unaffiliated production accounts with activity in the past 30 days; live ToS and privacy policy URLs; use every scope you request; a shared-data table. [official] https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements
- Changes effective 2026 [official] https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026:
  - New listings and certifications must use the OAuth v3 / date-based endpoints.
  - From 2026-11-02, new listings must be on platform v2025.2 or v2026.03 (legacy or 2023.2/2025.1 projects are rejected).
  - Legacy CRM cards are banned.
  - Certification adds a token-security questionnaire.
  - Test credentials are no longer required (demo video or walkthrough instead, since 2026-03-31).

**Review duration**
- Official: initial review "within 10 business days"; whole process "no more than 60 days from the time feedback is shared." [official] https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements

**Cost**
- Developer account and listing: no fees are mentioned. [official] same URL.

**OAuth specifics**
- Authorize: `https://app.hubspot.com/oauth/authorize` (or `/oauth/{accountId}/authorize`). [official] https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth
- Token: current docs use `https://api.hubspot.com/oauth/2026-09/token` (all params in a form-encoded body). Access token lifetime is **30 minutes** (`expires_in` 1800). [official] https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens
  - [live] `api.hubapi.com/oauth/v1/token`, `/oauth/v3/token`, `/oauth/2026-03/token` and `/oauth/2026-09/token` all respond with `BAD_GRANT_TYPE`, so all currently exist.
- **v1 `/oauth/v1/token` is deprecated; sunset 2027-02-16.** Replacements are `/oauth/2026-03/token`, `/introspect` and `/revoke`. The v3 endpoints were introduced 2026-01-27. [official] https://developers.hubspot.com/changelog/v1-oauth-api-deprecation ; https://developers.hubspot.com/changelog/new-oauth-v3-api-endpoints-and-standardized-error-responses
- Refresh tokens don't expire (valid until uninstall or revoke). [official blog] https://developers.hubspot.com/blog/oauth-token-management-hubspot-integrations ; [community] https://community.hubspot.com/t5/APIs-Integrations/Does-the-OAuth-refresh-token-expire/m-p/335543
- Redirect URI: "must use `https` in production." `http` is allowed for `localhost` testing. IP addresses are not supported. [official] https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth
- Scopes: `requiredScopes`, `conditionallyRequiredScopes` and `optionalScopes` live in `app-hsmeta.json`. Optional scopes are dropped silently if the portal lacks the tool. [official] same URL.

**Couldn't confirm (HubSpot)**
- PKCE support (not mentioned in any doc fetched).
- Whether the 100-account Solutions Partner private cap still applies.
- Content of the community "Expiration of OAuth access tokens is changing" announcement (page returned 403).
- Community-reported listing durations.

---

## 6. LinkedIn

**Registration / account**
- Create an app at `https://www.linkedin.com/developers/apps` (free LinkedIn member account). Apps are associated with a LinkedIn Page. Individual developers must pick a default Page. Some products require a Page super admin to verify the app (verification link valid 30 days). [official] https://www.linkedin.com/help/linkedin/answer/a548360

**Restricted / unreviewed state**
- **Open (self-serve) products**, available to any member with no review and no user cap: Sign In with LinkedIn using OpenID Connect (`openid`, `profile`, `email`) and Share on LinkedIn (`w_member_social`). "Open Permissions are the only permissions that are available to all developers without special approval." [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- [live] OIDC discovery advertises only `openid profile email`. https://www.linkedin.com/oauth/.well-known/openid-configuration
- Everything else is gated by partner programs or approval: Advertising API, Community Management API, Lead Sync, Conversions, Events, Matched Audiences, Sales Navigator (SNAP partner), Talent (partner application). Compliance is closed. Company Intelligence API is not accepting applications. [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access ; https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- **Community Management API Development tier** (the default after approval): **500 calls/app/24h, 100 calls/member/24h**, no BATCH_GET, webhooks disabled; you must build within 12 months. Standard tier has no restrictions. Advertising API Development tier allows edits on up to 5 ad accounts. [official] https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access

**Mandatory review triggers / what review involves**
- Any non-open scope (e.g. posting as an org: `w_organization_social`, reading org posts or analytics) requires a product application.
- Community Management requirements: "only available to registered legal organizations for commercial use cases"; verified **business** email (personal emails fail); legal name, address, website, privacy policy; Page super-admin verification of the app.
- Standard tier additionally needs test credentials and a high-resolution, downloadable **screencast** per use case showing the full OAuth flow.
- A rejected app cannot reapply; you must create a new app. [official] https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Review stages are Access Form Review, then Identity Vetting, then App Review. [official] https://www.linkedin.com/help/linkedin/answer/a1449586

**Review duration**
- Official: no timeline. Restricted APIs are "evaluated on a case-by-case basis with no fixed timeline." [official] https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- Community: Community Management roughly 2–8 weeks; one n8n forum user was told 10–14 days; MDP/Advertising "4 weeks at best, 4 months on average." [community] https://community.n8n.io/t/linkedin-connection-issue/235261 ; https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives

**Cost**
- No API fee in the docs fetched; access is gated by approval. [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access

**OAuth specifics**
- Authorize: `https://www.linkedin.com/oauth/v2/authorization`. Token: `https://www.linkedin.com/oauth/v2/accessToken` (client_secret in the body). [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow ; [live] OIDC discovery.
- Access tokens last **60 days**. Auth code lifespan is 30 minutes. All-or-nothing consent (no per-scope selection). Requesting a different scope invalidates previous tokens. [official] same URL.
- **Refresh tokens are NOT generally available**: "Programmatic refresh tokens are available for a limited set of partners" (approved MDP partners). Refresh tokens have a fixed 365-day TTL that does not roll over on refresh. Without them, you re-run the auth flow (consent is skipped if the member is logged in and the token hasn't expired). [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- Redirect URLs: absolute, HTTPS, no `#`; query params are ignored. [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- PKCE: only for native clients. It is not self-service: "reach out to your point of contact at LinkedIn," with S256 and a loopback redirect. The OIDC discovery doc lists no `code_challenge_methods_supported`. [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native ; [live]

**Recent changes**
- Marketing API version 202511 sunsets 2026-11-16. Versioned (`li-lms-YYYYMM`) APIs require monthly migrations. [official] https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- New boost permissions arrived in API version 202610. [official] same URL.
- Social login options (Google/Apple/passkey) are on the authorize page; native apps need `enable_extended_login=true`. [official] https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- Legacy `r_liteprofile` / `r_emailaddress` were replaced by OIDC `profile` / `email` (still listed for Lead Sync and Conversions). [official] getting-access page.

**Couldn't confirm (LinkedIn)**
- Daily rate limits for the open products (Share on LinkedIn / OIDC).
- Whether a localhost (`http`) redirect is accepted for non-native apps.
- An official review SLA.

---

## 7. Salesforce

**Registration / account**
- A free **Developer Edition** org is enough to create the app (Setup > External Client App Manager). [official] https://help.salesforce.com/s/articleView?id=xcloud.external_client_apps.htm&type=5
- **Spring '26: "The ability to create new connected apps is disabled by default for all Salesforce orgs"**, including via API and Metadata API. Existing connected apps keep working. Re-enabling requires Salesforce Support (Salesforce says Support may not be able to do this in future releases). Package installation is the exception. [official] https://help.salesforce.com/s/articleView?language=en_US&id=release-notes.rn_security_identity_connected_app_creation_disabled.htm&release=260&type=5 ; https://help.salesforce.com/s/articleView?language=en_US&id=005228017&type=1 (via search snippets; the help site needs JS)
- **Connected app support ends Summer '27.** [official] https://www.salesforce.com/blog/winter-27-release-architect-highlights/

**Restricted / unreviewed state**
- **External Client Apps (ECA)** have a Distribution State of **Local** or **Packaged**. "Local external client apps are available only on the org where you create them"; "Only packaged apps can be deployed to other orgs" (via 1GP/2GP managed packages). Connected apps cannot use 2GP. So for a multi-tenant SaaS, a local ECA may not be enough; plan for a packaged ECA installed in each customer org, or an existing connected app. [official] https://help.salesforce.com/s/articleView?id=xcloud.connected_apps_and_external_client_apps_features.htm&language=en_US&type=5 (see the Couldn't confirm note below)
- Customer-org prerequisite: API access exists only on **Enterprise, Unlimited, Performance and Developer** editions. Professional Edition needs the paid "Web Services API" add-on; Group and Essentials can't get it. Users need the "API Enabled" permission. [official] https://help.salesforce.com/s/articleView?id=000385436&language=en_US&type=1
- Subscriber admins control policies (who can use the app, IP ranges) in their own org. [official] ECA docs above.

**Mandatory review triggers**
- No review is needed to use OAuth. **AppExchange Security Review** is required only to list on AppExchange (free solutions pay no fee; paid/freemium pay a fee). [official/search snippet] https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packageGuide/security_review_how_it_works.htm
- **Partner security controls (deadline 2026-05-11):** partner connected apps or ECAs "in use by more than two customer production orgs" must implement **PKCE, refresh token rotation, refresh token idle TTL, and refresh token IP allowlist**. [official] https://help.salesforce.com/s/articleView?id=005387798&language=en_US&type=1

**Review duration**
- AppExchange security review: readiness check 1–2 weeks, then the first security test 3–4 weeks, then a resubmission 2–3 weeks. [official per search snippet] https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packageGuide/security_review_how_it_works.htm
- 4–6 weeks overall per an older guide version. [community] https://tekunda.com/blog/How-the-AppExchange-Security-Review-Submission-Loop-Works

**Cost**
- Developer Edition is free. Customer orgs need API-enabled editions (above). Security review fee: older official guides say $2,550 (plus $150/yr listing); other sources say $999. The current figure is unconfirmed. [official-old / community] https://developer.salesforce.com/docs/atlas.en-us.242.0.packagingGuide.meta/packagingGuide/security_review_fees.htm

**OAuth specifics**
- Authorize: `https://login.salesforce.com/services/oauth2/authorize`. Token: `https://login.salesforce.com/services/oauth2/token`. Use `test.salesforce.com` for sandboxes or My Domain URLs. PKCE is `S256` only. [live] https://login.salesforce.com/.well-known/openid-configuration
- After login, call the API at the returned `instance_url`, not `login.salesforce.com`. (Standard behaviour; not re-verified in this pass.)
- **Refresh token idle TTL of 30 days is enforced in production from 2026-11-04** (sandbox from 2026-10-21). It is a sliding window that resets on each use. It "may break low-frequency integrations." Third-party sources say it was locked on for apps created on or after 2026-07-09. [official] https://www.salesforce.com/blog/winter-27-release-architect-highlights/ ; [community] https://vantagepoint.io/blog/sf/salesforce-refresh-token-ttl-idle-integrations
- Flow retirements: the device flow is restricted to local ECAs with a localhost callback from **2026-11-30**; **username-password, user-agent and hybrid user-agent flows retire 2027-02-20**. The username-password flow was never available for ECAs. [official] https://www.salesforce.com/blog/winter-27-release-architect-highlights/ ; https://help.salesforce.com/s/articleView?id=release-notes.rn_security_oauth_device.htm&release=264&type=5

**Couldn't confirm (Salesforce)**
- Direct confirmation that a **local** ECA rejects OAuth from users of *other* orgs. The docs say "available only on the org where you create them," but I didn't test cross-org OAuth.
- Redirect URI rules (https vs `http://localhost`): developer.salesforce.com returned 403 and help.salesforce.com needs JS.
- Current AppExchange security review fee.
- Default refresh-token policy for new ECAs beyond the 30-day idle TTL.

---

## 8. Notion

**Registration / account**
- Developer portal at `https://app.notion.com/developers` (new 2026-05-12; also `notion.so/developers`). Since 2026-05-13 "any member can build connections (not just Workspace Owners)". The docs still say internal connections need a workspace owner. A free Notion workspace works. [official] https://www.notion.com/releases/2026-05-13 ; https://developers.notion.com/guides/get-started/authorization
- Terminology changed: "integrations" are now "connections". OAuth integrations have an **installation scope** of "Any workspace" (public) or "selected workspaces" (scoped). It is set at creation and "can't be changed afterward." [official] https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview

**Restricted / unreviewed state**
- None for authorization: "You can start authorization as soon as you configure the integration's client credentials and redirect URI; Marketplace submission or review is not required." No user cap. [official] https://developers.notion.com/guides/get-started/authorization
- If you pick "selected workspaces" scope by mistake, the connection can never become public. Recreate it.
- Rate limits: per connection, 600 req/min on Business and Enterprise and 180 req/min on other plans (2026-09-09). Plus a per-workspace limit shared by all of a workspace's connections (2026-06-16). [official] https://developers.notion.com/page/changelog
- The Free-plan block limit is enforced via the REST API for internal and selected-workspace OAuth connections (2026-09-01). [official] same URL.

**Mandatory review triggers**
- Only for a Notion Marketplace listing. The connection must be public ("Any workspace"). Public connections must pass a Notion security review before listing. [official] https://developers.notion.com/guides/connections-and-tokens/public-integrations/overview ; https://developers.notion.com/guides/connections-and-tokens/public-integrations/marketplace-listing

**Review duration**
- Official: listing review response "within 5-10 business days via email." [official] https://developers.notion.com/guides/connections-and-tokens/public-integrations/marketplace-listing

**Cost**
- The API is free. No listing fee is mentioned. [official] same URL.

**OAuth specifics**
- Authorize: `https://api.notion.com/v1/oauth/authorize` with `owner=user` and `response_type=code`. Token: `https://api.notion.com/v1/oauth/token` with **HTTP Basic auth** (`client_id:client_secret`) and a JSON body. [official] https://developers.notion.com/guides/get-started/authorization ; [live] authorize returns 302, token returns 401 without credentials.
- `redirect_uri` in the token request is required if multiple redirect URIs are configured or one was passed on authorize; otherwise it is not allowed. [official] same URL.
- Refresh tokens: the token response includes `refresh_token`. Refreshing "will generate a new access token and a new refresh token" (rotation). [official] same URL ; https://developers.notion.com/reference/refresh-a-token
- **2026-06-08:** new public connections mint a **fresh token pair per authorization** (previously the existing token was returned). Store every response. [official] https://developers.notion.com/page/changelog
- PKCE: not mentioned for REST OAuth (only the Notion MCP client flow documents it). [official] https://developers.notion.com/guides/mcp/build-mcp-client

**Recent changes**
- 2025-09-03: API version breaking change (`database_id` becomes `data_source_id`). 2026-03-11: another breaking version. [official] https://developers.notion.com/docs/upgrade-guide-2025-09-03 ; changelog.
- 2026-05-12: Developer portal and personal access tokens (PATs with expiry options of 7d to 1y). 2026-06-08: unique tokens per auth. 2026-06-16: workspace rate limit. 2026-07-15: token response adds `user_id`, `workspace_id`, `email_domain`. 2026-09-01: workspace-scoped OAuth / Free block limit. 2026-09-09: plan-based rate limits. 2026-11-02: Agent APIs GA. [official] https://developers.notion.com/page/changelog

**Couldn't confirm (Notion)**
- Access-token lifetime and refresh-token expiry for public REST connections. The 180-day absolute / 30-day idle rules are documented only for MCP clients.
- Redirect URI rules (https only? localhost?).
- Whether public connections still require company name, website, privacy policy, ToS and support email at creation.
- Community-reported listing review times.
