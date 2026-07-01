# Component Contract: Badge

## Props

```typescript
interface BadgeProps {
  variant: keyof typeof variantClasses;
  label: string;
}
```

## Variant Classes

| Variant | Tailwind Classes | Usage |
|---------|-----------------|-------|
| `default` | `bg-gray-600 text-gray-200` | Fallback |
| `secondary` | `bg-gray-700 text-gray-300` | Unused for transports |
| `destructive` | `bg-red-900 text-red-200` | General use |
| `success` | `bg-green-900 text-green-200` | General use |
| `warning` | `bg-yellow-900 text-yellow-200` | General use |
| `outline` | `border border-theme-border text-theme-muted` | General use |
| `http` | `bg-blue-800 text-blue-200` | HTTP transport badge |
| `stdio` | `bg-purple-800 text-purple-200` | STDIO transport badge |
| `sse` | `bg-cyan-800 text-cyan-200` | SSE transport badge |

## Behavior

- Renders a rounded-full pill with uppercase label
- Color is determined entirely by variant
- No interactive behavior (display only)
