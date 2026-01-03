# 🚀 Quick Start Guide - 5 Minutes to Running App

## ✅ Installation Complete!

All dependencies (1363 packages) have been successfully installed.

## Step 1: Configure Environment Variables (2 min)

1. Copy the environment file:
```bash
cd inventory-billing-mobile
cp .env.example .env
```

2. Open `.env` and add your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_APP_ENV=development
```

You can find these in your Supabase Dashboard → Settings → API

## Step 2: Start the Development Server (1 min)

```bash
npm start
```

This will open the Expo Dev Tools in your browser and show a QR code in the terminal.

## Step 3: Run on Your Device (2 min)

### Option A: Physical Android Device (Recommended)
1. Install **Expo Go** from Google Play Store
2. Open Expo Go app
3. Scan the QR code from the terminal
4. App will load on your device!

### Option B: Android Emulator
1. Make sure Android Studio is installed with an emulator
2. Start your Android emulator
3. Press `a` in the terminal
4. App will load in the emulator!

### Option C: iOS Device (Mac only)
1. Install Expo Go from App Store
2. Scan QR code
3. App will load!

## 🎉 You're Done!

The app should now be running with:
- ✅ Login/Signup screens
- ✅ Dashboard with stats
- ✅ Invoice list
- ✅ Inventory list
- ✅ Dark/Light theme toggle

## 🧪 Test the App

1. **Sign Up**: Create a new account
2. **Log In**: Use your credentials
3. **Navigate**: Explore all tabs (Dashboard, Invoices, Inventory, More)
4. **Theme**: Go to More → Settings → Toggle dark mode
5. **Pull to Refresh**: Pull down on any list to refresh data

## 🔧 Common Issues & Fixes

### Issue: "Network request failed"
**Fix**: Make sure your `.env` file has correct Supabase credentials

### Issue: "Unable to resolve module"
**Fix**: 
```bash
npm start -- --clear
```

### Issue: "Expo Go not connecting"
**Fix**: Make sure your phone and computer are on the same WiFi network

### Issue: "Android build error"
**Fix**: 
```bash
npm start -- --clear
# Or restart your emulator
```

## 📱 What Works Right Now

- ✅ Authentication (Login, Signup, Password Reset)
- ✅ Dashboard with live stats
- ✅ Invoice list with search
- ✅ Inventory list with search
- ✅ Dark/Light theme
- ✅ Settings
- ✅ Profile
- ✅ Navigation

## 🔨 What to Build Next

1. **Invoice Creation Form**: Complete the CreateInvoiceScreen
2. **Item Creation Form**: Complete the AddItemScreen
3. **Customer Management**: Implement customer CRUD
4. **PDF Generation**: Add invoice PDF export
5. **Camera**: Barcode scanning for items
6. **Offline Mode**: Local SQLite database

## 📚 Useful Commands

```bash
# Start dev server
npm start

# Start with cache cleared
npm start -- --clear

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Check for issues
npm run lint

# View logs
npx react-native log-android  # For Android
npx react-native log-ios      # For iOS
```

## 🎨 Customization

### Change Theme Colors
Edit `src/theme/colors.ts`:
```typescript
export const colors = {
  light: {
    primary: '#2563eb',  // Change this!
    // ... more colors
  }
}
```

### Add New Screen
1. Create file in `src/screens/your-feature/YourScreen.tsx`
2. Add to navigation in `src/navigation/`
3. Import and use!

### Add New API Call
Use the API service:
```typescript
import { ApiService } from '@services/api';

const { data, error } = await ApiService.get('your_table');
```

## 📞 Need Help?

Check these files:
- `README.md` - Overview
- `SETUP.md` - Detailed setup
- `PROJECT_SUMMARY.md` - What's built
- `IMPLEMENTATION_STATUS.md` - Progress tracker
- `MOBILE_APP_TODO.md` - Full roadmap

## 🎯 Next Steps After Running

1. ✅ Verify app runs on your device
2. ✅ Test login/signup flow
3. ✅ Check data loads from Supabase
4. ✅ Explore all screens
5. 🔄 Start building remaining features
6. 🔄 Add mobile-specific features (camera, offline, etc.)
7. 🔄 Test thoroughly on real devices
8. 🔄 Build production APK
9. 🔄 Publish to Play Store

---

## 🎉 Congratulations!

Your mobile app is now running! You have a solid foundation with:
- Modern React Native + Expo setup
- Full authentication system
- Beautiful UI components
- Type-safe navigation
- State management
- Theme support
- And much more!

Now go build something amazing! 🚀

**Happy coding!** 💪
