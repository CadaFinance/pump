"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KernelAccountClient } from "@zerodev/sdk";
import type { Address } from "viem";
import { useDisconnect } from "wagmi";
import {
  createEmailKernelSession,
  type EmailAccountSession,
} from "@/lib/aa/email-account";
import { withdrawFromKernelClient } from "@/lib/aa/kernel-account";
import {
  clearZeroDevConnectorSession,
  setZeroDevConnectorSession,
} from "@/lib/wagmi";
import { EmailLoginModal } from "@/components/wallet/EmailLoginModal";

type PumpWalletContextValue = {
  ready: boolean;
  authenticated: boolean;
  email: string | undefined;
  scwAddress: Address | undefined;
  kernelClient: KernelAccountClient | null;
  login: () => void;
  logout: () => Promise<void>;
  withdraw: (to: Address, value: bigint) => Promise<`0x${string}`>;
};

const PumpWalletContext = createContext<PumpWalletContextValue | null>(null);

export function usePumpWallet() {
  const ctx = useContext(PumpWalletContext);
  if (!ctx) {
    throw new Error("usePumpWallet must be used within PumpWalletProvider");
  }
  return ctx;
}

const noopAsync = async () => {
  throw new Error("Configure NEXT_PUBLIC_ZERODEV_PROJECT_ID");
};

const stubPumpWallet: PumpWalletContextValue = {
  ready: true,
  authenticated: false,
  email: undefined,
  scwAddress: undefined,
  kernelClient: null,
  login: () => {},
  logout: noopAsync,
  withdraw: noopAsync,
};

export function PumpWalletProviderStub({ children }: { children: ReactNode }) {
  return (
    <PumpWalletContext.Provider value={stubPumpWallet}>{children}</PumpWalletContext.Provider>
  );
}

const EMAIL_SESSION_KEY = "pump-email-session";

export function PumpWalletProvider({ children }: { children: ReactNode }) {
  const { disconnect } = useDisconnect();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [scwAddress, setScwAddress] = useState<Address | undefined>();
  const [kernelClient, setKernelClient] = useState<KernelAccountClient | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const applySession = useCallback((session: EmailAccountSession) => {
    setZeroDevConnectorSession(session.provider, session.scwAddress);
    setEmail(session.email);
    setScwAddress(session.scwAddress);
    setKernelClient(session.kernelClient);
    setAuthenticated(true);
    try {
      localStorage.setItem(EMAIL_SESSION_KEY, session.email);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const savedEmail = localStorage.getItem(EMAIL_SESSION_KEY);
        if (savedEmail) {
          const session = await createEmailKernelSession(savedEmail);
          if (!cancelled) applySession(session);
        }
      } catch {
        try {
          localStorage.removeItem(EMAIL_SESSION_KEY);
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(() => {
    setLoginModalOpen(true);
  }, []);

  const onEmailSuccess = useCallback(
    (session: EmailAccountSession) => {
      applySession(session);
      setLoginModalOpen(false);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    clearZeroDevConnectorSession();
    setEmail(undefined);
    setScwAddress(undefined);
    setKernelClient(null);
    setAuthenticated(false);
    try {
      localStorage.removeItem(EMAIL_SESSION_KEY);
    } catch {
      // ignore
    }
    disconnect();
  }, [disconnect]);

  const withdraw = useCallback(
    async (to: Address, value: bigint) => {
      if (!kernelClient) {
        throw new Error("Sign in to withdraw.");
      }
      return withdrawFromKernelClient(kernelClient, to, value);
    },
    [kernelClient]
  );

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      email,
      scwAddress,
      kernelClient,
      login,
      logout,
      withdraw,
    }),
    [ready, authenticated, email, scwAddress, kernelClient, login, logout, withdraw]
  );

  const savedEmail = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(EMAIL_SESSION_KEY) ?? "";
    } catch {
      return "";
    }
  }, [loginModalOpen]);

  return (
    <PumpWalletContext.Provider value={value}>
      {children}
      <EmailLoginModal
        open={loginModalOpen}
        initialEmail={savedEmail}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={onEmailSuccess}
      />
    </PumpWalletContext.Provider>
  );
}
