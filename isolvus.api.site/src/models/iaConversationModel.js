import { getConnection, executeQuery } from '../config/database.js';

function normalizeNumericValue(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export async function findConversationRecord(conversationId, userId = 0, groupId = 0) {
  const normalizedUserId = normalizeNumericValue(userId);
  const normalizedGroupId = normalizeNumericValue(groupId);

  const rows = await executeQuery(
    `
      SELECT
        ID_CONVERSA,
        CONVERSATION_ID,
        ID_USUARIO,
        ID_GRUPO_EMPRESA,
        RESUMO_CONTEXTO,
        ID_ULTIMA_MSG_RESUMO,
        DT_CADASTRO,
        DT_ULTIMA_INTERACAO,
        STATUS
      FROM BSTAB_IA_CONVERSA
      WHERE CONVERSATION_ID = :conversationId
        AND ID_USUARIO = :userId
        AND ID_GRUPO_EMPRESA = :groupId
        AND STATUS = 'A'
    `,
    {
      conversationId,
      userId: normalizedUserId,
      groupId: normalizedGroupId,
    }
  );

  return rows[0] ?? null;
}

export async function createConversationRecord(conversationId, userId = 0, groupId = 0) {
  const normalizedUserId = normalizeNumericValue(userId);
  const normalizedGroupId = normalizeNumericValue(groupId);
  let connection;

  try {
    connection = await getConnection();
    const sequenceResult = await connection.execute(
      'SELECT BSSEQ_IA_CONVERSA.NEXTVAL AS ID_CONVERSA FROM DUAL',
      {},
      { outFormat: 4002 }
    );

    const conversationDbId = sequenceResult.rows[0].ID_CONVERSA;

    await connection.execute(
      `
        INSERT INTO BSTAB_IA_CONVERSA (
          ID_CONVERSA,
          CONVERSATION_ID,
          ID_USUARIO,
          ID_GRUPO_EMPRESA,
          RESUMO_CONTEXTO,
          ID_ULTIMA_MSG_RESUMO,
          STATUS,
          DT_CADASTRO,
          DT_ULTIMA_INTERACAO
        ) VALUES (
          :conversationDbId,
          :conversationId,
          :userId,
          :groupId,
          :summary,
          0,
          'A',
          SYSTIMESTAMP,
          SYSTIMESTAMP
        )
      `,
      {
        conversationDbId,
        conversationId,
        userId: normalizedUserId,
        groupId: normalizedGroupId,
        summary: '',
      },
      { autoCommit: true }
    );

    return {
      id_conversa: conversationDbId,
      conversation_id: conversationId,
      id_usuario: normalizedUserId,
      id_grupo_empresa: normalizedGroupId,
      resumo_contexto: '',
      id_ultima_msg_resumo: 0,
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function insertConversationMessages(conversationDbId, messages = []) {
  if (!messages.length) {
    return;
  }

  let connection;

  try {
    connection = await getConnection();

    for (const message of messages) {
      const sequenceResult = await connection.execute(
        'SELECT BSSEQ_IA_CONVERSA_MSG.NEXTVAL AS ID_MENSAGEM FROM DUAL',
        {},
        { outFormat: 4002 }
      );

      const messageDbId = sequenceResult.rows[0].ID_MENSAGEM;

      await connection.execute(
        `
          INSERT INTO BSTAB_IA_CONVERSA_MSG (
            ID_MENSAGEM,
            ID_CONVERSA,
            PAPEL,
            TIPO_MENSAGEM,
            CONTEUDO_JSON,
            RESUMO_CONTEXTO,
            DT_CADASTRO
          ) VALUES (
            :messageDbId,
            :conversationDbId,
            :role,
            :type,
            :content,
            :summary,
            SYSTIMESTAMP
          )
        `,
        {
          messageDbId,
          conversationDbId,
          role: message.role,
          type: message.type,
          content: JSON.stringify(message.payload),
          summary: message.summary,
        }
      );
    }

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function listConversationHistoryRecords(conversationDbId, limit = 100) {
  return executeQuery(
    `
      SELECT *
      FROM (
        SELECT
          ID_MENSAGEM,
          PAPEL,
          TIPO_MENSAGEM,
          CONTEUDO_JSON,
          RESUMO_CONTEXTO,
          DT_CADASTRO
        FROM BSTAB_IA_CONVERSA_MSG
        WHERE ID_CONVERSA = :conversationDbId
        ORDER BY ID_MENSAGEM DESC
      )
      WHERE ROWNUM <= :limit
    `,
    {
      conversationDbId,
      limit: normalizeNumericValue(limit) || 100,
    }
  );
}

export async function listPendingConversationMessagesForSummary(conversationDbId, lastSummarizedMessageId = 0) {
  return executeQuery(
    `
      SELECT
        ID_MENSAGEM,
        PAPEL,
        TIPO_MENSAGEM,
        CONTEUDO_JSON,
        RESUMO_CONTEXTO,
        DT_CADASTRO
      FROM BSTAB_IA_CONVERSA_MSG
      WHERE ID_CONVERSA = :conversationDbId
        AND ID_MENSAGEM > :lastSummarizedMessageId
      ORDER BY ID_MENSAGEM ASC
    `,
    {
      conversationDbId,
      lastSummarizedMessageId: normalizeNumericValue(lastSummarizedMessageId),
    }
  );
}

export async function listRecentConversationMessages(conversationDbId, lastSummarizedMessageId = 0, limit = 6) {
  return executeQuery(
    `
      SELECT *
      FROM (
        SELECT
          ID_MENSAGEM,
          PAPEL,
          TIPO_MENSAGEM,
          CONTEUDO_JSON,
          RESUMO_CONTEXTO,
          DT_CADASTRO
        FROM BSTAB_IA_CONVERSA_MSG
        WHERE ID_CONVERSA = :conversationDbId
          AND ID_MENSAGEM > :lastSummarizedMessageId
        ORDER BY ID_MENSAGEM DESC
      )
      WHERE ROWNUM <= :limit
    `,
    {
      conversationDbId,
      lastSummarizedMessageId: normalizeNumericValue(lastSummarizedMessageId),
      limit: normalizeNumericValue(limit) || 6,
    }
  );
}

export async function updateConversationSummaryRecord(conversationDbId, summary, lastSummarizedMessageId = 0) {
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      `
        UPDATE BSTAB_IA_CONVERSA
        SET RESUMO_CONTEXTO = :summary,
            ID_ULTIMA_MSG_RESUMO = :lastSummarizedMessageId,
            DT_ULTIMA_INTERACAO = SYSTIMESTAMP
        WHERE ID_CONVERSA = :conversationDbId
      `,
      {
        summary,
        lastSummarizedMessageId: normalizeNumericValue(lastSummarizedMessageId),
        conversationDbId,
      },
      { autoCommit: true }
    );
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function touchConversationRecord(conversationDbId) {
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      `
        UPDATE BSTAB_IA_CONVERSA
        SET DT_ULTIMA_INTERACAO = SYSTIMESTAMP
        WHERE ID_CONVERSA = :conversationDbId
      `,
      { conversationDbId },
      { autoCommit: true }
    );
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function countConversationMessages(conversationDbId) {
  const rows = await executeQuery(
    `
      SELECT COUNT(1) AS TOTAL
      FROM BSTAB_IA_CONVERSA_MSG
      WHERE ID_CONVERSA = :conversationDbId
    `,
    { conversationDbId }
  );

  return rows[0]?.total ?? 0;
}

export async function deleteConversationRecord(conversationDbId) {
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      'DELETE FROM BSTAB_IA_CONVERSA_MSG WHERE ID_CONVERSA = :conversationDbId',
      { conversationDbId }
    );

    await connection.execute(
      'DELETE FROM BSTAB_IA_CONVERSA WHERE ID_CONVERSA = :conversationDbId',
      { conversationDbId }
    );

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function listConversationsByOwner(userId = 0, groupId = 0, limit = 30) {
  const normalizedUserId = normalizeNumericValue(userId);
  const normalizedGroupId = normalizeNumericValue(groupId);
  const normalizedLimit = normalizeNumericValue(limit) || 30;

  return executeQuery(
    `
      SELECT *
      FROM (
        SELECT
          C.ID_CONVERSA,
          C.CONVERSATION_ID,
          C.DT_CADASTRO,
          C.DT_ULTIMA_INTERACAO,
          C.RESUMO_CONTEXTO AS ULTIMO_RESUMO,
          (
            SELECT COUNT(1)
            FROM BSTAB_IA_CONVERSA_MSG M
            WHERE M.ID_CONVERSA = C.ID_CONVERSA
          ) AS TOTAL_MENSAGENS
        FROM BSTAB_IA_CONVERSA C
        WHERE C.ID_USUARIO = :userId
          AND C.ID_GRUPO_EMPRESA = :groupId
          AND C.STATUS = 'A'
        ORDER BY C.DT_ULTIMA_INTERACAO DESC
      )
      WHERE ROWNUM <= :limit
    `,
    {
      userId: normalizedUserId,
      groupId: normalizedGroupId,
      limit: normalizedLimit,
    }
  );
}

export async function purgeInactiveConversations(retentionDays = 90) {
  const normalizedRetentionDays = normalizeNumericValue(retentionDays) || 90;
  let connection;

  try {
    connection = await getConnection();

    const staleRows = await connection.execute(
      `
        SELECT ID_CONVERSA
        FROM BSTAB_IA_CONVERSA
        WHERE STATUS = 'A'
          AND DT_ULTIMA_INTERACAO < (SYSTIMESTAMP - NUMTODSINTERVAL(:retentionDays, 'DAY'))
      `,
      { retentionDays: normalizedRetentionDays },
      { outFormat: 4002 }
    );

    const staleConversationIds = (staleRows.rows || []).map((row) => row.ID_CONVERSA);

    if (!staleConversationIds.length) {
      return 0;
    }

    for (const conversationDbId of staleConversationIds) {
      await connection.execute(
        'DELETE FROM BSTAB_IA_CONVERSA_MSG WHERE ID_CONVERSA = :conversationDbId',
        { conversationDbId }
      );

      await connection.execute(
        'DELETE FROM BSTAB_IA_CONVERSA WHERE ID_CONVERSA = :conversationDbId',
        { conversationDbId }
      );
    }

    await connection.commit();
    return staleConversationIds.length;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function insertConversationFeedbackRecord(conversationDbId, payload = {}) {
  let connection;

  try {
    connection = await getConnection();

    const sequenceResult = await connection.execute(
      'SELECT BSSEQ_IA_CONV_FEEDBACK.NEXTVAL AS ID_FEEDBACK FROM DUAL',
      {},
      { outFormat: 4002 }
    );

    const feedbackDbId = sequenceResult.rows[0].ID_FEEDBACK;

    await connection.execute(
      `
        INSERT INTO BSTAB_IA_CONVERSA_FEEDBACK (
          ID_FEEDBACK,
          ID_CONVERSA,
          ID_MSG_CLIENTE,
          TIPO_FEEDBACK,
          COMENTARIO,
          DT_CADASTRO
        ) VALUES (
          :feedback_db_id,
          :conversation_db_id,
          :msg_client_id,
          :feedback_type,
          :feedback_comment,
          SYSTIMESTAMP
        )
      `,
      {
        feedback_db_id: feedbackDbId,
        conversation_db_id: conversationDbId,
        msg_client_id: payload.messageId || null,
        feedback_type: payload.feedbackType,
        feedback_comment: payload.comment || null,
      },
      { autoCommit: true }
    );

    return {
      id_feedback: feedbackDbId,
      id_conversa: conversationDbId,
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}