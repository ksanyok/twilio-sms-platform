#!/bin/bash
set -euo pipefail

# ============================================
# SCL SMS Platform — Shared Hosting Deploy
# ============================================
# Deploys to ~/sms-platform/ on the shared hosting server.
# The SMS platform is isolated from the main VibeADD site.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─── Configuration ───
SSH_HOST="${SSH_HOST:-vibeadd@vibeadd.ftp.tools}"
SSH_OPTS="-o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no"
REMOTE_DIR="sms-platform"
HEALTH_URL="https://twiliosmstest.vibeadd.com/api/health"

# Resolve project root (script is in scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} SCL SMS Platform — Deploy${NC}"
echo -e "${GREEN}========================================${NC}"

# ─── Step 1: Build TypeScript ───
echo -e "\n${YELLOW}[1/5] Building server...${NC}"
cd "$SERVER_DIR"
npx tsc
echo -e "${GREEN}✓ TypeScript compiled${NC}"

# ─── Step 2: Create tar archive ───
echo -e "\n${YELLOW}[2/5] Packaging dist/...${NC}"
ARCHIVE="/tmp/sms-dist.tar.gz"
tar czf "$ARCHIVE" dist/
echo -e "${GREEN}✓ Archive created: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))${NC}"

# ─── Step 3: Upload to server ───
echo -e "\n${YELLOW}[3/5] Uploading to server...${NC}"
scp $SSH_OPTS "$ARCHIVE" "${SSH_HOST}:~/${REMOTE_DIR}/sms-dist.tar.gz"
echo -e "${GREEN}✓ Archive uploaded${NC}"

# Also upload package.json and prisma schema if changed
scp $SSH_OPTS "$SERVER_DIR/package.json" "${SSH_HOST}:~/${REMOTE_DIR}/package.json"
scp $SSH_OPTS "$SERVER_DIR/prisma/schema.prisma" "${SSH_HOST}:~/${REMOTE_DIR}/prisma/schema.prisma"
echo -e "${GREEN}✓ Config files uploaded${NC}"

# ─── Step 4: Extract & install on server ───
echo -e "\n${YELLOW}[4/5] Installing on server...${NC}"
sleep 5
ssh $SSH_OPTS "$SSH_HOST" bash -s << 'REMOTE'
set -e
cd ~/sms-platform

# Extract new dist
rm -rf dist
tar xzf sms-dist.tar.gz
rm sms-dist.tar.gz

# Install dependencies
npm install --production --silent 2>&1 | tail -3

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma 2>&1 | tail -3

echo "Server files updated"
REMOTE
echo -e "${GREEN}✓ Server updated${NC}"

# ─── Step 5: Restart & verify ───
echo -e "\n${YELLOW}[5/5] Restarting server...${NC}"
sleep 5
ssh $SSH_OPTS "$SSH_HOST" "pkill -f 'node.*max-old.*dist/index' 2>/dev/null || true"
echo "Waiting for auto-restart..."
sleep 15

HEALTH=$(curl -s "$HEALTH_URL" 2>/dev/null || echo "failed")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check: $HEALTH${NC}"
    echo "  Server may need more time to start. Check manually."
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  URL: https://twiliosmstest.vibeadd.com"
echo "  Logs: ssh $SSH_HOST \"tail -f ~/sms-platform/logs/combined.log\""
echo ""
echo "Logs: docker compose logs -f"
