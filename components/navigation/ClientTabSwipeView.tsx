import { useMemo, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

const CLIENT_TAB_ROUTES = [
  { key: 'workout', href: '/(client)/workout' },
  { key: 'programs', href: '/(client)/programs' },
  { key: 'schedule', href: '/(client)/schedule' },
  { key: 'statistics', href: '/(client)/statistics' },
  { key: 'profile', href: '/(client)/profile' },
  { key: 'discover', href: '/(client)/discover' },
] as const;

export type ClientTabRouteKey = (typeof CLIENT_TAB_ROUTES)[number]['key'];

interface ClientTabSwipeViewProps {
  routeKey: ClientTabRouteKey;
  enabled?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

export function ClientTabSwipeView({ routeKey, enabled = true, children, style }: ClientTabSwipeViewProps) {
  const router = useRouter();
  const routeIndex = CLIENT_TAB_ROUTES.findIndex((route) => route.key === routeKey);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (!enabled || routeIndex < 0) return false;
        if (gestureState.numberActiveTouches !== 1) return false;

        const horizontalDistance = Math.abs(gestureState.dx);
        const verticalDistance = Math.abs(gestureState.dy);
        return horizontalDistance > 24 && horizontalDistance > verticalDistance * 1.4;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (!enabled || routeIndex < 0) return;

        if (gestureState.dx <= -64) {
          const nextRoute = CLIENT_TAB_ROUTES[routeIndex + 1];
          if (nextRoute) {
            router.replace(nextRoute.href);
          }
          return;
        }

        if (gestureState.dx >= 64) {
          const previousRoute = CLIENT_TAB_ROUTES[routeIndex - 1];
          if (previousRoute) {
            router.replace(previousRoute.href);
          }
        }
      },
    }),
    [enabled, routeIndex, router],
  );

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});