"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  applyPumpNumpadKey,
  numpadKeyLabel,
  PUMP_NUMPAD_ROWS,
  type PumpNumpadKey,
} from "@/lib/trade-numpad";

type PumpAmountNumpadProps = {
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
};

const BACKSPACE_HOLD_DELAY_MS = 350;
const BACKSPACE_REPEAT_START_MS = 90;
const BACKSPACE_REPEAT_MIN_MS = 45;

function hapticTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

export function PumpAmountNumpad({
  value,
  onValueChange,
  disabled = false,
}: PumpAmountNumpadProps) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingBackspaceRef = useRef(false);

  const clearBackspaceRepeat = useCallback(() => {
    holdingBackspaceRef.current = false;
    if (repeatTimeoutRef.current !== null) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearBackspaceRepeat, [clearBackspaceRepeat]);

  const deleteOnce = useCallback(() => {
    const current = valueRef.current;
    if (!current) return false;
    const next = applyPumpNumpadKey(current, "backspace");
    valueRef.current = next;
    onValueChange(next);
    return true;
  }, [onValueChange]);

  const scheduleBackspaceRepeat = useCallback(
    (delayMs: number) => {
      repeatTimeoutRef.current = window.setTimeout(() => {
        if (!holdingBackspaceRef.current || disabled) {
          clearBackspaceRepeat();
          return;
        }

        const deleted = deleteOnce();
        if (!deleted) {
          clearBackspaceRepeat();
          return;
        }

        const nextDelay =
          delayMs > BACKSPACE_REPEAT_MIN_MS
            ? Math.max(BACKSPACE_REPEAT_MIN_MS, delayMs - 12)
            : BACKSPACE_REPEAT_MIN_MS;
        scheduleBackspaceRepeat(nextDelay);
      }, delayMs);
    },
    [clearBackspaceRepeat, deleteOnce, disabled]
  );

  const beginBackspaceHold = useCallback(() => {
    if (disabled) return;

    clearBackspaceRepeat();
    holdingBackspaceRef.current = true;

    if (deleteOnce()) {
      hapticTap();
    }

    repeatTimeoutRef.current = window.setTimeout(() => {
      if (!holdingBackspaceRef.current) return;
      scheduleBackspaceRepeat(BACKSPACE_REPEAT_START_MS);
    }, BACKSPACE_HOLD_DELAY_MS);
  }, [clearBackspaceRepeat, deleteOnce, disabled, scheduleBackspaceRepeat]);

  const pressKey = (key: PumpNumpadKey) => {
    if (disabled) return;
    hapticTap();
    const next = applyPumpNumpadKey(valueRef.current, key);
    valueRef.current = next;
    onValueChange(next);
  };

  return (
    <div className="pump-amount-numpad" role="group" aria-label="Amount keypad">
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
                  onClick={isBackspace ? undefined : () => pressKey(key)}
                  onPointerDown={
                    isBackspace
                      ? (event) => {
                          event.preventDefault();
                          beginBackspaceHold();
                        }
                      : undefined
                  }
                  onPointerUp={isBackspace ? clearBackspaceRepeat : undefined}
                  onPointerLeave={isBackspace ? clearBackspaceRepeat : undefined}
                  onPointerCancel={isBackspace ? clearBackspaceRepeat : undefined}
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
