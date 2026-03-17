#!/usr/bin/env python3
"""
Piper TTS HTTP Server — runs on Termux alongside the Nyx APK.
Provides a simple REST endpoint for text-to-speech conversion.
The APK calls this at http://127.0.0.1:5000/tts
"""

import os
import sys
import subprocess
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

PORT = 5000
PIPER_BIN = os.getenv("PIPER_BIN", "piper")
MODELS_DIR = os.path.expanduser("~/piper-voices")

class TTSHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/tts":
            self.handle_tts()
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "engine": "piper"}).encode())
        elif self.path == "/voices":
            self.handle_list_voices()
        else:
            self.send_error(404)

    def handle_tts(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            text = body.get("text", "")
            voice = body.get("voice", "en_US-lessac-medium")

            if not text:
                self.send_error(400, "No text provided")
                return

            # Generate audio with Piper
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name

            model_path = os.path.join(MODELS_DIR, f"{voice}.onnx")
            config_path = os.path.join(MODELS_DIR, f"{voice}.onnx.json")

            cmd = [
                PIPER_BIN,
                "--model", model_path,
                "--config", config_path,
                "--output_file", tmp_path,
            ]

            # Pipe text to Piper's stdin
            proc = subprocess.run(
                cmd,
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=30,
            )

            if proc.returncode != 0:
                error_msg = proc.stderr.decode("utf-8", errors="replace")
                print(f"Piper error: {error_msg}")
                self.send_error(500, f"Piper failed: {error_msg[:200]}")
                return

            # Send the WAV audio back
            with open(tmp_path, "rb") as f:
                audio_data = f.read()

            os.remove(tmp_path)

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio_data)))
            self.end_headers()
            self.wfile.write(audio_data)

        except subprocess.TimeoutExpired:
            self.send_error(504, "Piper TTS timed out")
        except Exception as e:
            print(f"TTS error: {e}")
            self.send_error(500, str(e))

    def handle_list_voices(self):
        voices = []
        if os.path.isdir(MODELS_DIR):
            for f in os.listdir(MODELS_DIR):
                if f.endswith(".onnx") and not f.endswith(".onnx.json"):
                    voices.append(f.replace(".onnx", ""))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"voices": voices}).encode())

    def log_message(self, fmt, *args):
        print(f"[Piper TTS] {args[0]}")


def main():
    print("═══════════════════════════════════════════")
    print("  Piper TTS Server · localhost:5000")
    print("═══════════════════════════════════════════")
    print(f"  Model dir: {MODELS_DIR}")
    print()

    # Check Piper is installed
    try:
        subprocess.run([PIPER_BIN, "--version"], capture_output=True, timeout=5)
        print("  ✓ Piper found")
    except FileNotFoundError:
        print("  ✗ Piper not found! Install with:")
        print("    pkg install piper-tts")
        print("    OR download from: https://github.com/rhasspy/piper/releases")
        sys.exit(1)

    # Check for voice models
    if not os.path.isdir(MODELS_DIR):
        os.makedirs(MODELS_DIR, exist_ok=True)
        print(f"  ! Created {MODELS_DIR}")
        print(f"  ! Download voice models from: https://huggingface.co/rhasspy/piper-voices")
        print(f"  ! Place .onnx + .onnx.json files in {MODELS_DIR}")

    print()
    server = HTTPServer(("127.0.0.1", PORT), TTSHandler)
    print(f"  Listening on http://127.0.0.1:{PORT}")
    print("  Press Ctrl+C to stop")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Piper server stopped")
        server.server_close()


if __name__ == "__main__":
    main()
