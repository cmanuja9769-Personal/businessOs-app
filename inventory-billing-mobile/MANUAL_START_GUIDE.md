# Manual App Start Guide

Your Expo server is running, but the terminal is paused at a login prompt. **You do not need to log in** to run the app locally.

## Option 1: Run on Android Emulator (Recommended)

1.  **Do not close** the terminal window where `npx expo start` is running.
2.  Go to your **Android Emulator**.
3.  Open the **Expo Go** app.
    *   If it's not open, find it in the app drawer.
4.  On the Expo Go home screen, look for **"Enter URL manually"**.
    *   If you don't see it, look for a keyboard icon or a "+" button.
5.  Enter the following URL:
    ```
    exp://127.0.0.1:8081
    ```
6.  Tap **Connect** or **Go**.

## Option 2: Run in Web Browser

1.  Open your web browser (Chrome, Edge, etc.).
2.  Navigate to:
    ```
    http://localhost:8081
    ```
3.  The app should load in the browser.

## Troubleshooting

### "Version Mismatch" Errors
If the app crashes or you see red error screens about version mismatches (specifically `@expo/metro-runtime`), you may need to fix the dependencies.

1.  Stop the current server (Press `Ctrl+C` in the terminal).
2.  Run this command to install the correct versions for Expo SDK 50:
    ```powershell
    npm install @expo/metro-runtime@~3.1.3 expo-camera@~14.0.6 expo-sqlite@~13.2.2 react-native@0.73.6
    ```
3.  Start the server again:
    ```powershell
    npx expo start --web
    ```

### "Network Error" or "Could not connect"
If `127.0.0.1` doesn't work on Android, try your computer's LAN IP:
1.  Find your IP (run `ipconfig` in a new terminal).
2.  Enter `exp://YOUR_IP_ADDRESS:8081` in Expo Go.
