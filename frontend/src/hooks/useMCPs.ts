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
import type { TransportConfig, StatusEvent, MCPClient, MCPResponse } from '../services/api';

export function useMCPs() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mcps'],
    queryFn: fetchMCPs,
    refetchInterval: 30_000,
  });

  // Merge a status event into the query cache directly, so the card
  // updates instantly without waiting for a refetch round-trip.
  const handleStatusEvent = useCallback((event: StatusEvent) => {
    queryClient.setQueryData(['mcps'], (old: MCPResponse | undefined) => {
      if (!old?.clients) return old;
      return {
        ...old,
        clients: old.clients.map((c: MCPClient) =>
          c.name === event.name
            ? { ...c, status: event.status, error: event.error, toolCount: event.toolCount ?? c.toolCount }
            : c,
        ),
      };
    });
  }, [queryClient]);

  useEffect(() => {
    const disconnect = connectWebSocket(
      () => {
        setIsRefreshing(true);
        queryClient.invalidateQueries({ queryKey: ['mcps'] });
      },
      handleStatusEvent,
    );

    return disconnect;
  }, [queryClient, handleStatusEvent]);

  useEffect(() => {
    const disconnect = connectSSE(handleStatusEvent);
    return disconnect;
  }, [handleStatusEvent]);

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async ({
      transport,
      signal,
      name,
    }: {
      transport: TransportConfig;
      signal?: AbortSignal;
      name?: string;
    }) => {
      return testConnection(transport, signal, name);
    },
  });
}

export function useRemoveMCP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return removeMCP(name);
    },
    onSettled: () => {
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}
