import { useEffect, useState, useCallback } from 'react';
import { searchTrainers } from '@/services/marketplace';
import type { TrainerPublicProfile } from '@/types/marketplace';

export function useTrainerSearch(query: string, specialty: string) {
  const [trainers, setTrainers] = useState<TrainerPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchTrainers(
        query || undefined,
        specialty || undefined,
      );
      setTrainers(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [query, specialty]);

  useEffect(() => {
    search();
  }, [search]);

  return { trainers, loading, error, refetch: search };
}
