import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession, CompletedWorkout, SetLog, ExerciseLog, WorkoutRoutine } from '@/types/workout';

interface WorkoutState {
  activeSession: ActiveSession | null;
  history: CompletedWorkout[];
  restTimerEnd: number | null;

  startWorkout: (routine: WorkoutRoutine) => void;
  cancelWorkout: () => void;
  goToExercise: (index: number) => void;

  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetLog>) => void;
  toggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;

  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;

  finishWorkout: () => CompletedWorkout | null;
}

function buildExerciseLogs(routine: WorkoutRoutine): ExerciseLog[] {
  return routine.exercises.map((we) => ({
    exerciseId: we.exercise.id,
    exerciseName: we.exercise.name,
    sets: we.sets.map((s) => ({
      reps: s.reps,
      weight: s.weight ?? 0,
      completed: false,
    })),
  }));
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      history: [],
      restTimerEnd: null,

      startWorkout: (routine) => {
        set({
          activeSession: {
            routineId: routine.id,
            routineName: routine.name,
            startedAt: Date.now(),
            currentExerciseIndex: 0,
            exercises: buildExerciseLogs(routine),
            restTimerEnd: null,
          },
          restTimerEnd: null,
        });
      },

      cancelWorkout: () => {
        set({ activeSession: null, restTimerEnd: null });
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
        sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
        set({ activeSession: { ...session, exercises } });
      },

      addSet: (exerciseIndex) => {
        const session = get().activeSession;
        if (!session) return;
        const exercises = [...session.exercises];
        const lastSet = exercises[exerciseIndex].sets.at(-1);
        const newSet: SetLog = lastSet
          ? { ...lastSet, completed: false }
          : { reps: 10, weight: 0, completed: false };
        const sets = [...exercises[exerciseIndex].sets, newSet];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
        set({ activeSession: { ...session, exercises } });
      },

      removeSet: (exerciseIndex, setIndex) => {
        const session = get().activeSession;
        if (!session) return;
        const exercises = [...session.exercises];
        if (exercises[exerciseIndex].sets.length <= 1) return;
        const sets = exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
        set({ activeSession: { ...session, exercises } });
      },

      startRestTimer: (seconds) => {
        set({ restTimerEnd: Date.now() + seconds * 1000 });
      },

      clearRestTimer: () => {
        set({ restTimerEnd: null });
      },

      finishWorkout: () => {
        const session = get().activeSession;
        if (!session) return null;
        const completedAt = Date.now();
        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;
        for (const ex of session.exercises) {
          for (const s of ex.sets) {
            if (s.completed) {
              totalSets++;
              totalReps += s.reps;
              totalVolume += s.reps * s.weight;
            }
          }
        }
        const completed: CompletedWorkout = {
          id: `w-${completedAt}`,
          routineId: session.routineId,
          routineName: session.routineName,
          startedAt: session.startedAt,
          completedAt,
          durationSeconds: Math.round((completedAt - session.startedAt) / 1000),
          exercises: session.exercises,
          totalVolume,
          totalSets,
          totalReps,
        };
        set((state) => ({
          activeSession: null,
          restTimerEnd: null,
          history: [completed, ...state.history].slice(0, 50),
        }));
        return completed;
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        history: state.history,
      }),
    },
  ),
);
