module.exports = {
  apps: [
    {
      name: "betabackend",
      script: "backend/server.js",
      node_args: "--env-file=.env",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "350M",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
