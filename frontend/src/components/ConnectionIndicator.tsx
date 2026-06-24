interface ConnectionIndicatorProps {
  online: boolean;
}

export function ConnectionIndicator({ online }: ConnectionIndicatorProps) {
  return (
    <span
      data-testid="connection-indicator"
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online ? 'bg-green-500' : 'bg-red-500'
      }`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
