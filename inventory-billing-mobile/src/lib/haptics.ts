import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const IS_IOS = Platform.OS === 'ios';
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

export function lightTap(): void {
  if (!IS_NATIVE) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function mediumTap(): void {
  if (!IS_NATIVE) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function heavyTap(): void {
  if (!IS_NATIVE) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function successFeedback(): void {
  if (!IS_NATIVE) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorFeedback(): void {
  if (!IS_NATIVE) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function warningFeedback(): void {
  if (!IS_NATIVE) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function selectionTap(): void {
  if (!IS_NATIVE) return;
  Haptics.selectionAsync().catch(() => {});
}
