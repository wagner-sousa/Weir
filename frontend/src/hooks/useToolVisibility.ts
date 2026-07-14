import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMCPTools, getToolVisibility, setToolVisibility, setBulkToolVisibility } from '../services/api';
import type { ToolWithVisibility } from '../services/api';

export function useToolVisibility(mcpName: string) {
  const queryClient = useQueryClient();

  const toolsQuery = useQuery({
    queryKey: ['tools', mcpName],
    queryFn: () => getMCPTools(mcpName, true),
    enabled: !!mcpName,
  });

  const visibilityQuery = useQuery({
    queryKey: ['tool-visibility', mcpName],
    queryFn: () => getToolVisibility(mcpName),
    enabled: !!mcpName,
  });

  const tools = toolsQuery.data?.tools ?? [];
  const visibility = visibilityQuery.data?.visibility ?? {};

  const toolsWithVisibility: ToolWithVisibility[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    enabled: visibility[tool.name] ?? true,
  }));

  const enabledCount = toolsWithVisibility.filter((t) => t.enabled).length;

  const toggleMutation = useMutation({
    mutationFn: async ({ toolName, enabled }: { toolName: string; enabled: boolean }) => {
      await setToolVisibility(mcpName, toolName, enabled);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-visibility', mcpName] });
      queryClient.invalidateQueries({ queryKey: ['tools', mcpName] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const toolNames = tools.map((t) => t.name);
      await setBulkToolVisibility(mcpName, enabled, toolNames);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-visibility', mcpName] });
      queryClient.invalidateQueries({ queryKey: ['tools', mcpName] });
    },
  });

  return {
    tools: toolsWithVisibility,
    totalCount: toolsWithVisibility.length,
    enabledCount,
    isLoading: toolsQuery.isLoading || visibilityQuery.isLoading,
    error: toolsQuery.error || visibilityQuery.error,
    toggleMutation,
    bulkMutation,
  };
}
