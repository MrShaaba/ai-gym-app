import { supabase } from '@/config/supabase';
import { FEATURE_GATES } from '@/config/featureGates';
import {
  getDevScenarioUsageCount,
  isDevEntitlementScenarioActive,
  useDevEntitlementStore,
} from '@/store/devEntitlementStore';
import type { AppGenerationError, GenerationFailureCode, GenerationRequest, GeneratedPlan, GenerationError, GeneratedRoutine } from '@/types/generation';
import type { Equipment, MuscleGroup, WorkoutExercise } from '@/types/workout';

function createGenerationError(
  code: GenerationFailureCode,
  message: string,
  extra?: Partial<Pick<AppGenerationError, 'used' | 'limit' | 'retryable'>>,
) {
  const err = new Error(message) as AppGenerationError;
  err.code = code;
  err.used = extra?.used;
  err.limit = extra?.limit;
  err.retryable = extra?.retryable ?? code !== 'generation_limit_reached';
  return err;
}

function createBackendNotReadyError(message: string) {
  return createGenerationError('backend_unavailable', message, { retryable: true });
}

function isMissingGenerationColumn(message: string | undefined) {
  const text = (message ?? '').toLowerCase();
  return text.includes('ai_generation_count')
    || text.includes('plan_tier')
    || text.includes('trial_started_at')
    || text.includes('trial_ends_at')
    || text.includes('admin_override');
}

function isTransportFailure(message: string | undefined) {
  const text = (message ?? '').toLowerCase();
  return text.includes('failed to send a request')
    || text.includes('network request failed')
    || text.includes('failed to fetch')
    || text.includes('network error');
}

function isBackendUnavailable(message: string | undefined) {
  const text = (message ?? '').toLowerCase();
  return isMissingGenerationColumn(message)
    || text.includes('not found')
    || text.includes('404')
    || text.includes('edge function') && text.includes('not deployed');
}

function buildMockGeneratedPlan(request: GenerationRequest): GeneratedPlan {
  const routineCount = request.horizon === 'today' ? 1 : request.horizon === 'week' ? request.daysPerWeek : request.daysPerWeek * 4;
  const primaryEquipment: Equipment = request.equipment[0] ?? 'dumbbell';
  const cableOrFallback: Equipment = request.equipment.includes('cable') ? 'cable' : primaryEquipment;
  const routines: GeneratedRoutine[] = Array.from({ length: routineCount }, (_, routineIndex) => {
    const exercises: WorkoutExercise[] = [
      {
        exercise: {
          id: `mock-${routineIndex + 1}-1`,
          name: 'Goblet Squat',
          muscleGroups: ['quadriceps', 'glutes'] satisfies MuscleGroup[],
          equipment: primaryEquipment,
        },
        sets: [
          { reps: 10, weight: 20, restSeconds: 60 },
          { reps: 10, weight: 20, restSeconds: 60 },
          { reps: 10, weight: 20, restSeconds: 60 },
        ],
      },
      {
        exercise: {
          id: `mock-${routineIndex + 1}-2`,
          name: 'Push Up',
          muscleGroups: ['chest', 'triceps'] satisfies MuscleGroup[],
          equipment: 'bodyweight',
        },
        sets: [
          { reps: 12, weight: 0, restSeconds: 45 },
          { reps: 12, weight: 0, restSeconds: 45 },
          { reps: 12, weight: 0, restSeconds: 45 },
        ],
      },
      {
        exercise: {
          id: `mock-${routineIndex + 1}-3`,
          name: 'Cable Row',
          muscleGroups: ['back', 'biceps'] satisfies MuscleGroup[],
          equipment: cableOrFallback,
        },
        sets: [
          { reps: 10, weight: 35, restSeconds: 60 },
          { reps: 10, weight: 35, restSeconds: 60 },
          { reps: 10, weight: 35, restSeconds: 60 },
        ],
      },
    ];

    return {
    name: request.horizon === 'today' ? 'Mock Workout' : `Mock Day ${routineIndex + 1}`,
    difficulty: request.difficulty,
    durationMinutes: request.durationMinutes,
      exercises,
    };
  });

  return {
    title: `Mock ${request.goal} Plan`,
    goal: request.goal,
    summary: 'Developer mock plan for stable entitlement and generation flow testing.',
    horizon: request.horizon,
    daysPerWeek: request.daysPerWeek,
    routines,
    generatedAt: new Date().toISOString(),
    model: 'dev-mock-generator',
    request,
  };
}

function normalizeGenerationError(error: unknown): AppGenerationError {
  const existing = error as Partial<AppGenerationError> & { message?: string };

  if (existing?.code === 'generation_limit_reached') {
    return createGenerationError('generation_limit_reached', existing.message ?? 'You have used all free AI generations.', {
      used: existing.used,
      limit: existing.limit,
      retryable: false,
    });
  }

  if (
    existing?.code === 'transport_failure'
    || existing?.code === 'backend_unavailable'
    || existing?.code === 'generation_failed'
  ) {
    return createGenerationError(existing.code, existing.message ?? 'Generation failed.', {
      used: existing.used,
      limit: existing.limit,
      retryable: existing.retryable,
    });
  }

  const message = existing?.message ?? 'Generation failed';

  if (isTransportFailure(message)) {
    return createGenerationError(
      'transport_failure',
      'Could not reach the AI generation service. Check your connection and try again.',
      { retryable: true },
    );
  }

  if (isBackendUnavailable(message)) {
    return createGenerationError(
      'backend_unavailable',
      'AI generation backend is unavailable right now. Verify the migration and edge function deployment, then try again.',
      { retryable: true },
    );
  }

  return createGenerationError(
    'generation_failed',
    'AI generation failed. Please try again.',
    { retryable: true },
  );
}

async function assertGenerationBackendReady() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .select('ai_generation_count, plan_tier, trial_started_at, trial_ends_at, admin_override')
    .eq('id', user.id)
    .single();

  if (error && isMissingGenerationColumn(error.message)) {
    throw createBackendNotReadyError(
      'AI generation backend is not fully enabled yet. Apply the Phase 7C + Phase 10 migrations and redeploy the generate-plan function.',
    );
  }
}

/**
 * Call the secure backend (Supabase Edge Function) to generate a workout plan.
 * No provider API keys are ever exposed to the client.
 */
export async function generatePlan(request: GenerationRequest): Promise<GeneratedPlan> {
  const freeLimit = FEATURE_GATES.ai_generation.freeLimit ?? 3;
  const devState = __DEV__ ? useDevEntitlementStore.getState() : null;

  if (devState && isDevEntitlementScenarioActive(devState.scenario)) {
    const simulatedUsed = getDevScenarioUsageCount(devState.scenario, freeLimit);
    const simulatedUnlimited = ['trial_active', 'premium_active', 'admin_override'].includes(devState.scenario);

    if (!simulatedUnlimited && simulatedUsed >= freeLimit) {
      throw createGenerationError(
        'generation_limit_reached',
        'This dev entitlement scenario is currently blocked by the AI generation cap.',
        { used: simulatedUsed, limit: freeLimit, retryable: false },
      );
    }
  }

  if (devState?.mockGenerationEnabled) {
    return buildMockGeneratedPlan(request);
  }

  await assertGenerationBackendReady();

  try {
    const { data, error } = await supabase.functions.invoke<GeneratedPlan>('generate-plan', {
      body: request,
    });

    if (error) {
      if (isMissingGenerationColumn(error.message)) {
        throw createBackendNotReadyError(
          'AI generation backend is not fully enabled yet. Apply the Phase 7C + Phase 10 migrations and redeploy the generate-plan function.',
        );
      }
      throw normalizeGenerationError(error);
    }

    // The edge function returns error objects with status >= 400
    if (data && typeof data === 'object' && 'error' in data) {
      const errData = data as unknown as GenerationError;
      if (
        errData.error === 'internal_error' ||
        (typeof errData.message === 'string' && isMissingGenerationColumn(errData.message))
      ) {
        throw createBackendNotReadyError(
          'AI generation backend is not fully enabled yet. Apply the Phase 7C + Phase 10 migrations and redeploy the generate-plan function.',
        );
      }
      throw normalizeGenerationError({
        code: errData.error,
        message: errData.message,
        used: errData.used,
        limit: errData.limit,
      });
    }

    if (!data) {
      throw createGenerationError('generation_failed', 'No plan returned from generation service');
    }

    return data;
  } catch (error) {
    throw normalizeGenerationError(error);
  }
}

/**
 * Get the current user's AI generation usage count.
 */
export async function getGenerationCount(userId: string): Promise<number> {
  if (__DEV__) {
    const devState = useDevEntitlementStore.getState();
    if (isDevEntitlementScenarioActive(devState.scenario)) {
      return getDevScenarioUsageCount(
        devState.scenario,
        FEATURE_GATES.ai_generation.freeLimit ?? 0,
      );
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('ai_generation_count')
    .eq('id', userId)
    .single();
  if (error) return 0;
  return data?.ai_generation_count ?? 0;
}
