import { executeQuery, getConnection } from '../config/database.js';

function normalizeNumericValue(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizeTableTags(value = '') {
  const normalized = String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(normalized)].join(', ');
}

export async function listKnowledgeRecords(filters = {}) {
  const userId = normalizeNumericValue(filters.id_usuario);
  const groupId = normalizeNumericValue(filters.id_grupo_empresa);
  const limit = normalizeNumericValue(filters.limit, 60);
  const searchTerm = (filters.searchTerm || '').trim().toUpperCase();
  const tableFilter = (filters.tabela || '').trim().toUpperCase();
  const onlyActive = filters.onlyActive !== false;

  const whereConditions = [
    'ID_USUARIO = :userId',
    'ID_GRUPO_EMPRESA = :groupId',
  ];

  const binds = {
    userId,
    groupId,
    limit,
  };

  if (onlyActive) {
    whereConditions.push("STATUS = 'A'");
  }

  if (searchTerm) {
    whereConditions.push('(UPPER(TITULO) LIKE :searchTerm OR UPPER(REGRAS_NEGOCIO) LIKE :searchTerm OR UPPER(TABELAS_ALVO) LIKE :searchTerm)');
    binds.searchTerm = `%${searchTerm}%`;
  }

  if (tableFilter) {
    whereConditions.push('UPPER(TABELAS_ALVO) LIKE :tableFilter');
    binds.tableFilter = `%${tableFilter}%`;
  }

  const sql = `
    SELECT *
    FROM (
      SELECT
        ID_CONHECIMENTO,
        TITULO,
        OBJETIVO_ANALISE,
        REGRAS_NEGOCIO,
        EXEMPLOS_PERGUNTAS,
        EXEMPLOS_RESPOSTA,
        TABELAS_ALVO,
        PRIORIDADE,
        STATUS,
        ID_USUARIO,
        ID_GRUPO_EMPRESA,
        DT_CADASTRO,
        DT_ATUALIZACAO
      FROM BSTAB_IA_CONHECIMENTO
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY PRIORIDADE DESC, DT_ATUALIZACAO DESC
    )
    WHERE ROWNUM <= :limit
  `;

  return executeQuery(sql, binds);
}

export async function saveKnowledgeRecord(payload = {}) {
  const id = normalizeNumericValue(payload.id, 0);
  const userId = normalizeNumericValue(payload.id_usuario);
  const groupId = normalizeNumericValue(payload.id_grupo_empresa);
  const status = payload.ativo === false ? 'I' : 'A';

  let connection;

  try {
    connection = await getConnection();

    if (id > 0) {
      await connection.execute(
        `
          UPDATE BSTAB_IA_CONHECIMENTO
          SET TITULO = :titulo,
              OBJETIVO_ANALISE = :objetivoAnalise,
              REGRAS_NEGOCIO = :regrasNegocio,
              EXEMPLOS_PERGUNTAS = :exemplosPerguntas,
              TABELAS_ALVO = :tabelasAlvo,
              EXEMPLOS_RESPOSTA = :exemplosResposta,
              PRIORIDADE = :prioridade,
              STATUS = :status,
              DT_ATUALIZACAO = SYSTIMESTAMP
          WHERE ID_CONHECIMENTO = :id
            AND ID_USUARIO = :userId
            AND ID_GRUPO_EMPRESA = :groupId
        `,
        {
          id,
          titulo: payload.titulo,
          objetivoAnalise: payload.objetivoAnalise || '',
          regrasNegocio: payload.regrasNegocio,
          tabelasAlvo: normalizeTableTags(payload.tabelasAlvo),
          exemplosPerguntas: payload.exemplosPerguntas || '',
          exemplosResposta: payload.exemplosResposta || '',
          prioridade: normalizeNumericValue(payload.prioridade, 50),
          status,
          userId,
          groupId,
        },
        { autoCommit: true }
      );

      return { id, operation: 'update' };
    }

    const seqResult = await connection.execute(
      'SELECT BSSEQ_IA_CONHECIMENTO.NEXTVAL AS ID_CONHECIMENTO FROM DUAL',
      {},
      { outFormat: 4002 }
    );

    const newId = seqResult.rows[0].ID_CONHECIMENTO;

    await connection.execute(
      `
        INSERT INTO BSTAB_IA_CONHECIMENTO (
          ID_CONHECIMENTO,
          TITULO,
          OBJETIVO_ANALISE,
          REGRAS_NEGOCIO,
          EXEMPLOS_PERGUNTAS,
          EXEMPLOS_RESPOSTA,
          TABELAS_ALVO,
          PRIORIDADE,
          STATUS,
          ID_USUARIO,
          ID_GRUPO_EMPRESA,
          DT_CADASTRO,
          DT_ATUALIZACAO
        ) VALUES (
          :id,
          :titulo,
          :objetivoAnalise,
          :regrasNegocio,
          :exemplosPerguntas,
          :exemplosResposta,
          :tabelasAlvo,
          :prioridade,
          :status,
          :userId,
          :groupId,
          SYSTIMESTAMP,
          SYSTIMESTAMP
        )
      `,
      {
        id: newId,
        titulo: payload.titulo,
        objetivoAnalise: payload.objetivoAnalise || '',
        regrasNegocio: payload.regrasNegocio,
        exemplosPerguntas: payload.exemplosPerguntas || '',
        tabelasAlvo: normalizeTableTags(payload.tabelasAlvo),
        exemplosResposta: payload.exemplosResposta || '',
        prioridade: normalizeNumericValue(payload.prioridade, 50),
        status,
        userId,
        groupId,
      },
      { autoCommit: true }
    );

    return { id: newId, operation: 'insert' };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function deactivateKnowledgeRecord(id, userId = 0, groupId = 0) {
  const normalizedId = normalizeNumericValue(id);
  const normalizedUserId = normalizeNumericValue(userId);
  const normalizedGroupId = normalizeNumericValue(groupId);

  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        UPDATE BSTAB_IA_CONHECIMENTO
        SET STATUS = 'I',
            DT_ATUALIZACAO = SYSTIMESTAMP
        WHERE ID_CONHECIMENTO = :id
          AND ID_USUARIO = :userId
          AND ID_GRUPO_EMPRESA = :groupId
      `,
      {
        id: normalizedId,
        userId: normalizedUserId,
        groupId: normalizedGroupId,
      },
      { autoCommit: true }
    );

    return {
      id: normalizedId,
      deleted: (result.rowsAffected || 0) > 0,
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function listActiveKnowledgeSnippets(userId = 0, groupId = 0, limit = 20) {
  const normalizedUserId = normalizeNumericValue(userId);
  const normalizedGroupId = normalizeNumericValue(groupId);
  const normalizedLimit = normalizeNumericValue(limit, 20);

  const sql = `
    SELECT *
    FROM (
      SELECT
        TITULO,
        OBJETIVO_ANALISE,
        REGRAS_NEGOCIO,
        EXEMPLOS_PERGUNTAS,
        TABELAS_ALVO,
        EXEMPLOS_RESPOSTA,
        PRIORIDADE
      FROM BSTAB_IA_CONHECIMENTO
      WHERE STATUS = 'A'
        AND (ID_USUARIO = :userId OR ID_USUARIO = 0)
        AND (ID_GRUPO_EMPRESA = :groupId OR ID_GRUPO_EMPRESA = 0)
      ORDER BY PRIORIDADE DESC, DT_ATUALIZACAO DESC
    )
    WHERE ROWNUM <= :limit
  `;

  return executeQuery(sql, {
    userId: normalizedUserId,
    groupId: normalizedGroupId,
    limit: normalizedLimit,
  });
}
