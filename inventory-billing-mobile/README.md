# Inventory & Billing Mobile App

React Native mobile application for inventory management and billing, built with Expo.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Physical device or Android emulator

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials

## Running the App

Start the development server:
```bash
npm start
```

Run on Android:
```bash
npm run android
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── screens/         # App screens
├── navigation/      # Navigation setup
├── lib/             # Business logic
├── hooks/           # Custom hooks
├── types/           # TypeScript types
├── utils/           # Utility functions
├── services/        # API services
├── store/           # State management
├── constants/       # App constants
├── contexts/        # React contexts
└── theme/           # Theme configuration
```

## Features

- 📱 Invoice Management
- 📦 Inventory Tracking
- 👥 Customer Management
- 🚚 E-waybill Generation
- 📊 Reports & Analytics
- 🔒 Secure Authentication
- 📴 Offline Support
- 🔔 Push Notifications

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- React Native Paper
- Supabase
- Zustand

## License

Proprietary
