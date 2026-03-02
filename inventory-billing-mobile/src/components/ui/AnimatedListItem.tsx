import React, { useEffect, useState } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface AnimatedListItemProps {
  readonly children: React.ReactNode;
  readonly index: number;
  readonly style?: StyleProp<ViewStyle>;
}

const MAX_ANIMATED = 15;

export default function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));

  useEffect(() => {
    if (index >= MAX_ANIMATED) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    const delay = index * 50;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
