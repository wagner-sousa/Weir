# Especificacao: Hub/Gateway MCP com Visualizacao Web

**Branch**: `001-mcp-gateway-web`

**Criado em**: 2026-06-19

**Status**: Draft

**Entrada**: "Vamos criar um hub/gateway de mcps com visualizacao web. A princípio vamos usar os mesmo padrao de arquivo mcp (.mcp.json) para o caso do modo de utilizacao com docker, o usuario deve colocar apenas o arquivo de configuracao do mcp como volume. A apresentacao sera em cards, um por mcp, 3 por linha. O titulo do card sera o titulo do mcp no arquivo. Deve informar o tipo (http/stdio, tem outros tipos?), A listagem sera atualizada conforme a atualizacao do arquivo. A tela ira apenas listar os mcps."

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

### Casos Extremos

- O que acontece quando o arquivo .mcp.json esta mal formatado (JSON invalido)?
- Como o sistema se comporta quando o arquivo .mcp.json tem uma estrutura inesperada ou campos ausentes?
- O que acontece quando o arquivo .mcp.json e deletado enquanto o Weir esta rodando?
- Como a interface se comporta em janelas muito estreitas (< 400px)?
- O que acontece se o .mcp.json define um tipo de transporte desconhecido (diferente de http e stdio)?
- Como o sistema lida com arquivos .mcp.json muito grandes (dezenas de MCPs)?

## Esclarecimentos

### Sessao 2026-06-19

- Q: Quais funcionalidades estao explicitamente FORA do escopo desta versao? → A: Apenas leitura. Sem edicao, sem iniciar/parar MCPs, sem gerenciamento de configuracoes.

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

### Entidades Envolvidas

- **Servidor MCP**: Representa um servidor MCP configurado no .mcp.json. Atributos: nome/titulo, tipo de transporte (http/stdio), comando/url para conexao.
- **Arquivo .mcp.json**: Fonte da verdade contendo a configuracao de todos os servidores MCP. Segue o formato padrao adotado por ferramentas como Cline.

## Criterios de Sucesso

### Resultados Mensuraveis

- **CS-001**: Usuarios conseguem ver todos os seus MCPs configurados na primeira tela em menos de 2 segundos apos iniciar o Weir.
- **CS-002**: Alteracoes no .mcp.json refletem na interface em ate 5 segundos sem acao do usuario.
- **CS-003**: O container Docker inicia e fica acessivel em menos de 5 segundos com um .mcp.json valido montado.
- **CS-004**: Usuarios conseguem identificar o tipo de transporte de cada MCP sem clicar em nada adicional (apenas olhando o cartao).

## Suposicoes

- O formato do .mcp.json segue o padrao estabelecido por ferramentas como Cline, com a estrutura `{ "mcpServers": { "<nome>": { ... } } }`.
- O usuario executa o Weir em ambiente controlado (local ou Docker) — autenticacao nao e necessaria para v1.
- O tipo "http" refere-se a transporte SSE (Server-Sent Events) sobre HTTP, padrao do protocolo MCP.
- Alem de http e stdio, outros tipos de transporte (como websocket) serao tratados como "desconhecido" e exibidos como tal, sem impedir a listagem.
- A interface web roda na mesma maquina/container que o Weir (acesso local).
