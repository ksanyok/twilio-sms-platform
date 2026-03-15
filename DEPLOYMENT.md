# Production Deployment Guide — SCL SMS Platform

## Current Hosting: vibeadd.ftp.tools (CloudLinux Shared)

**URL**: https://twiliosmstest.vibeadd.com  
**Server directory**: `~/sms-platform/` (isolated from main site)  
**Admin**: `admin@twiliosms.demo`

### Architecture

```
Internet → Apache/PHP Proxy (api.php) → Node.js :3003 (~/sms-platform/)
                                          ↓
                                    MySQL + Redis (unix socket)
```

- The SMS platform runs from `~/sms-platform/` — fully isolated from the main VibeADD site
- `lve_suwrapper` auto-restarts the Node.js process; `~/.bashrc` redirects `cd` to the isolated dir
- Frontend static files served from `~/vibeadd.com/twiliosmstest/`
- API proxied through `~/vibeadd.com/twiliosmstest/api.php` to `http://127.0.0.1:3003`

---

## Quick Deploy

```bash
# From project root
./scripts/deploy.sh
```

This will:

1. Build TypeScript locally (`npx tsc`)
2. Create and upload `dist/` archive to server
3. Upload `package.json` and `prisma/schema.prisma`
4. Run `npm install --production` and `npx prisma generate` on server
5. Restart the Node.js process (auto-restarted by `lve_suwrapper`)

---

## Manual Deploy

```bash
# 1. Build locally
cd server && npx tsc

# 2. Package
tar czf /tmp/sms-dist.tar.gz dist/

# 3. Upload (use sshpass or enter password)
SSH="ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no"
SCP="scp -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no"

$SCP /tmp/sms-dist.tar.gz vibeadd@vibeadd.ftp.tools:~/sms-platform/
$SCP server/package.json vibeadd@vibeadd.ftp.tools:~/sms-platform/
$SCP server/prisma/schema.prisma vibeadd@vibeadd.ftp.tools:~/sms-platform/prisma/

# 4. Install on server
$SSH vibeadd@vibeadd.ftp.tools "cd ~/sms-platform && rm -rf dist && tar xzf sms-dist.tar.gz && rm sms-dist.tar.gz && npm install --production && npx prisma generate --schema=prisma/schema.prisma"

# 5. Restart
$SSH vibeadd@vibeadd.ftp.tools "pkill -f 'node.*max-old.*dist/index' || true"
# lve_suwrapper auto-restarts in ~10s
```

---

## Frontend Deploy

```bash
cd client && npm run build
# Upload built files
$SCP -r dist/* vibeadd@vibeadd.ftp.tools:~/vibeadd.com/twiliosmstest/
```

---

## Server Isolation

The SMS platform is isolated in `~/sms-platform/` to prevent the main VibeADD site from interfering. The `.bashrc` contains a `cd` override that redirects the `lve_suwrapper` process from `~/vibeadd.com/server/` to `~/sms-platform/`.

**Never** put SMS platform files in `~/vibeadd.com/server/` — that directory is shared with the main site.

---

## Troubleshooting

| Problem             | Solution                                                             |
| ------------------- | -------------------------------------------------------------------- |
| 502 Bad Gateway     | Check if node process is running: `ps aux \| grep node`              |
| Server not starting | Check logs: `tail -f ~/sms-platform/logs/combined.log`               |
| Wrong code running  | Verify: `head -3 ~/sms-platform/dist/index.js`                       |
| SSH rate limited    | Wait 2-3 min between connections                                     |
| Files overwritten   | SMS code should be in `~/sms-platform/`, not `~/vibeadd.com/server/` |

---

## Database

- **MySQL**: `vibeadd.mysql.tools:3306`
- **Redis**: unix socket at `~/.system/redis.sock`

---

## Twilio Webhooks

- **Incoming**: `https://twiliosmstest.vibeadd.com/api/webhooks/twilio/incoming` (POST)
- **Status**: `https://twiliosmstest.vibeadd.com/api/webhooks/twilio/status` (POST)

---

## Docker Deployment (Alternative)

For Docker-based deployment on a VPS, see the `docker-compose.yml` and `Dockerfile` in the project root.
