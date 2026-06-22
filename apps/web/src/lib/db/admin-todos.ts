import { getLaunchpadPool } from "@/lib/db/launchpad";

export type AdminTodoPriority = "low" | "medium" | "high" | "urgent";

export type AdminTodoSortMode = "priority" | "manual";

export const ADMIN_TODO_SORT_MODE_KEY = "admin_todos_sort_mode";

export type AdminTodo = {
  id: string;
  title: string;
  body: string | null;
  priority: AdminTodoPriority;
  isCompleted: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

const PRIORITIES: AdminTodoPriority[] = ["low", "medium", "high", "urgent"];

const PRIORITY_SQL_ORDER = `
  CASE priority
    WHEN 'urgent' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    ELSE 3
  END
`;

export function priorityRank(priority: AdminTodoPriority): number {
  switch (priority) {
    case "urgent":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    default:
      return 3;
  }
}

export async function getAdminTodoSortMode(): Promise<AdminTodoSortMode> {
  const pool = getLaunchpadPool();
  const result = await pool.query<{ value: string }>(
    `SELECT value FROM platform_settings WHERE key = $1`,
    [ADMIN_TODO_SORT_MODE_KEY]
  );
  return result.rows[0]?.value === "manual" ? "manual" : "priority";
}

export async function setAdminTodoSortMode(
  mode: AdminTodoSortMode,
  updatedBy?: string | null
): Promise<AdminTodoSortMode> {
  const pool = getLaunchpadPool();
  await pool.query(
    `
      INSERT INTO platform_settings (key, value, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
    `,
    [ADMIN_TODO_SORT_MODE_KEY, mode, updatedBy ?? null]
  );
  return mode;
}

function parsePriority(value: string | undefined | null): AdminTodoPriority {
  if (value && PRIORITIES.includes(value as AdminTodoPriority)) {
    return value as AdminTodoPriority;
  }
  return "medium";
}

function mapRow(row: {
  id: string;
  title: string;
  body: string | null;
  priority: string;
  is_completed: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}): AdminTodo {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: parsePriority(row.priority),
    isCompleted: row.is_completed,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

export async function listAdminTodos(): Promise<{
  todos: AdminTodo[];
  sortMode: AdminTodoSortMode;
}> {
  const pool = getLaunchpadPool();
  const sortMode = await getAdminTodoSortMode();
  const orderBy =
    sortMode === "manual"
      ? `is_completed ASC, sort_order ASC, id ASC`
      : `is_completed ASC, ${PRIORITY_SQL_ORDER} ASC, created_at ASC, id ASC`;

  const result = await pool.query<{
    id: string;
    title: string;
    body: string | null;
    priority: string;
    is_completed: boolean;
    sort_order: number;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
  }>(
    `
      SELECT id::text, title, body, priority, is_completed, sort_order,
             created_by, created_at, updated_at, completed_at
      FROM admin_todos
      ORDER BY ${orderBy}
    `
  );

  return { todos: result.rows.map(mapRow), sortMode };
}

export async function createAdminTodo(input: {
  title: string;
  body?: string | null;
  priority?: AdminTodoPriority;
  createdBy?: string | null;
}): Promise<AdminTodo> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const pool = getLaunchpadPool();
  const nextOrder = await pool.query<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM admin_todos`
  );
  const sortOrder = nextOrder.rows[0]?.next_order ?? 0;

  const result = await pool.query<{
    id: string;
    title: string;
    body: string | null;
    priority: string;
    is_completed: boolean;
    sort_order: number;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
  }>(
    `
      INSERT INTO admin_todos (title, body, priority, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id::text, title, body, priority, is_completed, sort_order,
                created_by, created_at, updated_at, completed_at
    `,
    [
      title,
      input.body?.trim() || null,
      parsePriority(input.priority),
      sortOrder,
      input.createdBy?.toLowerCase() ?? null,
    ]
  );

  const row = result.rows[0];
  if (!row) throw new Error("Failed to create todo");
  return mapRow(row);
}

export async function updateAdminTodo(
  id: string,
  input: {
    title?: string;
    body?: string | null;
    priority?: AdminTodoPriority;
    isCompleted?: boolean;
    sortOrder?: number;
  }
): Promise<AdminTodo | null> {
  const pool = getLaunchpadPool();
  const existing = await pool.query<{ is_completed: boolean }>(
    `SELECT is_completed FROM admin_todos WHERE id = $1::bigint`,
    [id]
  );
  if (!existing.rows[0]) return null;

  const title = input.title !== undefined ? input.title.trim() : undefined;
  if (title !== undefined && !title) throw new Error("Title is required");

  const priority = input.priority !== undefined ? parsePriority(input.priority) : undefined;
  const isCompleted =
    input.isCompleted !== undefined ? input.isCompleted : existing.rows[0].is_completed;

  const result = await pool.query<{
    id: string;
    title: string;
    body: string | null;
    priority: string;
    is_completed: boolean;
    sort_order: number;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
  }>(
    `
      UPDATE admin_todos
      SET
        title = COALESCE($2, title),
        body = CASE WHEN $3::boolean THEN $4 ELSE body END,
        priority = COALESCE($5, priority),
        is_completed = COALESCE($6, is_completed),
        sort_order = COALESCE($7, sort_order),
        completed_at = CASE
          WHEN COALESCE($6, is_completed) = true AND completed_at IS NULL THEN now()
          WHEN COALESCE($6, is_completed) = false THEN NULL
          ELSE completed_at
        END,
        updated_at = now()
      WHERE id = $1::bigint
      RETURNING id::text, title, body, priority, is_completed, sort_order,
                created_by, created_at, updated_at, completed_at
    `,
    [
      id,
      title ?? null,
      input.body !== undefined,
      input.body?.trim() || null,
      priority ?? null,
      input.isCompleted ?? null,
      input.sortOrder ?? null,
    ]
  );

  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function deleteAdminTodo(id: string): Promise<boolean> {
  const pool = getLaunchpadPool();
  const result = await pool.query(`DELETE FROM admin_todos WHERE id = $1::bigint`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function reorderAdminTodos(
  orderedIds: string[],
  updatedBy?: string | null
): Promise<{ todos: AdminTodo[]; sortMode: AdminTodoSortMode }> {
  if (!orderedIds.length) return listAdminTodos();

  const pool = getLaunchpadPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (let index = 0; index < orderedIds.length; index++) {
      await client.query(
        `UPDATE admin_todos SET sort_order = $2, updated_at = now() WHERE id = $1::bigint`,
        [orderedIds[index], index]
      );
    }

    await client.query(
      `
        INSERT INTO platform_settings (key, value, updated_by)
        VALUES ($1, 'manual', $2)
        ON CONFLICT (key) DO UPDATE
        SET value = 'manual',
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
      `,
      [ADMIN_TODO_SORT_MODE_KEY, updatedBy ?? null]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return listAdminTodos();
}

export function isAdminTodoPriority(value: string): value is AdminTodoPriority {
  return PRIORITIES.includes(value as AdminTodoPriority);
}
