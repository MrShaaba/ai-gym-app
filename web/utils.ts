import type { Unit, Workout } from './types';

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(key: string, amount: number): string {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
export function formatDate(key: string): string {
  const date = new Date(key.length === 10 ? `${key}T12:00:00` : key);
  return Number.isNaN(date.getTime())
    ? key
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
export function toUnit(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg * 2.2046226218 : kg;
}
export function fromUnit(value: number, unit: Unit): number {
  return unit === 'lb' ? value / 2.2046226218 : value;
}
export function formatWeight(kg: number, unit: Unit): string {
  return `${toUnit(kg, unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}
export function volume(workout: Workout): number {
  return workout.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (sum, set) =>
          sum + (set.completed && !set.isWarmup ? set.reps * set.weight : 0),
        0,
      ),
    0,
  );
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
