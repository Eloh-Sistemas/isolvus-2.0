# Flyway da api-site

Esta pasta guarda as migrations versionadas do schema usado pela `isolvus.api.site`.

## Pré-requisitos

- O arquivo `.env` de `isolvus.api.site` deve conter `DB_USER`, `DB_PASSWORD` e `DB_CONNECT`.
- `DB_CONNECT` deve estar no formato `host:porta/service_name`.
- O usuário informado deve conseguir criar e alterar objetos no schema alvo.
- O binário `flyway` precisa estar instalado no host (ou configurado via `FLYWAY_CMD`).

## Execução automática no startup da API

- A API executa `flyway migrate` antes de abrir a porta HTTP, tanto em `npm start` quanto em `npm run dev`.
- O bootstrap de inicialização está em `src/bootstrap.js`.
- Se quiser usar um comando Flyway diferente do padrão (`flyway`), defina `FLYWAY_CMD` no ambiente.
- Em emergência, para subir mesmo com falha de migration, defina `ALLOW_START_WITHOUT_MIGRATIONS=true`.

## Comandos

Executar migrations pendentes:

```bash
npm run migrate
```

Ver status das migrations:

```bash
npm run migrate -- info
```

Validar integridade do histórico:

```bash
npm run migrate -- validate
```

## Estratégia adotada

- `V1__create_bstab_integracao.sql` cria a tabela e os índices.
- `V2__seed_bstab_integracao_servidor_1.sql` faz a carga inicial com `MERGE`, evitando duplicidade por `(ID_SERVIDOR, ID_INTEGRACAO)`.
- Em bases já existentes, use o `baselineOnMigrate` configurado no `flyway.conf` para iniciar o controle pelo Flyway sem reexecutar histórico legado.