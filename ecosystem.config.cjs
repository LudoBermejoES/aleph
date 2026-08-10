module.exports = {
  apps: [
    {
      name: 'aleph',
      script: '.output/server/index.mjs',
      node_args: '--env-file=.env --import ./.output/server/sentry.server.config.mjs',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        NITRO_PORT: 3033,
        NITRO_HOST: '0.0.0.0',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      // 512M was sized before the semantic search embedding model (~800MB RSS
      // once loaded — see openspec/changes/add-semantic-search) became part of
      // this process; that model pushed it well over the old cap and caused a
      // live restart loop in production on 2026-08-10. 1500M leaves headroom
      // above the model's footprint plus normal app memory.
      max_memory_restart: '1500M',
      watch: false,
      autorestart: true,
    },
  ],
}
