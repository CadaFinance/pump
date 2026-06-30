export type PumpNumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "backspace";

export const PUMP_NUMPAD_ROWS: readonly (PumpNumpadKey | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
];

export function applyPumpNumpadKey(current: string, key: PumpNumpadKey): string {
  if (key === "backspace") {
    return current.slice(0, -1);
  }

  if (key === ".") {
    if (current.includes(".")) return current;
    return current ? `${current}.` : "0.";
  }

  if (current === "0") {
    return key;
  }

  return `${current}${key}`;
}

export function numpadKeyLabel(key: PumpNumpadKey): string {
  if (key === "backspace") return "Delete";
  if (key === ".") return "Decimal";
  return key;
}
