"use client";

import { useCallback } from "react";
import { modal } from "@reown/appkit/react";
import "@/lib/appkit";

export function useOpenConnectModal() {
  const openConnectModal = useCallback(() => {
    void modal?.open();
  }, []);

  return { openConnectModal };
}
