"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { adminFetch } from "@/lib/admin-api-client";
import { ADMIN_COPY } from "@/lib/admin/copy";
import {
  WIPE_DATA_CONFIRMATION_PHRASE,
  WIPE_PRESERVED_TABLES,
  WIPE_TRUNCATED_TABLES,
} from "@/lib/db/admin-wipe";
import { AdminAlert, AdminBlock, AdminBtn } from "@/components/admin/AdminChrome";

type AdminDataWipeCardProps = {
  onWiped?: () => void;
};

export function AdminDataWipeCard({ onWiped }: AdminDataWipeCardProps) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const phraseOk = confirmation === WIPE_DATA_CONFIRMATION_PHRASE;

  async function onWipe() {
    if (!phraseOk) return;
    if (!window.confirm(ADMIN_COPY.wipe.finalConfirm)) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/admin/wipe-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const json = (await res.json()) as {
        data?: {
          wipedAt: string;
          indexerResyncFromBlock?: string | null;
          indexerRestart?: { ok: boolean; detail?: string };
          warnings?: string[];
        };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Wipe failed");

      setConfirmation("");
      const restartOk = json.data?.indexerRestart?.ok !== false;
      const fromBlock = json.data?.indexerResyncFromBlock;
      let message = restartOk
        ? ADMIN_COPY.wipe.success
        : ADMIN_COPY.wipe.successWithWarning;
      if (fromBlock) {
        message += ` Resync from block ${fromBlock}.`;
      }
      const extraWarnings = json.data?.warnings?.filter(Boolean) ?? [];
      if (extraWarnings.length > 0) {
        message += ` ${extraWarnings.join(" ")}`;
      }
      setSuccess(message);
      onWiped?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wipe failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminBlock title={ADMIN_COPY.wipe.title} description={ADMIN_COPY.wipe.description}>
      <div className="admin-wipe-zone">
        <div className="admin-wipe-warning">
          <AlertTriangle size={16} aria-hidden />
          <p>{ADMIN_COPY.wipe.warning}</p>
        </div>

        <div className="admin-wipe-columns">
          <div>
            <p className="admin-wipe-list-title">{ADMIN_COPY.wipe.preservedTitle}</p>
            <ul className="admin-wipe-list admin-wipe-list--ok">
              {WIPE_PRESERVED_TABLES.map((table) => (
                <li key={table}>{table}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="admin-wipe-list-title">{ADMIN_COPY.wipe.wipedTitle}</p>
            <ul className="admin-wipe-list admin-wipe-list--danger">
              {WIPE_TRUNCATED_TABLES.map((table) => (
                <li key={table}>{table}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="admin-note">{ADMIN_COPY.wipe.indexerNote}</p>

        <label className="admin-wipe-confirm">
          <span className="admin-field-label">{ADMIN_COPY.wipe.confirmLabel}</span>
          <input
            className="admin-input admin-wipe-input"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={WIPE_DATA_CONFIRMATION_PHRASE}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {error ? <AdminAlert>{error}</AdminAlert> : null}
        {success ? <p className="admin-wipe-success">{success}</p> : null}

        <AdminBtn danger disabled={!phraseOk || busy} onClick={() => void onWipe()}>
          {busy ? ADMIN_COPY.wipe.running : ADMIN_COPY.wipe.button}
        </AdminBtn>
      </div>
    </AdminBlock>
  );
}
