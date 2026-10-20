import { requireThat } from './errors.mjs';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
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

export function object(value, field = 'Request', keys) {
  requireThat(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${field} must be an object.`,
  );
  if (keys)
    requireThat(
      Object.keys(value).every((key) => keys.includes(key)),
      `${field} contains unsupported fields.`,
    );
  return value;
}

export function text(value, field, max = 500, min = 0) {
  requireThat(typeof value === 'string', `${field} must be text.`);
  const result = value.trim();
  requireThat(
    result.length >= min && result.length <= max,
    `${field} must be between ${min} and ${max} characters.`,
  );
  requireThat(
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result),
    `${field} contains invalid characters.`,
  );
  return result;
}

export function number(value, field, min, max, integer = false) {
  requireThat(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isInteger(value)),
    `${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`,
  );
  return value;
}

export function boolean(value, field) {
  requireThat(typeof value === 'boolean', `${field} must be true or false.`);
  return value;
}

export function choice(value, field, choices) {
  requireThat(
    choices.includes(value),
    `${field} must be one of: ${choices.join(', ')}.`,
  );
  return value;
}

export function list(value, field, max, min = 0) {
  requireThat(
    Array.isArray(value) && value.length >= min && value.length <= max,
    `${field} must contain ${min}–${max} items.`,
  );
  return value;
}

export function strings(value, field, max = 20, length = 80) {
  return [
    ...new Set(
      list(value, field, max).map((item) => text(item, field, length, 1)),
    ),
  ];
}

export function id(value, field = 'ID') {
  const result = text(value, field, 100, 1);
  requireThat(
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(result),
    `${field} has an invalid format.`,
  );
  return result;
}

export function email(value) {
  const result = text(value, 'Email', 254, 3).toLowerCase();
  requireThat(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result),
    'Enter a valid email address.',
  );
  return result;
}

export function password(value) {
  // Do not trim passwords: spaces may be intentional.
  requireThat(
    typeof value === 'string' && value.length >= 10 && value.length <= 128,
    'Password must contain 10–128 characters.',
  );
  requireThat(
    value.trim().length > 0,
    'Password cannot consist only of spaces.',
  );
  return value;
}

export function date(value, field = 'Date') {
  requireThat(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
    `${field} must use YYYY-MM-DD.`,
  );
  const parsed = new Date(`${value}T12:00:00Z`);
  requireThat(
    !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value >= '2000-01-01' &&
      value <= '2100-12-31',
    `${field} is not a valid calendar date.`,
  );
  return value;
}

export function instant(value, field) {
  requireThat(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T/.test(value) &&
      Number.isFinite(Date.parse(value)),
    `${field} must be a valid timestamp.`,
  );
  return new Date(value).toISOString();
}

export function uniqueIds(items, field = 'Items') {
  requireThat(
    new Set(items.map((item) => item.id)).size === items.length,
    `${field} must have unique IDs.`,
  );
}

export function prescription(value, logged = false) {
  object(value, 'Set', [
    'reps',
    'weight',
    'restSeconds',
    'isWarmup',
    'durationSeconds',
    ...(logged ? ['completed'] : []),
  ]);
  const result = {
    reps: number(value.reps, 'Repetitions', 0, 1000, true),
    weight: number(value.weight, 'Weight (kg)', 0, 1000),
    restSeconds: number(value.restSeconds, 'Rest seconds', 0, 3600, true),
  };
  if (value.isWarmup !== undefined)
    result.isWarmup = boolean(value.isWarmup, 'Warm-up');
  if (value.durationSeconds !== undefined)
    result.durationSeconds = number(
      value.durationSeconds,
      'Set duration',
      0,
      14400,
      true,
    );
  if (logged) result.completed = boolean(value.completed, 'Set completion');
  requireThat(
    result.reps > 0 || (result.durationSeconds ?? 0) > 0,
    'Each set needs repetitions or a timed duration.',
  );
  return result;
}

export function exercises(value, catalog, logged = false) {
  return list(value, 'Exercises', 30, 1).map((item) => {
    object(item, 'Exercise', ['exerciseId', 'name', 'group', 'sets']);
    const definition = catalog.find(
      (exercise) => exercise.id === item.exerciseId,
    );
    requireThat(definition, 'Choose an exercise from the exercise library.');
    const result = {
      exerciseId: definition.id,
      name: definition.name,
      sets: list(item.sets, 'Exercise sets', 20, 1).map((set) =>
        prescription(set, logged),
      ),
    };
    if (item.group !== undefined)
      result.group = text(item.group, 'Exercise group', 80);
    return result;
  });
}

export function routine(value, catalog) {
  object(value, 'Routine', ['id', 'name', 'durationMinutes', 'exercises']);
  return {
    id: id(value.id, 'Routine ID'),
    name: text(value.name, 'Routine name', 120, 1),
    durationMinutes: number(
      value.durationMinutes,
      'Routine duration',
      5,
      240,
      true,
    ),
    exercises: exercises(value.exercises, catalog),
  };
}

export function reflection(value) {
  object(value, 'Reflection', ['effort', 'notes']);
  return {
    effort: number(value.effort, 'Effort', 1, 10, true),
    notes: text(value.notes, 'Reflection', 4000),
  };
}
