import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const mockRoutines = [
  { id: '1', name: 'Push Day', exercises: 5, duration: '45 min' },
  { id: '2', name: 'Pull Day', exercises: 6, duration: '50 min' },
  { id: '3', name: 'Leg Day', exercises: 5, duration: '55 min' },
];

export default function Workout() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>Ready to train? 💪</Text>

        <View style={styles.calendarStrip}>
          {DAYS.map((day, i) => (
            <View key={day} style={[styles.dayCol, i === TODAY_INDEX && styles.dayColActive]}>
              <Text style={[styles.dayLabel, i === TODAY_INDEX && styles.dayLabelActive]}>{day}</Text>
              <View style={[styles.dayDot, i === TODAY_INDEX && styles.dayDotActive]} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Routines</Text>

        {mockRoutines.map((routine) => (
          <Card key={routine.id} style={styles.routineCard}>
            <View style={styles.routineRow}>
              <View>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineMeta}>
                  {routine.exercises} exercises · {routine.duration}
                </Text>
              </View>
              <Ionicons name="play-circle" size={36} color={colors.accent} />
            </View>
          </Card>
        ))}

        <Button
          title="Generate AI Workout"
          variant="outline"
          onPress={() => {}}
          style={styles.aiBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  dayCol: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dayColActive: {
    backgroundColor: colors.accent + '20',
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  dayLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  routineCard: {
    marginBottom: spacing.md,
  },
  routineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  aiBtn: {
    marginTop: spacing.md,
  },
});
