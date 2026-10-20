import type {
  Assignment,
  LoggedExercise,
  Occurrence,
  Unit,
  Workout,
} from '../types';

export function isOccurrenceStartable(
  occurrence: Occurrence,
  assignments: Pick<Assignment, 'id' | 'active'>[],
): boolean {
  return (
    occurrence.status === 'in_progress' ||
    (occurrence.status === 'planned' &&
      assignments.some(
        (assignment) =>
          assignment.id === occurrence.assignmentId && assignment.active,
      ))
  );
}

export interface WorkoutDraft {
  version: 1;
  ownerId: string;
  id: string;
  occurrence: Occurrence;
  startedAt: string;
  elapsedSeconds: number;
  resumedAt: number | null;
  exercises: LoggedExercise[];
  inputs: Record<string, string>;
  unit: Unit;
  restUntil: number | null;
  restRemaining: number;
  effort: number;
  notes: string;
}
export interface PendingWorkout {
  workout: Workout;
  queuedAt: string;
  error?: string;
}

export const draftKey = (ownerId: string) => `aigym.web.draft.v1.${ownerId}`;
export const outboxKey = (ownerId: string) => `aigym.web.outbox.v1.${ownerId}`;
export const memberStorageEvent = 'aigym:workout-storage';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonnegative(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function validExercises(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (exercise: unknown) =>
        isObject(exercise) &&
        typeof exercise.exerciseId === 'string' &&
        typeof exercise.name === 'string' &&
        Array.isArray(exercise.sets) &&
        exercise.sets.length > 0 &&
        exercise.sets.every(
          (set: unknown) =>
            isObject(set) &&
            nonnegative(set.reps) &&
            nonnegative(set.weight) &&
            nonnegative(set.restSeconds) &&
            typeof set.completed === 'boolean',
        ),
    )
  );
}
function validWorkout(value: unknown, ownerId: string): boolean {
  return (
    isObject(value) &&
    value.userId === ownerId &&
    typeof value.id === 'string' &&
    typeof value.routineName === 'string' &&
    typeof value.programTitle === 'string' &&
    typeof value.date === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.completedAt === 'string' &&
    nonnegative(value.durationSeconds) &&
    validExercises(value.exercises) &&
    isObject(value.reflection) &&
    typeof value.reflection.notes === 'string' &&
    typeof value.reflection.effort === 'number'
  );
}

export function readDraft(ownerId: string): WorkoutDraft | null {
  const raw = localStorage.getItem(draftKey(ownerId));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !isObject(value) ||
    value.ownerId !== ownerId ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    !validExercises(value.exercises) ||
    !isObject(value.occurrence) ||
    value.occurrence.memberId !== ownerId ||
    typeof value.occurrence.date !== 'string' ||
    !isObject(value.occurrence.routine) ||
    typeof value.occurrence.routine.name !== 'string' ||
    !Array.isArray(value.occurrence.routine.exercises) ||
    !isObject(value.inputs) ||
    Object.values(value.inputs).some((entry) => typeof entry !== 'string') ||
    typeof value.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.startedAt)) ||
    !nonnegative(value.elapsedSeconds) ||
    !(value.resumedAt === null || nonnegative(value.resumedAt)) ||
    !(value.restUntil === null || nonnegative(value.restUntil)) ||
    !nonnegative(value.restRemaining) ||
    !['kg', 'lb'].includes(String(value.unit)) ||
    typeof value.notes !== 'string' ||
    typeof value.effort !== 'number'
  )
    throw new Error(
      'The saved workout draft could not be read. Export its browser data before clearing storage.',
    );
  return value as unknown as WorkoutDraft;
}

export function readOutbox(ownerId: string): PendingWorkout[] {
  const raw = localStorage.getItem(outboxKey(ownerId));
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    value.some(
      (item: unknown) =>
        !isObject(item) ||
        !validWorkout(item.workout, ownerId) ||
        typeof item.queuedAt !== 'string',
    )
  )
    throw new Error(
      'Saved workouts could not be read. Their browser data has been preserved.',
    );
  return value as PendingWorkout[];
}

export function writeDraft(ownerId: string, draft: WorkoutDraft | null): void {
  if (draft && draft.ownerId !== ownerId)
    throw new Error('This workout belongs to another account.');
  if (draft) localStorage.setItem(draftKey(ownerId), JSON.stringify(draft));
  else localStorage.removeItem(draftKey(ownerId));
  window.dispatchEvent(new CustomEvent(memberStorageEvent));
}

export function writeOutbox(ownerId: string, pending: PendingWorkout[]): void {
  if (pending.some((item) => item.workout.userId !== ownerId))
    throw new Error('Cannot save another account’s workout.');
  localStorage.setItem(outboxKey(ownerId), JSON.stringify(pending));
  window.dispatchEvent(new CustomEvent(memberStorageEvent));
}

export function queueWorkout(ownerId: string, workout: Workout): void {
  const pending = readOutbox(ownerId);
  if (!pending.some((item) => item.workout.id === workout.id))
    writeOutbox(ownerId, [
      ...pending,
      { workout, queuedAt: new Date().toISOString() },
    ]);
}

export function removePendingWorkout(ownerId: string, id: string): void {
  writeOutbox(
    ownerId,
    readOutbox(ownerId).filter((item) => item.workout.id !== id),
  );
}

export const inputKey = (exercise: number, set: number, field: string) =>
  `${exercise}.${set}.${field}`;
export function weightInUnit(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg * 2.2046226218 : kg;
}
export function weightInKg(value: number, unit: Unit): number {
  return unit === 'lb' ? value / 2.2046226218 : value;
}

export function exerciseInputs(
  exercises: LoggedExercise[],
  unit: Unit,
): Record<string, string> {
  const inputs: Record<string, string> = {};
  exercises.forEach((exercise, ei) =>
    exercise.sets.forEach((set, si) => {
      inputs[inputKey(ei, si, 'reps')] = String(set.reps);
      inputs[inputKey(ei, si, 'weight')] = String(
        Math.round(weightInUnit(set.weight, unit) * 100) / 100,
      );
      if (set.durationSeconds !== undefined)
        inputs[inputKey(ei, si, 'durationSeconds')] = String(
          set.durationSeconds,
        );
    }),
  );
  return inputs;
}

export function parseEntry(
  value: string,
  field: 'reps' | 'weight' | 'durationSeconds',
  unit: Unit = 'kg',
): number | null {
  if (!/^\d+(?:[.,]\d*)?$/.test(value.trim())) return null;
  const number = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(number) || number < 0) return null;
  if (
    field !== 'weight' &&
    (!Number.isInteger(number) ||
      number < 1 ||
      number > (field === 'reps' ? 1000 : 14400))
  )
    return null;
  if (field === 'weight' && weightInKg(number, unit) > 1000) return null;
  return number;
}

export function validateInputs(
  exercises: LoggedExercise[],
  inputs: Record<string, string>,
  unit: Unit = 'kg',
): boolean {
  return exercises.every((exercise, ei) =>
    exercise.sets.every((set, si) => {
      const fields: Array<'reps' | 'weight' | 'durationSeconds'> =
        set.durationSeconds !== undefined
          ? ['weight', 'durationSeconds']
          : ['reps', 'weight'];
      return fields.every(
        (field) =>
          parseEntry(inputs[inputKey(ei, si, field)] ?? '', field, unit) !==
          null,
      );
    }),
  );
}

export function createDraft(
  ownerId: string,
  occurrence: Occurrence,
  unit: Unit,
  now = Date.now(),
): WorkoutDraft {
  const exercises = occurrence.routine.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set, completed: false })),
  }));
  return {
    version: 1,
    ownerId,
    id: crypto.randomUUID(),
    occurrence,
    startedAt: new Date(now).toISOString(),
    elapsedSeconds: 0,
    resumedAt: now,
    exercises,
    inputs: exerciseInputs(exercises, unit),
    unit,
    restUntil: null,
    restRemaining: 0,
    effort: 5,
    notes: '',
  };
}

export function elapsed(draft: WorkoutDraft, now = Date.now()): number {
  return (
    draft.elapsedSeconds +
    (draft.resumedAt === null
      ? 0
      : Math.max(0, Math.floor((now - draft.resumedAt) / 1000)))
  );
}
export function pauseDraft(
  draft: WorkoutDraft,
  now = Date.now(),
): WorkoutDraft {
  return {
    ...draft,
    elapsedSeconds: elapsed(draft, now),
    resumedAt: null,
    restRemaining: draft.restUntil
      ? Math.max(0, Math.ceil((draft.restUntil - now) / 1000))
      : draft.restRemaining,
    restUntil: null,
  };
}
export function resumeDraft(
  draft: WorkoutDraft,
  now = Date.now(),
): WorkoutDraft {
  return {
    ...draft,
    resumedAt: now,
    restUntil:
      draft.restRemaining > 0 ? now + draft.restRemaining * 1000 : null,
    restRemaining: 0,
  };
}
export function completedSets(exercises: LoggedExercise[]): number {
  return exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.completed).length,
    0,
  );
}
export function totalSets(exercises: LoggedExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
}

export function finishDraft(draft: WorkoutDraft, now = Date.now()): Workout {
  if (!completedSets(draft.exercises))
    throw new Error('Complete at least one set before saving a workout.');
  if (!validateInputs(draft.exercises, draft.inputs, draft.unit))
    throw new Error('Check your set entries before saving.');
  const finished = new Date(now);
  const actualDate = `${finished.getFullYear()}-${String(finished.getMonth() + 1).padStart(2, '0')}-${String(finished.getDate()).padStart(2, '0')}`;
  if (elapsed(draft, now) > 172800)
    throw new Error(
      'This timer has been running for more than 48 hours. Correct the active duration before saving.',
    );
  return {
    id: draft.id,
    userId: draft.ownerId,
    occurrenceId: draft.occurrence.id,
    routineId: draft.occurrence.routine.id,
    routineName: draft.occurrence.routine.name,
    programTitle: draft.occurrence.programTitle,
    source: draft.occurrence.source,
    date: actualDate,
    startedAt: draft.startedAt,
    completedAt: finished.toISOString(),
    durationSeconds: elapsed(draft, now),
    exercises: draft.exercises,
    reflection: { effort: draft.effort, notes: draft.notes.trim() },
  };
}

export function clockTime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  return `${Math.floor(rounded / 60)
    .toString()
    .padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`;
}
