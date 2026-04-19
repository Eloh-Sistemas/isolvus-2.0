# Plano de Ação — Migração Oracle → PostgreSQL + pgvector
> Projeto: iSolvus 2.0 | Data: 19/04/2026

---

## Visão Geral

| Item | Origem | Destino |
|---|---|---|
| Banco transacional | Oracle 12c | PostgreSQL 16 |
| Driver Node.js | `oracledb` | `pg` |
| Vetores (IA) | Não implementado | `pgvector` (extensão PG) |
| Hospedagem sugerida | Servidor atual | Self-hosted ou Supabase |

---

## Fase 1 — Preparação do Ambiente

### 1.1 Instalar PostgreSQL 16 + pgvector

1. Baixar instalador em: https://www.postgresql.org/download/windows/
2. Instalar com Stack Builder incluso
3. Via Stack Builder: instalar a extensão **pgvector**
4. Criar banco de dados:

```sql
CREATE DATABASE isolvus;
\c isolvus
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### 1.2 Instalar dependência Node.js

```bash
cd isolvus.api.site
npm install pg
npm uninstall oracledb
```

---

## Fase 2 — Exportar Estrutura do Oracle (DDL)

### 2.1 Ferramenta recomendada: ora2pg (via WSL ou Docker)

```bash
# Via Docker
docker run --rm -v $(pwd):/data georgmoser/ora2pg -t TABLE   -o tables.sql   -b ./output -c ora2pg.conf
docker run --rm -v $(pwd):/data georgmoser/ora2pg -t SEQUENCE -o sequences.sql -b ./output -c ora2pg.conf
docker run --rm -v $(pwd):/data georgmoser/ora2pg -t INDEX    -o indexes.sql   -b ./output -c ora2pg.conf
docker run --rm -v $(pwd):/data georgmoser/ora2pg -t TRIGGER  -o triggers.sql  -b ./output -c ora2pg.conf
docker run --rm -v $(pwd):/data georgmoser/ora2pg -t COPY     -o data.sql      -b ./output -c ora2pg.conf
```

### 2.2 Alternativa gráfica (sem linha de comando)

Usar **DBeaver Community** com a ferramenta de migração:
`Database → Migration → Oracle → PostgreSQL`

---

## Fase 3 — Conversão de Sintaxe SQL

Ajustes obrigatórios em todos os `models/*.js`:

| Oracle | PostgreSQL |
|---|---|
| `WHERE ROWNUM <= :limit` | `LIMIT $1` |
| `SYSTIMESTAMP` | `NOW()` |
| `SYSDATE` | `CURRENT_DATE` |
| `SELECT ... FROM DUAL` | `SELECT ...` (sem FROM DUAL) |
| `BSSEQ_X.NEXTVAL` | `NEXTVAL('bsseq_x')` |
| `NVL(x, y)` | `COALESCE(x, y)` |
| `VARCHAR2(n)` | `VARCHAR(n)` |
| `NUMBER(10)` | `INTEGER` ou `BIGINT` |
| `NUMBER(10,2)` | `NUMERIC(10,2)` |
| `CLOB` | `TEXT` |
| `BLOB` | `BYTEA` |
| Bind `:paramName` | Bind `$1, $2, $3...` |
| `outFormat: 4002` | Removido — pg retorna objetos diretamente |

### Exemplo de conversão:

**Oracle:**
```sql
SELECT * FROM (
  SELECT ID, NOME FROM BSTAB_USUARIO
  ORDER BY ID DESC
) WHERE ROWNUM <= :limit
```

**PostgreSQL:**
```sql
SELECT ID, NOME FROM bstab_usuario
ORDER BY ID DESC
LIMIT $1
```

---

## Fase 4 — Reescrever camada de banco (`database.js`)

Substituir `isolvus.api.site/src/config/database.js`:

```js
import pg from 'pg';
import { dbConfig } from './dbConfig.js';

const pool = new pg.Pool({
  host: dbConfig.host,
  port: dbConfig.port || 5432,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  max: 20,
  idleTimeoutMillis: 30000,
});

export async function getConnection() {
  const client = await pool.connect();
  return {
    execute: async (sql, params = []) => client.query(sql, params),
    commit: async () => client.query('COMMIT'),
    rollback: async () => client.query('ROLLBACK'),
    close: async () => client.release(),
  };
}

export async function executeQuery(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}
```

> **Atenção:** O padrão de binds muda de objeto nomeado `{ userId: 1 }` com `:userId`
> para array posicional `[1]` com `$1`. Todos os models precisam ser atualizados.

---

## Fase 5 — Adicionar suporte a pgvector (RAG para IA)

### 5.1 Criar tabela de embeddings no PostgreSQL

```sql
CREATE TABLE ia_table_embeddings (
  id                BIGSERIAL PRIMARY KEY,
  id_agente_tabela  BIGINT NOT NULL,
  id_grupo_empresa  BIGINT NOT NULL,
  embedding         VECTOR(1536),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_agente_tabela)
);

CREATE INDEX ON ia_table_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### 5.2 Criar serviço de embedding

Novo arquivo: `isolvus.api.site/src/services/embeddingService.js`

```js
import { openai } from '../IA/openaiClient.js';
import pgPool from '../config/pgDatabase.js';

export async function upsertTableEmbedding(tableRecord, groupId) {
  const text = [
    tableRecord.nome_negocio,
    tableRecord.descricao,
    tableRecord.colunas_def,
    tableRecord.observacoes,
  ].filter(Boolean).join(' ');

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = response.data[0].embedding;

  await pgPool.query(
    `INSERT INTO ia_table_embeddings (id_agente_tabela, id_grupo_empresa, embedding)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_agente_tabela)
     DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
    [tableRecord.id_agente_tabela, groupId, JSON.stringify(embedding)]
  );
}

export async function findRelevantTableIds(pergunta, groupId, limit = 12) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: pergunta,
  });

  const queryEmbedding = response.data[0].embedding;

  const result = await pgPool.query(
    `SELECT id_agente_tabela
     FROM ia_table_embeddings
     WHERE id_grupo_empresa = $1
     ORDER BY embedding <=> $2
     LIMIT $3`,
    [groupId, JSON.stringify(queryEmbedding), limit]
  );

  return result.rows.map(r => r.id_agente_tabela);
}
```

### 5.3 Integrar no fluxo de geração de SQL

Em `deepseekService.js`, substituir `loadSqlAgentPromptBundle` por:

```js
// 1. Busca IDs relevantes via pgvector
const relevantIds = await findRelevantTableIds(pergunta, metadata.id_grupo_empresa);

// 2. Busca apenas essas tabelas no Oracle/PG
const tables = await getTablesByIds(relevantIds);
```

---

## Fase 6 — Migrar models por módulo

Ordem recomendada (do menor impacto para o maior):

| Prioridade | Módulo | Models |
|---|---|---|
| 1 | IA | `iaConversationModel.js`, `iaAgentSqlModel.js`, `iaModel.js`, `iaKnowledgeModel.js` |
| 2 | Usuário/Auth | `usuarioModel.js`, `permissoesModel.js` |
| 3 | Financeiro | `caixaBancoModel.js`, `solicitacaoDeDespesaModel.js`, `valeModal.js`, `orcamentoMensalModel.js` |
| 4 | Cadastros | `clienteModel.js`, `fornecedorModel.js`, `filialModel.js`, `setorModel.js`, `veiculoModal.js` |
| 5 | Operacional | Demais models |

---

## Fase 7 — Testes e Validação

- [ ] Testar todas as rotas com dados reais no PostgreSQL
- [ ] Validar integridade referencial (FKs)
- [ ] Testar fluxo completo da Eloh IA com pgvector
- [ ] Verificar performance das queries mais pesadas
- [ ] Testar transações com rollback
- [ ] Validar LOBs migrados (TEXT no PG)

---

## Fase 8 — Cutover (Go-live)

1. Manter Oracle ativo em modo leitura durante a transição
2. Exportar snapshot final dos dados Oracle
3. Importar no PostgreSQL
4. Alterar variáveis de ambiente apontando para PG
5. Reiniciar aplicação
6. Monitorar logs por 48h
7. Desativar Oracle após confirmação de estabilidade

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Procedures/triggers complexas | Alto | Reescrever em PL/pgSQL ou mover lógica para Node.js |
| Case sensitivity (Oracle maiúsculo, PG minúsculo) | Médio | Padronizar nomes em minúsculo ou usar aspas |
| Caracteres especiais em dados | Médio | Validar encoding UTF-8 na exportação |
| Performance de queries complexas | Médio | Criar índices equivalentes, analisar EXPLAIN |
| `executeQueryFull` sem conversão de keys | Baixo | Revisar os poucos usos no código |

---

## Referências

- ora2pg: https://ora2pg.darold.net/
- pgvector: https://github.com/pgvector/pgvector
- PostgreSQL docs: https://www.postgresql.org/docs/16/
- Supabase (PG hospedado): https://supabase.com
- DBeaver migration: https://dbeaver.io/
