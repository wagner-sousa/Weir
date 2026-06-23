import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMCPs, useRemoveMCP } from './hooks/useMCPs';
import { CardGrid } from './components/CardGrid';
import { ErrorState } from './components/ErrorState';
import { useToast, showToast } from './components/Toast';

const queryClient = new QueryClient();

function MCPDashboard() {
  const { data, isLoading, error, isRefreshing } = useMCPs();
  const { ToastUI } = useToast();
  const removeMutation = useRemoveMCP();

  const handleRemove = async (name: string) => {
    const result = await removeMutation.mutateAsync(name);
    if (result.success) {
      showToast(`MCP "${name}" removed.`, 'success');
    } else {
      showToast(result.error || 'Error removing MCP.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500">Loading...</p>
        <ToastUI />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <ErrorState message={error instanceof Error ? error.message : 'Unknown error'} />
        <ToastUI />
      </>
    );
  }

  if (data?.error) {
    return (
      <>
        <ErrorState message={data.error} />
        <ToastUI />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weir - MCP Gateway</h1>
            <p className="mt-1 text-sm text-gray-500">
              MCP servers configured in{' '}
              <code className="rounded bg-gray-100 px-1">.mcp.json</code>
            </p>
          </div>
          {isRefreshing && <span className="text-sm text-blue-600">Updating...</span>}
        </div>
      </header>
      <CardGrid
        clients={data?.clients || []}
        onRemove={handleRemove}
        removePending={removeMutation.isPending}
      />
      <ToastUI />
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
