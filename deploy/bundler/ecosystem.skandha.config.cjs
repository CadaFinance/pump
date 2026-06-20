module.exports = {
  apps: [
    {
      name: "pump-skandha",
      cwd: "/opt/skandha",
      script: "./skandha",
      args: "standalone --unsafeMode",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
        PATH: `${process.env.HOME}/.bun/bin:/usr/local/bin:/usr/bin:/bin`,
      },
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
    },
  ],
};
