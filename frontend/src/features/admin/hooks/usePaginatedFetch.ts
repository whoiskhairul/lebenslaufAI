import { useEffect, useState } from 'react';
import api from '../../../services/api';
import { PAGE_SIZE } from '../constants';
import { Pagination } from '../types';

export function usePaginatedFetch<T>(
  url: string,
  params: Record<string, string>,
  reloadKey?: number,
): { rows: T[]; pagination: Pagination | null; loading: boolean; error: boolean } {
  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const qs = new URLSearchParams({ page_size: String(PAGE_SIZE), ...params }).toString();
    api.get(`${url}?${qs}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.results);
        setPagination(res.data.pagination);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [url, JSON.stringify(params), reloadKey]);

  return { rows, pagination, loading, error };
}
