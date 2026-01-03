import { useEffect, useCallback, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onDiscard?: () => void;
}

/**
 * Hook to handle unsaved changes warnings when navigating away.
 * 
 * IMPORTANT: Only use this hook on screens that actually have editable content
 * (CreateInvoiceScreen, AddCustomerScreen, AddItemScreen, etc.)
 * 
 * DO NOT use on view-only screens (InvoiceDetailScreen, CustomerDetailScreen)
 * 
 * Shows an alert when user tries to:
 * - Press hardware back button (Android)
 * - Navigate away via gestures or navigation actions
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  title = 'Discard changes?',
  message = 'You have unsaved changes. Are you sure you want to discard them?',
  confirmText = 'Discard',
  cancelText = 'Keep Editing',
  onDiscard,
}: UseUnsavedChangesOptions) {
  const navigation = useNavigation();
  const hasChangesRef = useRef(hasUnsavedChanges);
  
  // Keep ref in sync with prop
  useEffect(() => {
    hasChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasChangesRef.current) {
        Alert.alert(title, message, [
          { text: cancelText, style: 'cancel' },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => {
              onDiscard?.();
              navigation.goBack();
            },
          },
        ]);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [navigation, title, message, confirmText, cancelText, onDiscard]);

  // Handle navigation events (swipe back gesture, programmatic navigation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // No unsaved changes - allow navigation freely
      if (!hasChangesRef.current) {
        return;
      }

      // User is trying to leave with unsaved changes - show confirmation
      e.preventDefault();

      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        {
          text: confirmText,
          style: 'destructive',
          onPress: () => {
            onDiscard?.();
            // Dispatch the blocked action to proceed with navigation
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, title, message, confirmText, cancelText, onDiscard]);

  // Helper function for manual navigation confirmation
  const confirmNavigation = useCallback(
    (navigateAction: () => void) => {
      if (hasChangesRef.current) {
        Alert.alert(title, message, [
          { text: cancelText, style: 'cancel' },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => {
              onDiscard?.();
              navigateAction();
            },
          },
        ]);
      } else {
        navigateAction();
      }
    },
    [title, message, confirmText, cancelText, onDiscard]
  );

  return { confirmNavigation };
}

export default useUnsavedChanges;
