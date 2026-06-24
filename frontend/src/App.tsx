import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { useMCPs, useRemoveMCP } from './hooks/useMCPs';
import { CardGrid } from './components/CardGrid';
import { ErrorState } from './components/ErrorState';
import { LoadingSpinner } from './components/LoadingSpinner';

const queryClient = new QueryClient();

function MCPDashboard() {
  const { data, isLoading, error, isRefreshing } = useMCPs();
  const removeMutation = useRemoveMCP();

  const handleRemove = async (name: string) => {
    const result = await removeMutation.mutateAsync(name);
    if (result.success) {
      toast.success(`MCP "${name}" removed.`);
    } else {
      toast.error(result.error || 'Error removing MCP.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Unknown error'} />;
  }

  if (data?.error) {
    return <ErrorState message={data.error} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">Weir - MCP Gateway</h1>
            <p className="mt-1 text-sm text-theme-muted">
              MCP servers configured in{' '}
              <code className="rounded bg-theme-panel px-1 text-theme-accent">.mcp.json</code>
            </p>
          </div>
          {isRefreshing && <span className="text-sm text-theme-accent">Updating...</span>}
        </div>
      </header>
      <CardGrid
        clients={data?.clients || []}
        onRemove={handleRemove}
        removePending={removeMutation.isPending}
      />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MCPDashboard />
    </QueryClientProvider>
  );
}
