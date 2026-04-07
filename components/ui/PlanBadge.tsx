import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssignmentSource } from '@/types/assignment';
import { PLAN_LABEL, PLAN_COLOR } from '@/config/copy';

interface PlanBadgeProps {
  source: AssignmentSource;
  size?: 'sm' | 'md';
}

const ICON: Record<AssignmentSource, keyof typeof Ionicons.glyphMap> = {
  trainer: 'person-circle-outline',
  self: 'create-outline',
  ai: 'sparkles',
};

export function PlanBadge({ source, size = 'sm' }: PlanBadgeProps) {
  const color = PLAN_COLOR[source];
  const iconSize = size === 'sm' ? 10 : 12;
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }, size === 'md' && styles.md]}>
      <Ionicons name={ICON[source]} size={iconSize} color={color} />
      <Text style={[styles.text, { color }, size === 'md' && styles.textMd]}>
        {PLAN_LABEL[source]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: 11,
  },
});
