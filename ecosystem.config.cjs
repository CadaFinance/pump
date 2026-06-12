/**
 * PM2 — pump-tma + pump-realtime
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "pump-tma",
      cwd: "/var/www/pump/tma/.next/standalone",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3012",
        HOSTNAME: "0.0.0.0",
      },
      env_file: "/var/www/pump/tma/.env",
      autorestart: true,
      max_memory_restart: "512M",
      instances: 1,
    },
    {
      name: "pump-realtime",
      cwd: "/var/www/pump/tma/realtime",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3013",
        REDIS_URL: "redis://127.0.0.1:6379",
      },
      env_file: "/var/www/pump/tma/realtime/.env",
      autorestart: true,
      max_memory_restart: "256M",
      instances: 1,
    },
  ],
};
