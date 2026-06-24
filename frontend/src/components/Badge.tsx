const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-800',
  secondary: 'bg-gray-200 text-gray-700',
  destructive: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  outline: 'border border-gray-300 text-gray-700',
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
