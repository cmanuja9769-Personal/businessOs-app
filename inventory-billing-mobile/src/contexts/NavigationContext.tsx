import React, { createContext, useContext } from 'react';

/**
 * Simplified Navigation Context
 * 
 * The navigation model follows these principles:
 * 1. Each screen handles its own unsaved changes via useUnsavedChanges hook
 * 2. Tab switching is instant - no global confirmations
 * 3. Only edit screens (CreateInvoice, AddCustomer, etc.) show discard prompts
 * 4. View-only screens allow free navigation
 */
interface NavigationContextType {
  // Currently empty - kept for future extensibility
  // Individual screens handle their own unsaved changes
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContext.Provider value={{}}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}
