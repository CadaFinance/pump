"use client";

const PRESET_PERCENTS = [25, 50, 75] as const;

type PumpAmountPresetsProps = {
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

export function PumpAmountPresets({
  onPresetPercent,
  onMax,
  activePreset = null,
  maxDisabled = false,
  presetsDisabled = false,
  disabled = false,
  side = "buy",
}: PumpAmountPresetsProps) {
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
      className={`pump-amount-presets pump-amount-presets--${side}`}
      role="group"
      aria-label="Quick amount"
    >
      {PRESET_PERCENTS.map((pct) => (
        <button
          key={pct}
          type="button"
          className={
            activePreset === pct
              ? "pump-amount-presets__btn pump-amount-presets__btn--active"
              : "pump-amount-presets__btn"
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
            ? "pump-amount-presets__btn pump-amount-presets__btn--active"
            : "pump-amount-presets__btn"
        }
        disabled={disabled || maxDisabled}
        aria-pressed={activePreset === "max"}
        onClick={pressMax}
      >
        Max
      </button>
    </div>
  );
}
