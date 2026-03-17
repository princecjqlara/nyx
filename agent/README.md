# Nyx Phone Agent — Appium + Viber Setup

## Architecture

```
┌─────────────────────────────────┐
│      Appium Server (Node.js)    │
│      localhost:4723             │
└──────────┬──────────────────────┘
           │ UiAutomator2
           ▼
┌─────────────────────────────────┐
│      Android Device             │
│  ┌───────────┐  ┌────────────┐  │
│  │   Viber   │  │  Mic/Audio │  │
│  └───────────┘  └────────────┘  │
└──────────┬──────────────────────┘
           │ Audio Stream
           ▼
┌─────────────────────────────────┐
│   AI Server (GPU)               │
│   Whisper → LLM → Piper        │
└─────────────────────────────────┘
```

## Option A: Run on PC (controls phone via USB)

### 1. Install Appium
```bash
npm install -g appium
appium driver install uiautomator2
```

### 2. Connect Android phone
- Enable **Developer Options** → **USB Debugging**
- Connect via USB
- Verify: `adb devices` should list your device

### 3. Install Python deps
```bash
pip install -r requirements.txt
```

### 4. Start Appium server
```bash
appium --relaxed-security
```

### 5. Run the agent
```bash
export NYX_API_URL="https://your-nyx-app.vercel.app"
export NYX_AI_SERVER="http://your-gpu-server:8000"
python caller.py
```

---

## Option B: Run on Termux (phone controls itself)

### 1. Install Termux packages
```bash
pkg update && pkg upgrade
pkg install python nodejs
pip install -r requirements.txt
npm install -g appium
appium driver install uiautomator2
```

### 2. Configure environment
```bash
export NYX_API_URL="https://your-nyx-app.vercel.app"
export NYX_AI_SERVER="http://your-gpu-server:8000"
export NYX_APPIUM_URL="http://127.0.0.1:4723"
```

### 3. Start Appium in one terminal
```bash
appium --relaxed-security
```

### 4. Run the agent in another terminal
```bash
python caller.py
```

---

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `NYX_API_URL` | `http://localhost:3000` | Dashboard API URL |
| `NYX_AI_SERVER` | `http://your-gpu-server:8000` | AI server (Whisper/LLM/Piper) |
| `NYX_APPIUM_URL` | `http://127.0.0.1:4723` | Appium server URL |
| `NYX_POLL_INTERVAL` | `5` | Seconds between task polls |
| `NYX_RING_TIMEOUT` | `30` | Max seconds to wait for answer |
| `NYX_CALL_TIMEOUT` | `60` | Max call duration |
| `NYX_CALL_DELAY` | `10` | Delay between calls |

## How It Works

1. **Polls** the Nyx API for pending call tasks
2. **Opens Viber** via Appium and dials the number
3. **Detects call state** by reading Viber's UI (ringing → connected → ended)
4. **Records audio** during the call
5. **Transcribes** via Whisper STT on your AI server
6. **Analyzes** sentiment and outcome via LLM
7. **Reports** results back to the Nyx dashboard

## Permissions Required

- **USB Debugging** enabled on the Android device
- **Viber** installed and logged in
- **Microphone** permission granted to Termux (if running locally)
