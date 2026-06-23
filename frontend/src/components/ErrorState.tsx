interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">⚠️</div>
      <h2 className="text-xl font-semibold text-red-600">Error loading</h2>
      <p className="mt-2 max-w-md text-gray-600">{message}</p>
    </div>
  );
}
