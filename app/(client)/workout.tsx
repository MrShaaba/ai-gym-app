import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';

const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(startOfWeek);
  d.setDate(startOfWeek.getDate() + i);
  return {
    label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    date: d.getDate(),
    isToday: d.toDateString() === now.toDateString(),
    hasWorkout: [0, 1, 3, 5].includes(i),
  };
});

const mockRoutines = [
  { id: '1', name: 'Push — Chest Focused', muscles: 'Chest, Triceps, Shoulders', exercises: 7, duration: '50 min' },
  { id: '2', name: 'Pull Day Chapter 3', muscles: 'Lats, Biceps, Rhomboids', exercises: 7, duration: '45 min' },
  { id: '3', name: 'Lower Body', muscles: 'Quads, Glutes, Hamstrings, Calves', exercises: 8, duration: '55 min' },
  { id: '4', name: 'Push Day — Shoulders', muscles: 'Shoulders, Triceps, Traps', exercises: 7, duration: '45 min' },
  { id: '5', name: 'Upper Body Special', muscles: 'Chest, Back, Arms', exercises: 6, duration: '40 min' },
];

export default function Workout() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Workout</Text>
        <Text style={styles.dateSubtitle}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        <View style={styles.calendarStrip}>
          {WEEK_DAYS.map((day) => (
            <View key={day.label} style={[styles.dayCol, day.isToday && styles.dayColActive]}>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelActive]}>{day.label.toUpperCase()}</Text>
              <Text style={[styles.dayDate, day.isToday && styles.dayDateActive]}>{day.date}</Text>
              {day.hasWorkout && <View style={[styles.dayDot, day.isToday && styles.dayDotActive]} />}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Today's Routines</Text>

        {mockRoutines.slice(0, 3).map((routine) => (
          <Card key={routine.id} accent style={styles.routineCard}>
            <View style={styles.routineRow}>
              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineMuscles}>{routine.muscles}</Text>
                <Text style={styles.routineMeta}>
                  {routine.exercises} exercises  ·  {routine.duration}
                </Text>
              </View>
              <TouchableOpacity style={styles.playBtn}>
                <Ionicons name="play" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Button
            title="Generate Workout"
            icon="sparkles-outline"
            onPress={() => {}}
            style={styles.actionBtn}
          />
          <Button
            title="Browse Routines"
            icon="library-outline"
            variant="secondary"
            onPress={() => {}}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  dateSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayLabelActive: {
    color: colors.accent,
  },
  dayDate: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dayDateActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent + '60',
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
  routineInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  routineMuscles: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    gap: spacing.md,
  },
  actionBtn: {
    // full width default
  },
});
