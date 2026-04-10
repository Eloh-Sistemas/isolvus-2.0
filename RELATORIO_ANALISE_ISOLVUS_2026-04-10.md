# Relatório de Análise Técnica — ISOLVUS

**Data:** 10/04/2026  
**Projetos analisados:** `isolvus.site`, `isolvus.api.site`, `isolvus.api.cliente`

---

## Visão geral

Os projetos já possuem uma base funcional com separação por `routes`, `controllers` e `models`, versionamento `/v1` e um início de padronização de tratamento de erros e validação no `isolvus.api.site`.

Os principais pontos de atenção hoje estão em:

- **segurança**
- **configuração de ambiente**
- **duplicação de código**
- **ausência de testes automatizados**
- **arquivos grandes e difíceis de manter**

---

## Pontos de atenção que podem prejudicar a aplicação

| Prioridade | Ponto | Evidência observada | Impacto |
|---|---|---|---|
| 🔴 Alta | Credenciais hardcoded | `isolvus.site/src/servidor/api.jsx`, `isolvus.api.site/src/config/authApiClient.js`, `dbConfig.js` | Risco de vazamento e acesso indevido |
| 🔴 Alta | CORS aberto e payload muito alto | `cors()` aberto e `express.json({ limit: '1gb' })` | Pode aumentar risco de abuso e consumo excessivo de memória |
| 🔴 Alta | Upload em memória sem limite | `uploadArquivosRoutes.js` com `multer.memoryStorage()` sem limites | Pode derrubar a aplicação com arquivos grandes |
| 🔴 Alta | Validação SQL fraca/desativada em ponto crítico | `integracaoFornecedorModel.js` com trecho de validação comentado | Risco de SQL insegura e comportamento imprevisível |
| 🟠 Média/Alta | URL e IP fixos no front-end | `baseURL` definido diretamente em `api.jsx` | Quebra entre ambientes e dificulta deploy |
| 🟠 Média/Alta | Falta de testes automatizados | Não foram encontrados testes estruturados | Alto risco de regressão |
| 🟠 Média | Muitos `console.log` no front e backend | Diversas ocorrências no código | Logs ruidosos e possível exposição de dados |
| 🟠 Média | Arquivos muito grandes | Ex.: `solicitacaoDeDespesaModel.js` e componentes extensos no front | Dificulta manutenção e evolução |
| 🟡 Média | Dependências e stack merecem revisão | `react-scripts` legado com stack moderna no front | Pode gerar incompatibilidades futuras |

---

## Melhorias recomendadas na arquitetura

### 1. Segurança

- Remover credenciais do código-fonte
- Utilizar `.env` e `.env.example`
- Restringir CORS por domínio confiável
- Adicionar proteção com `helmet`, `rate-limit` e limites reais de upload
- Reforçar validações de entrada e SQL

### 2. Organização do projeto

- Reduzir duplicação entre `isolvus.api.site` e `isolvus.api.cliente`
- Criar módulos compartilhados para:
  - configuração
  - banco de dados
  - validações
  - utilitários
  - regras comuns

### 3. Qualidade e manutenção

- Padronizar nomenclatura de arquivos e rotas
- Centralizar melhor o tratamento de erro
- Substituir `console.log` por logger estruturado
- Dividir arquivos grandes em módulos menores

### 4. Front-end

- Configurar URL da API por ambiente
- Proteger rotas privadas
- Refatorar páginas/componentes muito extensos
- Planejar migração futura de CRA para `Vite`

---

## Lista de tarefas priorizada

### Urgente — fazer agora

- [ ] Remover credenciais hardcoded de `api.jsx`, `authApiClient.js` e configs de banco
- [ ] Criar `.env` e `.env.example` nos 3 projetos
- [ ] Rotacionar senhas já expostas no repositório
- [ ] Restringir `cors()` para domínios reais
- [ ] Reduzir o limite de payload de `1gb` para um valor seguro
- [ ] Adicionar limites de upload no `multer`
- [ ] Reativar e reforçar validação SQL no fluxo de integração

### Próxima sprint

- [ ] Criar testes mínimos para login, upload e solicitação de despesa
- [ ] Adicionar `ESLint` e `Prettier`
- [ ] Configurar pipeline de CI para build e testes
- [ ] Substituir `console.log` por logger estruturado (`pino` ou `winston`)
- [ ] Centralizar configuração de portas, URLs e caminhos do Oracle Client

### Refatoração importante

- [ ] Quebrar `solicitacaoDeDespesaModel.js` em módulos menores
- [ ] Quebrar componentes/páginas muito grandes do front-end
- [ ] Criar camada `services` compartilhada entre as APIs
- [ ] Padronizar nomenclatura de arquivos, controllers e rotas
- [ ] Revisar autenticação/autorização das rotas sensíveis

### Médio prazo

- [ ] Avaliar migração do front para `Vite`
- [ ] Melhorar observabilidade com logs, métricas e monitoramento
- [ ] Documentar setup, ambientes e deploy no `README`

---

## Resumo executivo

Se fosse para priorizar apenas 3 ações imediatas, seriam:

1. **Corrigir segurança de credenciais e variáveis de ambiente**
2. **Controlar melhor upload, payload e validação de entrada**
3. **Criar testes e iniciar refatoração dos arquivos gigantes**

---

## Conclusão

Os projetos têm uma base funcional e já demonstram evolução, mas há uma **dívida técnica importante** que pode impactar segurança, estabilidade e velocidade de manutenção.

A recomendação é atacar primeiro os itens de **segurança e configuração**, depois avançar para **testes, padronização e refatoração estrutural**.
