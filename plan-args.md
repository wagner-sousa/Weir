Use Tailwind CSS v4 via the @tailwindcss/vite plugin.
Colors are defined as CSS custom properties in styles.css using Tailwind's @theme directive
(--color-theme-bg: #0e1116, --color-theme-panel: #161b22, --color-theme-border: #2a2f3a,
--color-theme-text: #e6edf3, --color-theme-muted: #8b949e, --color-theme-accent: #5eead4,
--color-theme-accent-dark: #14b8a6). Badges use Tailwind utility classes mapped to 6 status
variants (default, secondary, destructive, success, warning, outline) with the exact colors
 from the spec. Notifications use the sonner library (npm install sonner) replacing the
custom Toast.tsx implementation. HTTP client uses ofetch (npm install ofetch) replacing
native fetch in frontend/src/services/api.ts. All changes are frontend-only in frontend/src/.
No backend changes needed. Sonner toasts are positioned at bottom-right, auto-dismiss after
3 seconds, with 3 types: success (green), error (red), info (blue).
