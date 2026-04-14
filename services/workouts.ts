import { supabase } from '@/config/supabase';
import type { CompletedWorkout, ExerciseLog } from '@/types/workout';

/* ── helpers ─────────────────────────────────────────────────── */

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapRow(row: Record<string, unknown>): CompletedWorkout {
  return {
    id: row.id as string,
    routineId: (row.routine_id as string) ?? '',
    routineName: row.routine_name as string,
    startedAt: new Date(row.started_at as string).getTime(),
    completedAt: new Date(row.completed_at as string).getTime(),
    durationSeconds: row.duration_seconds as number,
    exercises: (row.exercises_json as ExerciseLog[]) ?? [],
    totalVolume: row.total_volume as number,
    totalSets: row.total_sets as number,
    totalReps: row.total_reps as number,
    reflection: (row.reflection_json as CompletedWorkout['reflection']) ?? undefined,
  };
}

/* ── queries ─────────────────────────────────────────────────── */

/** Fetch completed workout history for a user (most recent first, max 50). */
export async function fetchWorkoutHistory(
  userId: string,
): Promise<CompletedWorkout[]> {
  const { data, error } = await supabase
    .from('completed_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Insert a completed workout into the database. */
export async function insertCompletedWorkout(
  userId: string,
  workout: CompletedWorkout,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('completed_workouts')
    .insert({
      user_id: userId,
      routine_id: workout.routineId || null,
      routine_name: workout.routineName,
      started_at: new Date(workout.startedAt).toISOString(),
      completed_at: new Date(workout.completedAt).toISOString(),
      duration_seconds: workout.durationSeconds,
      total_volume: workout.totalVolume,
      total_sets: workout.totalSets,
      total_reps: workout.totalReps,
      exercises_json: workout.exercises,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function updateCompletedWorkout(
  userId: string,
  workout: CompletedWorkout,
): Promise<void> {
  const payload = {
    routine_name: workout.routineName,
    started_at: new Date(workout.startedAt).toISOString(),
    completed_at: new Date(workout.completedAt).toISOString(),
    duration_seconds: workout.durationSeconds,
    total_volume: workout.totalVolume,
    total_sets: workout.totalSets,
    total_reps: workout.totalReps,
    exercises_json: workout.exercises,
  };

  let query = supabase
    .from('completed_workouts')
    .update(payload)
    .eq('user_id', userId);

  if (isUuidLike(workout.id)) {
    query = query.eq('id', workout.id);
  } else {
    query = query
      .eq('routine_name', workout.routineName)
      .eq('started_at', new Date(workout.startedAt).toISOString())
      .eq('completed_at', new Date(workout.completedAt).toISOString());
  }

  const { error } = await query;
  if (error) throw error;
}
