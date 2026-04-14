export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'abs'
  | 'traps' | 'lats' | 'forearms';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine'
  | 'bodyweight' | 'cable' | 'resistance_band' | 'pull_up_bar';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutPlanSource = 'self' | 'trainer' | 'ai' | 'ai_endorsed';
export type WeightUnit = 'kg' | 'lb';

export type WorkoutEffort = 'easy' | 'solid' | 'challenging' | 'max_effort';

export interface WorkoutReflection {
  effort: WorkoutEffort;
}

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
  isWarmup?: boolean;
}

export type WorkoutExerciseGroupType = 'single' | 'superset' | 'triset' | 'giantset';

export interface WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  groupId?: string;
  groupType?: WorkoutExerciseGroupType;
  groupOrder?: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  difficulty: Difficulty;
  durationMinutes?: number;
  assignedBy?: string;
  programName?: string;
  source?: WorkoutPlanSource;
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
  isWarmup?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  groupId?: string;
  groupType?: WorkoutExerciseGroupType;
  groupOrder?: number;
}

export type ActiveSessionStatus = 'running' | 'paused';

export interface ActiveSession {
  routineId: string;
  routineName: string;
  programName?: string;
  source?: WorkoutPlanSource;
  status?: ActiveSessionStatus;
  startedAt: number;
  elapsedSeconds?: number;
  lastResumedAt?: number | null;
  currentExerciseIndex: number;
  exercises: ExerciseLog[];
  restTimerEnd: number | null;
  routineSnapshot?: WorkoutRoutine;
}

export interface CompletedWorkout {
  id: string;
  routineId: string;
  routineName: string;
  programName?: string;
  source?: WorkoutPlanSource;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  exercises: ExerciseLog[];
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  reflection?: WorkoutReflection;
}
