module.exports = {
  apps: [
    {
      name: "pump-skandha",
      cwd: "/opt/skandha",
      script: "/root/.bun/bin/bun",
      args: "--bun ./packages/cli/bin/skandha.js standalone --unsafeMode",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PATH: "/root/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      },
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
    },
  ],
};
