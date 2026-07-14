import { useQuery } from '@tanstack/react-query';
import { getToolVisibility, getMCPTools } from '../services/api';

interface EnabledToolBadgeProps {
  mcpName: string;
}

export function EnabledToolBadge({ mcpName }: EnabledToolBadgeProps) {
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

  const enabledCount = tools.filter((t) => visibility[t.name] ?? true).length;

  if (tools.length === 0) return null;

  return (
    <span
      className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[10px] font-medium text-teal-300"
      title={`${enabledCount} enabled tool${enabledCount !== 1 ? 's' : ''}`}
    >
      {enabledCount}
    </span>
  );
}
