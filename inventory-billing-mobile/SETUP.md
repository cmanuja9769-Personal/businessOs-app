# Inventory & Billing Mobile - Installation Guide

## Step 1: Navigate to the mobile app directory
```bash
cd inventory-billing-mobile
```

## Step 2: Install dependencies
```bash
npm install
```

## Step 3: Install additional required dependency
```bash
npm install --save-dev babel-plugin-module-resolver
```

## Step 4: Set up environment variables
Create a `.env` file by copying from `.env.example`:
```bash
cp .env.example .env
```

Then edit `.env` and add your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Step 5: Start the development server
```bash
npm start
```

## Step 6: Run on Android
- Press `a` in the terminal, or
- Run: `npm run android`

## Troubleshooting

### If you encounter module resolution errors:
```bash
npm install
npm start --clear
```

### If dependencies fail to install:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Android build issues:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Project Structure

- `/src/components` - Reusable UI components
- `/src/screens` - App screens
- `/src/navigation` - Navigation setup
- `/src/lib` - Business logic
- `/src/contexts` - React contexts
- `/src/theme` - Theme configuration
- `/src/utils` - Utility functions

## What's Implemented

✅ Project structure and configuration
✅ Authentication (Login, Signup, Password Reset)
✅ Navigation (Tab + Stack navigation)
✅ Theme system (Light/Dark mode)
✅ UI component library
✅ Supabase integration
✅ Dashboard with stats
✅ Invoice list
✅ Inventory list with search
✅ More menu with settings

## What Needs Implementation

- Invoice creation and editing
- Item creation and editing
- Customer management
- Supplier management
- E-waybill functionality
- PDF generation
- Camera/Barcode scanning
- Offline support
- Push notifications

## Next Steps

1. Connect to your actual Supabase instance
2. Test authentication flow
3. Verify database queries
4. Implement remaining screens
5. Add mobile-specific features (camera, offline, etc.)
