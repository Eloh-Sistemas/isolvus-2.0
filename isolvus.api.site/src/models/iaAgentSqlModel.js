import { executeQuery, getConnection } from '../config/database.js';

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTableName(value = '') {
  return String(value || '').trim().toUpperCase();
}

function toTitleFromSnake(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseQualifiedTableName(value = '') {
  const raw = String(value || '').trim().toUpperCase();

  if (!raw) {
    return { owner: null, tableName: '' };
  }

  if (!raw.includes('.')) {
    return { owner: null, tableName: raw };
  }

  const [owner, tableName] = raw.split('.', 2);
  return {
    owner: owner || null,
    tableName: tableName || '',
  };
}

function sanitizeOracleIdentifier(value = '', label = 'identificador') {
  const normalized = String(value || '').trim().toUpperCase();

  if (!normalized || !/^[A-Z][A-Z0-9_$#]*$/.test(normalized)) {
    throw new Error(`Nome inválido de ${label} para atualização de comentário no banco.`);
  }

  return normalized;
}

function parseColumnsDefinition(columnsText = '') {
  return String(columnsText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [definitionPart, ...commentParts] = line.split(' - ');
      const tokens = definitionPart.trim().split(/\s+/);

      return {
        name: String(tokens.shift() || '').trim().toUpperCase(),
        comment: commentParts.join(' - ').trim(),
      };
    });
}

async function syncDatabaseTableAndColumnComments(connection, tableName = '', tableDescription = '', columnsText = '') {
  const parsedTable = parseQualifiedTableName(tableName);
  const owner = parsedTable.owner ? sanitizeOracleIdentifier(parsedTable.owner, 'owner') : null;
  const normalizedTableName = sanitizeOracleIdentifier(parsedTable.tableName, 'tabela');
  const qualifiedTableName = owner ? `${owner}.${normalizedTableName}` : normalizedTableName;
  const sanitizedTableComment = String(tableDescription || '').trim().replace(/'/g, "''");
  const columns = parseColumnsDefinition(columnsText).filter((column) => column.name);

  await connection.execute(`COMMENT ON TABLE ${qualifiedTableName} IS '${sanitizedTableComment}'`);

  for (const column of columns) {
    const normalizedColumnName = sanitizeOracleIdentifier(column.name, 'coluna');
    const commentText = String(column.comment || '').replace(/'/g, "''");

    await connection.execute(`COMMENT ON COLUMN ${qualifiedTableName}.${normalizedColumnName} IS '${commentText}'`);
  }
}

export async function getSqlAgentConfig({ userId = 0, groupId = 0, type = 'SQL', searchTerm = '', table = '', onlyActive = false, limit = 200 } = {}) {
  const normalizedUserId = normalizeNumber(userId);
  const normalizedGroupId = normalizeNumber(groupId);
  const normalizedType = String(type || 'SQL').trim().toUpperCase();
  const normalizedLimit = Math.min(Math.max(normalizeNumber(limit, 200), 1), 200);

  const agentRows = await executeQuery(
    `
      SELECT
        ID_AGENTE,
        TIPO_AGENTE,
        NOME_AGENTE,
        REGRAS_GERAIS,
        STATUS,
        ID_USUARIO,
        ID_GRUPO_EMPRESA,
        DT_CADASTRO,
        DT_ATUALIZACAO
      FROM BSTAB_IA_AGENTE
      WHERE TIPO_AGENTE = :type
        AND ID_GRUPO_EMPRESA = :groupId
      ORDER BY DT_ATUALIZACAO DESC
    `,
    {
      type: normalizedType,
      groupId: normalizedGroupId,
    }
  );

  const agent = agentRows?.[0] || null;

  if (!agent) {
    return {
      agent: null,
      tables: [],
    };
  }

  const where = ['ID_AGENTE = :agentId'];
  const binds = {
    agentId: agent.id_agente,
    limit: normalizedLimit,
  };

  if (onlyActive) {
    where.push("STATUS = 'A'");
  }

  const normalizedSearchTerm = String(searchTerm || '').trim().toUpperCase();
  if (normalizedSearchTerm) {
    where.push('(UPPER(NOME_TABELA) LIKE :searchTerm OR UPPER(NOME_NEGOCIO) LIKE :searchTerm OR UPPER(COLUNAS_DEF) LIKE :searchTerm)');
    binds.searchTerm = `%${normalizedSearchTerm}%`;
  }

  const normalizedTable = String(table || '').trim().toUpperCase();
  if (normalizedTable) {
    where.push('UPPER(NOME_TABELA) LIKE :tableFilter');
    binds.tableFilter = `%${normalizedTable}%`;
  }

  const tables = await executeQuery(
    `
      SELECT *
      FROM (
        SELECT
          ID_AGENTE_TABELA,
          ID_AGENTE,
          NOME_TABELA,
          NOME_NEGOCIO,
          DESCRICAO,
          COLUNAS_DEF,
          RELACIONAMENTOS,
          OBSERVACOES,
          STATUS,
          DT_CADASTRO,
          DT_ATUALIZACAO
        FROM BSTAB_IA_AGENTE_TABELA
        WHERE ${where.join(' AND ')}
        ORDER BY NOME_TABELA ASC
      )
      WHERE ROWNUM <= :limit
    `,
    binds
  );

  return {
    agent,
    tables,
  };
}

export async function saveSqlAgentConfig(payload = {}) {
  const normalizedUserId = normalizeNumber(payload.userId);
  const normalizedGroupId = normalizeNumber(payload.groupId);
  const normalizedType = String(payload.type || 'SQL').trim().toUpperCase();
  const normalizedName = String(payload.name || '').trim();
  const normalizedRules = String(payload.rules || '').trim();
  const tables = Array.isArray(payload.tables) ? payload.tables : [];
  const status = payload.active === false ? 'I' : 'A';
  const pendingCommentSync = [];

  let connection;

  try {
    connection = await getConnection();

    let agentId = normalizeNumber(payload.agentId, 0);

    if (!agentId) {
      const existingAgent = await connection.execute(
        `
          SELECT ID_AGENTE
          FROM BSTAB_IA_AGENTE
          WHERE TIPO_AGENTE = :type
            AND ID_GRUPO_EMPRESA = :groupId
        `,
        {
          type: normalizedType,
          groupId: normalizedGroupId,
        },
        { outFormat: 4002 }
      );

      agentId = existingAgent.rows?.[0]?.ID_AGENTE || 0;
    }

    if (agentId > 0) {
      await connection.execute(
        `
          UPDATE BSTAB_IA_AGENTE
          SET NOME_AGENTE = :name,
              REGRAS_GERAIS = :rules,
              STATUS = :status,
              ID_USUARIO = :userId,
              DT_ATUALIZACAO = SYSTIMESTAMP
          WHERE ID_AGENTE = :agentId
            AND ID_GRUPO_EMPRESA = :groupId
        `,
        {
          agentId,
          name: normalizedName,
          rules: normalizedRules,
          status,
          userId: normalizedUserId,
          groupId: normalizedGroupId,
        },
        { autoCommit: false }
      );
    } else {
      const seqAgent = await connection.execute(
        'SELECT BSSEQ_IA_AGENTE.NEXTVAL AS ID_AGENTE FROM DUAL',
        {},
        { outFormat: 4002 }
      );

      agentId = seqAgent.rows?.[0]?.ID_AGENTE;

      await connection.execute(
        `
          INSERT INTO BSTAB_IA_AGENTE (
            ID_AGENTE,
            TIPO_AGENTE,
            NOME_AGENTE,
            REGRAS_GERAIS,
            STATUS,
            ID_USUARIO,
            ID_GRUPO_EMPRESA,
            DT_CADASTRO,
            DT_ATUALIZACAO
          ) VALUES (
            :agentId,
            :type,
            :name,
            :rules,
            :status,
            :userId,
            :groupId,
            SYSTIMESTAMP,
            SYSTIMESTAMP
          )
        `,
        {
          agentId,
          type: normalizedType,
          name: normalizedName,
          rules: normalizedRules,
          status,
          userId: normalizedUserId,
          groupId: normalizedGroupId,
        },
        { autoCommit: false }
      );
    }

    for (const item of tables) {
      const tableId = normalizeNumber(item.id, 0);
      const tableName = normalizeTableName(item.name);

      if (!tableName) {
        continue;
      }

      const tableStatus = item.active === false ? 'I' : 'A';
      const tableBusinessName = String(item.businessName || '').trim();
      const tableDescription = String(item.description || '').trim();
      const tableColumns = String(item.columns || '').trim();
      const tableRelationships = String(item.relationships || '').trim();
      const tableNotes = String(item.notes || '').trim();

      let resolvedTableId = tableId;

      if (!resolvedTableId) {
        const existingTable = await connection.execute(
          `
            SELECT ID_AGENTE_TABELA
            FROM BSTAB_IA_AGENTE_TABELA
            WHERE ID_AGENTE = :agentId
              AND NOME_TABELA = :tableName
          `,
          {
            agentId,
            tableName,
          },
          { outFormat: 4002 }
        );

        resolvedTableId = existingTable.rows?.[0]?.ID_AGENTE_TABELA || 0;
      }

      if (resolvedTableId > 0) {
        await connection.execute(
          `
            UPDATE BSTAB_IA_AGENTE_TABELA
            SET NOME_NEGOCIO = :businessName,
                DESCRICAO = :description,
                COLUNAS_DEF = :columnsDef,
                RELACIONAMENTOS = :relationships,
                OBSERVACOES = :notes,
                STATUS = :status,
                DT_ATUALIZACAO = SYSTIMESTAMP
            WHERE ID_AGENTE_TABELA = :tableId
              AND ID_AGENTE = :agentId
          `,
          {
            tableId: resolvedTableId,
            agentId,
            businessName: tableBusinessName,
            description: tableDescription,
            columnsDef: tableColumns,
            relationships: tableRelationships,
            notes: tableNotes,
            status: tableStatus,
          },
          { autoCommit: false }
        );
      } else {
        const seqTable = await connection.execute(
          'SELECT BSSEQ_IA_AGENTE_TABELA.NEXTVAL AS ID_AGENTE_TABELA FROM DUAL',
          {},
          { outFormat: 4002 }
        );

        const newTableId = seqTable.rows?.[0]?.ID_AGENTE_TABELA;

        await connection.execute(
          `
            INSERT INTO BSTAB_IA_AGENTE_TABELA (
              ID_AGENTE_TABELA,
              ID_AGENTE,
              NOME_TABELA,
              NOME_NEGOCIO,
              DESCRICAO,
              COLUNAS_DEF,
              RELACIONAMENTOS,
              OBSERVACOES,
              STATUS,
              DT_CADASTRO,
              DT_ATUALIZACAO
            ) VALUES (
              :tableId,
              :agentId,
              :tableName,
              :businessName,
              :description,
              :columnsDef,
              :relationships,
              :notes,
              :status,
              SYSTIMESTAMP,
              SYSTIMESTAMP
            )
          `,
          {
            tableId: newTableId,
            agentId,
            tableName,
            businessName: tableBusinessName,
            description: tableDescription,
            columnsDef: tableColumns,
            relationships: tableRelationships,
            notes: tableNotes,
            status: tableStatus,
          },
          { autoCommit: false }
        );
      }

      pendingCommentSync.push({
        tableName,
        tableDescription,
        columnsText: tableColumns,
      });
    }

    await connection.commit();

    for (const item of pendingCommentSync) {
      await syncDatabaseTableAndColumnComments(connection, item.tableName, item.tableDescription, item.columnsText);
    }

    return {
      agentId,
      type: normalizedType,
      operation: payload.agentId ? 'update' : 'upsert',
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    throw new Error(error.message || 'Não foi possível salvar os comentários das colunas no banco.');
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function deactivateSqlAgentTable(id, userId = 0, groupId = 0) {
  const normalizedId = normalizeNumber(id);
  const normalizedUserId = normalizeNumber(userId);
  const normalizedGroupId = normalizeNumber(groupId);

  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        DELETE FROM BSTAB_IA_AGENTE_TABELA t
        WHERE t.ID_AGENTE_TABELA = :id
          AND EXISTS (
            SELECT 1
            FROM BSTAB_IA_AGENTE a
            WHERE a.ID_AGENTE = t.ID_AGENTE
              AND a.ID_GRUPO_EMPRESA = :groupId
          )
      `,
      {
        id: normalizedId,
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

export async function getSqlAgentPromptBundle(userId = 0, groupId = 0, type = 'SQL') {
  const normalizedUserId = normalizeNumber(userId);
  const normalizedGroupId = normalizeNumber(groupId);
  const normalizedType = String(type || 'SQL').trim().toUpperCase();

  const agentRows = await executeQuery(
    `
      SELECT
        ID_AGENTE,
        NOME_AGENTE,
        REGRAS_GERAIS,
        STATUS
      FROM BSTAB_IA_AGENTE
      WHERE TIPO_AGENTE = :type
        AND ID_GRUPO_EMPRESA = :groupId
        AND STATUS = 'A'
      ORDER BY DT_ATUALIZACAO DESC
    `,
    {
      type: normalizedType,
      groupId: normalizedGroupId,
    }
  );

  const agent = agentRows?.[0] || null;

  if (!agent) {
    return {
      agent: null,
      tables: [],
    };
  }

  const tables = await executeQuery(
    `
      SELECT
        ID_AGENTE_TABELA,
        NOME_TABELA,
        NOME_NEGOCIO,
        DESCRICAO,
        COLUNAS_DEF,
        RELACIONAMENTOS,
        OBSERVACOES,
        STATUS
      FROM BSTAB_IA_AGENTE_TABELA
      WHERE ID_AGENTE = :agentId
        AND STATUS = 'A'
      ORDER BY NOME_TABELA ASC
    `,
    {
      agentId: agent.id_agente,
    }
  );

  return {
    agent,
    tables,
  };
}

export async function searchDbTables({ searchTerm = '', limit = 20 } = {}) {
  const normalizedSearchTerm = String(searchTerm || '').trim().toUpperCase();
  const normalizedLimit = Math.min(Math.max(normalizeNumber(limit, 20), 1), 100);
  const likeTerm = normalizedSearchTerm ? `%${normalizedSearchTerm}%` : null;

  const tables = await executeQuery(
    `
      SELECT *
      FROM (
        SELECT DISTINCT
          OWNER,
          TABLE_NAME
        FROM ALL_TABLES
        WHERE (
          :searchTerm IS NULL
          OR UPPER(TABLE_NAME) LIKE :searchTerm
          OR UPPER(OWNER || '.' || TABLE_NAME) LIKE :searchTerm
          OR UPPER(OWNER) LIKE :searchTerm
        )
          AND OWNER NOT IN ('SYS', 'SYSTEM', 'XDB', 'MDSYS', 'CTXSYS', 'DBSNMP', 'SYSMAN')
        ORDER BY OWNER, TABLE_NAME
      )
      WHERE ROWNUM <= :limit
    `,
    {
      searchTerm: likeTerm,
      limit: normalizedLimit,
    }
  );

  return tables.map((item) => ({
    tableName: item.owner ? `${item.owner}.${item.table_name}` : item.table_name,
    businessName: toTitleFromSnake(item.table_name),
  }));
}

export async function getDbTableMetadata({ tableName = '' } = {}) {
  const parsedTable = parseQualifiedTableName(tableName);
  const normalizedTableName = normalizeTableName(parsedTable.tableName);
  const normalizedOwner = parsedTable.owner ? normalizeTableName(parsedTable.owner) : null;

  if (!normalizedTableName) {
    return null;
  }

  const tableRows = await executeQuery(
    `
      SELECT OWNER, TABLE_NAME
      FROM ALL_TABLES
      WHERE TABLE_NAME = :tableName
        AND (:owner IS NULL OR OWNER = :owner)
      ORDER BY CASE WHEN OWNER = USER THEN 0 ELSE 1 END, OWNER
    `,
    {
      tableName: normalizedTableName,
      owner: normalizedOwner,
    }
  );

  if (!tableRows?.length) {
    return null;
  }

  const selectedOwner = tableRows[0]?.owner || null;

  const columns = await executeQuery(
    `
      SELECT
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.DATA_LENGTH,
        c.DATA_PRECISION,
        c.DATA_SCALE,
        c.NULLABLE,
        c.COLUMN_ID,
        cc.COMMENTS
      FROM ALL_TAB_COLUMNS c
      LEFT JOIN ALL_COL_COMMENTS cc
        ON cc.TABLE_NAME = c.TABLE_NAME
       AND cc.OWNER = c.OWNER
       AND cc.COLUMN_NAME = c.COLUMN_NAME
      WHERE c.TABLE_NAME = :tableName
        AND c.OWNER = :owner
      ORDER BY c.COLUMN_ID
    `,
    {
      tableName: normalizedTableName,
      owner: selectedOwner,
    }
  );

  const outboundRelationships = await executeQuery(
    `
      SELECT
        c.CONSTRAINT_NAME,
        cc.COLUMN_NAME,
        rc.OWNER AS REF_OWNER,
        rc.TABLE_NAME AS REF_TABLE,
        rcc.COLUMN_NAME AS REF_COLUMN
      FROM ALL_CONSTRAINTS c
      JOIN ALL_CONS_COLUMNS cc
        ON cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
       AND cc.OWNER = c.OWNER
       AND cc.TABLE_NAME = c.TABLE_NAME
      JOIN ALL_CONSTRAINTS rc
        ON rc.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
       AND rc.OWNER = c.R_OWNER
      JOIN ALL_CONS_COLUMNS rcc
        ON rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
       AND rcc.OWNER = rc.OWNER
       AND rcc.POSITION = cc.POSITION
      WHERE c.TABLE_NAME = :tableName
        AND c.OWNER = :owner
        AND c.CONSTRAINT_TYPE = 'R'
      ORDER BY c.CONSTRAINT_NAME, cc.POSITION
    `,
    {
      tableName: normalizedTableName,
      owner: selectedOwner,
    }
  );

  const inboundRelationships = await executeQuery(
    `
      SELECT
        c.CONSTRAINT_NAME,
        c.OWNER AS SOURCE_OWNER,
        c.TABLE_NAME AS SOURCE_TABLE,
        cc.COLUMN_NAME AS SOURCE_COLUMN,
        rcc.COLUMN_NAME AS TARGET_COLUMN
      FROM ALL_CONSTRAINTS c
      JOIN ALL_CONS_COLUMNS cc
        ON cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
       AND cc.OWNER = c.OWNER
       AND cc.TABLE_NAME = c.TABLE_NAME
      JOIN ALL_CONSTRAINTS rc
        ON rc.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
       AND rc.OWNER = c.R_OWNER
      JOIN ALL_CONS_COLUMNS rcc
        ON rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
       AND rcc.OWNER = rc.OWNER
       AND rcc.POSITION = cc.POSITION
      WHERE c.CONSTRAINT_TYPE = 'R'
        AND rc.TABLE_NAME = :tableName
        AND rc.OWNER = :owner
      ORDER BY c.TABLE_NAME, c.CONSTRAINT_NAME, cc.POSITION
    `,
    {
      tableName: normalizedTableName,
      owner: selectedOwner,
    }
  );

  const tableCommentRows = await executeQuery(
    `
      SELECT COMMENTS
      FROM ALL_TAB_COMMENTS
      WHERE TABLE_NAME = :tableName
        AND OWNER = :owner
    `,
    {
      tableName: normalizedTableName,
      owner: selectedOwner,
    }
  );

  const tableComment = String(tableCommentRows?.[0]?.comments || '').trim();

  const columnsText = columns
    .map((column) => {
      let typeText = column.data_type;

      if (column.data_type === 'NUMBER') {
        const precision = column.data_precision ?? '';
        const scale = column.data_scale ?? '';
        typeText = precision !== '' ? `NUMBER(${precision}${scale !== '' ? `,${scale}` : ''})` : 'NUMBER';
      } else if (/CHAR|RAW/i.test(column.data_type)) {
        typeText = `${column.data_type}(${column.data_length})`;
      }

      const nullableText = column.nullable === 'N' ? 'NOT NULL' : 'NULL';
      const commentText = column.comments ? ` - ${column.comments}` : '';

      return `${column.column_name} ${typeText} ${nullableText}${commentText}`;
    })
    .join('\n');

  const relationshipsTextList = [
    ...outboundRelationships.map((item) => `${selectedOwner}.${normalizedTableName}.${item.column_name} -> ${item.ref_owner}.${item.ref_table}.${item.ref_column}`),
    ...inboundRelationships.map((item) => `${item.source_owner}.${item.source_table}.${item.source_column} -> ${selectedOwner}.${normalizedTableName}.${item.target_column}`),
  ];

  const relationshipsText = relationshipsTextList.join('\n');

  const notesList = [];
  if (tableComment) {
    notesList.push(`Comentário da tabela: ${tableComment}`);
  }

  const commentedColumns = columns
    .filter((column) => String(column.comments || '').trim())
    .map((column) => `${column.column_name}: ${column.comments}`);

  if (commentedColumns.length > 0) {
    notesList.push('Comentários de colunas:');
    notesList.push(...commentedColumns);
  }

  return {
    tableName: selectedOwner ? `${selectedOwner}.${normalizedTableName}` : normalizedTableName,
    businessName: toTitleFromSnake(normalizedTableName),
    description: tableComment || `Tabela ${normalizedTableName}`,
    columnsText,
    relationshipsText,
    notesText: notesList.join('\n'),
    relationshipsCount: relationshipsTextList.length,
    columnsCount: columns.length,
  };
}
