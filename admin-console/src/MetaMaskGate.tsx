import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";
import { isAdminWallet } from "@/config/admin";
import { shortAddress } from "@/config/chain";

function hasBrowserProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function MetaMaskGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const connectors = useConnectors();
  const { connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const walletConnector = connectors[0];

  if (isConnecting || isPending) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center">
        <p className="admin-meta">Connecting wallet…</p>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="admin-page flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="admin-title">Pump Admin</h1>
        <p className="admin-meta max-w-md text-center">
          Connect the ops wallet ({`NEXT_PUBLIC_ADMIN_ADDRESS`}) via your browser extension.
        </p>
        {!hasBrowserProvider() ? (
          <p className="admin-status-bad max-w-md text-center text-caption">
            No wallet extension detected. Install MetaMask and refresh, or disable other wallet
            extensions blocking <code className="admin-num">window.ethereum</code>.
          </p>
        ) : null}
        <button
          type="button"
          className="admin-btn"
          disabled={!walletConnector}
          onClick={() => {
            if (!walletConnector) return;
            connect({ connector: walletConnector });
          }}
        >
          Connect wallet
        </button>
        {connectError ? (
          <p className="admin-status-bad max-w-md text-center text-caption">{connectError.message}</p>
        ) : null}
      </div>
    );
  }

  if (!isAdminWallet(address)) {
    return (
      <div className="admin-page flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <p className="admin-title">Not authorized</p>
        <p className="admin-meta">
          Connected {shortAddress(address)} is not the configured admin wallet.
        </p>
        <button type="button" className="admin-btn" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page border-b border-pump-border/40 px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <span className="admin-meta">
            Admin · <span className="admin-num">{shortAddress(address)}</span>
          </span>
          <button type="button" className="admin-btn" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
