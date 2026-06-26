export type ToastTone = "success" | "error" | "info" | "loading";

export type ToastAction = {
  label: string;
  href: string;
};

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  durationMs: number;
  /** Stays visible until updated to a terminal tone or explicitly dismissed. */
  persistent?: boolean;
  action?: ToastAction;
};

export type ToastEvent =
  | { type: "push"; item: ToastItem }
  | { type: "update"; id: string; patch: Partial<Omit<ToastItem, "id">> }
  | { type: "dismiss"; id: string };

type ToastListener = (event: ToastEvent) => void;

const listeners = new Set<ToastListener>();

function emit(event: ToastEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function pushToast(
  tone: ToastTone,
  title: string,
  description?: string,
  options?: {
    id?: string;
    durationMs?: number;
    persistent?: boolean;
    action?: ToastAction;
  }
) {
  const durationMs =
    options?.durationMs ?? (tone === "error" ? 6_000 : tone === "loading" ? 0 : 4_000);
  emit({
    type: "push",
    item: {
      id: options?.id ?? createToastId(),
      tone,
      title,
      description,
      durationMs,
      persistent: options?.persistent ?? tone === "loading",
      action: options?.action,
    },
  });
}

export const toast = {
  success(title: string, description?: string, options?: { id?: string; durationMs?: number }) {
    if (options?.id) {
      emit({
        type: "update",
        id: options.id,
        patch: {
          tone: "success",
          title,
          description,
          durationMs: options.durationMs ?? 3_500,
          persistent: false,
          action: undefined,
        },
      });
      return;
    }
    pushToast("success", title, description, options);
  },
  error(title: string, description?: string, options?: { id?: string; durationMs?: number }) {
    if (options?.id) {
      emit({
        type: "update",
        id: options.id,
        patch: {
          tone: "error",
          title,
          description,
          durationMs: options.durationMs ?? 6_000,
          persistent: false,
          action: undefined,
        },
      });
      return;
    }
    pushToast("error", title, description, options);
  },
  info(title: string, description?: string, options?: { id?: string; durationMs?: number }) {
    pushToast("info", title, description, options);
  },
  loading(title: string, description?: string, options?: { id?: string; action?: ToastAction }) {
    pushToast("loading", title, description, {
      id: options?.id,
      persistent: true,
      action: options?.action,
    });
  },
  update(id: string, patch: Partial<Omit<ToastItem, "id">>) {
    emit({ type: "update", id, patch });
  },
  dismiss(id: string) {
    emit({ type: "dismiss", id });
  },
};
