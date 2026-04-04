import type { WorkoutRoutine } from '@/types/workout';
import { EXERCISES } from './exercises';

const ex = (id: string) => EXERCISES.find((e) => e.id === id)!;

const defaultSets = (count: number, reps: number, weight: number) =>
  Array.from({ length: count }, () => ({ reps, weight, restSeconds: 90 }));

export const ROUTINES: WorkoutRoutine[] = [
  {
    id: 'rt-01',
    name: 'Push — Chest Focused',
    difficulty: 'intermediate',
    durationMinutes: 50,
    assignedBy: 'Marko',
    exercises: [
      { exercise: ex('ex-01'), sets: defaultSets(4, 8, 80) },
      { exercise: ex('ex-02'), sets: defaultSets(3, 10, 28) },
      { exercise: ex('ex-03'), sets: defaultSets(3, 12, 15) },
      { exercise: ex('ex-10'), sets: defaultSets(3, 8, 50) },
      { exercise: ex('ex-11'), sets: defaultSets(3, 15, 10) },
      { exercise: ex('ex-15'), sets: defaultSets(3, 12, 25) },
      { exercise: ex('ex-04'), sets: defaultSets(2, 15, 0) },
    ],
  },
  {
    id: 'rt-02',
    name: 'Pull Day Chapter 3',
    difficulty: 'intermediate',
    durationMinutes: 45,
    assignedBy: 'Marko',
    exercises: [
      { exercise: ex('ex-26'), sets: defaultSets(4, 5, 140) },
      { exercise: ex('ex-06'), sets: defaultSets(3, 8, 0) },
      { exercise: ex('ex-05'), sets: defaultSets(3, 10, 70) },
      { exercise: ex('ex-07'), sets: defaultSets(3, 12, 55) },
      { exercise: ex('ex-09'), sets: defaultSets(3, 15, 15) },
      { exercise: ex('ex-13'), sets: defaultSets(3, 10, 35) },
      { exercise: ex('ex-14'), sets: defaultSets(3, 12, 16) },
    ],
  },
  {
    id: 'rt-03',
    name: 'Lower Body',
    difficulty: 'intermediate',
    durationMinutes: 55,
    assignedBy: 'Marko',
    exercises: [
      { exercise: ex('ex-17'), sets: defaultSets(4, 6, 120) },
      { exercise: ex('ex-18'), sets: defaultSets(3, 10, 80) },
      { exercise: ex('ex-19'), sets: defaultSets(3, 12, 160) },
      { exercise: ex('ex-23'), sets: defaultSets(3, 10, 20) },
      { exercise: ex('ex-21'), sets: defaultSets(3, 12, 40) },
      { exercise: ex('ex-22'), sets: defaultSets(4, 15, 60) },
      { exercise: ex('ex-24'), sets: defaultSets(3, 12, 0) },
      { exercise: ex('ex-25'), sets: defaultSets(3, 15, 30) },
    ],
  },
  {
    id: 'rt-04',
    name: 'Push — Shoulders',
    difficulty: 'intermediate',
    durationMinutes: 45,
    assignedBy: 'Marko',
    exercises: [
      { exercise: ex('ex-10'), sets: defaultSets(4, 6, 55) },
      { exercise: ex('ex-27'), sets: defaultSets(3, 10, 22) },
      { exercise: ex('ex-11'), sets: defaultSets(4, 12, 12) },
      { exercise: ex('ex-12'), sets: defaultSets(3, 15, 8) },
      { exercise: ex('ex-01'), sets: defaultSets(3, 10, 70) },
      { exercise: ex('ex-16'), sets: defaultSets(3, 10, 30) },
      { exercise: ex('ex-15'), sets: defaultSets(3, 12, 25) },
    ],
  },
  {
    id: 'rt-05',
    name: 'Upper Body Special',
    difficulty: 'advanced',
    durationMinutes: 40,
    assignedBy: 'Marko',
    exercises: [
      { exercise: ex('ex-01'), sets: defaultSets(4, 6, 90) },
      { exercise: ex('ex-05'), sets: defaultSets(4, 6, 80) },
      { exercise: ex('ex-08'), sets: defaultSets(3, 10, 60) },
      { exercise: ex('ex-02'), sets: defaultSets(3, 10, 30) },
      { exercise: ex('ex-13'), sets: defaultSets(3, 10, 35) },
      { exercise: ex('ex-16'), sets: defaultSets(3, 10, 30) },
    ],
  },
];

export function getRoutine(id: string): WorkoutRoutine | undefined {
  return ROUTINES.find((r) => r.id === id);
}
