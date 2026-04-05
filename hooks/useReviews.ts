import { useEffect, useState, useCallback } from 'react';
import { fetchReviews } from '@/services/marketplace';
import type { Review } from '@/types/marketplace';

export function useReviews(trainerId: string | undefined) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!trainerId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setReviews(await fetchReviews(trainerId));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  useEffect(() => { load(); }, [load]);

  return { reviews, loading, error, refetch: load };
}
