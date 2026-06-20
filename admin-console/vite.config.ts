import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..");
  const env = loadEnv(mode, repoRoot, "");

  const chainId = env.NEXT_PUBLIC_CHAIN_ID ?? "97";
  const rpcUrl =
    env.NEXT_PUBLIC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545";
  const tmaPort = env.VITE_PUMP_API_PORT ?? env.PORT ?? "3012";
  const apiTarget = env.VITE_PUMP_API_URL ?? `http://127.0.0.1:${tmaPort}`;

  return {
    plugins: [react()],
    resolve: {
      dedupe: ["viem", "wagmi", "@tanstack/react-query", "react", "react-dom"],
      alias: {
        "@": path.resolve(repoRoot, "src"),
        "next/link": path.resolve(__dirname, "src/shims/next-link.tsx"),
        viem: path.resolve(__dirname, "node_modules/viem"),
        wagmi: path.resolve(__dirname, "node_modules/wagmi"),
      },
    },
    define: {
      "process.env.NEXT_PUBLIC_CHAIN_ID": JSON.stringify(chainId),
      "process.env.NEXT_PUBLIC_RPC_URL": JSON.stringify(rpcUrl),
      "process.env.NEXT_PUBLIC_MEME_FACTORY": JSON.stringify(env.NEXT_PUBLIC_MEME_FACTORY ?? ""),
      "process.env.NEXT_PUBLIC_BONDING_CURVE_MANAGER": JSON.stringify(
        env.NEXT_PUBLIC_BONDING_CURVE_MANAGER ?? ""
      ),
      "process.env.NEXT_PUBLIC_AIRDROP_MANAGER": JSON.stringify(
        env.NEXT_PUBLIC_AIRDROP_MANAGER ?? ""
      ),
      "process.env.NEXT_PUBLIC_ADMIN_ADDRESS": JSON.stringify(
        env.NEXT_PUBLIC_ADMIN_ADDRESS ?? ""
      ),
      "process.env.NEXT_PUBLIC_LAUNCHPAD_TREASURY": JSON.stringify(
        env.NEXT_PUBLIC_LAUNCHPAD_TREASURY ?? ""
      ),
    },
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
