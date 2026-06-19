import { pumpChain } from "@/config/chain";
import { zeroDevProjectId } from "@/lib/zerodev-config";
import { http, type HttpTransport } from "viem";

/** ZeroDev bundler RPC (UserOp relay only — no paymaster). */
export function getZeroDevBundlerUrl(chainId: number = pumpChain.id): string {
  return `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${chainId}`;
}

export function createZeroDevBundlerTransport(chainId: number = pumpChain.id): HttpTransport {
  return http(getZeroDevBundlerUrl(chainId));
}
