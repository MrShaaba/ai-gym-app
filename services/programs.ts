import { supabase } from '@/config/supabase';
import type { Difficulty, WorkoutExercise, WorkoutRoutine } from '@/types/workout';
import type { GeneratedPlan, ProgramSource } from '@/types/generation';

/* ── Types ───────────────────────────────────────────────────── */

export interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  days_per_week: number;
  created_by: string;
  created_at: string;
  source: ProgramSource;
  generation_metadata: Record<string, unknown> | null;
  trainer_endorsed_by: string | null;
  trainer_endorsed_at: string | null;
}

export interface RoutineRow {
  id: string;
  program_id: string | null;
  name: string;
  difficulty: Difficulty;
  duration_minutes: number;
  exercises_json: WorkoutExercise[];
  sort_order: number;
  created_at: string;
}

/* ── Program queries ─────────────────────────────────────────── */

/** Fetch all programs created by a trainer. */
export async function fetchTrainerPrograms(trainerId: string): Promise<ProgramRow[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('created_by', trainerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProgramRow[];
}

/** Fetch programs for a client (own programs + linked trainer programs). */
export async function fetchClientPrograms(clientId: string): Promise<ProgramRow[]> {
  // 1. Client's own programs
  const { data: ownData, error: ownErr } = await supabase
    .from('programs')
    .select('*')
    .eq('created_by', clientId)
    .order('created_at', { ascending: false });
  if (ownErr) throw ownErr;

  // 2. Trainer-linked programs
  const { data: links, error: linkErr } = await supabase
    .from('trainer_client_links')
    .select('trainer_id')
    .eq('client_id', clientId)
    .eq('status', 'active');
  if (linkErr) throw linkErr;

  let trainerData: ProgramRow[] = [];
  if (links && links.length > 0) {
    const trainerIds = links.map((l) => l.trainer_id as string);
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .in('created_by', trainerIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    trainerData = (data ?? []) as ProgramRow[];
  }

  // Merge: own first, then trainer
  const ownPrograms = (ownData ?? []) as ProgramRow[];
  const ownIds = new Set(ownPrograms.map((p) => p.id));
  return [...ownPrograms, ...trainerData.filter((p) => !ownIds.has(p.id))];
}

/** Create a new program. */
export async function createProgram(params: {
  name: string;
  description?: string;
  difficulty: Difficulty;
  daysPerWeek: number;
  createdBy: string;
}): Promise<ProgramRow> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      name: params.name,
      description: params.description ?? null,
      difficulty: params.difficulty,
      days_per_week: params.daysPerWeek,
      created_by: params.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProgramRow;
}

/** Update a program. */
export async function updateProgram(
  id: string,
  updates: Partial<Pick<ProgramRow, 'name' | 'description' | 'difficulty' | 'days_per_week'>>,
): Promise<void> {
  const { error } = await supabase.from('programs').update(updates).eq('id', id);
  if (error) throw error;
}

/** Delete a program (cascades to routines via FK). */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw error;
}

/* ── Routine queries ─────────────────────────────────────────── */

/** Fetch routines for a program. */
export async function fetchRoutines(programId: string): Promise<RoutineRow[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineRow[];
}

/** Fetch all routines for a trainer (across all their programs). */
export async function fetchTrainerRoutines(trainerId: string): Promise<RoutineRow[]> {
  // Get trainer's program IDs first
  const { data: programs, error: pErr } = await supabase
    .from('programs')
    .select('id')
    .eq('created_by', trainerId);
  if (pErr) throw pErr;
  if (!programs || programs.length === 0) return [];

  const programIds = programs.map((p) => p.id as string);

  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .in('program_id', programIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineRow[];
}

/** Fetch a single routine by ID. */
export async function fetchRoutineById(id: string): Promise<RoutineRow | null> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as RoutineRow | null;
}

/** Create a routine inside a program. */
export async function createRoutine(params: {
  programId: string;
  name: string;
  difficulty: Difficulty;
  durationMinutes: number;
  exercises: WorkoutExercise[];
  sortOrder?: number;
}): Promise<RoutineRow> {
  const { data, error } = await supabase
    .from('routines')
    .insert({
      program_id: params.programId,
      name: params.name,
      difficulty: params.difficulty,
      duration_minutes: params.durationMinutes,
      exercises_json: params.exercises,
      sort_order: params.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineRow;
}

/** Update a routine. */
export async function updateRoutine(
  id: string,
  updates: Partial<Pick<RoutineRow, 'name' | 'difficulty' | 'duration_minutes' | 'exercises_json' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase.from('routines').update(updates).eq('id', id);
  if (error) throw error;
}

/** Delete a routine. */
export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

/* ── Helpers ─────────────────────────────────────────────────── */

/** Fetch all routines available to a client (own programs + linked trainers). */
export async function fetchClientRoutines(clientId: string): Promise<RoutineRow[]> {
  const programs = await fetchClientPrograms(clientId);
  if (programs.length === 0) return [];

  const programIds = programs.map((p) => p.id);
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .in('program_id', programIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineRow[];
}

/** Convert RoutineRow to local WorkoutRoutine shape (for starting a workout). */
export function routineRowToWorkoutRoutine(row: RoutineRow): WorkoutRoutine {
  return {
    id: row.id,
    name: row.name,
    exercises: row.exercises_json ?? [],
    difficulty: row.difficulty,
    durationMinutes: row.duration_minutes,
  };
}

/* ── AI Generation ───────────────────────────────────────────── */

/** Save a generated plan as a program with routines. */
export async function saveGeneratedPlan(userId: string, plan: GeneratedPlan): Promise<ProgramRow> {
  // 1. Create the program
  const { data: program, error: pErr } = await supabase
    .from('programs')
    .insert({
      name: plan.title,
      description: plan.summary,
      difficulty: plan.routines[0]?.difficulty ?? 'intermediate',
      days_per_week: plan.daysPerWeek,
      created_by: userId,
      source: 'ai' as ProgramSource,
      generation_metadata: {
        model: plan.model,
        generatedAt: plan.generatedAt,
        request: plan.request,
      },
    })
    .select()
    .single();
  if (pErr) throw pErr;

  // 2. Insert routines
  const routineInserts = plan.routines.map((r, i) => ({
    program_id: program.id,
    name: r.name,
    difficulty: r.difficulty,
    duration_minutes: r.durationMinutes,
    exercises_json: r.exercises,
    sort_order: i,
  }));

  const { error: rErr } = await supabase.from('routines').insert(routineInserts);
  if (rErr) throw rErr;

  return program as ProgramRow;
}

/** Trainer endorses an AI-generated program. */
export async function endorseProgram(programId: string, trainerId: string): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({
      source: 'ai_endorsed' as ProgramSource,
      trainer_endorsed_by: trainerId,
      trainer_endorsed_at: new Date().toISOString(),
    })
    .eq('id', programId);
  if (error) throw error;
}
