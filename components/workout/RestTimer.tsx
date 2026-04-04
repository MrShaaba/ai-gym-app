import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

interface RestTimerProps {
  endTime: number;
  onDismiss: () => void;
}

export function RestTimer({ endTime, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) onDismiss();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime, onDismiss]);

  useEffect(() => {
    if (remaining <= 5 && remaining > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [remaining, pulseAnim]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>REST</Text>
        <Animated.Text style={[styles.time, { transform: [{ scale: pulseAnim }] }]}>
          {formatTime(remaining)}
        </Animated.Text>
        <TouchableOpacity onPress={onDismiss} style={styles.skipBtn}>
          <Ionicons name="play-skip-forward" size={18} color={colors.background} />
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  time: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  skipText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
