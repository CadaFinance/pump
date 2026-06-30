"use client";

import {
  applyPumpNumpadKey,
  numpadKeyLabel,
  PUMP_NUMPAD_ROWS,
  type PumpNumpadKey,
} from "@/lib/trade-numpad";

const PRESET_PERCENTS = [25, 50, 75] as const;

type PumpAmountNumpadProps = {
  value: string;
  onValueChange: (next: string) => void;
  onPresetPercent?: (pct: number) => void;
  onMax?: () => void;
  activePreset?: number | "max" | null;
  maxDisabled?: boolean;
  presetsDisabled?: boolean;
  disabled?: boolean;
  side?: "buy" | "sell";
};

function hapticTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

export function PumpAmountNumpad({
  value,
  onValueChange,
  onPresetPercent,
  onMax,
  activePreset = null,
  maxDisabled = false,
  presetsDisabled = false,
  disabled = false,
  side = "buy",
}: PumpAmountNumpadProps) {
  const pressKey = (key: PumpNumpadKey) => {
    if (disabled) return;
    hapticTap();
    onValueChange(applyPumpNumpadKey(value, key));
  };

  const pressPreset = (pct: number) => {
    if (disabled || presetsDisabled) return;
    hapticTap();
    onPresetPercent?.(pct);
  };

  const pressMax = () => {
    if (disabled || maxDisabled) return;
    hapticTap();
    onMax?.();
  };

  return (
    <div
      className={`pump-amount-numpad pump-amount-numpad--${side}`}
      role="group"
      aria-label="Amount keypad"
    >
      <div className="pump-amount-numpad__presets" role="group" aria-label="Quick amount">
        {PRESET_PERCENTS.map((pct) => (
          <button
            key={pct}
            type="button"
            className={
              activePreset === pct
                ? "pump-amount-numpad__preset pump-amount-numpad__preset--active"
                : "pump-amount-numpad__preset"
            }
            disabled={disabled || presetsDisabled}
            aria-pressed={activePreset === pct}
            onClick={() => pressPreset(pct)}
          >
            {pct}%
          </button>
        ))}
        <button
          type="button"
          className={
            activePreset === "max"
              ? "pump-amount-numpad__preset pump-amount-numpad__preset--active"
              : "pump-amount-numpad__preset"
          }
          disabled={disabled || maxDisabled}
          aria-pressed={activePreset === "max"}
          onClick={pressMax}
        >
          Max
        </button>
      </div>

      <div className="pump-amount-numpad__grid">
        {PUMP_NUMPAD_ROWS.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="pump-amount-numpad__row">
            {row.map((key) => {
              if (!key) return <span key={`empty-${rowIndex}`} className="pump-amount-numpad__spacer" />;
              const isBackspace = key === "backspace";
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    isBackspace
                      ? "pump-amount-numpad__key pump-amount-numpad__key--backspace"
                      : "pump-amount-numpad__key"
                  }
                  disabled={disabled}
                  aria-label={numpadKeyLabel(key)}
                  onClick={() => pressKey(key)}
                >
                  {isBackspace ? (
                    <span className="pump-amount-numpad__backspace" aria-hidden>
                      ⌫
                    </span>
                  ) : (
                    key
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
