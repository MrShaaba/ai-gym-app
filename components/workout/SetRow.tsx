import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type { SetLog } from '@/types/workout';

interface SetRowProps {
  index: number;
  data: SetLog;
  onUpdate: (data: Partial<SetLog>) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function SetRow({ index, data, onUpdate, onToggleComplete, onRemove, canRemove }: SetRowProps) {
  return (
    <View style={[styles.row, data.completed && styles.rowCompleted]}>
      <Text style={styles.setNum}>{index + 1}</Text>

      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={String(data.weight)}
          onChangeText={(v) => onUpdate({ weight: Number(v) || 0 })}
          keyboardType="numeric"
          selectTextOnFocus
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.unit}>kg</Text>
      </View>

      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={String(data.reps)}
          onChangeText={(v) => onUpdate({ reps: Number(v) || 0 })}
          keyboardType="numeric"
          selectTextOnFocus
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.unit}>reps</Text>
      </View>

      <TouchableOpacity onPress={onToggleComplete} style={styles.checkBtn}>
        <Ionicons
          name={data.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={data.completed ? colors.accent : colors.textMuted}
        />
      </TouchableOpacity>

      {canRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  rowCompleted: {
    backgroundColor: colors.accent + '10',
  },
  setNum: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    flex: 1,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  unit: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginLeft: 2,
  },
  checkBtn: {
    padding: 4,
  },
  removeBtn: {
    padding: 2,
  },
});
