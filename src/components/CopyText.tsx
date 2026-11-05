"use client";
import { useState } from "react";

export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch gap-0 max-w-full">
      <code className="font-mono text-xs bg-code rounded-l-md px-2 py-1.5 break-all border border-line border-r-0 min-w-0">{text}</code>
      <button
        className="btn-secondary rounded-l-none text-xs px-2 shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            /* clipboard blocked; text is selectable */
          }
        }}
      >
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
