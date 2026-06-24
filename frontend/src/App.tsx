import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMCPs } from './hooks/useMCPs';
import { CardGrid } from './components/CardGrid';
import { ErrorState } from './components/ErrorState';
import { LoadingSpinner } from './components/LoadingSpinner';

const queryClient = new QueryClient();

function MCPDashboard() {
  const { data, isLoading, error, isRefreshing } = useMCPs();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Erro desconhecido'} />;
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
              Servidores MCP configurados em{' '}
              <code className="rounded bg-theme-panel px-1 text-theme-accent">.mcp.json</code>
            </p>
          </div>
          {isRefreshing && <span className="text-sm text-theme-accent">Atualizando...</span>}
        </div>
      </header>
      <CardGrid clients={data?.clients || []} />
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
