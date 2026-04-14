import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Difficulty, Exercise, WorkoutExerciseGroupType } from '@/types/workout';

export const CREATE_ROUTINE_DRAFT_KEY = 'create-routine-draft';

export interface RoutineBuilderDraftExercise {
  exercise: Exercise;
  setsCount: number;
  reps: number;
  weight: number;
  includeWarmup?: boolean;
  groupId?: string;
  groupType?: WorkoutExerciseGroupType;
  groupOrder?: number;
}

export interface CreateRoutineDraft {
  userId: string;
  name: string;
  difficulty: Difficulty;
  durationMinutes: string;
  selectedExercises: RoutineBuilderDraftExercise[];
  updatedAt: number;
}

export async function loadCreateRoutineDraft(): Promise<CreateRoutineDraft | null> {
  const raw = await AsyncStorage.getItem(CREATE_ROUTINE_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CreateRoutineDraft;
  } catch {
    return null;
  }
}

export async function saveCreateRoutineDraft(draft: CreateRoutineDraft): Promise<void> {
  await AsyncStorage.setItem(CREATE_ROUTINE_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearCreateRoutineDraft(): Promise<void> {
  await AsyncStorage.removeItem(CREATE_ROUTINE_DRAFT_KEY);
}