import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useFocusRefresh(onRefresh: () => void) {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      onRefresh();
    }, [onRefresh])
  );
}
