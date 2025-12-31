# Mobile App Implementation TODO

**Project**: Android Mobile App for Inventory & Billing System  
**Framework**: React Native with Expo  
**Target**: Android (expandable to iOS)  
**Start Date**: December 31, 2025  
**Estimated Timeline**: 6-8 weeks

---

## 📋 Phase 1: Project Setup & Environment (Week 1)

### 1.1 Development Environment
- [ ] Install Node.js 18+ (verify with `node --version`)
- [ ] Install Expo CLI globally: `npm install -g expo-cli`
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Install Android Studio with Android SDK
- [ ] Set up Android Emulator or physical device with USB debugging
- [ ] Install Git for version control

### 1.2 Project Initialization
- [ ] Create new Expo project: `npx create-expo-app inventory-billing-mobile --template blank-typescript`
- [ ] Initialize Git repository
- [ ] Create `.gitignore` for mobile-specific files
- [ ] Set up ESLint and Prettier for React Native
- [ ] Configure `app.json` with app name, bundle identifier, version

### 1.3 Project Structure Setup
```
inventory-billing-mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens
│   ├── navigation/     # Navigation setup
│   ├── lib/            # Business logic (copied from web)
│   ├── hooks/          # Custom hooks
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   ├── store/          # State management
│   └── constants/      # App constants
├── assets/             # Images, fonts, icons
└── app.json
```

- [ ] Create folder structure as above
- [ ] Set up path aliases in `tsconfig.json`

### 1.4 Core Dependencies Installation
```bash
# Navigation
npx expo install @react-navigation/native
npx expo install @react-navigation/stack
npx expo install @react-navigation/bottom-tabs
npx expo install @react-navigation/drawer
npx expo install react-native-screens react-native-safe-area-context

# UI Components
npx expo install react-native-paper
npx expo install react-native-vector-icons
npx expo install @expo/vector-icons

# Backend & Storage
npx expo install @supabase/supabase-js
npx expo install react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage

# Forms & Validation
npx expo install react-hook-form
npx expo install zod

# State Management
npx expo install zustand
```

- [ ] Install all core dependencies
- [ ] Verify installation with `npx expo doctor`
- [ ] Test app runs: `npx expo start`

---

## 📋 Phase 2: Backend Integration (Week 1-2)

### 2.1 Supabase Configuration
- [ ] Copy `lib/supabase.ts` to `src/lib/supabase.ts`
- [ ] Update Supabase config for mobile (add `AsyncStorage` for persistence)
- [ ] Create environment variables setup (`.env` file)
- [ ] Add environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Install expo-secure-store: `npx expo install expo-secure-store`
- [ ] Configure secure token storage

### 2.2 Copy Business Logic Files
Copy the following files from web app to `src/lib/`:
- [ ] `lib/auth.ts` - Authentication logic
- [ ] `lib/customer-management.ts` - Customer operations
- [ ] `lib/invoice-calculations.ts` - Invoice calculations
- [ ] `lib/stock-management.ts` - Stock management
- [ ] `lib/batch-management.ts` - Batch operations
- [ ] `lib/serial-management.ts` - Serial number management
- [ ] `lib/warehouse-management.ts` - Warehouse operations
- [ ] `lib/adjustment-management.ts` - Adjustment logic
- [ ] `lib/e-invoice-service.ts` - E-invoice integration
- [ ] `lib/e-waybill-service.ts` - E-waybill integration
- [ ] `lib/gst-lookup.ts` - GST lookup
- [ ] `lib/utils.ts` - Utility functions
- [ ] `lib/schemas.ts` - Validation schemas
- [ ] `lib/permissions.ts` - Permission management

### 2.3 Copy Type Definitions
- [ ] Copy all files from `types/` directory to `src/types/`
- [ ] Update import paths as needed
- [ ] Add mobile-specific types (navigation types, screen props)

### 2.4 Adapt API Services
- [ ] Create `src/services/api.ts` for centralized API calls
- [ ] Convert Next.js API routes logic to direct Supabase calls
- [ ] Implement error handling wrapper
- [ ] Add network connectivity check
- [ ] Create retry logic for failed requests

### 2.5 Authentication Implementation
- [ ] Create `src/contexts/AuthContext.tsx` for auth state
- [ ] Implement login functionality
- [ ] Implement signup functionality
- [ ] Implement logout functionality
- [ ] Implement password reset
- [ ] Add biometric authentication (expo-local-authentication)
- [ ] Implement session persistence
- [ ] Add auto-logout on inactivity

---

## 📋 Phase 3: UI Component Library Setup (Week 2)

### 3.1 Theme Configuration
- [ ] Create `src/theme/colors.ts` - Color palette
- [ ] Create `src/theme/fonts.ts` - Typography system
- [ ] Create `src/theme/spacing.ts` - Spacing constants
- [ ] Configure React Native Paper theme
- [ ] Implement dark mode support
- [ ] Create theme context and toggle

### 3.2 Base UI Components
Create reusable components in `src/components/ui/`:
- [ ] `Button.tsx` - Custom button component
- [ ] `Input.tsx` - Text input with validation
- [ ] `Card.tsx` - Card container
- [ ] `Loading.tsx` - Loading spinner/skeleton
- [ ] `EmptyState.tsx` - Empty list placeholder
- [ ] `ErrorBoundary.tsx` - Error handling wrapper
- [ ] `Toast.tsx` - Toast notifications
- [ ] `Modal.tsx` - Modal dialog
- [ ] `Picker.tsx` - Dropdown picker
- [ ] `DatePicker.tsx` - Date picker component
- [ ] `SearchBar.tsx` - Search input
- [ ] `Badge.tsx` - Badge/chip component
- [ ] `Avatar.tsx` - User avatar

### 3.3 Layout Components
- [ ] `Header.tsx` - App header with navigation
- [ ] `BottomNav.tsx` - Bottom navigation bar
- [ ] `DrawerContent.tsx` - Drawer menu content
- [ ] `KeyboardAvoidingWrapper.tsx` - Keyboard handling
- [ ] `SafeAreaWrapper.tsx` - Safe area wrapper

---

## 📋 Phase 4: Navigation Setup (Week 2)

### 4.1 Navigation Structure
- [ ] Create `src/navigation/types.ts` - Navigation type definitions
- [ ] Create `src/navigation/AuthNavigator.tsx` - Auth flow navigation
- [ ] Create `src/navigation/MainNavigator.tsx` - Main app navigation
- [ ] Create `src/navigation/RootNavigator.tsx` - Root navigation wrapper

### 4.2 Navigation Flows
Define navigation stacks:
- [ ] Auth Stack (Login, Signup, ForgotPassword)
- [ ] Main Bottom Tabs (Dashboard, Invoices, Inventory, More)
- [ ] Invoice Stack (InvoiceList, InvoiceDetail, CreateInvoice)
- [ ] Inventory Stack (ItemList, ItemDetail, AddItem, StockAdjustment)
- [ ] Customer Stack (CustomerList, CustomerDetail, AddCustomer)
- [ ] E-waybill Stack (EwaybillList, EwaybillDetail, CreateEwaybill)
- [ ] Settings Stack (Settings, Profile, Organization, Users)

### 4.3 Deep Linking
- [ ] Configure deep linking in `app.json`
- [ ] Set up URL scheme (e.g., `invbilling://`)
- [ ] Add deep link handlers for invoices, items, etc.

---

## 📋 Phase 5: Screen Implementation (Week 3-5)

### 5.1 Authentication Screens
- [ ] `LoginScreen.tsx` - Login with email/password
- [ ] `SignupScreen.tsx` - User registration
- [ ] `ForgotPasswordScreen.tsx` - Password reset
- [ ] `OnboardingScreen.tsx` - First-time user onboarding
- [ ] Add form validation
- [ ] Add loading states
- [ ] Add error handling

### 5.2 Dashboard Screen
- [ ] `DashboardScreen.tsx` - Main dashboard
- [ ] Display key metrics (total sales, pending invoices, low stock items)
- [ ] Add quick action buttons
- [ ] Show recent activities
- [ ] Implement pull-to-refresh
- [ ] Add date range filter

### 5.3 Invoice Screens
- [ ] `InvoiceListScreen.tsx` - List all invoices with filters
  - [ ] Add search functionality
  - [ ] Add filter by status (draft, pending, paid)
  - [ ] Add filter by date range
  - [ ] Implement infinite scroll/pagination
  - [ ] Add swipe actions (view, edit, delete)
- [ ] `InvoiceDetailScreen.tsx` - View invoice details
  - [ ] Display all invoice information
  - [ ] Show payment status
  - [ ] Add share invoice action
  - [ ] Add print invoice action
  - [ ] Add generate PDF action
- [ ] `CreateInvoiceScreen.tsx` - Create/edit invoice
  - [ ] Multi-step form (customer, items, payment)
  - [ ] Customer selection/creation
  - [ ] Item selection with quantity
  - [ ] Auto-calculate totals, tax, discount
  - [ ] Add notes and terms
  - [ ] Save as draft functionality
  - [ ] Preview before saving

### 5.4 Inventory/Items Screens
- [ ] `ItemListScreen.tsx` - List all items
  - [ ] Add search by name/SKU
  - [ ] Add category filter
  - [ ] Show stock status (in stock, low stock, out of stock)
  - [ ] Add sorting options
  - [ ] Implement pull-to-refresh
- [ ] `ItemDetailScreen.tsx` - View item details
  - [ ] Show all item information
  - [ ] Display stock levels per godown
  - [ ] Show batch/serial numbers
  - [ ] Display recent transactions
  - [ ] Add quick stock adjustment
- [ ] `AddItemScreen.tsx` - Create/edit item
  - [ ] Form with all item fields
  - [ ] Image upload (expo-image-picker)
  - [ ] Barcode scanning for SKU (expo-barcode-scanner)
  - [ ] Category selection
  - [ ] Tax configuration
  - [ ] Pricing setup
- [ ] `StockAdjustmentScreen.tsx` - Adjust stock
  - [ ] Select item and godown
  - [ ] Adjustment type (add, remove, set)
  - [ ] Reason selection
  - [ ] Batch/serial entry if applicable

### 5.5 Customer Screens
- [ ] `CustomerListScreen.tsx` - List all customers
  - [ ] Add search functionality
  - [ ] Add filter by type (regular, business)
  - [ ] Show outstanding balance
  - [ ] Implement pull-to-refresh
- [ ] `CustomerDetailScreen.tsx` - View customer details
  - [ ] Display customer information
  - [ ] Show invoice history
  - [ ] Display payment history
  - [ ] Show outstanding amount
  - [ ] Add quick actions (create invoice, record payment)
- [ ] `AddCustomerScreen.tsx` - Create/edit customer
  - [ ] Form with customer fields
  - [ ] GSTIN validation
  - [ ] Address fields
  - [ ] Contact information
  - [ ] Credit limit setting

### 5.6 Supplier Screens
- [ ] `SupplierListScreen.tsx` - List all suppliers
- [ ] `SupplierDetailScreen.tsx` - View supplier details
- [ ] `AddSupplierScreen.tsx` - Create/edit supplier

### 5.7 Purchase Screens
- [ ] `PurchaseListScreen.tsx` - List all purchases
- [ ] `PurchaseDetailScreen.tsx` - View purchase details
- [ ] `CreatePurchaseScreen.tsx` - Create/edit purchase

### 5.8 E-waybill Screens
- [ ] `EwaybillListScreen.tsx` - List all e-waybills
  - [ ] Add search and filter
  - [ ] Show status (generated, active, expired)
  - [ ] Add date range filter
- [ ] `EwaybillDetailScreen.tsx` - View e-waybill details
  - [ ] Display all e-waybill information
  - [ ] Show QR code
  - [ ] Add share functionality
  - [ ] Add print functionality
- [ ] `CreateEwaybillScreen.tsx` - Generate e-waybill
  - [ ] Form with all required fields
  - [ ] Vehicle and transporter details
  - [ ] Distance calculation
  - [ ] Preview before generation
  - [ ] Generate and save

### 5.9 Payment Screens
- [ ] `PaymentListScreen.tsx` - List all payments
- [ ] `RecordPaymentScreen.tsx` - Record new payment

### 5.10 Reports Screens
- [ ] `ReportsScreen.tsx` - Reports dashboard
  - [ ] Sales reports
  - [ ] Stock reports
  - [ ] GST reports
  - [ ] Financial reports
- [ ] `ReportViewScreen.tsx` - View specific report
  - [ ] Export to PDF
  - [ ] Export to Excel
  - [ ] Share functionality

### 5.11 Settings Screens
- [ ] `SettingsScreen.tsx` - App settings
  - [ ] Theme toggle (light/dark)
  - [ ] Language selection
  - [ ] Notification preferences
  - [ ] Data sync settings
- [ ] `ProfileScreen.tsx` - User profile
  - [ ] Edit user information
  - [ ] Change password
  - [ ] Profile picture upload
- [ ] `OrganizationScreen.tsx` - Organization settings
  - [ ] Edit organization details
  - [ ] Logo upload
  - [ ] Business settings
  - [ ] Tax configuration
- [ ] `UserManagementScreen.tsx` - Manage users
  - [ ] List all users
  - [ ] Add/edit users
  - [ ] Role management
  - [ ] Permission settings

---

## 📋 Phase 6: Mobile-Specific Features (Week 5)

### 6.1 Camera & Scanning
- [ ] Install expo-camera: `npx expo install expo-camera`
- [ ] Install expo-barcode-scanner: `npx expo install expo-barcode-scanner`
- [ ] Create `BarcodeScannerScreen.tsx`
- [ ] Implement barcode scanning for items
- [ ] Add QR code scanning for e-waybills
- [ ] Implement OCR for invoice scanning (optional)

### 6.2 Image Handling
- [ ] Install expo-image-picker: `npx expo install expo-image-picker`
- [ ] Implement image upload for items
- [ ] Implement organization logo upload
- [ ] Add image compression
- [ ] Implement Supabase Storage integration

### 6.3 PDF Generation & Viewing
- [ ] Install expo-print: `npx expo install expo-print`
- [ ] Install react-native-pdf: `npm install react-native-pdf`
- [ ] Adapt `lib/pdf-service.tsx` for React Native
- [ ] Implement invoice PDF generation
- [ ] Implement e-waybill PDF generation
- [ ] Create PDF viewer component
- [ ] Add print functionality

### 6.4 File Sharing
- [ ] Install expo-sharing: `npx expo install expo-sharing`
- [ ] Implement share invoice
- [ ] Implement share e-waybill
- [ ] Implement share reports
- [ ] Add WhatsApp sharing integration
- [ ] Add email sharing

### 6.5 Offline Support
- [ ] Set up local SQLite database: `npx expo install expo-sqlite`
- [ ] Create offline storage schema
- [ ] Implement data sync logic
- [ ] Add network status detection
- [ ] Implement queue for offline actions
- [ ] Add conflict resolution
- [ ] Show offline indicator in UI

### 6.6 Push Notifications
- [ ] Install expo-notifications: `npx expo install expo-notifications`
- [ ] Configure push notification credentials
- [ ] Implement notification handler
- [ ] Add notifications for:
  - [ ] Low stock alerts
  - [ ] Pending invoice reminders
  - [ ] Payment received
  - [ ] E-waybill expiry warnings

### 6.7 Biometric Authentication
- [ ] Install expo-local-authentication: `npx expo install expo-local-authentication`
- [ ] Implement fingerprint authentication
- [ ] Add face recognition support
- [ ] Create settings toggle for biometric login

### 6.8 Location Services
- [ ] Install expo-location: `npx expo install expo-location`
- [ ] Add location permission handling
- [ ] Implement geolocation for e-waybill
- [ ] Add location tracking for deliveries (optional)

---

## 📋 Phase 7: State Management & Performance (Week 6)

### 7.1 Global State Setup
- [ ] Create Zustand stores in `src/store/`:
  - [ ] `authStore.ts` - Authentication state
  - [ ] `invoiceStore.ts` - Invoice data
  - [ ] `itemStore.ts` - Inventory items
  - [ ] `customerStore.ts` - Customer data
  - [ ] `settingsStore.ts` - App settings
  - [ ] `syncStore.ts` - Sync status
- [ ] Implement state persistence with AsyncStorage
- [ ] Add state hydration on app start

### 7.2 Data Caching
- [ ] Implement React Query or SWR for data fetching
- [ ] Set up cache policies
- [ ] Add optimistic updates
- [ ] Implement background data refresh

### 7.3 Performance Optimization
- [ ] Implement list virtualization (FlatList, SectionList)
- [ ] Add memoization with React.memo
- [ ] Optimize re-renders with useCallback, useMemo
- [ ] Implement lazy loading for screens
- [ ] Add image lazy loading
- [ ] Optimize bundle size
- [ ] Use Hermes engine (configure in app.json)

### 7.4 Error Handling
- [ ] Create global error handler
- [ ] Implement error boundaries for screens
- [ ] Add Sentry integration for crash reporting
- [ ] Create user-friendly error messages
- [ ] Add retry mechanisms

---

## 📋 Phase 8: Testing (Week 6-7)

### 8.1 Unit Testing Setup
- [ ] Install Jest and React Native Testing Library
- [ ] Configure test environment
- [ ] Create test utilities

### 8.2 Unit Tests
- [ ] Test business logic functions (calculations, validations)
- [ ] Test utility functions
- [ ] Test hooks
- [ ] Test state management
- [ ] Aim for 70%+ code coverage

### 8.3 Component Testing
- [ ] Test UI components
- [ ] Test form validation
- [ ] Test user interactions
- [ ] Test navigation flows

### 8.4 Integration Testing
- [ ] Test API integration
- [ ] Test authentication flow
- [ ] Test data sync
- [ ] Test offline functionality

### 8.5 E2E Testing (Optional)
- [ ] Set up Detox or Maestro
- [ ] Create critical path tests
- [ ] Test complete workflows

### 8.6 Manual Testing
- [ ] Test on Android emulator
- [ ] Test on physical Android device (various screen sizes)
- [ ] Test all features end-to-end
- [ ] Test offline scenarios
- [ ] Test edge cases
- [ ] Test error scenarios
- [ ] Perform accessibility testing

---

## 📋 Phase 9: Styling & UX Polish (Week 7)

### 9.1 UI/UX Refinement
- [ ] Review and refine all screens
- [ ] Ensure consistent spacing and alignment
- [ ] Add proper loading states
- [ ] Add skeleton screens
- [ ] Add empty states with illustrations
- [ ] Add success animations
- [ ] Implement haptic feedback
- [ ] Add pull-to-refresh animations
- [ ] Ensure proper keyboard handling

### 9.2 Accessibility
- [ ] Add accessibility labels
- [ ] Test with screen readers
- [ ] Ensure proper color contrast
- [ ] Add large text support
- [ ] Test with accessibility tools

### 9.3 Responsive Design
- [ ] Test on different screen sizes
- [ ] Optimize for tablets
- [ ] Handle landscape orientation
- [ ] Test on foldable devices

### 9.4 Animations & Transitions
- [ ] Add screen transition animations
- [ ] Add micro-interactions
- [ ] Implement swipe gestures
- [ ] Add loading animations

---

## 📋 Phase 10: App Configuration & Assets (Week 7)

### 10.1 App Icons & Splash Screen
- [ ] Design app icon (1024x1024px)
- [ ] Generate adaptive icons for Android
- [ ] Design splash screen
- [ ] Configure splash screen in app.json
- [ ] Test icons on different Android versions

### 10.2 App Configuration
- [ ] Update `app.json`:
  - [ ] App name and slug
  - [ ] Bundle identifier (com.yourcompany.inventorybilling)
  - [ ] Version and build number
  - [ ] Permissions
  - [ ] Orientation settings
  - [ ] Android-specific settings
- [ ] Configure `eas.json` for builds
- [ ] Set up environment variables for different builds (dev, staging, prod)

### 10.3 Permissions Setup
Add required permissions in app.json:
- [ ] Camera permission
- [ ] Storage permission
- [ ] Location permission
- [ ] Notification permission
- [ ] Add permission request UI with explanations

---

## 📋 Phase 11: Build & Deployment (Week 8)

### 11.1 Local Build Testing
- [ ] Build development APK: `eas build --profile development --platform android`
- [ ] Install and test on physical device
- [ ] Test all features thoroughly
- [ ] Fix any build-specific issues

### 11.2 Release Build Preparation
- [ ] Create keystore for signing
- [ ] Configure signing in `eas.json`
- [ ] Update version number
- [ ] Create release notes
- [ ] Prepare app screenshots (various screen sizes)
- [ ] Prepare feature graphic
- [ ] Create app description

### 11.3 Internal Testing
- [ ] Build internal testing APK: `eas build --profile preview --platform android`
- [ ] Distribute to internal testers
- [ ] Collect feedback
- [ ] Fix reported issues
- [ ] Iterate and rebuild

### 11.4 Google Play Console Setup
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Create app in Google Play Console
- [ ] Fill in app details
- [ ] Add content rating questionnaire
- [ ] Set up pricing and distribution
- [ ] Upload privacy policy
- [ ] Configure in-app updates (optional)

### 11.5 Production Build
- [ ] Build production APK/AAB: `eas build --profile production --platform android`
- [ ] Test production build thoroughly
- [ ] Upload to Google Play Console (Internal Testing track first)
- [ ] Complete all required information
- [ ] Submit for review

### 11.6 Release Strategy
- [ ] Start with Internal Testing (team only)
- [ ] Move to Closed Testing (beta testers)
- [ ] Progress to Open Testing (public beta)
- [ ] Finally, release to Production
- [ ] Monitor crash reports and reviews
- [ ] Respond to user feedback

---

## 📋 Phase 12: Post-Launch (Ongoing)

### 12.1 Monitoring & Analytics
- [ ] Set up Firebase Analytics (optional)
- [ ] Set up Sentry for error tracking
- [ ] Monitor crash reports
- [ ] Track user engagement metrics
- [ ] Set up performance monitoring

### 12.2 User Feedback
- [ ] Monitor app reviews on Play Store
- [ ] Respond to user reviews
- [ ] Collect user feedback in-app
- [ ] Create feature request board
- [ ] Prioritize based on feedback

### 12.3 Maintenance & Updates
- [ ] Fix critical bugs immediately
- [ ] Plan regular update cycles
- [ ] Keep dependencies updated
- [ ] Test with new Android versions
- [ ] Maintain backward compatibility
- [ ] Monitor API changes from Supabase

### 12.4 Feature Enhancements
- [ ] Implement user-requested features
- [ ] Optimize performance based on metrics
- [ ] Add new integrations
- [ ] Expand e-invoice/e-waybill features
- [ ] Add advanced reporting

### 12.5 iOS Expansion (Future)
- [ ] Test app on iOS simulator
- [ ] Fix iOS-specific issues
- [ ] Create iOS build configuration
- [ ] Build and test on iOS devices
- [ ] Prepare for App Store submission
- [ ] Submit to Apple App Store

---

## 🔧 Technical Checklist

### Code Quality
- [ ] Follow React Native best practices
- [ ] Use TypeScript strictly (no `any` types)
- [ ] Write meaningful comments
- [ ] Follow consistent naming conventions
- [ ] Keep components small and focused
- [ ] Extract reusable logic to hooks
- [ ] Use proper error handling
- [ ] Validate all user inputs

### Security
- [ ] Store sensitive data securely (expo-secure-store)
- [ ] Never commit API keys to Git
- [ ] Use environment variables
- [ ] Implement proper authentication checks
- [ ] Validate all API responses
- [ ] Sanitize user inputs
- [ ] Implement rate limiting
- [ ] Add certificate pinning (advanced)

### Performance
- [ ] Minimize bundle size
- [ ] Use code splitting
- [ ] Optimize images
- [ ] Implement proper list virtualization
- [ ] Avoid unnecessary re-renders
- [ ] Use production builds for testing
- [ ] Monitor memory usage
- [ ] Profile app performance

### Documentation
- [ ] Document setup process
- [ ] Document architecture decisions
- [ ] Create component documentation
- [ ] Document API integration
- [ ] Create troubleshooting guide
- [ ] Document deployment process

---

## 📦 Key Dependencies Summary

```json
{
  "dependencies": {
    "@react-navigation/native": "^6.x",
    "@react-navigation/stack": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@supabase/supabase-js": "^2.x",
    "react-native-paper": "^5.x",
    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "expo": "~50.x",
    "expo-camera": "~14.x",
    "expo-barcode-scanner": "~12.x",
    "expo-image-picker": "~14.x",
    "expo-print": "~12.x",
    "expo-sharing": "~11.x",
    "expo-notifications": "~0.27.x",
    "expo-local-authentication": "~13.x",
    "expo-location": "~16.x",
    "expo-sqlite": "~13.x",
    "expo-secure-store": "~12.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-pdf": "^6.x"
  }
}
```

---

## 🎯 Success Criteria

- [ ] App runs smoothly on Android 8.0+
- [ ] All core features working (invoicing, inventory, e-waybill)
- [ ] Offline functionality works correctly
- [ ] Data syncs properly with backend
- [ ] App passes all manual test cases
- [ ] No critical bugs or crashes
- [ ] App follows Material Design guidelines
- [ ] Performance is acceptable (smooth 60fps)
- [ ] App size is under 50MB
- [ ] Successfully published on Google Play Store

---

## 📞 Support & Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Documentation**: https://reactnavigation.org/
- **React Native Paper**: https://reactnativepaper.com/
- **Supabase Documentation**: https://supabase.com/docs
- **EAS Build Documentation**: https://docs.expo.dev/build/introduction/

---

## 📝 Notes

- Regularly commit your progress to Git
- Test on real devices frequently, not just emulator
- Start with core features, add nice-to-haves later
- Prioritize user experience and performance
- Keep the app size minimal
- Follow Material Design 3 guidelines for Android
- Plan for future iOS release from the start

---

**Last Updated**: December 31, 2025  
**Status**: Ready to Start  
**Next Step**: Begin Phase 1 - Project Setup & Environment
