import type { Exercise } from '@/types/workout';

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-01', name: 'Barbell Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: 'barbell' },
  { id: 'ex-02', name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders'], equipment: 'dumbbell' },
  { id: 'ex-03', name: 'Cable Fly', muscleGroups: ['chest'], equipment: 'cable' },
  { id: 'ex-04', name: 'Push-Up', muscleGroups: ['chest', 'triceps', 'shoulders'], equipment: 'bodyweight' },
  // Back
  { id: 'ex-05', name: 'Barbell Row', muscleGroups: ['back', 'biceps'], equipment: 'barbell' },
  { id: 'ex-06', name: 'Pull-Up', muscleGroups: ['lats', 'biceps'], equipment: 'pull_up_bar' },
  { id: 'ex-07', name: 'Seated Cable Row', muscleGroups: ['back', 'traps'], equipment: 'cable' },
  { id: 'ex-08', name: 'Lat Pulldown', muscleGroups: ['lats', 'biceps'], equipment: 'cable' },
  { id: 'ex-09', name: 'Face Pull', muscleGroups: ['shoulders', 'traps'], equipment: 'cable' },
  // Shoulders
  { id: 'ex-10', name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'barbell' },
  { id: 'ex-11', name: 'Lateral Raise', muscleGroups: ['shoulders'], equipment: 'dumbbell' },
  { id: 'ex-12', name: 'Rear Delt Fly', muscleGroups: ['shoulders'], equipment: 'dumbbell' },
  // Arms
  { id: 'ex-13', name: 'Barbell Curl', muscleGroups: ['biceps'], equipment: 'barbell' },
  { id: 'ex-14', name: 'Hammer Curl', muscleGroups: ['biceps', 'forearms'], equipment: 'dumbbell' },
  { id: 'ex-15', name: 'Tricep Pushdown', muscleGroups: ['triceps'], equipment: 'cable' },
  { id: 'ex-16', name: 'Skull Crusher', muscleGroups: ['triceps'], equipment: 'barbell' },
  // Legs
  { id: 'ex-17', name: 'Barbell Squat', muscleGroups: ['quadriceps', 'glutes'], equipment: 'barbell' },
  { id: 'ex-18', name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'barbell' },
  { id: 'ex-19', name: 'Leg Press', muscleGroups: ['quadriceps', 'glutes'], equipment: 'machine' },
  { id: 'ex-20', name: 'Walking Lunge', muscleGroups: ['quadriceps', 'glutes'], equipment: 'dumbbell' },
  { id: 'ex-21', name: 'Leg Curl', muscleGroups: ['hamstrings'], equipment: 'machine' },
  { id: 'ex-22', name: 'Calf Raise', muscleGroups: ['calves'], equipment: 'machine' },
  { id: 'ex-23', name: 'Bulgarian Split Squat', muscleGroups: ['quadriceps', 'glutes'], equipment: 'dumbbell' },
  // Core
  { id: 'ex-24', name: 'Hanging Leg Raise', muscleGroups: ['abs'], equipment: 'pull_up_bar' },
  { id: 'ex-25', name: 'Cable Crunch', muscleGroups: ['abs'], equipment: 'cable' },
  // Compound
  { id: 'ex-26', name: 'Deadlift', muscleGroups: ['back', 'hamstrings', 'glutes', 'traps'], equipment: 'barbell' },
  { id: 'ex-27', name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'dumbbell' },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
