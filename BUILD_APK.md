# Nyx APK Build Guide

The Android project is fully set up using **Capacitor** in the `android/` directory.

## Quick Build (requires Android Studio)

### 1. Install Prerequisites
- [Android Studio](https://developer.android.com/studio) (includes Java JDK + Android SDK)
- After install, open Android Studio → SDK Manager → install **Android SDK 34+**

### 2. Update the Server URL
Edit `capacitor.config.ts` and set your deployed Vercel URL:
```ts
server: {
  url: 'https://your-nyx-app.vercel.app', // ← your actual URL
}
```

### 3. Build the APK
```bash
# Sync web assets
npx cap sync android

# Build debug APK via Gradle
cd android
.\gradlew.bat assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Build signed release APK
```bash
cd android
.\gradlew.bat assembleRelease
```

## Alternative: Open in Android Studio
```bash
npx cap open android
```
This opens the project in Android Studio where you can:
- Build → Build Bundle / APK → Build APK
- Run directly on a connected device

## Test on Device
```bash
# Connect phone via USB (enable USB debugging)
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Config Details
- **Package name**: `com.nyx.autocaller`
- **App name**: Nyx Auto-Caller
- **Web dir**: `out/` (placeholder, loads from Vercel URL)
