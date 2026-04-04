export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'abs'
  | 'traps' | 'lats' | 'forearms';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine'
  | 'bodyweight' | 'cable' | 'resistance_band' | 'pull_up_bar';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  imageUrl?: string;
}

export interface WorkoutSet {
  reps: number;
  weight?: number;
  duration?: number;
  restSeconds?: number;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  difficulty: Difficulty;
  durationMinutes?: number;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  daysPerWeek: number;
  routines: WorkoutRoutine[];
  createdBy?: string;
}
