#!/bin/bash

echo "🚀 Starting Mobile App Development Server..."
echo ""
echo "This script will:"
echo "1. Check if dependencies are installed"
echo "2. Create .env file if it doesn't exist"
echo "3. Start the Expo development server"
echo ""

# Navigate to the correct directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Please edit .env and add your Supabase credentials!"
    echo ""
fi

echo "🎬 Starting development server..."
echo ""
echo "Next steps:"
echo "1. Install Expo Go on your phone"
echo "2. Scan the QR code that appears"
echo "3. Or press 'a' to run on Android emulator"
echo ""

npm start
