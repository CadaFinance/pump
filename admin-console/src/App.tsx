import { AdminPanel } from "@/components/admin/AdminPanel";
import { PumpWalletProviderStub } from "@/components/wallet/PumpWalletProvider";
import { MetaMaskGate } from "./MetaMaskGate";

export function App() {
  return (
    <PumpWalletProviderStub>
      <MetaMaskGate>
        <AdminPanel />
      </MetaMaskGate>
    </PumpWalletProviderStub>
  );
}
