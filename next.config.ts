import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.join(__dirname);

/**
 * Telegram OIDC login + legacy widget + bundler CSP.
 * COOP must allow popup postMessage from oauth.telegram.org.
 */
const scriptSrc =
  "'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://oauth.telegram.org";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  `script-src-elem ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https: wss: https://oauth.telegram.org",
  "child-src 'self' https://oauth.telegram.org https://telegram.org",
  "frame-src 'self' https://oauth.telegram.org https://telegram.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://oauth.telegram.org",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
