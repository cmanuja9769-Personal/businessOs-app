import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { initDatabase } from './src/lib/offline-storage';
import SplashScreen from './src/screens/SplashScreen';
import 'react-native-url-polyfill/auto';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  const handleSplashFinish = () => {
    setSplashAnimationDone(true);
  };

  // Hide splash when both animation is done AND app is ready
  useEffect(() => {
    if (isReady && splashAnimationDone) {
      setShowSplash(false);
    }
  }, [isReady, splashAnimationDone]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PaperProvider>
            <AuthProvider>
              <ErrorBoundary>
                <ToastProvider>
                  <StatusBar style="auto" />
                  <RootNavigator />
                  {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
                </ToastProvider>
              </ErrorBoundary>
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
