import { useEffect, useState, useCallback } from 'react';
import { fetchTrainerClients } from '@/services/trainer';
import type { TrainerClient } from '@/types/assignment';

/**
 * Fetches the trainer's linked clients from Supabase.
 * Returns { clients, loading, error, refetch }.
 */
export function useTrainerClients(trainerId: string | undefined) {
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!trainerId) {
      setClients([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrainerClients(trainerId);
      setClients(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { clients, loading, error, refetch: load };
}
