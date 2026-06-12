"use client";

import { useState } from "react";

export function CopyAddress({ address, label = "Token address" }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel-surface mt-3 px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-pump-muted">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-pump-accent hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="financial-value break-all text-xs text-pump-text">{address}</p>
    </div>
  );
}
