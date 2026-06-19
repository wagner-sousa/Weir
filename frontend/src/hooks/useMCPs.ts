import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchMCPs, connectWebSocket } from '../services/api';

export function useMCPs() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mcps'],
    queryFn: fetchMCPs,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const disconnect = connectWebSocket(() => {
      setIsRefreshing(true);
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    });

    return disconnect;
  }, [queryClient]);

  useEffect(() => {
    if (!query.isFetching) {
      setIsRefreshing(false);
    }
  }, [query.isFetching]);

  return { ...query, isRefreshing };
}
