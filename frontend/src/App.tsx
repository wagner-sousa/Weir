import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMCPs } from './hooks/useMCPs';
import { CardGrid } from './components/CardGrid';
import { ErrorState } from './components/ErrorState';

const queryClient = new QueryClient();

function MCPDashboard() {
  const { data, isLoading, error, isRefreshing } = useMCPs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Weir - MCP Gateway</h1>
            <p className="mt-1 text-sm text-gray-500">
              Servidores MCP configurados em{' '}
              <code className="rounded bg-gray-100 px-1">.mcp.json</code>
            </p>
          </div>
          {isRefreshing && <span className="text-sm text-blue-600">Atualizando...</span>}
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
