import { AdminPanel } from "@/components/admin/AdminPanel";
import { MetaMaskGate } from "./MetaMaskGate";

export function App() {
  return (
    <MetaMaskGate>
      <AdminPanel />
    </MetaMaskGate>
  );
}
