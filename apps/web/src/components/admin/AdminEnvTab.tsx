"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApiUrl } from "@/lib/admin-api-client";
import { ADMIN_COPY } from "@/lib/admin/copy";
import {
  AdminAlert,
  AdminBlock,
  AdminBtn,
  AdminCallout,
  AdminDataRow,
  AdminDataTable,
  AdminEmptyState,
  AdminStatusBadge,
  AdminTextButton,
} from "@/components/admin/AdminChrome";

type EnvFileMeta = {
  id: string;
  label: string;
  description: string;
  service: string;
  reloadHint: string;
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
};

type EnvFileDetail = EnvFileMeta & {
  content: string;
};

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminEnvTab({ address }: { address: string }) {
  const [files, setFiles] = useState<EnvFileMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EnvFileDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(adminApiUrl("/api/admin/env-files", address), { cache: "no-store" });
      const json = (await res.json()) as { data?: EnvFileMeta[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load env files");
      setFiles(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load env files");
    } finally {
      setLoading(false);
    }
  }, [address]);

  const loadFile = useCallback(
    async (id: string) => {
      setError(null);
      setSaveNote(null);
      setLoading(true);
      setSelectedId(id);
      try {
        const res = await fetch(adminApiUrl(`/api/admin/env-files/${id}`, address), {
          cache: "no-store",
        });
        const json = (await res.json()) as { data?: EnvFileDetail; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load env file");
        const data = json.data ?? null;
        setDetail(data);
        setDraft(data?.content ?? "");
      } catch (err) {
        setDetail(null);
        setDraft("");
        setError(err instanceof Error ? err.message : "Failed to load env file");
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function onSave() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setSaveNote(null);
    try {
      const res = await fetch(adminApiUrl(`/api/admin/env-files/${selectedId}`, address), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const json = (await res.json()) as {
        data?: { backupPath: string | null; reloadHint: string };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSaveNote(
        json.data?.backupPath
          ? `Saved. Backup: ${json.data.backupPath}. Reload: ${json.data.reloadHint}`
          : `Saved. Reload: ${json.data?.reloadHint ?? "restart service"}`
      );
      await loadList();
      if (detail) {
        setDetail({ ...detail, content: draft });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const dirty = detail != null && draft !== detail.content;

  return (
    <div className="admin-env-layout">
      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <AdminCallout tone="warn">{ADMIN_COPY.environment.callout}</AdminCallout>

      <div className="admin-env-grid">
        <AdminBlock title={ADMIN_COPY.environment.listTitle} description={ADMIN_COPY.environment.listDescription}>
          {loading && files.length === 0 ? (
            <p className="admin-empty">{ADMIN_COPY.empty.loading}</p>
          ) : files.length === 0 ? (
            <AdminEmptyState title={ADMIN_COPY.environment.empty} />
          ) : (
            <div className="admin-env-file-list">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={
                    selectedId === file.id ? "admin-env-file-card admin-env-file-card--active" : "admin-env-file-card"
                  }
                  onClick={() => void loadFile(file.id)}
                >
                  <div className="admin-env-file-card-head">
                    <span className="admin-env-file-card-title">{file.label}</span>
                    <AdminStatusBadge tone={file.exists ? "ok" : "warn"}>
                      {file.exists ? "Present" : "Missing"}
                    </AdminStatusBadge>
                  </div>
                  <p className="admin-meta">{file.service}</p>
                  <p className="admin-meta admin-num">{file.path}</p>
                  <p className="admin-meta">
                    {formatBytes(file.sizeBytes)} · {formatTime(file.modifiedAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
          <div className="admin-card-foot">
            <AdminTextButton onClick={() => void loadList()} disabled={loading}>
              {ADMIN_COPY.actions.refreshList}
            </AdminTextButton>
          </div>
        </AdminBlock>

        <AdminBlock
          title={detail?.label ?? ADMIN_COPY.environment.editorTitle}
          description={detail?.description ?? ADMIN_COPY.environment.editorEmpty}
          actions={
            detail ? (
              <AdminBtn primary onClick={() => void onSave()} disabled={saving || !dirty}>
                {saving ? ADMIN_COPY.environment.saving : ADMIN_COPY.environment.save}
              </AdminBtn>
            ) : null
          }
        >
          {detail ? (
            <>
              <AdminDataTable>
                <AdminDataRow label="Service">{detail.service}</AdminDataRow>
                <AdminDataRow label="Path">
                  <span className="admin-num">{detail.path}</span>
                </AdminDataRow>
                <AdminDataRow label="After save">{detail.reloadHint}</AdminDataRow>
              </AdminDataTable>
              <textarea
                className="admin-env-editor admin-num"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                rows={28}
                aria-label="Environment file content"
              />
              {saveNote ? <p className="admin-note">{saveNote}</p> : null}
              {dirty ? (
                <p className="admin-note admin-status-warn">{ADMIN_COPY.environment.unsaved}</p>
              ) : null}
            </>
          ) : (
            <AdminEmptyState title={ADMIN_COPY.environment.selectFile} />
          )}
        </AdminBlock>
      </div>
    </div>
  );
}
