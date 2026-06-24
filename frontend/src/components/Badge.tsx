const variantClasses: Record<string, string> = {
  default: 'bg-gray-600 text-gray-200',
  secondary: 'bg-gray-700 text-gray-300',
  destructive: 'bg-red-900 text-red-200',
  success: 'bg-green-900 text-green-200',
  warning: 'bg-yellow-900 text-yellow-200',
  outline: 'border border-theme-border text-theme-muted',
};

interface BadgeProps {
  variant?: keyof typeof variantClasses;
  label: string;
}

export function Badge({ variant = 'default', label }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
