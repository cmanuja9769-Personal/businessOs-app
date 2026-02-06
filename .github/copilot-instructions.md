# GitHub Copilot Instructions: Next.js & TypeScript Engineering Standards

Apply the following rules to all code generations, refactors, and reviews to maintain a scalable, type-safe, and high-performance repository.

## 1. Directory Structure & Architecture

- **Feature-Based Design**: Organize domain-specific code into `features/[feature-name]/`. Each feature folder must act as a self-contained module containing its own components, hooks, and services.
- **Routing Conventions**: Use route groups `(group-name)` for organizational grouping and private folders `_components` for route-specific logic that should not be public.
- **Path Aliases**: Use `@/` prefix for all imports (configured in `tsconfig.json`).

## 2. Styling & Design System (Tailwind CSS)

- **Relative Units**: Strictly avoid `px` for font sizes, padding, and margins. Use `rem` units (based on 16px root) to ensure web accessibility and proper scaling.
- **Semantic Color Palette**: Use CSS custom properties defined in `globals.css` instead of arbitrary hex codes. Reference design tokens from `lib/design-tokens.ts`.
- **Dynamic Classes**: Use `class-variance-authority` (CVA) for managing component variants. Combine with `cn()` helper function (utilizing `clsx` and `tailwind-merge`) to safely resolve class conflicts.
- **No Comments in Code**: Remove all inline comments. Code should be self-documenting.

## 3. Logic & Code Quality

- **Ruthless Simplification**: Proactively identify and remove over-engineered abstractions. If a service layer or hook merely wraps another function without adding unique value, collapse it.
- **State Locality**: Keep state local to the component unless global management is strictly necessary. Avoid dumping UI flags (e.g., `isModalOpen`) into global stores like Zustand.
- **Next.js 15+ Async APIs**: Ensure that `params` and `searchParams` in layouts and pages are treated as Promises and properly awaited.
- **No Dummy Data**: Never initialize stores or components with mock/dummy data. Only real data from APIs should be displayed.

## 4. Type Safety & Advanced TypeScript

- **Discriminated Unions**: Represent asynchronous states (loading, error, success) using discriminated unions to prevent "impossible states":
  ```typescript
  type AsyncState<T, E = Error> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: T }
    | { status: "error"; error: E };
  ```
- **Generics with Constraints**: Use generics (e.g., `<T extends string | number>`) for reusable components that handle dynamic data types.
- **Read-only Props**: Enforce immutability by typing component props as `readonly`.
- **Strict Null Checks**: Always handle `null` and `undefined` cases explicitly.

## 5. Automated Compliance (ESLint & Sonar)

- **Core Web Vitals**: Adhere to `eslint-config-next/core-web-vitals` to protect performance metrics (e.g., forcing `next/image` over `<img>`).
- **SonarJS Maintainability**: Refactor functions with a Cognitive Complexity score above 15. Eliminate code smells like `no-identical-functions`, `no-duplicate-string`, and `no-collapsible-if`.
- **Accessibility**: All interactive components must support keyboard focus and include valid ARIA roles and labels.
- **Max Depth**: Limit nesting to 4 levels maximum. Use early returns to flatten logic.

## 6. Mobile & Desktop Feature Parity

- **Responsive Layouts**: Use Tailwind's mobile-first approach. Write base styles for mobile and use `md:`, `lg:`, and `xl:` prefixes for larger screens. Avoid duplicating components for different screen sizes; use responsive utility classes instead.
- **Shared Logic**: All business logic must reside in `features/`. Both mobile and desktop views must call the same hooks and services to ensure 100% functional parity.
- **Touch-Friendly UI**: Ensure interactive elements (buttons, links) have a minimum touch target of 44px × 44px (2.75rem). Use `cursor-pointer` sparingly as it does not exist on mobile.

## 7. Standalone Mobile Deployment (PWA & Capacitor)

- **Standalone Manifest**: Maintain an `app/manifest.ts` file with `display: 'standalone'` and `orientation: 'portrait'`. This allows the app to hide browser UI when "Added to Home Screen".
- **Platform Detection**: When using native hardware features (Camera, GPS), use the Capacitor bridge. Detect the platform to provide fallbacks:

  ```typescript
  import { Capacitor } from "@capacitor/core";

  if (Capacitor.isNativePlatform()) {
    // Call Native API via USB-debugged container
  } else {
    // Web Fallback
  }
  ```

- **Static Export for Native**: If deploying via Capacitor (Android/iOS), ensure `next.config.ts` uses `output: 'export'`. This generates the static assets required for the native container to work offline after disconnecting from the debugger.
- **USB Debugging Workflow**:
  1. Run `next build` to generate the `/out` directory.
  2. Run `npx cap sync` to push web code to the `android/` or `ios/` folders.
  3. Use Android Studio/Xcode to "Run" the app on the physical device via USB.

## 8. Persistence & Offline Support

- **LocalStorage/IndexedDB**: Use browser-persistent storage for state that must survive app restarts and network disconnections.
- **Service Workers**: Ensure `sw.js` is configured to cache essential assets (CSS/JS) so the standalone app remains functional without an active internet connection.

## 9. Component Patterns

- **Shared UI Components**: Use components from `components/ui/` for common patterns:
  - `DeleteConfirmButton` - Confirmation dialogs with loading states
  - `DataEmptyState` - Empty state with icon, title, description, action
  - `PageHeader` - Page title with description and actions
  - `StatusBadge` - CVA-powered status indicators
  - `RoleBadge` - User role badges
  - `SearchInput` - Debounced search input
  - `DataPagination` - Smart pagination

- **Formatting Utilities**: Use utilities from `lib/format-utils.ts`:
  - `formatCurrency()` - Currency formatting with INR default
  - `formatNumber()` - Number formatting with locale
  - `formatPercentage()` - Percentage formatting

- **Date Utilities**: Use utilities from `lib/date-utils.ts`:
  - `formatDate()` - Date formatting with multiple formats
  - `formatRelativeDate()` - Relative dates (today, yesterday)
  - `formatTimeAgo()` - Time ago strings

## 10. Database & API Patterns

- **Supabase**: Use `@supabase/ssr` for server-side and `@supabase/supabase-js` for client-side.
- **Error Handling**: Always wrap database calls in try-catch and return typed error responses.
- **Server Actions**: Use Next.js Server Actions for mutations. Keep them in dedicated files.

## 11. Performance

- **Image Optimization**: Always use `next/image` component.
- **Dynamic Imports**: Use `next/dynamic` for heavy components with loading states.
- **Memoization**: Use `useMemo` and `useCallback` only when there's a measurable performance benefit.

## 12. Testing Checklist

Before completing any task, verify:

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] No dummy/mock data in production code
- [ ] All forms have proper validation with Zod
- [ ] Loading and error states are handled
- [ ] UI is responsive (mobile-first)
- [ ] Keyboard navigation works for interactive elements
