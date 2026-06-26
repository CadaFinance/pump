"use client";

export type TradeSoundEvent = "buy_confirmed" | "sell_confirmed" | "trade_failed";

const STORAGE_KEY = "pump-trade-sounds-enabled";

let audioContext: AudioContext | null = null;
let unlocked = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function prefersReducedFeedback(): boolean {
  if (!isBrowser()) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTradeSoundEnabled(): boolean {
  if (!isBrowser()) return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "0") return false;
  return true;
}

export function setTradeSoundEnabled(enabled: boolean): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

function getAudioContext(): AudioContext | null {
  if (!isBrowser() || prefersReducedFeedback() || !isTradeSoundEnabled()) return null;
  if (!audioContext) {
    const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

/** Call once after first user gesture so autoplay policy allows SFX. */
export function unlockTradeSounds(): void {
  const ctx = getAudioContext();
  if (!ctx || unlocked) return;
  void ctx.resume().then(() => {
    unlocked = true;
  });
}

function playTone(
  frequencies: number[],
  durationSec: number,
  type: OscillatorType,
  volume = 0.08
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    gain.connect(ctx.destination);

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + index * 0.07);
      osc.connect(gain);
      osc.start(now + index * 0.07);
      osc.stop(now + durationSec + 0.02);
    });
  }).catch(() => {
    /* Autoplay blocked — silent fail. */
  });
}

export function playTradeSound(event: TradeSoundEvent): void {
  if (!isTradeSoundEnabled() || prefersReducedFeedback()) return;

  switch (event) {
    case "buy_confirmed":
      playTone([523.25, 659.25, 783.99], 0.22, "sine", 0.07);
      break;
    case "sell_confirmed":
      playTone([440, 554.37], 0.18, "triangle", 0.06);
      break;
    case "trade_failed":
      playTone([220, 185], 0.24, "square", 0.045);
      break;
  }
}

if (isBrowser()) {
  window.addEventListener(
    "pointerdown",
    () => {
      unlockTradeSounds();
    },
    { once: true, passive: true }
  );
}
