import { http, type HttpTransport } from "viem";
import { getBundlerRpcUrl } from "@/lib/aa/bundler-config";

export function createBundlerTransport(): HttpTransport {
  return http(getBundlerRpcUrl());
}
