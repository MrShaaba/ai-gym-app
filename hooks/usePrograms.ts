import { useEffect, useState, useCallback } from 'react';
import {
  fetchTrainerPrograms,
  fetchClientPrograms,
  type ProgramRow,
} from '@/services/programs';

/**
 * Fetches programs from Supabase.
 * - trainer: programs created by the trainer
 * - client: programs from linked trainers
 */
export function usePrograms(
  role: 'trainer' | 'client',
  userId: string | undefined,
) {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data =
        role === 'trainer'
          ? await fetchTrainerPrograms(userId)
          : await fetchClientPrograms(userId);
      setPrograms(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { programs, loading, error, refetch: load };
}
