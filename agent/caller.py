#!/usr/bin/env python3
"""
Nyx Phone Agent — Appium-based Viber Auto-Caller
Runs on Android via Termux (or connected PC). Uses Appium with UiAutomator2
to fully automate Viber calls with UI state detection and audio handling.
"""

import os
import sys
import time
import json
import subprocess
import requests
import logging
from datetime import datetime
from typing import Optional, Dict, Any

try:
    from appium import webdriver
    from appium.options.android import UiAutomator2Options
    from appium.webdriver.common.appiumby import AppiumBy
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        TimeoutException,
        NoSuchElementException,
        StaleElementReferenceException,
    )
except ImportError:
    print("ERROR: Appium Python client not installed.")
    print("Run: pip install Appium-Python-Client")
    sys.exit(1)

# ============================================
# Configuration
# ============================================
API_BASE_URL = os.getenv("NYX_API_URL", "http://localhost:3000")
AI_SERVER_URL = os.getenv("NYX_AI_SERVER", "http://your-gpu-server:8000")
APPIUM_SERVER = os.getenv("NYX_APPIUM_URL", "http://127.0.0.1:4723")
POLL_INTERVAL = int(os.getenv("NYX_POLL_INTERVAL", "5"))
CALL_TIMEOUT = int(os.getenv("NYX_CALL_TIMEOUT", "60"))
RING_TIMEOUT = int(os.getenv("NYX_RING_TIMEOUT", "30"))
DELAY_BETWEEN_CALLS = int(os.getenv("NYX_CALL_DELAY", "10"))

# Viber package info
VIBER_PACKAGE = "com.viber.voip"
VIBER_ACTIVITY = "com.viber.voip.WelcomeActivity"

# ============================================
# Logging
# ============================================
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("nyx-agent")

# ============================================
# API Helpers
# ============================================
def claim_task() -> Optional[Dict[str, Any]]:
    """Claim the next pending task from the queue."""
    try:
        resp = requests.post(f"{API_BASE_URL}/api/call-tasks/claim", timeout=10)
        if resp.status_code == 200:
            return resp.json().get("task")
        elif resp.status_code == 404:
            return None
        else:
            log.warning(f"Claim failed: {resp.status_code} {resp.text}")
            return None
    except requests.RequestException as e:
        log.error(f"API error: {e}")
        return None


def update_task(task_id: str, status: str, result: str = None) -> bool:
    """Update task status and result."""
    payload = {"status": status}
    if result:
        payload["result"] = result
    try:
        resp = requests.patch(
            f"{API_BASE_URL}/api/call-tasks/{task_id}",
            json=payload,
            timeout=10,
        )
        return resp.status_code == 200
    except requests.RequestException as e:
        log.error(f"Update failed: {e}")
        return False


def submit_log(
    task_id: str,
    lead_id: str,
    duration: int,
    transcript: str,
    ai_summary: str,
    sentiment: str,
    outcome: str,
) -> bool:
    """Submit call log with transcript and AI analysis."""
    try:
        resp = requests.post(
            f"{API_BASE_URL}/api/call-logs",
            json={
                "taskId": task_id,
                "leadId": lead_id,
                "durationSeconds": duration,
                "transcript": transcript,
                "aiSummary": ai_summary,
                "sentiment": sentiment,
                "outcome": outcome,
            },
            timeout=10,
        )
        return resp.status_code == 200
    except requests.RequestException as e:
        log.error(f"Log submit failed: {e}")
        return False


# ============================================
# AI Server Integration
# ============================================
def transcribe_audio(audio_path: str) -> str:
    """Send audio to Whisper STT server."""
    try:
        with open(audio_path, "rb") as f:
            resp = requests.post(
                f"{AI_SERVER_URL}/transcribe", files={"audio": f}, timeout=30
            )
        if resp.status_code == 200:
            return resp.json().get("text", "")
    except Exception as e:
        log.error(f"Transcription failed: {e}")
    return ""


def generate_response(context: str, lead_info: Dict) -> str:
    """Get LLM-generated conversational response."""
    try:
        resp = requests.post(
            f"{AI_SERVER_URL}/generate",
            json={
                "context": context,
                "lead_name": lead_info.get("leadName", ""),
                "lead_company": lead_info.get("leadCompany", ""),
            },
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("response", "")
    except Exception as e:
        log.error(f"LLM generation failed: {e}")
    return ""


def synthesize_speech(text: str, output_path: str) -> bool:
    """Convert text to speech via Piper TTS."""
    try:
        resp = requests.post(
            f"{AI_SERVER_URL}/synthesize", json={"text": text}, timeout=15
        )
        if resp.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        log.error(f"TTS failed: {e}")
    return False


# ============================================
# Appium Driver Manager
# ============================================
class ViberDriver:
    """Manages the Appium session for Viber automation."""

    def __init__(self):
        self.driver = None

    def connect(self) -> bool:
        """Initialize or reuse Appium session."""
        if self.driver:
            try:
                self.driver.session_id  # Check if session is alive
                return True
            except Exception:
                self.driver = None

        log.info(f"Connecting to Appium at {APPIUM_SERVER}...")
        try:
            options = UiAutomator2Options()
            options.platform_name = "Android"
            options.automation_name = "UiAutomator2"
            options.no_reset = True  # Don't clear Viber data
            options.dont_stop_app_on_reset = True
            options.new_command_timeout = 300
            options.set_capability("appPackage", VIBER_PACKAGE)
            options.set_capability("appActivity", VIBER_ACTIVITY)
            options.set_capability("autoGrantPermissions", True)
            options.set_capability("ignoreHiddenApiPolicyError", True)

            self.driver = webdriver.Remote(APPIUM_SERVER, options=options)
            log.info("Appium session established")
            return True
        except Exception as e:
            log.error(f"Appium connection failed: {e}")
            return False

    def quit(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    # ------------------------------------------
    # Viber Navigation
    # ------------------------------------------
    def open_viber(self) -> bool:
        """Bring Viber to foreground."""
        try:
            self.driver.activate_app(VIBER_PACKAGE)
            time.sleep(2)
            return True
        except Exception as e:
            log.error(f"Failed to open Viber: {e}")
            return False

    def navigate_to_dialpad(self) -> bool:
        """Navigate to Viber's call/dialpad screen."""
        try:
            # Try tapping the Calls tab in bottom navigation
            calls_tab = self._find_element_safe(
                AppiumBy.ACCESSIBILITY_ID, "Calls", timeout=5
            )
            if calls_tab:
                calls_tab.click()
                time.sleep(1)

            # Look for the dialpad/new call button
            dialpad_btn = self._find_element_safe(
                AppiumBy.ACCESSIBILITY_ID, "Start new call", timeout=3
            ) or self._find_element_safe(
                AppiumBy.ID, f"{VIBER_PACKAGE}:id/dialpadButton", timeout=3
            ) or self._find_element_safe(
                AppiumBy.XPATH,
                '//android.widget.ImageButton[contains(@content-desc, "call") or contains(@content-desc, "dial")]',
                timeout=3,
            )

            if dialpad_btn:
                dialpad_btn.click()
                time.sleep(1)
                return True

            log.warning("Could not find dialpad button, trying direct dial")
            return True  # Will fall back to direct dial method
        except Exception as e:
            log.error(f"Navigation failed: {e}")
            return False

    # ------------------------------------------
    # Call Management
    # ------------------------------------------
    def dial_number(self, phone: str) -> bool:
        """Enter phone number and initiate the call."""
        try:
            # Method 1: Use Viber's deep link URI
            self.driver.execute_script(
                "mobile: shell",
                {
                    "command": "am",
                    "args": [
                        "start",
                        "-a", "android.intent.action.VIEW",
                        "-d", f"viber://call/{phone}",
                    ],
                },
            )
            time.sleep(3)

            # Check if a call confirmation dialog appeared
            call_btn = self._find_element_safe(
                AppiumBy.XPATH,
                '//*[contains(@text, "Call") or contains(@text, "CALL")]',
                timeout=5,
            )
            if call_btn:
                call_btn.click()
                time.sleep(2)

            log.info(f"Dialed {phone} via Viber")
            return True

        except Exception as e:
            log.error(f"Dial failed: {e}")
            return False

    def detect_call_state(self) -> str:
        """
        Detect the current call state by reading UI elements.
        Returns: 'ringing', 'connected', 'ended', 'failed', 'unknown'
        """
        try:
            # Check for call duration timer (means call is connected)
            timer = self._find_element_safe(
                AppiumBy.ID, f"{VIBER_PACKAGE}:id/call_duration", timeout=1
            ) or self._find_element_safe(
                AppiumBy.XPATH,
                '//*[matches(@text, "^\\d{1,2}:\\d{2}$")]',
                timeout=1,
            )
            if timer:
                return "connected"

            # Check for ringing/calling state
            ringing = self._find_element_safe(
                AppiumBy.XPATH,
                '//*[contains(@text, "Ringing") or contains(@text, "Calling") or contains(@text, "ringing") or contains(@text, "calling")]',
                timeout=1,
            )
            if ringing:
                return "ringing"

            # Check for call ended
            ended = self._find_element_safe(
                AppiumBy.XPATH,
                '//*[contains(@text, "ended") or contains(@text, "Ended") or contains(@text, "unavailable") or contains(@text, "busy") or contains(@text, "declined")]',
                timeout=1,
            )
            if ended:
                return "ended"

            # Check if the end-call button is visible (means call is active)
            end_btn = self._find_element_safe(
                AppiumBy.ACCESSIBILITY_ID, "End call", timeout=1
            ) or self._find_element_safe(
                AppiumBy.ID, f"{VIBER_PACKAGE}:id/endCallButton", timeout=1
            )
            if end_btn:
                return "connected"

            return "unknown"

        except Exception:
            return "unknown"

    def wait_for_connection(self) -> bool:
        """Wait for the call to connect (ringing → connected)."""
        log.info("Waiting for call to connect...")
        start = time.time()

        while time.time() - start < RING_TIMEOUT:
            state = self.detect_call_state()

            if state == "connected":
                log.info("✓ Call connected!")
                return True
            elif state == "ended" or state == "failed":
                log.warning(f"Call ended during ringing: {state}")
                return False
            elif state == "ringing":
                log.info("  Ringing...")

            time.sleep(2)

        log.warning("Ring timeout — no answer")
        return False

    def wait_for_call_end(self) -> int:
        """Monitor an active call until it ends. Returns duration in seconds."""
        log.info("Call active — monitoring...")
        start = time.time()

        while time.time() - start < CALL_TIMEOUT:
            state = self.detect_call_state()

            if state == "ended" or state == "unknown":
                # Double-check by waiting a moment
                time.sleep(2)
                state2 = self.detect_call_state()
                if state2 != "connected":
                    duration = int(time.time() - start)
                    log.info(f"Call ended after {duration}s")
                    return duration

            time.sleep(1)

        # Call timeout reached
        log.warning(f"Call timeout ({CALL_TIMEOUT}s) — ending call")
        self.end_call()
        return CALL_TIMEOUT

    def end_call(self) -> bool:
        """End the current call."""
        try:
            end_btn = self._find_element_safe(
                AppiumBy.ACCESSIBILITY_ID, "End call", timeout=3
            ) or self._find_element_safe(
                AppiumBy.ID, f"{VIBER_PACKAGE}:id/endCallButton", timeout=3
            ) or self._find_element_safe(
                AppiumBy.XPATH,
                '//android.widget.ImageButton[contains(@content-desc, "end") or contains(@content-desc, "End")]',
                timeout=3,
            )

            if end_btn:
                end_btn.click()
                log.info("Call ended via UI button")
                time.sleep(2)
                return True

            # Fallback: use keyevent
            self.driver.execute_script(
                "mobile: shell",
                {"command": "input", "args": ["keyevent", "KEYCODE_ENDCALL"]},
            )
            log.info("Call ended via KEYCODE_ENDCALL")
            time.sleep(2)
            return True

        except Exception as e:
            log.error(f"Failed to end call: {e}")
            return False

    def dismiss_post_call(self):
        """Dismiss any post-call dialogs or screens."""
        try:
            # Close any rating dialogs
            close = self._find_element_safe(
                AppiumBy.XPATH,
                '//*[contains(@text, "Not now") or contains(@text, "Close") or contains(@text, "Skip") or contains(@content-desc, "Close")]',
                timeout=3,
            )
            if close:
                close.click()
                time.sleep(1)

            # Press back to exit call screen
            self.driver.back()
            time.sleep(1)
        except Exception:
            pass

    # ------------------------------------------
    # Audio Recording
    # ------------------------------------------
    def start_recording(self, output_path: str) -> bool:
        """Start recording audio via Termux or Appium."""
        try:
            # Method 1: Appium screen recording (captures all audio)
            self.driver.start_recording_screen(
                videoType="mp4",
                timeLimit=CALL_TIMEOUT,
            )
            log.info("Screen recording started (includes audio)")
            return True
        except Exception:
            # Method 2: Termux microphone recording
            try:
                subprocess.Popen(
                    [
                        "termux-microphone-record",
                        "-f", output_path,
                        "-l", str(CALL_TIMEOUT),
                        "-e", "aac",
                    ]
                )
                log.info("Termux microphone recording started")
                return True
            except Exception as e:
                log.error(f"Recording failed: {e}")
                return False

    def stop_recording(self, output_path: str) -> Optional[str]:
        """Stop recording and save the file."""
        try:
            # Try Appium recording first
            video_b64 = self.driver.stop_recording_screen()
            if video_b64:
                import base64
                with open(output_path, "wb") as f:
                    f.write(base64.b64decode(video_b64))
                log.info(f"Recording saved to {output_path}")
                return output_path
        except Exception:
            pass

        # Fallback: stop Termux recording
        try:
            subprocess.run(["termux-microphone-record", "-q"], timeout=5)
            log.info("Termux recording stopped")
            return output_path
        except Exception:
            pass

        return None

    # ------------------------------------------
    # Screenshot for Debug
    # ------------------------------------------
    def take_screenshot(self, name: str = "debug") -> Optional[str]:
        """Take a screenshot for debugging purposes."""
        try:
            path = f"/tmp/nyx_screenshot_{name}_{int(time.time())}.png"
            self.driver.save_screenshot(path)
            return path
        except Exception:
            return None

    # ------------------------------------------
    # Helper
    # ------------------------------------------
    def _find_element_safe(self, by, value, timeout=5):
        """Find an element without raising if not found."""
        try:
            return WebDriverWait(
                self.driver,
                timeout,
                ignored_exceptions=[StaleElementReferenceException],
            ).until(EC.presence_of_element_located((by, value)))
        except (TimeoutException, NoSuchElementException):
            return None


# ============================================
# Call Flow Orchestrator
# ============================================
def handle_call(viber: ViberDriver, task: Dict) -> None:
    """Full Appium-automated call flow."""
    task_id = task["id"]
    lead_id = task["leadId"]
    phone = task.get("leadPhone", "")
    name = task.get("leadName", "Unknown")

    log.info("═" * 50)
    log.info(f"CALLING: {name} ({phone})")
    log.info("═" * 50)

    update_task(task_id, "in_progress")

    # 1. Open Viber
    if not viber.open_viber():
        log.error("Cannot open Viber")
        update_task(task_id, "failed", "viber_error")
        return

    # 2. Dial the number
    if not viber.dial_number(phone):
        log.error("Cannot dial number")
        update_task(task_id, "failed", "dial_error")
        return

    # 3. Wait for connection
    connected = viber.wait_for_connection()

    if not connected:
        log.warning("Call did not connect")
        viber.dismiss_post_call()
        update_task(task_id, "failed", "no_answer")
        submit_log(task_id, lead_id, 0, "", "Call did not connect — no answer or declined.", "neutral", "no_answer")
        return

    # 4. Start audio recording
    audio_path = f"/tmp/nyx_call_{task_id}.mp4"
    viber.start_recording(audio_path)

    # 5. Monitor call until it ends
    duration = viber.wait_for_call_end()

    # 6. Stop recording
    viber.stop_recording(audio_path)

    # 7. Dismiss post-call UI
    viber.dismiss_post_call()

    # 8. Transcribe the call audio
    log.info("Transcribing call audio...")
    transcript = transcribe_audio(audio_path)

    # 9. AI analysis
    log.info("Generating AI summary...")
    ai_summary = generate_response(
        f"Summarize this sales call transcript and determine the lead's interest level:\n\n{transcript}",
        task,
    )

    # 10. Determine outcome from transcript
    outcome = "no_answer"
    sentiment = "neutral"
    if transcript:
        lower = transcript.lower()
        if any(w in lower for w in ["interested", "yes", "sure", "tell me more", "send me", "sounds good"]):
            outcome = "interested"
            sentiment = "positive"
        elif any(w in lower for w in ["no", "not interested", "stop", "don't call", "remove"]):
            outcome = "not_interested"
            sentiment = "negative"
        elif any(w in lower for w in ["later", "call back", "busy", "meeting"]):
            outcome = "callback"
            sentiment = "neutral"
        else:
            outcome = "voicemail" if duration < 10 else "interested"
            sentiment = "neutral" if duration < 10 else "positive"

    # 11. Report results
    update_task(task_id, "completed", outcome)
    submit_log(task_id, lead_id, duration, transcript, ai_summary, sentiment, outcome)

    log.info(f"✓ Call complete: {outcome} ({duration}s)")
    log.info("═" * 50)

    # Cleanup
    try:
        os.remove(audio_path)
    except OSError:
        pass


# ============================================
# Main Loop
# ============================================
def main():
    print()
    print("╔══════════════════════════════════════════╗")
    print("║    NYX Phone Agent · Appium + Viber      ║")
    print("╚══════════════════════════════════════════╝")
    print()
    log.info(f"API Server:    {API_BASE_URL}")
    log.info(f"AI Server:     {AI_SERVER_URL}")
    log.info(f"Appium Server: {APPIUM_SERVER}")
    log.info(f"Poll interval: {POLL_INTERVAL}s")
    log.info(f"Ring timeout:  {RING_TIMEOUT}s")
    log.info(f"Call timeout:  {CALL_TIMEOUT}s")
    print()

    # Initialize Appium driver
    viber = ViberDriver()
    if not viber.connect():
        log.error("Failed to connect to Appium. Make sure:")
        log.error("  1. Appium server is running (npx appium)")
        log.error("  2. Android device is connected (adb devices)")
        log.error("  3. Viber is installed on the device")
        sys.exit(1)

    log.info("Agent ready — polling for tasks...")
    print()

    try:
        while True:
            task = claim_task()
            if task:
                # Reconnect to Appium if needed
                if not viber.connect():
                    log.error("Lost Appium connection, skipping task")
                    update_task(task["id"], "failed", "agent_error")
                    time.sleep(POLL_INTERVAL)
                    continue

                handle_call(viber, task)

                log.info(f"Waiting {DELAY_BETWEEN_CALLS}s before next call...")
                time.sleep(DELAY_BETWEEN_CALLS)
            else:
                time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:
        log.info("Agent stopped by user.")
    finally:
        viber.quit()


if __name__ == "__main__":
    main()
