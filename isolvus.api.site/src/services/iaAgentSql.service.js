import { deactivateSqlAgentTable, getDbTableMetadata, getSqlAgentConfig, getSqlAgentPromptBundle, saveSqlAgentConfig, searchDbTables } from '../models/iaAgentSqlModel.js';

export async function listSqlAgentConfiguration(payload = {}) {
  return getSqlAgentConfig({
    userId: payload.id_usuario,
    groupId: payload.id_grupo_empresa,
    type: payload.tipoAgente || 'SQL',
    searchTerm: payload.searchTerm,
    table: payload.tabela,
    onlyActive: payload.onlyActive === true,
    limit: payload.limit,
  });
}

export async function saveSqlAgentConfiguration(payload = {}) {
  const type = String(payload.tipoAgente || 'SQL').trim().toUpperCase();
  const name = String(payload.nomeAgente || '').trim();
  const rules = String(payload.regrasGerais || '').trim();
  const tables = Array.isArray(payload.tabelas) ? payload.tabelas : [];

  if (!name) {
    throw new Error('Informe o nome do agente SQL.');
  }

  if (!rules) {
    throw new Error('Informe as regras gerais do agente SQL.');
  }

  return saveSqlAgentConfig({
    agentId: payload.id_agente,
    userId: payload.id_usuario,
    groupId: payload.id_grupo_empresa,
    type,
    name,
    rules,
    active: payload.ativo !== false,
    tables,
  });
}

export async function removeSqlAgentTable(payload = {}) {
  const id = Number(payload.id || 0);

  if (!id) {
    throw new Error('Registro de tabela inválido para remoção.');
  }

  return deactivateSqlAgentTable(id, payload.id_usuario, payload.id_grupo_empresa);
}

export async function loadSqlAgentPromptBundle(metadata = {}) {
  return getSqlAgentPromptBundle(metadata.id_usuario, metadata.id_grupo_empresa, metadata.tipoAgente || 'SQL');
}

export async function listDatabaseTablesForSqlAgent(payload = {}) {
  return searchDbTables({
    searchTerm: payload.searchTerm,
    limit: payload.limit,
  });
}

export async function getDatabaseTableMetadataForSqlAgent(payload = {}) {
  const tableName = String(payload.tableName || '').trim().toUpperCase();

  if (!tableName) {
    throw new Error('Informe o nome da tabela para consultar no banco.');
  }

  const metadata = await getDbTableMetadata({ tableName });

  if (!metadata) {
    throw new Error('Tabela não encontrada no banco para o usuário conectado.');
  }

  return metadata;
}
