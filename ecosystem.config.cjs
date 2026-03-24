module.exports = {
  apps: [{
    name: 'aleph',
    script: '.output/server/index.mjs',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      NITRO_PORT: 3000,
      NITRO_HOST: '0.0.0.0',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    max_memory_restart: '512M',
    watch: false,
    autorestart: true,
  }],
}
