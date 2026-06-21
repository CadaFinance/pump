import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import {
  getEnvFileDef,
  readAdminEnvFile,
  writeAdminEnvFile,
  type AdminEnvFileId,
} from "@/lib/admin/env-files";

function parseId(id: string): AdminEnvFileId | null {
  if (id === "tma" || id === "realtime" || id === "indexer") return id;
  return null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!requireAdminWallet(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const envId = parseId(id);
  if (!envId || !getEnvFileDef(envId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readAdminEnvFile(envId);
    const def = getEnvFileDef(envId)!;
    return NextResponse.json(
      {
        data: {
          id: envId,
          label: def.label,
          description: def.description,
          service: def.service,
          reloadHint: def.reloadHint,
          path: file.path,
          content: file.content,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read env file";
    const status = message.includes("ENOENT") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!requireAdminWallet(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const envId = parseId(id);
  if (!envId || !getEnvFileDef(envId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { content?: unknown };
  try {
    body = (await request.json()) as { content?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  try {
    const result = await writeAdminEnvFile(envId, body.content);
    const def = getEnvFileDef(envId)!;
    return NextResponse.json({
      data: {
        id: envId,
        path: result.path,
        backupPath: result.backupPath,
        reloadHint: def.reloadHint,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write env file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
