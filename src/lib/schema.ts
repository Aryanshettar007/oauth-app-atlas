import { z } from "zod";

/**
 * A Guide is the shareable artifact: everything a developer needs to decide
 * "how hard is this?" and then actually get an OAuth app ready for production.
 *
 * Evidence is first-class. Every guide separates:
 *  - probes:  HTTP checks our code actually ran (recorded by the server, not the model)
 *  - claims:  key statements, each tagged with how well it is supported
 */

export const Difficulty = z.enum(["easy", "moderate", "hard", "gated"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const Actor = z.enum(["agent", "you", "provider"]);
export const Phase = z.enum(["build", "review", "launch"]);
export const Evidence = z.enum(["tested", "documented", "community", "inferred"]);
export type Evidence = z.infer<typeof Evidence>;

export const StepSchema = z.object({
  title: z.string(),
  detail: z.string(),
  actor: Actor,
  phase: Phase,
  estimate: z.string(),
  url: z.string().optional().default(""),
});

export const ClaimSchema = z.object({
  claim: z.string(),
  evidence: Evidence,
  note: z.string().optional().default(""),
  sourceUrl: z.string().optional().default(""),
});

export const ProbeSchema = z.object({
  kind: z.string(),
  target: z.string(),
  ok: z.boolean(),
  finding: z.string(),
  at: z.string(),
});
export type Probe = z.infer<typeof ProbeSchema>;

export const GuideSchema = z.object({
  slug: z.string(),
  appName: z.string(),
  website: z.string(),
  category: z.string(),
  summary: z.string(),
  verdict: z.object({
    difficulty: Difficulty,
    why: z.string(),
    setupTime: z.string(),
    approvalWait: z.string(),
    approval: z.enum(["none", "conditional", "always"]),
    approvalTrigger: z.string(),
    cost: z.string(),
  }),
  oauth: z.object({
    developerConsoleUrl: z.string(),
    docsUrl: z.string(),
    authorizeUrl: z.string(),
    tokenUrl: z.string(),
    pkce: z.enum(["required", "supported", "not-supported", "unknown"]),
    refreshTokens: z.string(),
    redirectUriRules: z.string(),
    scopeNotes: z.string(),
  }),
  prerequisites: z.array(
    z.object({ item: z.string(), detail: z.string(), blocking: z.boolean() }),
  ),
  steps: z.array(StepSchema),
  blockers: z.array(
    z.object({
      blocker: z.string(),
      likelihood: z.enum(["low", "medium", "high"]),
      howToUnblock: z.string(),
    }),
  ),
  gotchas: z.array(z.string()),
  handoff: z.object({
    agentCanDo: z.array(z.string()),
    youMustDo: z.array(z.string()),
  }),
  claims: z.array(ClaimSchema),
  openQuestions: z.array(z.string()),
  /** Model-written: what this means for a developer using Composio for this toolkit. */
  composioAdvice: z.string().optional().default(""),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  // Filled by our code, never by the model:
  probes: z.array(ProbeSchema).default([]),
  /** Facts from Composio's toolkit API, attached by our code. Null when the app isn't a Composio toolkit. */
  composio: z
    .object({
      slug: z.string(),
      name: z.string(),
      logo: z.string(),
      managedOAuth: z.boolean(),
      authSchemes: z.array(z.string()),
      redirectUri: z.string(),
      defaultScopes: z.array(z.string()),
      authorizeUrl: z.string(),
      tokenUrl: z.string(),
      toolsCount: z.number(),
      triggersCount: z.number(),
    })
    .nullable()
    .default(null),
  meta: z.object({
    input: z.string().optional(),
    generatedAt: z.string(),
    model: z.string(),
    durationSec: z.number().optional(),
    toolCalls: z.number().optional(),
    review: z
      .object({
        status: z.enum(["unreviewed", "reviewed"]),
        reviewedAt: z.string().optional(),
        notes: z.array(z.string()).default([]),
      })
      .default({ status: "unreviewed", notes: [] }),
  }),
});
export type Guide = z.infer<typeof GuideSchema>;

/** The part the model writes. Probes + meta are attached by the server. */
export const ModelGuideSchema = GuideSchema.omit({ probes: true, meta: true, slug: true, composio: true });

/** JSON schema handed to Gemini for structured output. */
export const modelGuideJsonSchema = z.toJSONSchema(ModelGuideSchema, { target: "openapi-3.0", io: "input" });

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|so|ai|app|dev|co|net|org)(\/.*)?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: "Easy", blurb: "Self-serve. Working credentials in under an hour, no review to go live." },
  moderate: { label: "Moderate", blurb: "Self-serve to build, but a review, listing or plan requirement applies before broad use." },
  hard: { label: "Hard", blurb: "Formal review, verification or security assessment with multi-week waits." },
  gated: { label: "Gated", blurb: "Access requires partner approval, a paid contract or an application that can be denied." },
};
