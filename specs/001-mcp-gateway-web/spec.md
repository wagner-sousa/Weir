# Especificacao: Hub/Gateway MCP com Visualizacao Web

**Branch**: `001-mcp-gateway-web`

**Criado em**: 2026-06-19

**Status**: Draft

**Entrada**: "Vamos criar um hub/gateway de mcps com visualizacao web. A princípio vamos usar os mesmo padrao de arquivo mcp (.mcp.json) para o caso do modo de utilizacao com docker, o usuario deve colocar apenas o arquivo de configuracao do mcp como volume. A apresentacao sera em cards, um por mcp, 3 por linha. O titulo do card sera o titulo do mcp no arquivo. Deve informar o tipo (http/stdio, tem outros tipos?), A listagem sera atualizada conforme a atualizacao do arquivo. A tela ira apenas listar os mcps." + "Migrar frontend para Tailwind CSS v4 com sistema de design temático, substituir toast customizado por sonner, substituir fetch nativo por ofetch, implementar variantes de badge e indicadores de conexao."

## Cenarios de Uso e Testes

### Historia 1 - Visualizar lista de MCPs em modo web (P1)

Como usuario do Weir, quero acessar uma interface web que liste todos os meus servidores MCP configurados no arquivo .mcp.json para visualizar rapidamente quais estao disponiveis e seus tipos de transporte.

**Por que esta prioridade**: E a funcionalidade principal e minima para o produto ser util — sem a listagem, nao ha valor algum.

**Teste independente**: Iniciar o Weir em modo web, abrir o navegador e verificar se os cartoes dos MCPs configurados no .mcp.json sao exibidos corretamente.

**Cenarios de aceitacao**:

1. **Dado** que o Weir esta rodando em modo web com um arquivo .mcp.json valido contendo 2 servidores MCP, **Quando** o usuario acessa a pagina inicial, **Entao** o sistema exibe 2 cartoes organizados em ate 3 colunas, cada um com o titulo e o tipo de transporte do respectivo MCP.

2. **Dado** que o Weir esta rodando em modo web com um arquivo .mcp.json valido contendo 5 servidores MCP, **Quando** o usuario acessa a pagina inicial, **Entao** o sistema exibe 5 cartoes em linhas de 3, resultando em 2 linhas completas (3 + 2).

---

### Historia 2 - Visualizar lista de MCPs em modo Docker (P1)

Como usuario que utiliza Docker, quero montar apenas meu arquivo .mcp.json como volume no container Weir para ver a lista dos meus servidores MCP sem configuracao adicional.

**Por que esta prioridade**: O suporte a Docker e um dos modos de deploy principais, essencial para adocao em infraestruturas existentes.

**Teste independente**: Executar o container Weir com o volume apontando para um .mcp.json valido e acessar a interface web para confirmar a listagem.

**Cenarios de aceitacao**:

1. **Dado** que o usuario executa `docker run -v /path/to/.mcp.json:/app/.mcp.json weir`, **Quando** o container inicia, **Entao** o Weir le o arquivo montado e exibe a lista de MCPs na interface web.

2. **Dado** que o container Weir e iniciado sem um arquivo .mcp.json montado, **Quando** o usuario acessa a interface, **Entao** o sistema exibe uma mensagem informando que nenhum arquivo de configuracao foi encontrado.

---

### Historia 3 - Atualizacao automatica da listagem (P2)

Como usuario, quero que a lista de MCPs seja atualizada automaticamente quando eu modificar o arquivo .mcp.json para ver as alteracoes sem reiniciar o servidor.

**Por que esta prioridade**: Melhora significativamente a experiencia do desenvolvedor, mas o MVP funciona sem ela (requer reinicializacao manual).

**Teste independente**: Modificar o arquivo .mcp.json (adicionar/remover MCP) e verificar se a interface web reflete a mudanca em ate 5 segundos sem interacao do usuario.

**Cenarios de aceitacao**:

1. **Dado** que a interface web esta exibindo 2 MCPs, **Quando** o usuario adiciona um novo MCP ao .mcp.json e salva o arquivo, **Entao** a interface exibe 3 MCPs em ate 5 segundos sem necessidade de recarregar a pagina.

2. **Dado** que a interface web esta exibindo 3 MCPs, **Quando** o usuario remove um MCP do .mcp.json e salva o arquivo, **Entao** a interface exibe 2 MCPs em ate 5 segundos.

---

### Historia 4 - Identificacao Visual de Status dos Componentes (P1)

Como usuario da interface web do Weir, quero ver indicadores visuais claros (badges e status de conexao) para cada servidor MCP, utilizando um sistema de cores consistente, para avaliar rapidamente o estado de cada servidor sem precisar ler texto.

**Por que esta prioridade**: Badges e indicadores de conexao sao a melhoria visual mais visivel — estabelecem a base do sistema de design que todos os outros componentes utilizam.

**Teste independente**: Carregar o dashboard principal e verificar se cada cartao MCP exibe um badge colorido com o status correto e um indicador de conexao verde/vermelho.

**Cenarios de aceitacao**:

1. **Dado** que o dashboard MCP esta carregado, **Quando** um servidor esta online, **Entao** seu indicador de conexao mostra verde
2. **Dado** que o dashboard MCP esta carregado, **Quando** um servidor esta offline, **Entao** seu indicador de conexao mostra vermelho
3. **Dado** qualquer cartao MCP, **Quando** ele exibe um badge de status (ex: "online", "erro", "aviso", "secundario"), **Entao** o badge usa a variante de cor correta (success verde, destructive vermelho, warning amarelo, default cinza, secondary tom secundario, outline borda)
4. **Dado** que a aplicacao renderiza, **Quando** qualquer badge de status e exibido, **Entao** ele utiliza a paleta de cores do tema definida pelo sistema de design

---

### Historia 5 - Notificacoes nao Intrusivas (P2)

Como usuario do Weir, quero receber notificacoes temporarias (toasts) no canto inferior direito da tela quando acoes sao realizadas ou erros ocorrem, para ser informado sem interromper meu fluxo de trabalho.

**Por que esta prioridade**: Notificacoes fornecem feedback critico ao usuario, mas nao bloqueiam o fluxo principal. Podem ser construidas independentemente da base do sistema de design.

**Teste independente**: Disparar uma notificacao a partir de qualquer acao do usuario e verificar se o toast aparece com o estilo correto, posicionamento e auto-dispensa.

**Cenarios de aceitacao**:

1. **Dado** que um usuario realiza uma acao com sucesso, **Quando** o sistema responde, **Entao** um toast verde aparece no canto inferior direito
2. **Dado** que uma acao do usuario falha, **Quando** o sistema retorna um erro, **Entao** um toast vermelho aparece com a mensagem de erro
3. **Dado** que o usuario recebe uma notificacao informativa, **Quando** o toast aparece, **Entao** ele utiliza estilo azul
4. **Dado** que qualquer notificacao e exibida, **Quando** 3 segundos se passam, **Entao** a notificacao e automaticamente dispensada

---

### Historia 6 - Carregamento Confiavel de Dados com Feedback Adequado (P3)

Como usuario do Weir, quero que a interface carregue os dados dos servidores MCP de forma confiavel, com tratamento consistente de erros e feedback visual durante o carregamento, para entender o que esta acontecendo em cada momento.

**Por que esta prioridade**: A comunicacao HTTP confiavel e fundamental para todas as funcionalidades dependentes de dados, mas o impacto visivel para o usuario e menor que indicadores visuais e notificacoes.

**Teste independente**: Carregar qualquer view que dependa de dados e verificar se respostas bem-sucedidas renderizam conteudo, enquanto requisicoes falhas mostram feedback de erro apropriado.

**Cenarios de aceitacao**:

1. **Dado** que um usuario navega para qualquer view de dados, **Quando** a requisicao de dados e bem-sucedida, **Entao** o conteudo e exibido em menos de 2 segundos
2. **Dado** que um usuario navega para qualquer view de dados, **Quando** a requisicao de dados falha, **Entao** uma notificacao de erro apropriada e exibida via sistema de toasts
3. **Dado** que um usuario navega para qualquer view de dados, **Quando** a requisicao esta em andamento, **Entao** a interface exibe um spinner de carregamento (LoaderCircle com animacao) com a cor de acento do tema

---

### Casos Extremos

- O que acontece quando o arquivo .mcp.json esta mal formatado (JSON invalido)?
- Como o sistema se comporta quando o arquivo .mcp.json tem uma estrutura inesperada ou campos ausentes?
- O que acontece quando o arquivo .mcp.json e deletado enquanto o Weir esta rodando?
- Como a interface se comporta em janelas muito estreitas (< 400px)?
- O que acontece se o .mcp.json define um tipo de transporte desconhecido (diferente de http e stdio)?
- Como o sistema lida com arquivos .mcp.json muito grandes (dezenas de MCPs)?
- O que acontece quando um badge precisa exibir um status que nao corresponde a nenhuma variante definida?
- Como o sistema de notificacoes lida com toasts rapidos e sucessivos (ex: 10 erros em 2 segundos)?
- O que acontece quando o cliente HTTP recebe uma resposta em formato nao padrao?
- Como o indicador de conexao se comporta quando o status do servidor e desconhecido ou indeterminado?

## Esclarecimentos

### Sessao 2026-06-19

- Q: Quais funcionalidades estao explicitamente FORA do escopo desta versao? → A: Apenas leitura. Sem edicao, sem iniciar/parar MCPs, sem gerenciamento de configuracoes.

### Sessao 2026-06-24

- Q: Qual a metrica para "tempo aceitavel" no carregamento de dados (US6)? → A: <2 segundos para exibir a listagem apos a requisicao.
- Q: Qual o componente de feedback visual de carregamento? → A: LoaderCircle do lucide-react com animate-spin e cor de acento do tema.
- Q: Como tratar erros de carregamento de dados? → A: Erro fatal usa componente ErrorState com icone de aviso e titulo vermelho; erro leve usa toast do tipo error com cor vermelha e exibicao inline no card.

## Fora de Escopo (v1)

As seguintes funcionalidades NAO serao implementadas nesta versao:
- Edicao, adicao ou remocao de MCPs pela interface web
- Iniciar, parar ou reiniciar servidores MCP
- Gerenciamento de configuracoes (alterar parametros, tipos de transporte)
- Autenticacao ou multiusuario
- Notificacoes push ou alertas de conectividade

## Requisitos

### Requisitos Funcionais

- **RF-001**: O sistema DEVE ler e validar um arquivo .mcp.json no formato padrao MCP.
- **RF-002**: O sistema DEVE exibir uma interface web com cartoes organizados em 3 colunas por linha.
- **RF-003**: Cada cartao DEVE exibir o titulo do MCP conforme definido no .mcp.json.
- **RF-004**: Cada cartao DEVE exibir o tipo de transporte do MCP (stdio, http ou sse).
- **RF-010**: O sistema DEVE reconhecer e exibir tipos de transporte desconhecidos como "Desconhecido".
- **RF-005**: O sistema DEVE suportar execucao via Docker com o .mcp.json montado como volume.
- **RF-006**: O sistema DEVE monitorar alteracoes no arquivo .mcp.json e atualizar a interface web automaticamente.
- **RF-007**: O sistema DEVE exibir uma mensagem clara quando nenhum arquivo .mcp.json for encontrado.
- **RF-008**: O sistema DEVE exibir uma mensagem de erro clara quando o .mcp.json estiver mal formatado.
- **RF-009**: O modo web e o modo Docker DEVEM compartilhar a mesma logica central de leitura e parse do .mcp.json.
- **RF-011**: O sistema DEVE exibir uma mensagem de estado vazio quando o .mcp.json for JSON valido mas nao contiver a chave `mcpServers` ou ela estiver vazia.
- **RF-012**: O sistema DEVE tratar a delecao do arquivo .mcp.json durante a execucao exibindo a mensagem de "arquivo nao encontrado" na interface, similar ao estado inicial sem arquivo.
- **RF-013**: O sistema DEVE exibir mensagens de erro descritivas no terminal quando nao for possivel iniciar o servidor web (ex: porta ocupada, permissao de leitura negada), permitindo ao usuario diagnosticar e corrigir o problema.
- **RF-014**: O sistema DEVE renderizar badges de status usando um sistema de variantes de cores consistente com pelo menos 6 estados semanticos: default (neutro/cinza), secondary, destructive (vermelho), success (verde), warning (amarelo) e outline (borda)
- **RF-015**: O sistema DEVE exibir um indicador de conexao em tempo real para cada servidor MCP, usando verde para online e vermelho para offline
- **RF-016**: O sistema DEVE exibir notificacoes toast com 3 tipos visuais distintos: success (verde), error (vermelho) e info (azul)
- **RF-017**: As notificacoes toast DEVEM aparecer ancoradas no canto inferior direito da viewport
- **RF-018**: As notificacoes toast DEVEM ser dispensadas automaticamente apos 3 segundos
- **RF-019**: O sistema DEVE utilizar um unico cliente HTTP padrao para todas as requisicoes de dados, com tratamento automatico de erros e parse consistente de respostas
- **RF-020**: O sistema DEVE fornecer feedback visual de carregamento enquanto requisicoes de dados estao em andamento
- **RF-021**: Todos os componentes visuais DEVEM aderir a uma paleta de cores tematica unificada definida a nivel de aplicacao, composta pelos seguintes tokens: cor de fundo (bg), cor de painel (panel), cor de borda (border), cor de texto (text), cor de texto secundario (muted), cor de acento (accent) e cor de acento escuro (accent-dark)

### Entidades Envolvidas

- **Servidor MCP**: Representa um servidor MCP configurado no .mcp.json. Atributos: nome/titulo, tipo de transporte (http/stdio), comando/url para conexao.
- **Arquivo .mcp.json**: Fonte da verdade contendo a configuracao de todos os servidores MCP. Segue o formato padrao adotado por ferramentas como Cline.
- **Notificacao Toast**: Mensagem efemera de feedback ao usuario com tipo (success/error/info), texto e temporizador de auto-dispensa
- **Badge de Status**: Rotulo visual que indica um estado semantico, renderizado com cores especificas da variante
- **Indicador de Conexao**: Sinal visual binario (online/offline) associado a cada entidade de servidor
- **Resposta HTTP**: Payload de dados recebido do backend, com tratamento padronizado de sucesso/erro

## Criterios de Sucesso

### Resultados Mensuraveis

- **CS-001**: Usuarios conseguem ver todos os seus MCPs configurados na primeira tela em menos de 2 segundos apos iniciar o Weir.
- **CS-002**: Alteracoes no .mcp.json refletem na interface em ate 5 segundos sem acao do usuario.
- **CS-003**: O container Docker inicia e fica acessivel em menos de 5 segundos com um .mcp.json valido montado.
- **CS-004**: Usuarios conseguem identificar o tipo de transporte de cada MCP sem clicar em nada adicional (apenas olhando o cartao).
- **CS-005**: A interface se adapta a diferentes tamanhos de tela, mantendo legibilidade e funcionalidade em janelas a partir de 320px de largura.
- **CS-006**: Todas as 6 variantes de badge sao visualmente distinguiveis entre si apenas pela cor
- **CS-007**: Notificacoes toast sao dispensadas automaticamente em ate 3 segundos sem intervencao do usuario
- **CS-008**: Notificacoes toast aparecem na posicao correta (canto inferior direito) em todos os tamanhos de viewport suportados
- **CS-009**: Requisicoes HTTP que falham exibem uma notificacao de erro para o usuario em ate 2 segundos apos a falha
- **CS-010**: Indicadores de conexao sao atualizados corretamente com base nas mudancas de estado do servidor sem necessidade de recarregar a pagina

## Suposicoes

- O formato do .mcp.json segue o padrao estabelecido por ferramentas como Cline, com a estrutura `{ "mcpServers": { "<nome>": { ... } } }`.
- O usuario executa o Weir em ambiente controlado (local ou Docker) — autenticacao nao e necessaria para v1.
- O tipo "http" refere-se a transporte SSE (Server-Sent Events) sobre HTTP, padrao do protocolo MCP.
- Alem de http e stdio, outros tipos de transporte (como websocket) serao tratados como "desconhecido" e exibidos como tal, sem impedir a listagem.
- A interface web roda na mesma maquina/container que o Weir (acesso local).
- O Weir sera acessivel via navegador na porta padrao 3000 (http://localhost:3000), documentada no quickstart do projeto.
- O modelo de dados dos servidores MCP ja fornece informacao de status de conexao (online/offline) para consumo pelo indicador visual
- O formato atual das respostas da API e bem definido e compativel com a nova abordagem de cliente HTTP
- As cores do tema definidas no sistema de design sao suficientes para cobrir todas as necessidades das variantes de badge
- O suporte do navegador a features CSS modernas (custom properties) esta disponivel para a base de usuarios alvo
