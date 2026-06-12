/**
 * PM2 — ui-app
 *
 *   pm2 start ecosystem.config.cjs --only pump-tma
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "pump-tma",
      cwd: "/var/www/zugchain-pump-tma/.next/standalone",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: "3012",
        HOSTNAME: "0.0.0.0",
      },
      env_file: "/var/www/zugchain-pump-tma/.env",
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
