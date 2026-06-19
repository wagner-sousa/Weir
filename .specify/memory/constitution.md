<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0
  Modified principles: None (principles unchanged)
  Added sections: None (guidance added to Fluxo de Desenvolvimento item 6)
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ Plan template generic — no change needed
    - .specify/templates/spec-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/tasks-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/checklist-template.md: ✅ No principle-specific content — no change needed
    - .specify/templates/constitution-template.md: ✅ Template is source — no change needed
  Documentation requiring updates (MANUAL):
    - quickstart.md: Update command examples to use docker-compose
    - plan.md: Update Technical Context to reflect docker-compose constraint
  Follow-up TODOs: None
-->

# Weir Constitution

## Core Principles

### I. Schema-Driven Development (SDD)

Schemas DEVEM ser definidos antes de qualquer implementacao.
Todo endpoint, comando e configuracao DEVE ter um schema
validavel. Schemas sao a fonte da verdade arquitetural —
nenhuma funcionalidade pode existir sem um schema que a
descreva formalmente.

### II. Test-First (NON-NEGOTIABLE)

TDD e obrigatorio nesta ordem: (1) testes escritos e
aprovados pelo usuario, (2) testes falham na execucao,
(3) implementacao escrita, (4) testes passam. O ciclo
Red-Green-Refactor DEVE ser rigorosamente seguido.
Nenhum codigo de producao deve ser escrito antes do teste
que o valida.

### III. Portugues Brasileiro para Agentes e Usuarios

Todas as mensagens exibidas para usuarios finais e todos
os prompts enviados para agentes DEVEM estar em portugues
brasileiro (pt-BR). O codigo-fonte (nomes de variaveis,
funcoes, classes, comentarios) e a documentacao tecnica
DEVEM estar em ingles. Esta separacao garante que o
codigo permaneca universal enquanto a experiencia do
usuario e natural.

### IV. .mcp.json como Fonte da Verdade

O arquivo .mcp.json e a fonte unica e vinculante de
verdade para todas as configuracoes do Weir. Toda
funcionalidade DEVE derivar do schema .mcp.json. O parser
e validador de .mcp.json sao componentes fundamentais dos
quais todos os outros dependem. Nenhuma configuracao
manual paralela deve existir.

### V. Simplicidade e Gateway Unificado

O Weir DEVE priorizar simplicidade e experiencia do
desenvolvedor. O modo web e o modo container DEVEM
compartilhar a mesma logica subjacente — sem duplicacao.
A configuracao DEVE exigir o minimo esforco possivel.
Cobertura de caminhos felizes E casos extremos e
obrigatoria para consideracao de producao.

## Stack Tecnologica

Linguagem e framework serao definidos durante a fase de
setup do projeto, priorizando ecossistemas que suportem
tipagem estatica e testabilidade. Docker e obrigatorio
para containerizacao. A interface web DEVE ser entregue
como parte do mesmo processo (ou via embedded UI).
Ferramenta de testes sera definida no setup, DEVendo
suportar testes de unidade, integracao e contrato.
Toda dependencia externa DEVE ser justificada.

## Fluxo de Desenvolvimento

1. SDD — definir schema primeiro (config, API, dados).
2. TDD — escrever teste → ver falha → implementar →
   ver passar.
3. Revisao de conformidade com a Constituicao e
   obrigatoria em todo PR.
4. Toda complexidade deve ser justificada por
   necessidade atual, nao futura (YAGNI).
5. Commits frequentes e atomicos apos cada tarefa ou
   grupo logico de tarefas.
6. Todos os comandos de desenvolvimento, teste, build e
   execucao DEVEM ser invocados via docker-compose.*.yml.
   Nenhum comando node/npm diretamente no host.

## Governance

Esta Constituicao substitui todas as outras praticas de
desenvolvimento. Emendas REQUEREM: (a) documentacao da
mudanca, (b) aprovacao por revisao, e (c) plano de
migracao quando aplicavel. O versionamento segue
Semantic Versioning (MAJOR.MINOR.PATCH) aplicado ao
documento da Constituicao. Toda revisao de PR DEVE
verificar conformidade com os principios aqui definidos.
Casos omissos serao resolvidos pelos principios gerais
de simplicidade e experiencia do desenvolvedor.

**Version**: 1.1.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
