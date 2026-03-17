#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════
#  NYX Auto-Caller — One-Time Setup
#  Run this ONCE to install everything
# ═══════════════════════════════════════════

set -e
echo "╔══════════════════════════════════════════╗"
echo "║    NYX Auto-Caller · Termux Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Update packages
echo "[1/6] Updating Termux packages..."
pkg update -y && pkg upgrade -y

# 2. Install Node.js & Python
echo "[2/6] Installing Node.js, Python, and tools..."
pkg install -y nodejs python git termux-api

# 3. Install Appium globally
echo "[3/6] Installing Appium + UiAutomator2 driver..."
npm install -g appium
appium driver install uiautomator2

# 4. Install Python dependencies
echo "[4/6] Installing Python dependencies..."
pip install -r requirements.txt

# 5. Install the Nyx web server dependencies
echo "[5/6] Installing Nyx server dependencies..."
cd ..
npm install --production
cd agent

# 6. Grant storage permission
echo "[6/6] Setting up permissions..."
termux-setup-storage || true

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ Setup complete!"
echo ""
echo "  To start Nyx, run:"
echo "    bash start.sh"
echo "═══════════════════════════════════════════"
