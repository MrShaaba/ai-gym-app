import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EXERCISES } from '@/data/exercises';
import { createRoutine } from '@/services/programs';
import { usePreferencesStore } from '@/store/preferencesStore';
import {
  formatWeightValue,
  formatWeightWithUnit,
  getWarmupReps,
  getWarmupWeightKg,
  parseWeightInputToKg,
} from '@/services/units';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { WeightUnitToggle } from '@/components/ui/WeightUnitToggle';
import { colors, fontSize, spacing, borderRadius } from '@/config/theme';
import type {
  Difficulty,
  WorkoutExercise,
  Exercise,
  Equipment,
  MuscleGroup,
  WorkoutExerciseGroupType,
} from '@/types/workout';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const difficultyColor: Record<string, string> = {
  beginner: '#4ADE80',
  intermediate: '#FACC15',
  advanced: '#F87171',
};

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type MuscleFilter = MuscleGroup | 'all';
type EquipmentFilter = Equipment | 'all';

// ---------------------------------------------------------------------------
// Builder types (mirrors client builder)
// ---------------------------------------------------------------------------

type BuilderExercise = {
  exercise: Exercise;
  setsCount: number;
  reps: number;
  /** Always stored in kg (canonical) */
  weight: number;
  includeWarmup?: boolean;
  groupId?: string;
  groupType?: WorkoutExerciseGroupType;
  groupOrder?: number;
};

type BuilderBlock =
  | { key: string; type: 'single'; exercise: BuilderExercise }
  | {
      key: string;
      type: 'group';
      groupId: string;
      groupType: Exclude<WorkoutExerciseGroupType, 'single'>;
      exercises: BuilderExercise[];
    };

// ---------------------------------------------------------------------------
// Helper functions (ported from client builder)
// ---------------------------------------------------------------------------

function getGroupType(count: number): WorkoutExerciseGroupType {
  if (count <= 1) return 'single';
  if (count === 2) return 'superset';
  if (count === 3) return 'triset';
  return 'giantset';
}

function getSelectionLabel(count: number) {
  if (count <= 0) return 'Select exercises';
  if (count === 1) return 'Add (1)';
  if (count === 2) return 'Superset';
  if (count === 3) return 'Tri-set';
  return 'Giant set';
}

function getGroupTypeLabel(groupType: WorkoutExerciseGroupType | undefined) {
  if (!groupType || groupType === 'single') return null;
  return { superset: 'Superset', triset: 'Tri-set', giantset: 'Giant set' }[groupType];
}

function buildBuilderBlocks(exercises: BuilderExercise[]): BuilderBlock[] {
  const blocks: BuilderBlock[] = [];
  const seenGroups = new Set<string>();

  exercises.forEach((exercise, index) => {
    if (exercise.groupId && exercise.groupType && exercise.groupType !== 'single') {
      if (seenGroups.has(exercise.groupId)) return;

      const grouped = exercises
        .filter((item) => item.groupId === exercise.groupId)
        .sort((left, right) => (left.groupOrder ?? 0) - (right.groupOrder ?? 0));

      seenGroups.add(exercise.groupId);

      blocks.push({
        key: `group-${exercise.groupId}`,
        type: 'group',
        groupId: exercise.groupId,
        groupType: exercise.groupType,
        exercises: grouped,
      });
      return;
    }

    blocks.push({
      key: `single-${exercise.exercise.id}-${index}`,
      type: 'single',
      exercise,
    });
  });

  return blocks;
}

function normalizeBuilderExercises(exercises: BuilderExercise[]): BuilderExercise[] {
  const groupedById = new Map<string, BuilderExercise[]>();

  exercises.forEach((exercise) => {
    if (!exercise.groupId) return;
    const current = groupedById.get(exercise.groupId) ?? [];
    current.push(exercise);
    groupedById.set(exercise.groupId, current);
  });

  return exercises.map((exercise) => {
    if (!exercise.groupId) {
      return { ...exercise, groupType: undefined, groupOrder: undefined };
    }

    const grouped = (groupedById.get(exercise.groupId) ?? [])
      .slice()
      .sort((left, right) => (left.groupOrder ?? 0) - (right.groupOrder ?? 0));

    if (grouped.length <= 1) {
      return {
        ...exercise,
        groupId: undefined,
        groupType: undefined,
        groupOrder: undefined,
      };
    }

    return {
      ...exercise,
      groupType: getGroupType(grouped.length),
      groupOrder: grouped.findIndex((item) => item === exercise),
    };
  });
}

function getExerciseSearchScore(exercise: Exercise, query: string) {
  if (!query) return 1;

  const normalizedName = exercise.name.toLowerCase();

  if (normalizedName === query) return 120;
  if (normalizedName.startsWith(query)) return 90;
  if (normalizedName.includes(query)) return 70;
  if (exercise.muscleGroups.some((group) => group.includes(query))) return 40;
  if (exercise.equipment.includes(query)) return 20;
  return 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrainerCreateRoutine() {
  const { programId, programName } = useLocalSearchParams<{
    programId: string;
    programName: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const groupedAuthoringGate = useFeatureGate('grouped_routine_authoring');
  const weightUnit = usePreferencesStore((s) => s.weightUnit);

  // ---- Form state ----
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSelections, setPickerSelections] = useState<string[]>([]);
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [openFilter, setOpenFilter] = useState<'muscle' | 'equipment' | null>(null);
  const [busy, setBusy] = useState(false);

  // ---- Derived data ----

  const muscleOptions = useMemo(
    () =>
      ['all', ...Array.from(new Set(EXERCISES.flatMap((e) => e.muscleGroups)))] as MuscleFilter[],
    [],
  );

  const equipmentOptions = useMemo(
    () =>
      ['all', ...Array.from(new Set(EXERCISES.map((e) => e.equipment)))] as EquipmentFilter[],
    [],
  );

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const selectedIds = new Set(selectedExercises.map((item) => item.exercise.id));

    return EXERCISES.filter((exercise) => !selectedIds.has(exercise.id))
      .filter((exercise) => muscleFilter === 'all' || exercise.muscleGroups.includes(muscleFilter))
      .filter((exercise) => equipmentFilter === 'all' || exercise.equipment === equipmentFilter)
      .map((exercise) => ({ exercise, score: getExerciseSearchScore(exercise, q) }))
      .filter((item) => !q || item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.exercise.name.localeCompare(right.exercise.name),
      )
      .map((item) => item.exercise);
  }, [equipmentFilter, muscleFilter, searchQuery, selectedExercises]);

  const builderBlocks = useMemo(() => buildBuilderBlocks(selectedExercises), [selectedExercises]);

  // ---- Actions ----

  const togglePickerSelection = (exerciseId: string) => {
    setPickerSelections((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleAddSelectedExercises = () => {
    const selected = pickerSelections
      .map((id) => EXERCISES.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));

    if (selected.length === 0) return;

    if (selected.length > 1 && !groupedAuthoringGate.allowed) {
      Alert.alert(
        'Premium Feature',
        'Grouped routine blocks like supersets, tri-sets, and giant sets unlock with Premium. You can still add single exercises on your current plan.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'View Premium', onPress: () => router.push('/(shared)/subscription') },
        ],
      );
      return;
    }

    const groupType = getGroupType(selected.length);
    const groupId =
      selected.length > 1
        ? `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : undefined;

    setSelectedExercises((prev) => [
      ...prev,
      ...selected.map((exercise, index) => ({
        exercise,
        setsCount: 3,
        reps: 10,
        weight: 0,
        groupId,
        groupType,
        groupOrder: groupId ? index : undefined,
      })),
    ]);

    setPickerSelections([]);
    setSearchQuery('');
    setOpenFilter(null);
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      normalizeBuilderExercises(prev.filter((item) => item.exercise.id !== exerciseId)),
    );
  };

  const updateExercise = (
    exerciseId: string,
    field: 'setsCount' | 'reps' | 'weight',
    value: number,
  ) => {
    setSelectedExercises((prev) => {
      const target = prev.find((item) => item.exercise.id === exerciseId);
      if (!target) return prev;

      return prev.map((item) => {
        const shouldUpdateGroup =
          field === 'setsCount' && target.groupId && item.groupId === target.groupId;
        const shouldUpdateSingle = item.exercise.id === exerciseId;

        if (shouldUpdateGroup || shouldUpdateSingle) {
          return { ...item, [field]: value };
        }

        return item;
      });
    });
  };

  const toggleWarmup = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.map((item) =>
        item.exercise.id === exerciseId
          ? { ...item, includeWarmup: !item.includeWarmup }
          : item,
      ),
    );
  };

  const canSubmit = name.trim() && selectedExercises.length > 0;

  const pickerActionLabel =
    pickerSelections.length > 1 && !groupedAuthoringGate.allowed
      ? `${getSelectionLabel(pickerSelections.length)} · Premium`
      : getSelectionLabel(pickerSelections.length);

  // ---- Submit ----

  const handleCreate = async () => {
    if (!canSubmit || !programId) return;
    setBusy(true);

    const exercises: WorkoutExercise[] = selectedExercises.map((item) => ({
      exercise: item.exercise,
      sets: [
        ...(item.includeWarmup
          ? [
              {
                reps: getWarmupReps(item.reps),
                weight: getWarmupWeightKg(item.weight) || undefined,
                restSeconds: 60,
                isWarmup: true,
              },
            ]
          : []),
        ...Array.from({ length: item.setsCount }, () => ({
          reps: item.reps,
          weight: item.weight || undefined,
          restSeconds: 90,
        })),
      ],
      groupId: item.groupId,
      groupType: item.groupType,
      groupOrder: item.groupOrder,
    }));

    try {
      await createRoutine({
        programId,
        name: name.trim(),
        difficulty,
        durationMinutes: parseInt(durationMinutes, 10) || 45,
        exercises,
      });

      Alert.alert('Routine Created', `"${name.trim()}" has been added to ${programName}.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create routine.');
    } finally {
      setBusy(false);
    }
  };

  // ---- Render ----

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + spacing.md : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: spacing.xxl + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Routine</Text>
          <Text style={styles.subtitle}>for {programName}</Text>

          {/* ---- Name ---- */}
          <Text style={styles.sectionTitle}>Routine Name</Text>
          <Card style={styles.fieldCard}>
            <Input
              placeholder="e.g. Push Day — Chest Focus"
              value={name}
              onChangeText={setName}
            />
          </Card>

          {/* ---- Difficulty ---- */}
          <Text style={styles.sectionTitle}>Difficulty</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.diffChip,
                  difficulty === value && {
                    backgroundColor: difficultyColor[value] + '20',
                    borderColor: difficultyColor[value],
                  },
                ]}
                onPress={() => setDifficulty(value)}
              >
                <Text
                  style={[
                    styles.diffText,
                    difficulty === value && { color: difficultyColor[value] },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ---- Duration ---- */}
          <Text style={styles.sectionTitle}>Duration (minutes)</Text>
          <Card style={styles.fieldCard}>
            <Input
              placeholder="45"
              keyboardType="number-pad"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
            />
          </Card>

          {/* ---- Exercises header ---- */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={styles.sectionTitle}>Exercises ({selectedExercises.length})</Text>
              <WeightUnitToggle />
            </View>
            <TouchableOpacity onPress={() => setShowPicker((c) => !c)}>
              <Ionicons
                name={showPicker ? 'close-circle' : 'add-circle'}
                size={28}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>

          {/* ---- Exercise picker ---- */}
          {showPicker && (
            <Card style={styles.pickerCard}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises…"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              {/* Filter row */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={styles.filterTrigger}
                  onPress={() =>
                    setOpenFilter((c) => (c === 'muscle' ? null : 'muscle'))
                  }
                >
                  <Text style={styles.filterTriggerLabel}>
                    Muscle: {muscleFilter === 'all' ? 'All' : muscleFilter}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterTrigger}
                  onPress={() =>
                    setOpenFilter((c) => (c === 'equipment' ? null : 'equipment'))
                  }
                >
                  <Text style={styles.filterTriggerLabel}>
                    Equipment: {equipmentFilter === 'all' ? 'All' : equipmentFilter}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {openFilter === 'muscle' && (
                <View style={styles.filterMenu}>
                  {muscleOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.filterMenuItem}
                      onPress={() => {
                        setMuscleFilter(option);
                        setOpenFilter(null);
                      }}
                    >
                      <Text style={styles.filterMenuText}>
                        {option === 'all' ? 'All muscles' : option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {openFilter === 'equipment' && (
                <View style={styles.filterMenu}>
                  {equipmentOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.filterMenuItem}
                      onPress={() => {
                        setEquipmentFilter(option);
                        setOpenFilter(null);
                      }}
                    >
                      <Text style={styles.filterMenuText}>
                        {option === 'all' ? 'All equipment' : option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Picker list with multi-select */}
              <ScrollView
                style={styles.pickerList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {filteredExercises.slice(0, 16).map((exercise) => {
                  const isSelected = pickerSelections.includes(exercise.id);

                  return (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => togglePickerSelection(exercise.id)}
                    >
                      <View style={styles.pickerItemInfo}>
                        <Text style={styles.pickerItemName}>{exercise.name}</Text>
                        <Text style={styles.pickerItemMeta}>
                          {exercise.muscleGroups.slice(0, 2).join(', ')}  ·  {exercise.equipment}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isSelected ? colors.accent : colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}

                {filteredExercises.length === 0 && (
                  <Text style={styles.pickerEmpty}>
                    No exercises match your search and filters.
                  </Text>
                )}
              </ScrollView>

              {/* Picker footer */}
              <View style={styles.pickerFooter}>
                <TouchableOpacity onPress={() => setPickerSelections([])}>
                  <Text style={styles.clearSelectionText}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectionBtn,
                    pickerSelections.length === 0 && styles.selectionBtnDisabled,
                  ]}
                  disabled={pickerSelections.length === 0}
                  onPress={handleAddSelectedExercises}
                >
                  <Text style={styles.selectionBtnText}>{pickerActionLabel}</Text>
                </TouchableOpacity>
              </View>

              {pickerSelections.length > 1 && !groupedAuthoringGate.allowed ? (
                <Text style={styles.groupUpsellText}>
                  Grouped routine blocks unlock with Premium. You can still add one exercise at a
                  time on the free plan.
                </Text>
              ) : null}
            </Card>
          )}

          {/* ---- Empty state ---- */}
          {selectedExercises.length === 0 && !showPicker && (
            <Card style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={24} color={colors.textMuted} />
              <Text style={styles.emptyText}>Tap + to add exercises</Text>
            </Card>
          )}

          {/* ---- Builder blocks ---- */}
          {builderBlocks.map((block, blockIndex) => {
            if (block.type === 'group') {
              const leadExercise = block.exercises[0];
              return (
                <Card key={block.key} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View>
                      <Text style={styles.groupTitle}>
                        {getGroupTypeLabel(block.groupType)}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {block.exercises.length} exercises · {leadExercise.setsCount} working sets
                      </Text>
                    </View>
                  </View>

                  {/* Shared set count for group */}
                  <View style={styles.groupSetConfig}>
                    <Text style={styles.setLabel}>Working Sets</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            leadExercise.exercise.id,
                            'setsCount',
                            Math.max(1, leadExercise.setsCount - 1),
                          )
                        }
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={22}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{leadExercise.setsCount}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            leadExercise.exercise.id,
                            'setsCount',
                            Math.min(10, leadExercise.setsCount + 1),
                          )
                        }
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={colors.accent}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Group member cards */}
                  {block.exercises.map((item) => (
                    <View
                      key={`${block.groupId}-${item.exercise.id}`}
                      style={styles.groupMemberCard}
                    >
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseIndex}>{blockIndex + 1}</Text>
                          <View>
                            <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                            <Text style={styles.exerciseMuscles}>
                              {item.exercise.muscleGroups.slice(0, 2).join(', ')}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => removeExercise(item.exercise.id)}>
                          <Ionicons name="close-circle" size={22} color="#F87171" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.setConfig}>
                        <View style={styles.setField}>
                          <Text style={styles.setLabel}>Reps</Text>
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              onPress={() =>
                                updateExercise(
                                  item.exercise.id,
                                  'reps',
                                  Math.max(1, item.reps - 1),
                                )
                              }
                            >
                              <Ionicons
                                name="remove-circle-outline"
                                size={22}
                                color={colors.textSecondary}
                              />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{item.reps}</Text>
                            <TouchableOpacity
                              onPress={() =>
                                updateExercise(
                                  item.exercise.id,
                                  'reps',
                                  Math.min(30, item.reps + 1),
                                )
                              }
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={22}
                                color={colors.accent}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={styles.setField}>
                          <Text style={styles.setLabel}>Weight</Text>
                          <TextInput
                            style={styles.weightInput}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={
                              item.weight
                                ? formatWeightValue(item.weight, weightUnit)
                                : ''
                            }
                            onChangeText={(value) =>
                              updateExercise(
                                item.exercise.id,
                                'weight',
                                parseWeightInputToKg(value, weightUnit),
                              )
                            }
                          />
                          <Text style={styles.weightUnitText}>{weightUnit}</Text>
                        </View>
                      </View>

                      {/* Warm-up toggle */}
                      <TouchableOpacity
                        style={[
                          styles.warmupToggle,
                          item.includeWarmup && styles.warmupToggleActive,
                        ]}
                        onPress={() => toggleWarmup(item.exercise.id)}
                      >
                        <Ionicons
                          name={item.includeWarmup ? 'flame' : 'flame-outline'}
                          size={16}
                          color={item.includeWarmup ? colors.accent : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.warmupToggleText,
                            item.includeWarmup && styles.warmupToggleTextActive,
                          ]}
                        >
                          {item.includeWarmup
                            ? `Warm-up: ${getWarmupReps(item.reps)} reps${
                                item.weight > 0
                                  ? ` @ ${formatWeightWithUnit(getWarmupWeightKg(item.weight), weightUnit)}`
                                  : ''
                              }`
                            : 'Add warm-up set'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </Card>
              );
            }

            // ---- Single exercise block ----
            const item = block.exercise;

            return (
              <Card key={block.key} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseIndex}>{blockIndex + 1}</Text>
                    <View>
                      <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                      <Text style={styles.exerciseMuscles}>
                        {item.exercise.muscleGroups.slice(0, 2).join(', ')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(item.exercise.id)}>
                    <Ionicons name="close-circle" size={22} color="#F87171" />
                  </TouchableOpacity>
                </View>

                <View style={styles.setConfig}>
                  <View style={styles.setField}>
                    <Text style={styles.setLabel}>Sets</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            item.exercise.id,
                            'setsCount',
                            Math.max(1, item.setsCount - 1),
                          )
                        }
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={22}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.setsCount}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            item.exercise.id,
                            'setsCount',
                            Math.min(10, item.setsCount + 1),
                          )
                        }
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={colors.accent}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.setField}>
                    <Text style={styles.setLabel}>Reps</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            item.exercise.id,
                            'reps',
                            Math.max(1, item.reps - 1),
                          )
                        }
                      >
                        <Ionicons
                          name="remove-circle-outline"
                          size={22}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.reps}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateExercise(
                            item.exercise.id,
                            'reps',
                            Math.min(30, item.reps + 1),
                          )
                        }
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={colors.accent}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.setField}>
                    <Text style={styles.setLabel}>Weight</Text>
                    <TextInput
                      style={styles.weightInput}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={
                        item.weight ? formatWeightValue(item.weight, weightUnit) : ''
                      }
                      onChangeText={(value) =>
                        updateExercise(
                          item.exercise.id,
                          'weight',
                          parseWeightInputToKg(value, weightUnit),
                        )
                      }
                    />
                    <Text style={styles.weightUnitText}>{weightUnit}</Text>
                  </View>
                </View>

                {/* Warm-up toggle */}
                <TouchableOpacity
                  style={[
                    styles.warmupToggle,
                    item.includeWarmup && styles.warmupToggleActive,
                  ]}
                  onPress={() => toggleWarmup(item.exercise.id)}
                >
                  <Ionicons
                    name={item.includeWarmup ? 'flame' : 'flame-outline'}
                    size={16}
                    color={item.includeWarmup ? colors.accent : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.warmupToggleText,
                      item.includeWarmup && styles.warmupToggleTextActive,
                    ]}
                  >
                    {item.includeWarmup
                      ? `Warm-up: ${getWarmupReps(item.reps)} reps${
                          item.weight > 0
                            ? ` @ ${formatWeightWithUnit(getWarmupWeightKg(item.weight), weightUnit)}`
                            : ''
                        }`
                      : 'Add warm-up set'}
                  </Text>
                </TouchableOpacity>
              </Card>
            );
          })}

          {/* ---- Submit ---- */}
          <Button
            title={
              busy
                ? 'Creating…'
                : `Create Routine (${selectedExercises.length} exercises)`
            }
            icon="checkmark-circle-outline"
            onPress={handleCreate}
            disabled={!canSubmit || busy}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  fieldCard: {
    marginBottom: spacing.sm,
  },
  diffRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diffChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  diffText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // ---- Picker ----
  pickerCard: {
    marginBottom: spacing.md,
    maxHeight: 360,
  },
  searchInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterTriggerLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  filterMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  filterMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterMenuText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  pickerList: {
    maxHeight: 260,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: {
    backgroundColor: `${colors.accent}12`,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  pickerItemMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  pickerEmpty: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  pickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  clearSelectionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  selectionBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  selectionBtnDisabled: {
    opacity: 0.4,
  },
  selectionBtnText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  groupUpsellText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  // ---- Empty ----
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  // ---- Exercise cards ----
  exerciseCard: {
    marginBottom: spacing.sm,
  },
  groupCard: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    marginBottom: spacing.md,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  groupMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  groupSetConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupMemberCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseIndex: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: '700',
    width: 24,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exerciseMuscles: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  setConfig: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingLeft: 32,
  },
  setField: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  weightInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
    width: 48,
  },
  weightUnitText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  warmupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  warmupToggleActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}14`,
  },
  warmupToggleText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  warmupToggleTextActive: {
    color: colors.accent,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});
