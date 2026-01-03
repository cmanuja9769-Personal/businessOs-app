import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Track if animation is finishing to disable touch
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const circleScale1 = useRef(new Animated.Value(0)).current;
  const circleScale2 = useRef(new Animated.Value(0)).current;
  const circleScale3 = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderWidth = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Logo entrance with bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // 2. Title entrance
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // 3. Subtitle entrance
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // 4. Background circles
      Animated.stagger(150, [
        Animated.spring(circleScale1, {
          toValue: 1,
          friction: 8,
          tension: 20,
          useNativeDriver: true,
        }),
        Animated.spring(circleScale2, {
          toValue: 1,
          friction: 8,
          tension: 20,
          useNativeDriver: true,
        }),
        Animated.spring(circleScale3, {
          toValue: 1,
          friction: 8,
          tension: 20,
          useNativeDriver: true,
        }),
      ]),

      // 5. Loading bar
      Animated.parallel([
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(loaderWidth, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),

      // 6. Fade out
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish?.();
    });

    // Set fading out state before fade animation starts (after ~3.1 seconds)
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 3100);

    return () => clearTimeout(fadeTimer);
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      <LinearGradient
        colors={['#4F46E5', '#6366F1', '#818CF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background decorative circles */}
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle1,
            {
              transform: [{ scale: circleScale1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle2,
            {
              transform: [{ scale: circleScale2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bgCircle,
            styles.bgCircle3,
            {
              transform: [{ scale: circleScale3 }],
            },
          ]}
        />

        {/* Main content */}
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: logoScale },
                  { rotate: spin },
                ],
              },
            ]}
          >
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Ionicons name="cube" size={48} color="#4F46E5" />
              </View>
            </View>
          </Animated.View>

          {/* App Name */}
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            Inventory
          </Animated.Text>
          
          <Animated.Text
            style={[
              styles.titleAccent,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            & Billing
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            Smart Business Management
          </Animated.Text>

          {/* Loading bar */}
          <Animated.View
            style={[
              styles.loaderContainer,
              { opacity: loaderOpacity },
            ]}
          >
            <Animated.View
              style={[
                styles.loaderBar,
                {
                  width: loaderWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </Animated.View>

          {/* Features icons */}
          <Animated.View
            style={[
              styles.featuresRow,
              { opacity: subtitleOpacity },
            ]}
          >
            <View style={styles.featureItem}>
              <Ionicons name="receipt-outline" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Invoicing</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Ionicons name="barcode-outline" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Inventory</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Reports</Text>
            </View>
          </Animated.View>
        </View>

        {/* Bottom branding */}
        <Animated.View
          style={[
            styles.bottomBranding,
            { opacity: subtitleOpacity },
          ]}
        >
          <Text style={styles.brandingText}>GST Compliant</Text>
          <View style={styles.brandingDot} />
          <Text style={styles.brandingText}>E-Invoice Ready</Text>
          <View style={styles.brandingDot} />
          <Text style={styles.brandingText}>E-Way Bill</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bgCircle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    left: -width * 0.5,
  },
  bgCircle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.3,
    right: -width * 0.4,
  },
  bgCircle3: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: height * 0.3,
    left: -width * 0.3,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoInner: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -1,
    marginTop: -8,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  loaderContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 40,
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  brandingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
