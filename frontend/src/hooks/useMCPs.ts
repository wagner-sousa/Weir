import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import {
  fetchMCPs,
  connectWebSocket,
  connectSSE,
  addMCP,
  testConnection,
  removeMCP,
  updateMCP,
} from '../services/api';
import type { TransportConfig, StatusEvent, MCPClient } from '../services/api';

export function useMCPs() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, StatusEvent>>({});
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

  const handleStatusEvent = useCallback((event: StatusEvent) => {
    setStatusMap((prev) => ({ ...prev, [event.name]: event }));
  }, []);

  useEffect(() => {
    const disconnect = connectSSE(handleStatusEvent);
    return disconnect;
  }, [handleStatusEvent]);

  const clientsWithStatus: MCPClient[] = (query.data?.clients ?? []).map(
    (client: MCPClient) => {
      const statusEvent = statusMap[client.name];
      if (statusEvent) {
        return {
          ...client,
          status: statusEvent.status,
          error: statusEvent.error,
          toolCount: statusEvent.toolCount ?? client.toolCount,
        };
      }
      return client;
    },
  );

  return { ...query, data: { ...query.data, clients: clientsWithStatus }, isRefreshing };
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

export function useRemoveMCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return removeMCP(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useUpdateMCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      originalName,
      name,
      transport,
    }: {
      originalName: string;
      name: string;
      transport: TransportConfig;
    }) => {
      return updateMCP(originalName, name, transport);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}
