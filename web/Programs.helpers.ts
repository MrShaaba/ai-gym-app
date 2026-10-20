import type { DayMapping, Person, Program, Routine } from './types';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const EQUIPMENT = [
  'bodyweight',
  'dumbbell',
  'barbell',
  'cable',
  'machine',
  'pull_up_bar',
  'resistance_band',
  'kettlebell',
  'bench',
];

export function normalizeProfileEquipment(values: string[]): string[] {
  const aliases: Record<string, string> = {
    dumbbells: 'dumbbell',
    barbells: 'barbell',
    cables: 'cable',
    machines: 'machine',
    kettlebells: 'kettlebell',
    benches: 'bench',
    resistance_bands: 'resistance_band',
    bands: 'resistance_band',
    band: 'resistance_band',
    pullup_bar: 'pull_up_bar',
    pull_up_bars: 'pull_up_bar',
    body_weight: 'bodyweight',
  };
  const normalized = [
    ...new Set(
      values
        .map((value) => {
          const key = value
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');
          return aliases[key] || key;
        })
        .filter((value) => EQUIPMENT.includes(value)),
    ),
  ];
  return normalized.length ? normalized : ['bodyweight'];
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function schedulePreview(
  startDate: string,
  weeks: number,
  mapping: DayMapping[],
): { date: string; routineId: string }[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !Number.isInteger(weeks) ||
    weeks < 1 ||
    weeks > 52
  )
    return [];
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day, 12);
  if (localDate(start) !== startDate) return [];
  const result: { date: string; routineId: string }[] = [];
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = new Date(year, month - 1, day + offset, 12);
    const item = mapping.find((entry) => entry.day === date.getDay());
    if (item) result.push({ date: localDate(date), routineId: item.routineId });
  }
  return result;
}

export function displayDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function newRoutine(index: number): Routine {
  return {
    id: crypto.randomUUID(),
    name: `Day ${index + 1}`,
    durationMinutes: 45,
    exercises: [],
  };
}

export function newProgram(user: Person): Program {
  return {
    id: crypto.randomUUID(),
    ownerId: user.id,
    title: '',
    description: '',
    source: user.role === 'trainer' ? 'trainer' : 'self',
    difficulty: user.experience,
    revision: 1,
    archived: false,
    createdAt: new Date().toISOString(),
    routines: [newRoutine(0)],
    visibility: 'private',
  };
}

export function copyProgram(program: Program, user: Person): Program {
  return {
    ...newProgram(user),
    title: `${program.title} (copy)`,
    description: program.description,
    difficulty: program.difficulty,
    routines: program.routines.map((routine) => ({
      ...routine,
      id: crypto.randomUUID(),
      exercises: routine.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    })),
  };
}

export function moveItem<T>(items: T[], index: number, change: number): T[] {
  const destination = index + change;
  if (destination < 0 || destination >= items.length) return items;
  const next = [...items];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function validateProgram(program: Program): string | null {
  if (!program.title.trim()) return 'Give this program a title.';
  if (!program.routines.length) return 'Add at least one routine.';
  if (program.routines.length > 14)
    return 'Use no more than 14 routines per program.';
  for (const routine of program.routines) {
    if (!routine.name.trim()) return 'Every routine needs a name.';
    if (
      !Number.isInteger(routine.durationMinutes) ||
      routine.durationMinutes < 5 ||
      routine.durationMinutes > 240
    )
      return `${routine.name}: duration must be a whole number between 5 and 240 minutes.`;
    if (!routine.exercises.length)
      return `${routine.name}: add at least one exercise.`;
    if (routine.exercises.length > 30)
      return `${routine.name}: use no more than 30 exercises per routine.`;
    for (const exercise of routine.exercises) {
      if (!exercise.sets.length)
        return `${exercise.name}: add at least one set.`;
      if (exercise.sets.length > 20)
        return `${exercise.name}: use no more than 20 sets per exercise.`;
      for (const set of exercise.sets) {
        if (!Number.isInteger(set.reps) || set.reps < 0 || set.reps > 1000)
          return `${exercise.name}: repetitions must be a whole number from 0 to 1,000.`;
        if (set.reps === 0 && !(set.durationSeconds && set.durationSeconds > 0))
          return `${exercise.name}: each set needs repetitions or a timed duration.`;
        if (!Number.isFinite(set.weight) || set.weight < 0 || set.weight > 1000)
          return `${exercise.name}: use a load from 0 to 1,000 kg.`;
        if (
          !Number.isInteger(set.restSeconds) ||
          set.restSeconds < 0 ||
          set.restSeconds > 3600
        )
          return `${exercise.name}: rest must be a whole number from 0 to 3,600 seconds.`;
        if (
          set.durationSeconds !== undefined &&
          (!Number.isInteger(set.durationSeconds) ||
            set.durationSeconds < 0 ||
            set.durationSeconds > 14400)
        )
          return `${exercise.name}: duration must be a whole number from 0 to 14,400 seconds.`;
      }
    }
  }
  return null;
}

export function draftKey(ownerId: string): string {
  return `aigym:program-draft:${ownerId}`;
}

export function readDraft(ownerId: string): Program | null {
  try {
    const raw = localStorage.getItem(draftKey(ownerId));
    if (!raw) return null;
    const candidate: unknown = JSON.parse(raw);
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      !('ownerId' in candidate) ||
      candidate.ownerId !== ownerId
    )
      return null;
    if (
      !('id' in candidate) ||
      typeof candidate.id !== 'string' ||
      !('title' in candidate) ||
      typeof candidate.title !== 'string'
    )
      return null;
    if (!('routines' in candidate) || !Array.isArray(candidate.routines))
      return null;
    const program = candidate as Program;
    if (
      !program.routines.every(
        (routine) =>
          routine &&
          typeof routine.id === 'string' &&
          typeof routine.name === 'string' &&
          Array.isArray(routine.exercises) &&
          routine.exercises.every(
            (exercise) =>
              exercise &&
              typeof exercise.exerciseId === 'string' &&
              typeof exercise.name === 'string' &&
              Array.isArray(exercise.sets) &&
              exercise.sets.every(
                (set) =>
                  set &&
                  typeof set.reps === 'number' &&
                  typeof set.weight === 'number' &&
                  typeof set.restSeconds === 'number',
              ),
          ),
      )
    )
      return null;
    return program;
  } catch {
    return null;
  }
}

export function displayLoad(kg: number, unit: Person['unit']): number {
  return Math.round((unit === 'lb' ? kg * 2.2046226218 : kg) * 100) / 100;
}

export function storageLoad(value: number, unit: Person['unit']): number {
  return unit === 'lb'
    ? Math.round((value / 2.2046226218) * 100000) / 100000
    : value;
}
