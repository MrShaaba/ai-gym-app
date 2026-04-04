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
  assignedBy?: string;
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

// --- Phase 3: Active session & history types ---

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface ActiveSession {
  routineId: string;
  routineName: string;
  startedAt: number;
  currentExerciseIndex: number;
  exercises: ExerciseLog[];
  restTimerEnd: number | null;
}

export interface CompletedWorkout {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  exercises: ExerciseLog[];
  totalVolume: number;
  totalSets: number;
  totalReps: number;
}
