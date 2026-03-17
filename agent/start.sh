#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════
#  NYX Auto-Caller — Start All Services
#  Starts: API Server + Appium + Caller Agent
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

# Config — edit these
export NYX_API_URL="http://127.0.0.1:3000"
export NYX_AI_SERVER="${NYX_AI_SERVER:-http://your-gpu-server:8000}"
export NYX_APPIUM_URL="http://127.0.0.1:4723"
export NYX_POLL_INTERVAL="${NYX_POLL_INTERVAL:-5}"
export NYX_RING_TIMEOUT="${NYX_RING_TIMEOUT:-30}"
export NYX_CALL_TIMEOUT="${NYX_CALL_TIMEOUT:-60}"
export NYX_CALL_DELAY="${NYX_CALL_DELAY:-10}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    NYX Auto-Caller · Phone Server        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down all services...${NC}"
    kill $API_PID $APPIUM_PID $AGENT_PID 2>/dev/null
    wait $API_PID $APPIUM_PID $AGENT_PID 2>/dev/null
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── 1. Start Next.js API Server ───
echo -e "${GREEN}[1/3]${NC} Starting API server on port 3000..."
cd "$PROJECT_DIR"
PORT=3000 npx next start -p 3000 > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
sleep 3

if kill -0 $API_PID 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} API server running (PID: $API_PID)"
else
    echo -e "  ${RED}✗${NC} API server failed to start. Check $LOG_DIR/api.log"
    # Fallback: try dev mode
    echo -e "  ${YELLOW}→${NC} Trying dev mode..."
    npm run dev > "$LOG_DIR/api.log" 2>&1 &
    API_PID=$!
    sleep 5
fi

# ─── 2. Start Appium Server ───
echo -e "${GREEN}[2/3]${NC} Starting Appium server on port 4723..."
appium --relaxed-security --port 4723 --log-no-colors > "$LOG_DIR/appium.log" 2>&1 &
APPIUM_PID=$!
sleep 5

if kill -0 $APPIUM_PID 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Appium server running (PID: $APPIUM_PID)"
else
    echo -e "  ${RED}✗${NC} Appium failed to start. Check $LOG_DIR/appium.log"
fi

# ─── 3. Start Caller Agent ───
echo ""
echo -e "${GREEN}[3/3]${NC} Starting caller agent..."
sleep 2
cd "$SCRIPT_DIR"
python caller.py 2>&1 | tee "$LOG_DIR/agent.log" &
AGENT_PID=$!

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "  ${GREEN}All services running!${NC}"
echo ""
echo -e "  API Server:    ${CYAN}http://127.0.0.1:3000${NC}  (PID: $API_PID)"
echo -e "  Appium Server: ${CYAN}http://127.0.0.1:4723${NC}  (PID: $APPIUM_PID)"
echo -e "  Caller Agent:  ${CYAN}Running${NC}               (PID: $AGENT_PID)"
echo ""
echo -e "  Logs:          ${YELLOW}$LOG_DIR/${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Wait for agent (foreground process)
wait $AGENT_PID
