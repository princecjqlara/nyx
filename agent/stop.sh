#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════
#  NYX Auto-Caller — Stop All Services
# ═══════════════════════════════════════════

echo "Stopping Nyx services..."

# Kill by process name
pkill -f "next start" 2>/dev/null || pkill -f "next dev" 2>/dev/null
pkill -f "appium" 2>/dev/null
pkill -f "caller.py" 2>/dev/null

echo "✓ All services stopped"
