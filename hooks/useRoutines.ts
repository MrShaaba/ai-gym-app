import { useEffect, useState, useCallback } from 'react';
import { fetchRoutines, type RoutineRow } from '@/services/programs';

/**
 * Fetches routines for a program from Supabase.
 */
export function useRoutines(programId: string | undefined) {
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!programId) {
      setRoutines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoutines(programId);
      setRoutines(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  return { routines, loading, error, refetch: load };
}
