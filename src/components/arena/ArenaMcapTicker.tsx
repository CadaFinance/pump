"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { TokenListItem } from "@/lib/db/launchpad";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import { formatSignedPct, pctTone } from "@/lib/arena-board-format";

const MCAP_TICKER_LIMIT = 20;

type ArenaMcapTickerProps = {
  tokens: TokenListItem[];
};

function TickerItem({ token }: { token: TokenListItem }) {
  const symbolLabel = `$${token.symbol}`;

  return (
    <Link href={`/token/${token.address}`} className="mcap-ticker-item">
      <TokenAvatar
        address={token.address}
        symbol={token.symbol}
        logoUrl={token.logoUrl}
        size={18}
      />
      <span className="mcap-ticker-symbol">{symbolLabel}</span>
      <span
        className={`financial-value mcap-ticker-pct ${pctTone(token.change24hPct ?? null)}`}
      >
        {formatSignedPct(token.change24hPct ?? null)}
      </span>
    </Link>
  );
}

function repeatTokens(source: TokenListItem[], repeats: number): TokenListItem[] {
  const out: TokenListItem[] = [];
  for (let i = 0; i < repeats; i += 1) {
    out.push(...source);
  }
  return out;
}

function measureSegmentShift(first: HTMLElement, second: HTMLElement): number {
  const firstRect = first.getBoundingClientRect();
  const secondRect = second.getBoundingClientRect();
  const shift = secondRect.left - firstRect.left;
  if (shift > 0) return Math.round(shift);

  const width = firstRect.width;
  if (width <= 0) return 0;

  const track = first.parentElement;
  if (!track) return width;

  const gapValue = getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0px";
  const gap = Number.parseFloat(gapValue) || 0;
  return Math.round(width + gap);
}

export function ArenaMcapTicker({ tokens }: ArenaMcapTickerProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const segmentDupRef = useRef<HTMLDivElement>(null);
  const [loopTokens, setLoopTokens] = useState<TokenListItem[]>([]);
  const [shiftPx, setShiftPx] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const topTokens = useMemo(() => tokens.slice(0, MCAP_TICKER_LIMIT), [tokens]);

  useLayoutEffect(() => {
    if (reducedMotion) {
      setLoopTokens(topTokens);
      setShiftPx(0);
      return;
    }

    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure || topTokens.length === 0) return;

    const syncLoopTokens = () => {
      const unitWidth = measure.scrollWidth;
      const viewportWidth = viewport.clientWidth;
      if (unitWidth <= 0 || viewportWidth <= 0) {
        setLoopTokens(topTokens);
        return;
      }

      let repeats = 1;
      while (unitWidth * repeats < viewportWidth) {
        repeats += 1;
      }

      setLoopTokens(repeatTokens(topTokens, repeats));
    };

    syncLoopTokens();
    const ro = new ResizeObserver(syncLoopTokens);
    ro.observe(viewport);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [topTokens, reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion || loopTokens.length === 0) {
      setShiftPx(0);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const measureLoop = () => {
      const first = segmentRef.current;
      const second = segmentDupRef.current;
      if (!first || !second) return;

      const shift = measureSegmentShift(first, second);
      if (shift > 0) {
        if (!cancelled) setShiftPx(shift);
        return;
      }

      retryTimer = setTimeout(() => {
        if (cancelled) return;
        const retryFirst = segmentRef.current;
        const retrySecond = segmentDupRef.current;
        if (!retryFirst || !retrySecond) return;
        const retryShift = measureSegmentShift(retryFirst, retrySecond);
        if (retryShift > 0) setShiftPx(retryShift);
      }, 120);
    };

    measureLoop();
    const raf = requestAnimationFrame(() => {
      measureLoop();
    });

    const ro = new ResizeObserver(measureLoop);
    if (segmentRef.current) ro.observe(segmentRef.current);
    if (segmentDupRef.current) ro.observe(segmentDupRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (retryTimer) clearTimeout(retryTimer);
      ro.disconnect();
    };
  }, [loopTokens, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || shiftPx <= 0) return;

    const track = trackRef.current;
    if (!track) return;

    // Safari sometimes skips CSS animation when the class/var is applied after first paint.
    track.style.animation = "none";
    void track.offsetHeight;
    track.style.removeProperty("animation");
  }, [shiftPx, reducedMotion]);

  if (topTokens.length === 0) return null;

  const loopReady = !reducedMotion && loopTokens.length > 0 && shiftPx > 0;
  const viewportStyle = loopReady
    ? ({ "--mcap-ticker-shift": `-${shiftPx}px` } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`mcap-ticker${reducedMotion ? " mcap-ticker-static" : ""}`}
      role="region"
      aria-label="Top market cap tokens"
    >
      <div className="sr-only" aria-live="off">
        Top tokens by market cap:{" "}
        {topTokens.map((token) => `$${token.symbol}`).join(", ")}
      </div>
      <div ref={viewportRef} className="mcap-ticker-viewport" style={viewportStyle}>
        <div ref={measureRef} className="mcap-ticker-measure" aria-hidden>
          {topTokens.map((token) => (
            <TickerItem key={`measure-${token.address}`} token={token} />
          ))}
        </div>
        <div
          ref={trackRef}
          className={`mcap-ticker-track${loopReady ? " mcap-ticker-track--ready" : ""}`}
        >
          <div ref={segmentRef} className="mcap-ticker-segment">
            {(loopTokens.length > 0 ? loopTokens : topTokens).map((token, index) => (
              <TickerItem key={`a-${token.address}-${index}`} token={token} />
            ))}
          </div>
          {reducedMotion ? null : (
            <div ref={segmentDupRef} className="mcap-ticker-segment" aria-hidden>
              {(loopTokens.length > 0 ? loopTokens : topTokens).map((token, index) => (
                <TickerItem key={`b-${token.address}-${index}`} token={token} />
              ))}
            </div>
          )}
        </div>
      </div>
      {reducedMotion ? (
        <div className="mcap-ticker-static-row">
          {topTokens.map((token) => (
            <TickerItem key={token.address} token={token} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
