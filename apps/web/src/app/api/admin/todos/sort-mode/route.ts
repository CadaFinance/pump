import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import { listAdminTodos, setAdminTodoSortMode, type AdminTodoSortMode } from "@/lib/db/admin-todos";

export async function POST(request: NextRequest) {
  const admin = requireAdminWallet(request);
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { mode?: string };
    const mode = body.mode?.trim();
    if (mode !== "priority" && mode !== "manual") {
      return NextResponse.json({ error: "mode must be priority or manual" }, { status: 400 });
    }

    await setAdminTodoSortMode(mode as AdminTodoSortMode, admin);
    const { todos, sortMode } = await listAdminTodos();
    return NextResponse.json({ data: { todos, sortMode } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
