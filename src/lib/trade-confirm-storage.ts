const AUTO_CONFIRM_KEY = "pump-trade-auto-confirm";

export function loadTradeAutoConfirm(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_CONFIRM_KEY) === "1";
}

export function saveTradeAutoConfirm(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(AUTO_CONFIRM_KEY, "1");
  } else {
    localStorage.removeItem(AUTO_CONFIRM_KEY);
  }
}

export function clearTradeAutoConfirm(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTO_CONFIRM_KEY);
}
