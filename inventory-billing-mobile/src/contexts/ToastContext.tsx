import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastContextType {
  show: (config: ToastConfig) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const VARIANT_CONFIG: Record<ToastVariant, { bg: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { bg: '#059669', icon: 'checkmark-circle', color: '#FFFFFF' },
  error: { bg: '#DC2626', icon: 'alert-circle', color: '#FFFFFF' },
  warning: { bg: '#D97706', icon: 'warning', color: '#FFFFFF' },
  info: { bg: '#2563EB', icon: 'information-circle', color: '#FFFFFF' },
};

const DEFAULT_DURATION = 3000;

interface ActiveToast extends Required<Pick<ToastConfig, 'message' | 'variant'>> {
  id: number;
  duration: number;
  action?: { label: string; onPress: () => void };
}

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const idCounter = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback((config: ToastConfig) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    const id = ++idCounter.current;
    const activeToast: ActiveToast = {
      id,
      message: config.message,
      variant: config.variant ?? 'info',
      duration: config.duration ?? DEFAULT_DURATION,
      action: config.action,
    };

    setToast(activeToast);
    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      hide();
    }, activeToast.duration);
  }, [translateY, opacity, hide]);

  const success = useCallback((message: string) => show({ message, variant: 'success' }), [show]);
  const error = useCallback((message: string) => show({ message, variant: 'error' }), [show]);
  const warning = useCallback((message: string) => show({ message, variant: 'warning' }), [show]);
  const info = useCallback((message: string) => show({ message, variant: 'info' }), [show]);

  const config = toast ? VARIANT_CONFIG[toast.variant] : null;

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info }}>
      {children}
      {toast && config && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[styles.toast, { backgroundColor: config.bg }]}
            onPress={hide}
            activeOpacity={0.9}
          >
            <Ionicons name={config.icon} size={20} color={config.color} />
            <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <TouchableOpacity
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}
                style={styles.actionButton}
              >
                <Text style={[styles.actionText, { color: config.color }]}>
                  {toast.action.label}
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    width: '100%',
    maxWidth: 480,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
