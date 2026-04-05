import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

interface PremiumGateProps {
  used: number;
  limit: number;
  remaining: number;
  children: React.ReactNode;
}

/**
 * Reusable premium gate wrapper.
 * Shows an upgrade prompt when the free limit is reached.
 * When billing is added, this becomes the enforcement point.
 */
export function PremiumGate({ used, limit, remaining, children }: PremiumGateProps) {
  const router = useRouter();

  if (remaining > 0) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={32} color={colors.accent} />
      </View>
      <Text style={styles.title}>Free Generations Used</Text>
      <Text style={styles.subtitle}>
        You&apos;ve used all {limit} free AI-generated plans. Upgrade to Pro for unlimited access.
      </Text>
      <View style={styles.usageRow}>
        <Text style={styles.usageText}>{used} / {limit} used</Text>
      </View>
      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => router.push('/(shared)/subscription')}
      >
        <Ionicons name="diamond-outline" size={18} color={colors.background} />
        <Text style={styles.upgradeBtnText}>View Plans</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  usageRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  usageText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  upgradeBtnText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
