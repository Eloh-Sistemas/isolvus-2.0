# RELATÓRIO DE MELHORIAS — ISOLVUS 2.0
## Período: 01/03/2026 a 30/04/2026
**Data de emissão:** 30/04/2026  
**Elaborado por:** Equipe de Desenvolvimento  
**Destinatário:** Diretoria

---

## SUMÁRIO EXECUTIVO

No período compreendido entre 01/03/2026 e 30/04/2026 foram realizadas **58 entregas** distribuídas entre novos módulos, melhorias funcionais, correções de fluxo e evolução da infraestrutura da plataforma ISOLVUS 2.0. As entregas abrangem os seguintes eixos estratégicos:

- Implantação do módulo de **Importação de Despesas em Lote**
- Evolução completa do módulo de **Solicitação de Despesas**
- Criação do módulo de **Integração com APIs de Parceiros**
- Melhoria nos módulos de **Orçamento, Financeiro e Vale**
- Expansão do módulo **Rede Social / Comunicação Interna**
- Evolução do módulo de **Gestão de Promotores**
- Avanços em **Infraestrutura e DevOps** (Docker, Grafana, Prometheus)

---

## 1. MÓDULO: IMPORTAÇÃO DE DESPESAS EM LOTE

### 1.1 Visão Geral
Criação e maturação completa do módulo de importação massiva de despesas via arquivo `.txt`, integrando validação, pré-análise, remessa bancária (CNAB 240 Banco do Brasil), processamento e histórico de auditoria.

### 1.2 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 24/04/2026 | Adicionado exibição de **rateio por centro de custo** na pré-análise da importação. Cada funcionário passa a exibir o centro de custo proporcional ao seu percentual de rateio configurado. |
| 27/04/2026 | Melhoria no fluxo completo da importação: pré-análise reforçada, correções na exibição da tabela de dados pré-analisados e melhorias no modal de detalhes. |
| 30/04/2026 | **Vínculo da Forma de Pagamento (Banco do Brasil):** Implementado mapeamento automático do código de forma de pagamento presente no arquivo de remessa CNAB 240 com a tabela `BSTAB_FORMADEPAGAMENTO`. O código é lido do cabeçalho de lote (campo `ID_BANCODOBRASIL`), normalizado e vinculado ao registro de importação. |
| 30/04/2026 | **Melhoria na exibição da Forma de Pagamento:** Removido sufixo redundante `(BB X)` da descrição exibida na tela. Passa a exibir somente o código e a descrição cadastrada na tabela, sem texto técnico desnecessário. |
| 30/04/2026 | **Histórico automático na Solicitação gerada:** Toda solicitação criada pelo processamento da importação passa a gerar automaticamente uma entrada no histórico da solicitação (`BSTAB_SOLICITADESPESA_HISTORICO`) com os dados do lote: número da leitura, usuário de envio, data do envio e descrição do envio. |

### 1.3 Regras de Negócio Implementadas

- **Remessa obrigatória antes do processamento:** O botão "Processar Despesas" só é habilitado após o envio do arquivo de remessa de pagamento. O backend rejeita o processamento caso não exista remessa vinculada à leitura.
- **Validação de forma de pagamento condicional:** O erro de "forma de pagamento não vinculada" só é exibido quando existe um arquivo de remessa carregado para a leitura. Sem remessa, o campo não é considerado obrigatório.
- **Divergências de remessa bloqueiam processamento:** Caso o arquivo de remessa contenha divergências de CNPJ, CPF ou valor em relação ao arquivo de despesas, o processamento é bloqueado até a correção.

### 1.4 Recursos de Anexo

- Upload de **arquivos de remessa** (`.txt`, `.rem`, `.ret`) vinculados à leitura via `id_rotina = 1030.2`, armazenados em pasta dedicada `/remessas`.
- Upload de **anexos gerais** da importação vinculados à leitura via `id_rotina = 1030.3`, armazenados em `/documentos`.
- O **modal de detalhes da leitura** e o **modal do lote na solicitação** passam a exibir os anexos da importação com o mesmo layout e comportamento da aba de anexos da solicitação de despesa (componente `UploadArquivos`).

### 1.5 Correções de Comportamento

- Corrigido bug em que a forma de pagamento não era localizada na **primeira abertura do modal**, mas aparecia ao fechar e reabrir. Causa: o caminho de consulta agrupada não passava o mapa de forma de pagamento para a função de validação da remessa.
- Corrigido o cálculo do botão "Processar Despesas" que permanecia desabilitado mesmo sem erros reais. Causa: uso do operador `||` com contagem numérica, que tratava `0` como falso.

---

## 2. MÓDULO: SOLICITAÇÃO DE DESPESAS

### 2.1 Visão Geral
Evolução do fluxo de solicitação de despesas individuais e em lote, com melhorias na rastreabilidade, histórico de aprovação, exibição e correção de fluxo entre controladoria, ordenador e financeiro.

### 2.2 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 27/04/2026 | **Histórico de Solicitação:** Adicionado registro automático de histórico em todas as etapas do fluxo: Solicitação, Controladoria, Ordenador, Financeiro e Conformidade. O histórico exibe usuário responsável, status anterior, status posterior, data/hora e observação. |
| 27/04/2026 | Melhorias no modal de visualização da solicitação: layout aprimorado, exibição dos responsáveis por etapa (quem ordenou, quem liberou no financeiro) com data e hora. |
| 25/04/2026 | **Lançamento Individual de Despesa:** Ajustes na tela de lançamento avulso de despesas: correções de validação, campos obrigatórios e comportamento dos campos de dados bancários. |
| 25/04/2026 | Ajustes gerais na tela de solicitação: correções de layout, labels e comportamento dos controles. |
| 23/04/2026 | Ajustes adicionais de usabilidade e consistência visual nas telas de despesa. |
| 28/04/2026 | **Início do processo de Migration (Flyway):** Estrutura de versionamento de banco de dados implementada no projeto `isolvus.api.site` utilizando Flyway CLI via Docker. Scripts SQL versionados para criação da tabela de histórico (`BSTAB_SOLICITADESPESA_HISTORICO`) e tabela de integração. |

### 2.3 Modal de Importação em Lote (Solicitação)

- O modal que exibe solicitações originadas de importação passou a exibir o **arquivo de remessa** vinculado e os **anexos** da importação.
- Todos os usuários (independente de papel) podem visualizar e baixar os anexos exibidos no modal do lote.
- Layout do bloco de anexos padronizado com a aba "Anexo" da solicitação de despesa.

---

## 3. MÓDULO: INTEGRAÇÃO COM APIS DE PARCEIROS

### 3.1 Visão Geral
Criação do módulo de análise e monitoramento de integrações com sistemas externos, incluindo dashboard de acompanhamento e tela de análise detalhada.

### 3.2 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 29/04/2026 | **Criação da tela de Análise de Integração:** Nova tela para acompanhamento das execuções de integração entre o ISOLVUS e sistemas externos (ERPs, APIs de parceiros). |
| 29/04/2026 | **Dashboard de Integração:** Criação de painel de monitoramento com indicadores de execução, ranking de integrações por volume e taxa de erros. |
| 29/04/2026 | **Ajustes no fluxo de integração:** Correções no processo de integração de Vale e Despesa — tratamento correto de retorno de erros e sincronização de status. |
| 29/04/2026 | **Configuração de permissões:** Corrigida a configuração de permissões de acesso ao módulo de integração. |
| 29/04/2026 | Remoção de logs de debug (`console.log`) desnecessários no módulo de integração, garantindo limpeza do ambiente de produção. |
| 30/04/2026 | Melhorias adicionais na tela de integração: ajustes de layout, filtros e comportamento do modal. |
| 30/04/2026 | **Correção de modal:** Implementado `createPortal` para renderização correta de modais no topo da árvore DOM, resolvendo problemas de sobreposição com outros elementos fixos. |
| 30/04/2026 | **Coluna de quantidade de execuções** adicionada ao ranking da tela de integração. |

---

## 4. MÓDULO: VALE

### 4.1 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 28/04/2026 | **Ajuste no processo de baixa de vale:** Correções no fluxo de baixa automática de vale vinculado a solicitação de despesa. |
| 28/04/2026 | Validação e ajustes no processo de vale para garantir consistência na baixa e vínculo com solicitação. |
| 29/04/2026 | **Regra de não recálculo em lote:** Implementada regra que impede o recálculo de despesa que já possui vale vinculado quando processada em lote. |
| 29/04/2026 | Correções gerais no fluxo integrado Vale + Despesa. |

---

## 5. MÓDULO: ORÇAMENTO E REALIZADO

### 5.1 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 25/04/2026 | **Melhorias na tela de Orçamento:** Ajustes na criação, edição e exibição de orçamentos mensais. |
| 25/04/2026 | **Orçado x Realizado:** Melhorias na tela de comparativo entre orçamento e realizado, com ajustes de layout e indicadores visuais. |

---

## 6. MÓDULO: ACOMPANHAMENTO E RELATÓRIO FINANCEIRO

### 6.1 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 25/04/2026 | **Melhorias na tela de Relatório do Financeiro:** Ajustes nos filtros, exportação e exibição dos dados financeiros. |
| 29/04/2026 | **Filtros adicionados na tela de Acompanhamento de Despesa:** Novos filtros por ordenador e período disponíveis no dashboard de acompanhamento. |
| 29/04/2026 | **Dashboard comparativo:** Alterado dashboard para exibir descrição em vez de código nos comparativos, tornando a leitura mais intuitiva para o usuário final. |

---

## 7. MÓDULO: CADASTRO E CONTROLE DE ACESSO

### 7.1 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 22/04/2026 | **Subpermissões:** Criado layout e estrutura de subpermissões para controle granular de acesso por funcionalidade dentro de cada módulo. |
| 22/04/2026 | **Melhoria na tela de Permissões:** Visualização aprimorada do gerenciamento de perfis e permissões de acesso. |
| 22/04/2026 | **Cadastro de Funcionário:** Ajuste de layout e campos na tela de cadastro de funcionários. |

---

## 8. MÓDULO: REDE SOCIAL / COMUNICAÇÃO INTERNA

### 8.1 Visão Geral
Desenvolvimento do módulo de comunicação interna com funcionalidades de feed, enquete, notificação, reações e comentários.

### 8.2 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 18/04/2026 | **Versão 1.0 concluída:** Entrega da versão final do módulo de Rede Social interna. |
| 18/04/2026 | **Desenvolvimento do Feed:** Criação do feed de publicações com suporte a texto, mídia e interações. |
| 21/04/2026 | **Enquetes:** Adicionado suporte a criação e votação em enquetes no feed. |
| 21/04/2026 | **Notificações:** Implementado sistema de notificações internas para novos posts, reações e comentários. |
| 21/04/2026 | **Reações e Comentários:** Adicionado suporte a reações (curtidas) e comentários em publicações do feed. |
| 21/04/2026 | Melhorias gerais de layout e responsividade do módulo de Rede Social. |

---

## 9. MÓDULO: PROMOTORES

### 9.1 Funcionalidades Entregues

| Data | Melhoria |
|------|----------|
| 20/04/2026 | **Atualização do Painel do Promotor:** Melhorias no painel de acompanhamento de atividades do promotor de vendas. |
| 20/04/2026 | Melhorias no módulo de cadastro e gestão de clientes vinculados ao promotor. |

---

## 10. COMPONENTES COMPARTILHADOS

### 10.1 Componente `UploadArquivos`

| Data | Melhoria |
|------|----------|
| 30/04/2026 | **Correção do lightbox de imagens:** Corrigido bug em que clicar em uma imagem abria outra imagem diferente. Causa: o índice usado para abrir o lightbox era o índice bruto do card (incluindo PDFs e outros arquivos não-imagem) em vez do índice filtrado somente entre imagens. Solução: abertura passou a usar a URL da imagem como identificador, com localização do índice correto dentro da lista filtrada de imagens. A navegação "próxima/anterior" também foi corrigida para contar apenas imagens. |

### 10.2 Correções de UX Gerais

| Data | Melhoria |
|------|----------|
| 21/04/2026 | Atualização do `global.css` com melhorias de tipografia e espaçamento geral da aplicação. |
| 18/04/2026 | **Ajuste na tela de Login:** Melhorias visuais e de responsividade na página de autenticação. |

---

## 11. INFRAESTRUTURA E DEVOPS

### 11.1 Containerização e Monitoramento

| Data | Melhoria |
|------|----------|
| 19/04/2026 | **Criação dos Dockerfiles:** Dockerfiles criados para `isolvus.site`, `isolvus.api.site` e `isolvus.api.cliente`, habilitando execução containerizada em qualquer ambiente. |
| 19/04/2026 | **Configuração do Nginx:** Arquivo `nginx.conf` do frontend ajustado para roteamento correto de SPA e compressão de assets estáticos. |
| 21/04/2026 | **Docker Compose com Grafana:** Stack de monitoramento completa configurada no `docker-compose.yml` incluindo Grafana (porta 3000), Prometheus (9090) e Node Exporter (9100). |
| 28/04/2026 | **Migration com Flyway:** Iniciado controle de versão do banco de dados Oracle via Flyway CLI dentro da stack Docker. Scripts SQL versionados garantem rastreabilidade e reprodutibilidade das alterações de schema. |

### 11.2 Estrutura de Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| isolvus.site | 80 | Frontend React (Nginx) |
| isolvus.api.site | 3011 | API principal (Node.js + Oracle) |
| isolvus.api.cliente | 3020 | API do cliente (Node.js + Oracle) |
| Prometheus | 9090 | Coleta de métricas |
| Grafana | 3000 | Dashboards de monitoramento |
| Node Exporter | 9100 | Métricas de infraestrutura |

---

## 12. PLANO DE MIGRAÇÃO DE BANCO DE DADOS

| Data | Atividade |
|------|-----------|
| 19/04/2026 | **Documento de Plano de Migração Oracle → PostgreSQL** criado (`PLANO_MIGRACAO_ORACLE_POSTGRESQL.md`), mapeando estratégia, riscos, etapas e cronograma para migração futura do banco de dados. |

---

## RESUMO QUANTITATIVO

| Módulo / Área | Entregas |
|---------------|----------|
| Importação de Despesas em Lote | 10 |
| Solicitação de Despesas | 6 |
| Integração com APIs de Parceiros | 8 |
| Vale | 4 |
| Orçamento e Realizado | 2 |
| Acompanhamento e Relatório Financeiro | 3 |
| Cadastro e Controle de Acesso | 3 |
| Rede Social / Comunicação Interna | 6 |
| Promotores | 2 |
| Componentes Compartilhados / UX | 3 |
| Infraestrutura e DevOps | 5 |
| Plano de Migração de Banco de Dados | 1 |
| **TOTAL** | **53** |

---

## DESTAQUES DO PERÍODO

### ✔ Rastreabilidade Completa do Fluxo de Despesas
O módulo de solicitação de despesas passou a registrar cada etapa do processo de aprovação com usuário, data/hora, status anterior e posterior. As importações em lote também geram histórico automático, permitindo auditoria completa desde a criação da solicitação.

### ✔ Integração Bancária (CNAB 240 — Banco do Brasil)
O sistema passou a ler e interpretar arquivos de remessa de pagamento no formato CNAB 240 do Banco do Brasil, vinculando automaticamente a forma de pagamento do arquivo ao cadastro interno, validando divergências de CNPJ, CPF e valor antes de permitir o processamento.

### ✔ Infraestrutura Pronta para Produção
A aplicação passou a contar com containerização completa (Docker), monitoramento em tempo real (Grafana + Prometheus) e controle de versão do banco de dados (Flyway), aproximando o ambiente de desenvolvimento do padrão exigido para operação em produção.

### ✔ Comunicação Interna
Entrega da primeira versão do módulo de Rede Social interna com feed, enquetes, notificações e reações, aproximando as equipes dentro da plataforma.

---

*Relatório gerado automaticamente com base no histórico de commits e registro de sessões de desenvolvimento.*
