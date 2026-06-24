interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">&#x26a0;&#xfe0f;</div>
      <h2 className="text-xl font-semibold text-red-500">Erro ao carregar</h2>
      <p className="mt-2 max-w-md text-theme-muted">{message}</p>
    </div>
  );
}
