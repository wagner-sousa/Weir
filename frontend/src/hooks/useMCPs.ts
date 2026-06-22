import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchMCPs, connectWebSocket, addMCP, testConnection } from '../services/api';
import type { TransportConfig } from '../services/api';

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

export function useAddMCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      transport,
    }: {
      name: string;
      transport: TransportConfig;
    }) => {
      return addMCP(name, transport);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async ({
      transport,
      signal,
    }: {
      transport: TransportConfig;
      signal?: AbortSignal;
    }) => {
      return testConnection(transport, signal);
    },
  });
}
