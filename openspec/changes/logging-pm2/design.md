# Design: Logging & Process Management

## Technical Approach

### Winston Logger

Centralized logger in `server/utils/logger.ts`:

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [
    new winston.transports.Console(),
    // Production: rotate daily, keep 14 days
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 10485760, maxFiles: 14 }),
      new winston.transports.File({ filename: 'logs/combined.log', maxsize: 10485760, maxFiles: 14 }),
    ] : []),
  ],
})
```

### Log Levels

| Level | Usage |
| ----- | ----- |
| error | Unhandled errors, failed migrations, crash conditions |
| warn | Deprecated usage, permission denials, rate limits |
| info | Server start/stop, migration applied, user login, campaign created |
| http | Request/response logging (method, path, status, duration) |
| debug | Query details, auto-linking processing, filesystem watcher events |

### PM2 Ecosystem Config

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'aleph',
    script: '.output/server/index.mjs',
    instances: 1,           // SQLite is single-writer, no clustering
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      NITRO_PORT: 3000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    max_memory_restart: '512M',
    watch: false,
    autorestart: true,
  }]
}
```

### Request Logging Middleware

`server/middleware/00.logger.ts` -- runs before auth middleware:
- Logs HTTP method, path, status code, response time
- Uses `http` log level
- Excludes static assets and health checks from logging

### Audit Logger

Separate Winston transport for security-sensitive events:
- User login/logout (success and failure)
- Role changes
- Permission grants/revokes
- Campaign creation/deletion
- Entity visibility changes

Written to `logs/audit.log` in structured JSON, never rotated (retained indefinitely).

### Dockerfile Update

Replace `CMD ["node", ".output/server/index.mjs"]` with:
```dockerfile
RUN npm install -g pm2
CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]
```

`pm2-runtime` is the Docker-optimized PM2 runner (keeps foreground, handles signals).
