"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { adminFetch } from "@/lib/admin-api-client";

type AdminSession = {
  address: string;
};

export function useAdminAuth(connectedAddress: string | undefined, enabled: boolean) {
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await adminFetch("/api/auth/admin/me", { cache: "no-store" });
      if (!res.ok) {
        setSession(null);
        return null;
      }
      const json = (await res.json()) as { data?: AdminSession };
      const next = json.data ?? null;
      setSession(next);
      return next;
    } catch {
      setSession(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setChecking(false);
      setSession(null);
      return;
    }
    void refreshSession();
  }, [enabled, refreshSession]);

  useEffect(() => {
    if (!enabled || !connectedAddress || !session) return;
    if (session.address.toLowerCase() !== connectedAddress.toLowerCase()) {
      void (async () => {
        await adminFetch("/api/auth/admin/logout", { method: "POST" });
        setSession(null);
      })();
    }
  }, [connectedAddress, enabled, session]);

  const signIn = useCallback(async () => {
    if (!connectedAddress) return false;
    setSigningIn(true);
    setError(null);
    try {
      const nonceRes = await adminFetch(
        `/api/auth/admin/nonce?address=${encodeURIComponent(connectedAddress)}`,
        { cache: "no-store" }
      );
      const nonceJson = (await nonceRes.json()) as { data?: { message: string }; error?: string };
      if (!nonceRes.ok || !nonceJson.data?.message) {
        throw new Error(nonceJson.error ?? "Could not start sign-in");
      }

      const signature = await signMessageAsync({ message: nonceJson.data.message });
      const verifyRes = await adminFetch("/api/auth/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nonceJson.data.message, signature }),
      });
      const verifyJson = (await verifyRes.json()) as { data?: AdminSession; error?: string };
      if (!verifyRes.ok || !verifyJson.data?.address) {
        throw new Error(verifyJson.error ?? "Sign-in verification failed");
      }

      setSession({ address: verifyJson.data.address.toLowerCase() });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setSession(null);
      return false;
    } finally {
      setSigningIn(false);
    }
  }, [connectedAddress, signMessageAsync]);

  const signOut = useCallback(async () => {
    await adminFetch("/api/auth/admin/logout", { method: "POST" });
    setSession(null);
  }, []);

  const sessionReady =
    Boolean(session) &&
    Boolean(connectedAddress) &&
    session!.address.toLowerCase() === connectedAddress!.toLowerCase();

  return {
    session,
    sessionReady,
    checking,
    signingIn,
    error,
    signIn,
    signOut,
    refreshSession,
  };
}

export async function adminSignOut(): Promise<void> {
  await adminFetch("/api/auth/admin/logout", { method: "POST" });
}
