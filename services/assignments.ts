import { supabase } from '@/config/supabase';
import type { Assignment, AssignmentStatus, DayOfWeek } from '@/types/assignment';
import { ROUTINES } from '@/data/routines';

/* ── helpers ─────────────────────────────────────────────────── */

function mapRow(row: Record<string, unknown>): Assignment {
  const routineName = row.routine_name as string;
  // Resolve local routine ID by name so workout-start still works
  const localRoutine = ROUTINES.find((r) => r.name === routineName);
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    clientId: row.client_id as string,
    routineId: localRoutine?.id ?? '',
    routineName,
    programName: (row.program_name as string) ?? undefined,
    scheduleDays: (row.schedule_days as DayOfWeek[]) ?? [],
    status: row.status as AssignmentStatus,
    note: (row.note as string) ?? undefined,
    assignedAt: new Date(row.assigned_at as string).getTime(),
    startedAt: row.started_at
      ? new Date(row.started_at as string).getTime()
      : undefined,
    completedAt: row.completed_at
      ? new Date(row.completed_at as string).getTime()
      : undefined,
  };
}

/* ── queries ─────────────────────────────────────────────────── */

/** Fetch all assignments for a trainer or client. */
export async function fetchAssignments(
  role: 'trainer' | 'client',
  userId: string,
): Promise<Assignment[]> {
  const col = role === 'trainer' ? 'trainer_id' : 'client_id';
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq(col, userId)
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Insert a new assignment. routine_id is null (no DB routines yet). */
export async function insertAssignment(params: {
  trainerId: string;
  clientId: string;
  routineName: string;
  programName?: string;
  scheduleDays: string[];
  note?: string;
}): Promise<Assignment> {
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      trainer_id: params.trainerId,
      client_id: params.clientId,
      routine_id: null,
      routine_name: params.routineName,
      program_name: params.programName ?? null,
      schedule_days: params.scheduleDays,
      note: params.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

/** Update an assignment's status (and timestamps). */
export async function updateAssignmentStatusDB(
  id: string,
  status: AssignmentStatus,
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}
