import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ActiveSession,
  ActiveSessionStatus,
  CompletedWorkout,
  ExerciseLog,
  SetLog,
  WorkoutReflection,
  WorkoutRoutine,
} from '@/types/workout';
import { insertCompletedWorkout, fetchWorkoutHistory, updateCompletedWorkout } from '@/services/workouts';

interface WorkoutState {
  activeSession: ActiveSession | null;
  history: CompletedWorkout[];
  restTimerEnd: number | null;
  reset: () => void;
  hydrateHistory: (userId: string) => Promise<void>;
  startWorkout: (
    routine: WorkoutRoutine,
    assignmentContext?: {
      assignmentId: string;
      assignmentStatus: ActiveSession['assignmentStatus'];
    },
  ) => void;
  cancelWorkout: () => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  restartWorkout: () => void;
  setActiveSessionAssignmentStatus: (status: NonNullable<ActiveSession['assignmentStatus']>) => void;
  goToExercise: (index: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetLog>) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  addGroupRound: (exerciseIndexes: number[]) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  finishWorkout: (userId?: string, reflection?: WorkoutReflection) => CompletedWorkout | null;
  saveCompletedWorkoutEdits: (userId: string | undefined, workout: CompletedWorkout) => Promise<CompletedWorkout | null>;
}

function buildExerciseLogs(routine: WorkoutRoutine): ExerciseLog[] {
  return routine.exercises.map((workoutExercise) => ({
    exerciseId: workoutExercise.exercise.id,
    exerciseName: workoutExercise.exercise.name,
    groupId: workoutExercise.groupId,
    groupType: workoutExercise.groupType,
    groupOrder: workoutExercise.groupOrder,
    sets: workoutExercise.sets.map((setLog) => ({
      reps: setLog.reps,
      weight: setLog.weight ?? 0,
      completed: false,
      isWarmup: setLog.isWarmup,
    })),
  }));
}

function getSessionStatus(session: ActiveSession): ActiveSessionStatus {
  return session.status ?? 'running';
}

function getSessionElapsedSeconds(session: ActiveSession, at = Date.now()) {
  const baseSeconds = session.elapsedSeconds ?? 0;
  const status = getSessionStatus(session);

  if (status === 'paused') {
    return baseSeconds;
  }

  const resumedAt = session.lastResumedAt ?? session.startedAt;
  return baseSeconds + Math.max(0, Math.floor((at - resumedAt) / 1000));
}

function calculateWorkoutMetrics(exercises: ExerciseLog[]) {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  for (const exercise of exercises) {
    for (const setLog of exercise.sets) {
      if (setLog.completed) {
        if (setLog.isWarmup) {
          continue;
        }
        totalSets += 1;
        totalReps += setLog.reps;
        totalVolume += setLog.reps * setLog.weight;
      }
    }
  }

  return { totalVolume, totalSets, totalReps };
}

const createWorkoutState: StateCreator<WorkoutState> = (set, get) => ({
  activeSession: null,
  history: [],
  restTimerEnd: null,

  reset: () => set({ activeSession: null, history: [], restTimerEnd: null }),

  hydrateHistory: async (userId) => {
    try {
      const history = await fetchWorkoutHistory(userId);
      set({ history });
    } catch (error) {
      console.warn('[workoutStore] hydrateHistory failed', error);
    }
  },

  startWorkout: (routine, assignmentContext) => {
    const now = Date.now();
    set({
      activeSession: {
        routineId: routine.id,
        routineName: routine.name,
        programName: routine.programName ?? routine.assignedBy,
        source: routine.source ?? 'self',
        assignmentId: assignmentContext?.assignmentId,
        assignmentStatus: assignmentContext?.assignmentStatus,
        status: 'running',
        startedAt: now,
        elapsedSeconds: 0,
        lastResumedAt: now,
        currentExerciseIndex: 0,
        exercises: buildExerciseLogs(routine),
        restTimerEnd: null,
        routineSnapshot: routine,
      },
      restTimerEnd: null,
    });
  },

  cancelWorkout: () => set({ activeSession: null, restTimerEnd: null }),

  pauseWorkout: () => {
    const session = get().activeSession;
    if (!session || getSessionStatus(session) === 'paused') return;

    set({
      activeSession: {
        ...session,
        status: 'paused',
        elapsedSeconds: getSessionElapsedSeconds(session),
        lastResumedAt: null,
        restTimerEnd: null,
      },
      restTimerEnd: null,
    });
  },

  resumeWorkout: () => {
    const session = get().activeSession;
    if (!session || getSessionStatus(session) === 'running') return;

    set({
      activeSession: {
        ...session,
        status: 'running',
        lastResumedAt: Date.now(),
      },
    });
  },

  setActiveSessionAssignmentStatus: (status) => {
    const session = get().activeSession;
    if (!session || !session.assignmentId) return;

    set({
      activeSession: {
        ...session,
        assignmentStatus: status,
      },
    });
  },

  restartWorkout: () => {
    const session = get().activeSession;
    const snapshot = session?.routineSnapshot;
    if (!session || !snapshot) return;

    const now = Date.now();
    set({
      activeSession: {
        routineId: snapshot.id,
        routineName: snapshot.name,
        programName: snapshot.programName ?? snapshot.assignedBy,
        source: snapshot.source ?? 'self',
        assignmentId: session.assignmentId,
        assignmentStatus: session.assignmentStatus,
        status: 'running',
        startedAt: now,
        elapsedSeconds: 0,
        lastResumedAt: now,
        currentExerciseIndex: 0,
        exercises: buildExerciseLogs(snapshot),
        restTimerEnd: null,
        routineSnapshot: snapshot,
      },
      restTimerEnd: null,
    });
  },

  goToExercise: (index) => {
    const session = get().activeSession;
    if (!session) return;

    set({
      activeSession: { ...session, currentExerciseIndex: index },
      restTimerEnd: null,
    });
  },

  updateSet: (exerciseIndex, setIndex, data) => {
    const session = get().activeSession;
    if (!session) return;

    const exercises = [...session.exercises];
    const sets = [...exercises[exerciseIndex].sets];
    sets[setIndex] = { ...sets[setIndex], ...data };
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

    set({ activeSession: { ...session, exercises } });
  },

  toggleSetComplete: (exerciseIndex, setIndex) => {
    const session = get().activeSession;
    if (!session) return;

    const exercises = [...session.exercises];
    const sets = [...exercises[exerciseIndex].sets];
    sets[setIndex] = {
      ...sets[setIndex],
      completed: !sets[setIndex].completed,
    };
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

    set({ activeSession: { ...session, exercises } });
  },

  addSet: (exerciseIndex) => {
    const session = get().activeSession;
    if (!session) return;

    const exercises = [...session.exercises];
    const lastSet = exercises[exerciseIndex].sets[exercises[exerciseIndex].sets.length - 1];
    const newSet: SetLog = lastSet
      ? { ...lastSet, completed: false, isWarmup: false }
      : { reps: 10, weight: 0, completed: false };
    const sets = [...exercises[exerciseIndex].sets, newSet];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

    set({ activeSession: { ...session, exercises } });
  },

  addGroupRound: (exerciseIndexes) => {
    const session = get().activeSession;
    if (!session || exerciseIndexes.length === 0) return;

    const exercises = [...session.exercises];

    exerciseIndexes.forEach((exerciseIndex) => {
      const currentExercise = exercises[exerciseIndex];
      if (!currentExercise) return;

      const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
      const newSet: SetLog = lastSet
        ? { ...lastSet, completed: false, isWarmup: false }
        : { reps: 10, weight: 0, completed: false };

      exercises[exerciseIndex] = {
        ...currentExercise,
        sets: [...currentExercise.sets, newSet],
      };
    });

    set({ activeSession: { ...session, exercises } });
  },

  removeSet: (exerciseIndex, setIndex) => {
    const session = get().activeSession;
    if (!session) return;

    const exercises = [...session.exercises];
    if (exercises[exerciseIndex].sets.length <= 1) return;

    const sets = exercises[exerciseIndex].sets.filter((_, index) => index !== setIndex);
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

    set({ activeSession: { ...session, exercises } });
  },

  startRestTimer: (seconds) => set({ restTimerEnd: Date.now() + seconds * 1000 }),

  clearRestTimer: () => set({ restTimerEnd: null }),

  finishWorkout: (userId, reflection) => {
    const session = get().activeSession;
    if (!session) return null;

    const completedAt = Date.now();
    const { totalVolume, totalSets, totalReps } = calculateWorkoutMetrics(session.exercises);
    const localId = `w-${completedAt}`;

    const completed: CompletedWorkout = {
      id: localId,
      routineId: session.routineId,
      routineName: session.routineName,
      programName: session.programName,
      source: session.source,
      startedAt: session.startedAt,
      completedAt,
      durationSeconds: getSessionElapsedSeconds(session, completedAt),
      exercises: session.exercises,
      totalVolume,
      totalSets,
      totalReps,
      reflection: reflection ?? undefined,
    };

    set((state) => ({
      activeSession: null,
      restTimerEnd: null,
      history: [completed, ...state.history].slice(0, 50),
    }));

    if (userId) {
      insertCompletedWorkout(userId, completed)
        .then(async (persistedId) => {
          if (!persistedId) return;

          let latestPersistedWorkout: CompletedWorkout | null = null;

          set((state) => ({
            history: state.history.map((item) => {
              if (item.id === localId) {
                latestPersistedWorkout = { ...item, id: persistedId };
                return latestPersistedWorkout;
              }

              return item;
            }),
          }));

          if (latestPersistedWorkout) {
            try {
              await updateCompletedWorkout(userId, latestPersistedWorkout);
            } catch (error) {
              console.warn('[workoutStore] post-insert workout sync failed', error);
            }
          }
        })
        .catch((error) => console.warn('[workoutStore] DB insert failed', error));
    }

    return completed;
  },

  saveCompletedWorkoutEdits: async (userId, workout) => {
    const { totalVolume, totalSets, totalReps } = calculateWorkoutMetrics(workout.exercises);
    const updatedWorkout: CompletedWorkout = {
      ...workout,
      totalVolume,
      totalSets,
      totalReps,
    };

    set((state) => ({
      history: state.history.map((item) => {
        const sameId = item.id === updatedWorkout.id;
        const sameTimestamps = item.startedAt === updatedWorkout.startedAt && item.completedAt === updatedWorkout.completedAt;
        return sameId || sameTimestamps ? updatedWorkout : item;
      }),
    }));

    if (userId) {
      try {
        await updateCompletedWorkout(userId, updatedWorkout);
      } catch (error) {
        console.warn('[workoutStore] completed workout update failed', error);
      }
    }

    return updatedWorkout;
  },
});

export const useWorkoutStore = create<WorkoutState>()(
  persist(createWorkoutState, {
    name: 'workout-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      activeSession: state.activeSession,
      history: state.history,
    }),
  }),
);
