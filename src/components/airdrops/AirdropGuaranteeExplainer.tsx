import { Lock, Medal, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AIRDROP_GUARANTEE_STEPS, AIRDROP_GUARANTEE_TAGLINE } from "@/lib/airdrop-trust";
import { ICON_STROKE } from "@/lib/icons";

const STEP_ICONS: LucideIcon[] = [Lock, Medal, ShieldCheck];

export function AirdropGuaranteeExplainer({ className = "" }: { className?: string }) {
  return (
    <section
      className={`airdrop-guarantee-explainer panel-surface p-3 md:p-4 ${className}`.trim()}
      aria-label="How guaranteed reward pools work"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label">Guaranteed reward pools</p>
          <p className="mt-1 max-w-3xl text-body-sm leading-relaxed text-pump-muted">
            {AIRDROP_GUARANTEE_TAGLINE}
          </p>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
        {AIRDROP_GUARANTEE_STEPS.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? ShieldCheck;
          return (
            <li
              key={step.title}
              className="rounded-lg border border-pump-border/20 bg-pump-surface/35 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pump-accent/12 text-pump-accent">
                  <Icon className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden />
                </span>
                <p className="text-body-sm font-semibold text-pump-text">{step.title}</p>
              </div>
              <p className="mt-2 text-caption leading-relaxed text-pump-muted">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
