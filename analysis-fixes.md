### U1 — "em tempo aceitavel"
Substituir por metrica existente: <2s para carregar a listagem.
Timeout padrao definido via MCP_CONNECTION_TIMEOUT (default 5000ms).

### U2 — "feedback visual de carregamento"
Usar LoaderCircle do lucide-react com animate-spin e cor text-yellow-500,
conforme ja implementado nos status connecting e testing em MCPCard.tsx.

### U3 — "tratar erro graciosamente"
Usar os dois padroes ja existentes:
- Erro fatal: componente ErrorState com icone de aviso + titulo vermelho
- Erro leve: showToast com tipo 'error' + cor vermelha + exibicao inline no card

### I2 — plan.md "badge generico"
Substituir texto no plan.md: de "badge generico" para "6 variantes de badge
com cores do spec".

### C9 — CS-001/003 sem task explicita
Manter como esta — coberto indiretamente pelas tasks T045 + env vars
MCP_CONNECTION_TIMEOUT (5000ms) e MCP_CACHE_TTL (60000ms).
