import { useEffect, useState } from "react";

/** Detect injected wallet (MetaMask) — may appear after first paint behind Cloudflare. */
export function useBrowserWalletProvider(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function detect(): boolean {
      return "ethereum" in window && Boolean(window.ethereum);
    }

    if (detect()) {
      setReady(true);
      return;
    }

    const onEthereum = () => {
      if (detect()) setReady(true);
    };

    window.addEventListener("ethereum#initialized", onEthereum);

    const onAnnounce = () => {
      if (detect()) setReady(true);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const timer = window.setInterval(() => {
      if (detect()) {
        setReady(true);
        window.clearInterval(timer);
      }
    }, 250);

    const timeout = window.setTimeout(() => window.clearInterval(timer), 5000);

    return () => {
      window.removeEventListener("ethereum#initialized", onEthereum);
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, []);

  return ready;
}
