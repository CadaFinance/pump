"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WalletFundingModal } from "@/components/wallet/WalletFundingModal";
import { startScwDepositWatch } from "@/lib/scw-balance-sync";

export type WalletFundingView = "choice" | "deposit" | "withdraw";

export type WalletFundingOptions = {
  title?: string;
  message?: string;
  initialView?: WalletFundingView;
};

type WalletFundingContextValue = {
  openDeposit: () => void;
  openWithdraw: () => void;
  openFundChoice: (options?: WalletFundingOptions) => void;
};

const WalletFundingContext = createContext<WalletFundingContextValue | null>(null);

export function useWalletFunding() {
  const ctx = useContext(WalletFundingContext);
  if (!ctx) {
    throw new Error("useWalletFunding must be used within WalletFundingProvider");
  }
  return ctx;
}

export function WalletFundingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WalletFundingView>("choice");
  const [options, setOptions] = useState<WalletFundingOptions>({});
  const [canReturnToChoice, setCanReturnToChoice] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const openDeposit = useCallback(() => {
    setOptions({});
    setCanReturnToChoice(false);
    setView("deposit");
    setOpen(true);
    startScwDepositWatch();
  }, []);

  const openWithdraw = useCallback(() => {
    setOptions({});
    setCanReturnToChoice(false);
    setView("withdraw");
    setOpen(true);
  }, []);

  const openFundChoice = useCallback((opts?: WalletFundingOptions) => {
    setOptions(opts ?? {});
    setCanReturnToChoice(true);
    setView(opts?.initialView ?? "choice");
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      openDeposit,
      openWithdraw,
      openFundChoice,
    }),
    [openDeposit, openWithdraw, openFundChoice]
  );

  return (
    <WalletFundingContext.Provider value={value}>
      {children}
      <WalletFundingModal
        open={open}
        view={view}
        options={options}
        canReturnToChoice={canReturnToChoice}
        onClose={close}
        onViewChange={setView}
      />
    </WalletFundingContext.Provider>
  );
}
