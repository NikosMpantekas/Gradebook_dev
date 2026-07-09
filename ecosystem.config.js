module.exports = {
  apps: [
    {
      name: 'betabackend',
      script: 'backend/server.js',
      instances: 'max', // Utilizes all available CPU cores (2 cores in your VPS)
      exec_mode: 'cluster', // Enables clustering
      watch: false,
      max_memory_restart: '350M', // Automatically restarts if memory exceeds 350MB to prevent system OOM
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000 // Replace with your target port if different
      }
    }
  ]
};
