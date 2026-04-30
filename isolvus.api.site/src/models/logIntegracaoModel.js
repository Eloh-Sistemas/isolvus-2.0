import { executeQuery } from "../config/database.js";

/**
 * Grava o cabeçalho do log de uma execução de integração.
 * Retorna o ID_LOG gerado para uso no detalhe.
 */
export async function gravarLogIntegracao({
    id_servidor,
    id_integracao,
    integracao,
    host,
    data_hora_inicio,
    data_hora_fim,
    status,          // 'S' sucesso | 'E' erro | 'P' parcial (sucesso com erros individuais)
    qtd_recebidos  = 0,
    qtd_inseridos  = 0,
    qtd_atualizados = 0,
    qtd_erros      = 0,
    mensagem_erro  = null
}) {
    const duracao = data_hora_fim && data_hora_inicio
        ? Math.round((new Date(data_hora_fim) - new Date(data_hora_inicio)) / 1000)
        : null;

    const ssql = `
        INSERT INTO BSTAB_LOG_INTEGRACAO (
            ID_LOG, ID_SERVIDOR, ID_INTEGRACAO, INTEGRACAO, HOST,
            DATA_HORA_INICIO, DATA_HORA_FIM, DURACAO_SEGUNDOS,
            STATUS, QTD_RECEBIDOS, QTD_INSERIDOS, QTD_ATUALIZADOS,
            QTD_ERROS, MENSAGEM_ERRO
        ) VALUES (
            :id_log,
            :id_servidor, :id_integracao, :integracao, :host,
            :data_hora_inicio, :data_hora_fim, :duracao_segundos,
            :status, :qtd_recebidos, :qtd_inseridos, :qtd_atualizados,
            :qtd_erros, :mensagem_erro
        )
    `;

    try {
        // Busca o próximo ID antes do INSERT (evita depender de RETURNING INTO)
        const seqResult = await executeQuery(`SELECT SEQ_BSTAB_LOG_INTEGRACAO.NEXTVAL AS ID_LOG FROM DUAL`);
        const id_log = seqResult[0]?.id_log;

        await executeQuery(ssql, {
            id_log,
            id_servidor:     id_servidor    ?? null,
            id_integracao:   id_integracao  ?? null,
            integracao:      integracao     ?? null,
            host:            host           ?? null,
            data_hora_inicio: data_hora_inicio ? new Date(data_hora_inicio) : null,
            data_hora_fim:    data_hora_fim    ? new Date(data_hora_fim)    : null,
            duracao_segundos: duracao,
            status,
            qtd_recebidos,
            qtd_inseridos,
            qtd_atualizados,
            qtd_erros,
            mensagem_erro: mensagem_erro ? String(mensagem_erro).substring(0, 4000) : null,
        }, true);

        return id_log;
    } catch (err) {
        // Log não pode parar a integração — só registra no console
        console.error("[LOG] Erro ao gravar log de integração:", err.message);
        return null;
    }
}

/**
 * Grava um detalhe de erro individual vinculado a um ID_LOG.
 */
export async function gravarLogDetalhe({
    id_log,
    operacao,           // 'I' insert | 'U' update | 'E' erro
    id_registro_erp,
    descricao_registro,
    mensagem_erro
}) {
    if (!id_log) return;

    const ssql = `
        INSERT INTO BSTAB_LOG_INTEGRACAO_DETALHE (
            ID_DETALHE, ID_LOG, OPERACAO,
            ID_REGISTRO_ERP, DESCRICAO_REGISTRO, MENSAGEM_ERRO, DATA_HORA
        ) VALUES (
            SEQ_BSTAB_LOG_INTEG_DETALHE.NEXTVAL,
            :id_log, :operacao,
            :id_registro_erp, :descricao_registro, :mensagem_erro, SYSDATE
        )
    `;

    try {
        await executeQuery(ssql, {
            id_log,
            operacao:           operacao           ?? 'E',
              id_registro_erp:    id_registro_erp    != null ? String(id_registro_erp).substring(0, 100)  : null,
              descricao_registro: descricao_registro != null ? String(descricao_registro).substring(0, 500) : null,
              mensagem_erro:      mensagem_erro      != null ? String(mensagem_erro).substring(0, 4000)   : null
        }, true);
    } catch (err) {
        console.error("[LOG] Erro ao gravar detalhe de integração:", err.message);
    }
}

/**
 * Consulta logs de integração com filtros opcionais.
 */
export async function consultarLogs({ integracao, status, data_inicio, data_fim, id_servidor } = {}) {
    let filtros = "";
    const params = {};

    if (integracao) {
        filtros += " AND UPPER(L.INTEGRACAO) LIKE UPPER(:integracao)";
        params.integracao = `%${integracao}%`;
    }
    if (status) {
        filtros += " AND L.STATUS = :status";
        params.status = status;
    }
    if (id_servidor) {
        filtros += " AND L.ID_SERVIDOR = :id_servidor";
        params.id_servidor = id_servidor;
    }
    if (data_inicio) {
        filtros += " AND L.DATA_HORA_INICIO >= TO_DATE(:data_inicio, 'DD/MM/YYYY')";
        params.data_inicio = data_inicio;
    }
    if (data_fim) {
        filtros += " AND L.DATA_HORA_INICIO < TO_DATE(:data_fim, 'DD/MM/YYYY') + 1";
        params.data_fim = data_fim;
    }

    const ssql = `
        SELECT L.ID_LOG,
               L.ID_SERVIDOR,
               L.ID_INTEGRACAO,
               L.INTEGRACAO,
               L.HOST,
               TO_CHAR(L.DATA_HORA_INICIO, 'DD/MM/YYYY HH24:MI:SS') DATA_HORA_INICIO,
               TO_CHAR(L.DATA_HORA_FIM,    'DD/MM/YYYY HH24:MI:SS') DATA_HORA_FIM,
               L.DURACAO_SEGUNDOS,
               L.STATUS,
               L.QTD_RECEBIDOS,
               L.QTD_INSERIDOS,
               L.QTD_ATUALIZADOS,
               L.QTD_ERROS,
               L.MENSAGEM_ERRO
          FROM BSTAB_LOG_INTEGRACAO L
         WHERE 1=1
               ${filtros}
         ORDER BY L.ID_LOG DESC
         FETCH FIRST 200 ROWS ONLY
    `;

    try {
        return await executeQuery(ssql, params);
    } catch (err) {
        console.error("[LOG] Erro ao consultar logs:", err.message);
        throw err;
    }
}

/**
 * Retorna os detalhes de erros de um log específico.
 */
export async function consultarDetalhesLog(id_log) {
    const ssql = `
        SELECT D.ID_DETALHE,
               D.OPERACAO,
               D.ID_REGISTRO_ERP,
               D.DESCRICAO_REGISTRO,
               D.MENSAGEM_ERRO,
               TO_CHAR(D.DATA_HORA, 'DD/MM/YYYY HH24:MI:SS') DATA_HORA
          FROM BSTAB_LOG_INTEGRACAO_DETALHE D
         WHERE D.ID_LOG = :id_log
         ORDER BY D.ID_DETALHE
    `;
    try {
        return await executeQuery(ssql, { id_log });
    } catch (err) {
        console.error("[LOG] Erro ao consultar detalhes:", err.message);
        throw err;
    }
}

/**
 * Força o reprocessamento de uma integração zerando a próxima atualização.
 */
export async function reprocessarIntegracao(id_servidor, id_integracao) {
    const ssql = `
        UPDATE BSTAB_INTEGRACAO
           SET DATAHORA_PROXIMA_ATUALIZACAO = SYSDATE - 1/1440
         WHERE ID_SERVIDOR    = :id_servidor
           AND ID_INTEGRACAO  = :id_integracao
    `;
    try {
        await executeQuery(ssql, { id_servidor, id_integracao }, true);
    } catch (err) {
        console.error("[LOG] Erro ao reprocessar integração:", err.message);
        throw err;
    }
}

/**
 * Retorna cards de resumo: execuções e erros do dia atual.
 */
export async function consultarResumo() {
    const ssql = `
        SELECT
            COUNT(*) TOTAL_EXECUCOES,
            SUM(CASE WHEN STATUS = 'S' THEN 1 ELSE 0 END) TOTAL_SUCESSO,
            SUM(CASE WHEN STATUS = 'P' THEN 1 ELSE 0 END) TOTAL_PARCIAL,
            SUM(CASE WHEN STATUS = 'E' THEN 1 ELSE 0 END) TOTAL_ERRO,
            SUM(QTD_RECEBIDOS)  TOTAL_RECEBIDOS,
            SUM(QTD_INSERIDOS)  TOTAL_INSERIDOS,
            SUM(QTD_ATUALIZADOS) TOTAL_ATUALIZADOS,
            SUM(QTD_ERROS)      TOTAL_ERROS_REGISTRO
          FROM BSTAB_LOG_INTEGRACAO
         WHERE DATA_HORA_INICIO >= TRUNC(SYSDATE)
    `;
    try {
        const result = await executeQuery(ssql);
        return result[0] ?? {};
    } catch (err) {
        console.error("[LOG] Erro ao consultar resumo:", err.message);
        throw err;
    }
}
