import type { Assignment, AssignmentSource, DayOfWeek, ResolvedDayRoutine } from '@/types/assignment';
import type { WorkoutRoutine } from '@/types/workout';

function getAssignmentPriority(source: AssignmentSource) {
  return source === 'trainer' ? 2 : 1;
}

function getResolutionReason(source: AssignmentSource): ResolvedDayRoutine['reason'] {
  if (source === 'trainer') return 'coach_assigned';
  if (source === 'ai') return 'ai_scheduled';
  return 'self_scheduled';
}

export function assignmentToWorkoutRoutine(assignment: Assignment): WorkoutRoutine | null {
  if (!assignment.exercisesJson || assignment.exercisesJson.length === 0) {
    return null;
  }

  return {
    id: assignment.routineId,
    name: assignment.routineName,
    exercises: assignment.exercisesJson,
    difficulty: 'intermediate',
    programName: assignment.programName,
    assignedBy: assignment.programName,
    source: assignment.source,
  };
}

export function resolveDayRoutine(params: {
  clientId: string | undefined;
  day: DayOfWeek;
  assignments: Assignment[];
  dayOverrides: Partial<Record<DayOfWeek, WorkoutRoutine>>;
}): ResolvedDayRoutine {
  const { clientId, day, assignments, dayOverrides } = params;

  const candidates = assignments
    .filter((assignment) => assignment.clientId === clientId)
    .filter((assignment) => assignment.status !== 'completed')
    .filter((assignment) => assignment.scheduleDays.includes(day))
    .filter((assignment) => assignment.exercisesJson && assignment.exercisesJson.length > 0)
    .sort((left, right) => {
      const priorityDelta = getAssignmentPriority(right.source) - getAssignmentPriority(left.source);
      if (priorityDelta !== 0) return priorityDelta;

      const assignedAtDelta = right.assignedAt - left.assignedAt;
      if (assignedAtDelta !== 0) return assignedAtDelta;

      return right.id.localeCompare(left.id);
    });

  const dayOverride = dayOverrides[day] ?? null;
  if (dayOverride) {
    return {
      day,
      activeRoutine: dayOverride,
      activeAssignment: null,
      reason: 'manual_override',
      candidates,
      isManualOverride: true,
    };
  }

  const activeAssignment = candidates[0] ?? null;
  const activeRoutine = activeAssignment ? assignmentToWorkoutRoutine(activeAssignment) : null;

  return {
    day,
    activeRoutine,
    activeAssignment,
    reason: activeAssignment ? getResolutionReason(activeAssignment.source) : 'empty',
    candidates,
    isManualOverride: false,
  };
}