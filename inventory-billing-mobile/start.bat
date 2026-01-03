@echo off
echo 🚀 Starting Mobile App Development Server...
echo.
echo This script will:
echo 1. Check if dependencies are installed
echo 2. Create .env file if it doesn't exist
echo 3. Start the Expo development server
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call npm install
) else (
    echo ✅ Dependencies already installed
)

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  IMPORTANT: Please edit .env and add your Supabase credentials!
    echo.
)

echo 🎬 Starting development server...
echo.
echo Next steps:
echo 1. Install Expo Go on your phone
echo 2. Scan the QR code that appears
echo 3. Or press 'a' to run on Android emulator
echo.

call npm start
