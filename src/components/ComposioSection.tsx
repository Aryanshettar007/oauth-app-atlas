import type { Guide } from "@/lib/schema";
import { ComposioAuthChip } from "./ui";
import { CopyText } from "./CopyText";

/** Deterministic section built from Composio's toolkit API, plus the agent's advice. */
export function ComposioSection({ g }: { g: Guide }) {
  const c = g.composio;
  if (!c) {
    return (
      <section id="composio" className="card p-5 flex flex-col gap-2 scroll-mt-20">
        <span className="eyebrow">On Composio</span>
        <p className="text-sm leading-relaxed">
          This app did not match a Composio toolkit. You would need your own OAuth app and a custom integration (Composio custom tools or proxy execute).
        </p>
        {g.composioAdvice && <p className="text-sm text-muted leading-relaxed">{g.composioAdvice}</p>}
      </section>
    );
  }
  const snippet = `import { Composio } from "@composio/core";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

// Use your own OAuth app for ${c.name}; other toolkits keep Composio's managed apps.
const session = await composio.create(userId, {
  toolkits: ["${c.slug}"],
  authConfigs: { ${c.slug}: "ac_your_auth_config_id" },
});
const connection = await session.authorize("${c.slug}"); // send connection.redirectUrl to the user`;

  return (
    <section id="composio" className="card overflow-hidden scroll-mt-20">
      <div className="p-5 flex flex-col gap-3 border-b border-line">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow">On Composio · toolkit <code className="font-mono normal-case">{c.slug}</code></span>
          <ComposioAuthChip managed={c.managedOAuth} />
        </div>
        <h2 className="text-lg font-semibold">
          {c.managedOAuth
            ? "You can start today on Composio's managed OAuth app. This guide is for when you need your own."
            : "Composio has no managed OAuth app for this toolkit. You must register your own."}
        </h2>
        {g.composioAdvice && <p className="text-sm leading-relaxed">{g.composioAdvice}</p>}
        {c.managedOAuth && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted">
            <li>· Your app name on the consent screen</li>
            <li>· Your own provider rate limits (managed apps share quota)</li>
            <li>· Scopes beyond Composio&apos;s defaults</li>
            <li>· Triggers faster than the 2-minute managed polling</li>
          </ul>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h3 className="font-semibold">Connect your own app to Composio</h3>
        <ol className="flex flex-col gap-3 text-sm">
          <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
            <span className="font-mono text-muted">1</span>
            <div className="flex flex-col gap-1.5">
              <span>When you register the app with {g.appName}, add Composio&apos;s redirect URI:</span>
              <CopyText text={c.redirectUri} />
            </div>
          </li>
          <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
            <span className="font-mono text-muted">2</span>
            <div className="flex flex-col gap-1.5">
              <span>
                In the Composio dashboard, create an auth config for <code className="font-mono">{c.slug}</code> with your client ID and secret.
                Composio requests these scopes by default; trim them if any would trigger a provider review you don&apos;t need:
              </span>
              <div className="flex flex-wrap gap-1">
                {c.defaultScopes.length ? (
                  c.defaultScopes.map((s) => (
                    <code key={s} className="font-mono text-[11px] bg-code rounded px-1.5 py-0.5 break-all">{s}</code>
                  ))
                ) : (
                  <span className="text-muted">None listed by Composio.</span>
                )}
              </div>
            </div>
          </li>
          <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
            <span className="font-mono text-muted">3</span>
            <div className="flex flex-col gap-1.5 min-w-0">
              <span>Pass the auth config to your session:</span>
              <pre className="bg-code rounded-lg p-3 text-xs font-mono overflow-x-auto leading-relaxed">{snippet}</pre>
            </div>
          </li>
        </ol>
        <p className="text-xs text-muted font-mono">
          {c.toolsCount} tools · {c.triggersCount} triggers · auth schemes: {c.authSchemes.join(", ")}
        </p>
      </div>
    </section>
  );
}
