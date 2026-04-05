import { supabase } from '@/config/supabase';
import type { GenerationRequest, GeneratedPlan, GenerationError } from '@/types/generation';

/**
 * Call the secure backend (Supabase Edge Function) to generate a workout plan.
 * No provider API keys are ever exposed to the client.
 */
export async function generatePlan(request: GenerationRequest): Promise<GeneratedPlan> {
  const { data, error } = await supabase.functions.invoke<GeneratedPlan>('generate-plan', {
    body: request,
  });

  if (error) {
    // Supabase functions.invoke wraps HTTP errors
    throw new Error(error.message ?? 'Generation failed');
  }

  // The edge function returns error objects with status >= 400
  if (data && typeof data === 'object' && 'error' in data) {
    const errData = data as unknown as GenerationError;
    const err = new Error(errData.message);
    (err as any).code = errData.error;
    (err as any).used = errData.used;
    (err as any).limit = errData.limit;
    throw err;
  }

  if (!data) {
    throw new Error('No plan returned from generation service');
  }

  return data;
}

/**
 * Get the current user's AI generation usage count.
 */
export async function getGenerationCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('ai_generation_count')
    .eq('id', userId)
    .single();
  if (error) return 0;
  return data?.ai_generation_count ?? 0;
}
