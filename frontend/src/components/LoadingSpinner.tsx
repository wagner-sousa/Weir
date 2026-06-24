import { LoaderCircle } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Carregando...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-16">
      <LoaderCircle className="h-6 w-6 animate-spin text-theme-accent" />
      <p className="text-theme-muted">{message}</p>
    </div>
  );
}
