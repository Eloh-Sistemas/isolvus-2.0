import { executeQuery } from "../config/database.js";


export async function consultarNotificacoesModel(dto){

    const ssqlConsulta = `
    SELECT A.ID_NOTIFICACAO,
        A.ID_REMETENTE,
        SUBSTR(U2.NOME, 1,
              CASE 
                  WHEN INSTR(U2.NOME, ' ', INSTR(U2.NOME, ' ') + 1) > 0
                  THEN INSTR(U2.NOME, ' ', INSTR(U2.NOME, ' ') + 1) - 1
                  ELSE LENGTH(U2.NOME)
              END
       ) AS REMETENTE,
        U2.FOTO AS FOTO_REMETENTE,
        A.TITULO,
        DBMS_LOB.SUBSTR(A.MENSAGEM, 4000, 1) AS MENSAGEM,
        A.DATA_CRIACAO AS DATA,
        A.ID_USUARIO,
        U.NOME,
        A.LIDA,
        0 AS EXPANDIDA,
        CASE WHEN A.DADOS_TABELA IS NOT NULL THEN 1 ELSE 0 END AS TEM_ANEXO,
        DBMS_LOB.SUBSTR(A.DADOS_TABELA, 32000, 1) AS DADOS_TABELA
    FROM BSTAB_NOTIFICACAO A
    JOIN BSTAB_USUSARIOS U ON A.ID_USUARIO = U.ID_USUARIO
    JOIN BSTAB_USUSARIOS U2 ON A.ID_REMETENTE = U2.ID_USUARIO 
    WHERE A.ID_USUARIO = :ID_USUARIO
    ORDER BY A.DATA_CRIACAO DESC
    `;

    try {
        
        const dados = await executeQuery(ssqlConsulta,{
            ID_USUARIO: dto.id_usuario
        });

        return dados;

    } catch (error) {
        throw error;
    }

}



export async function notificacaoLidoModel(dto){


    const ssqlLer = `
    UPDATE BSTAB_NOTIFICACAO F SET F.LIDA = 1 WHERE F.ID_NOTIFICACAO = :id_notificacao
    `;

    try {
        
        await executeQuery(ssqlLer,{
            id_notificacao: dto.id_notificacao
        },true);

        return await consultarNotificacoesModel(dto);

    } catch (error) {
        throw error;
    }

}

export async function notificacaoEnviarModel(dto){

    const ssqlEnviar= `
    insert into bstab_notificacao
        (id_notificacao, titulo, mensagem, id_usuario, lida, id_remetente, dados_tabela)
    values
        ((select nvl(max(a.id_notificacao)+1,1) from bstab_notificacao a), :titulo, :mensagem, :id_usuario, :lida, :id_remetente, :dados_tabela)
    `;

    try {
        
        for (const notf of dto){
            await executeQuery(ssqlEnviar,{
            titulo: notf.titulo, 
            mensagem: notf.mensagem, 
            id_usuario: notf.id_usuario, 
            lida: 0, 
            id_remetente: notf.id_remetente,
            dados_tabela: notf.dados_tabela ?? null
            },true);
        }        

        return {mensagem: 'Notificação enviado com sucesso.'};

    } catch (error) {
        throw error;
    }

}

export async function registrarTokenPushModel(dto) {

        const ssql = `
        MERGE INTO BSTAB_PUSH_TOKEN A
        USING (SELECT :EXPO_TOKEN AS EXPO_TOKEN FROM DUAL) B
             ON (A.EXPO_TOKEN = B.EXPO_TOKEN)
        WHEN MATCHED THEN
            UPDATE SET
                A.ID_USUARIO = :ID_USUARIO,
                A.PLATAFORMA = :PLATAFORMA,
                A.ATIVO = 1,
                A.DATA_ATUALIZACAO = SYSDATE
        WHEN NOT MATCHED THEN
            INSERT (ID_TOKEN, ID_USUARIO, EXPO_TOKEN, PLATAFORMA, ATIVO, DATA_CRIACAO, DATA_ATUALIZACAO)
            VALUES ((SELECT NVL(MAX(T.ID_TOKEN) + 1, 1) FROM BSTAB_PUSH_TOKEN T), :ID_USUARIO, :EXPO_TOKEN, :PLATAFORMA, 1, SYSDATE, SYSDATE)
        `;

        try {

            await executeQuery(ssql, {
                ID_USUARIO: dto.id_usuario,
                EXPO_TOKEN: dto.token,
                PLATAFORMA: dto.plataforma || 'mobile'
            }, true);

            return { mensagem: 'Token de push registrado com sucesso.' };

        } catch (error) {
            throw error;
        }

}

export async function consultarTokensPushAtivosModel(idsUsuarios = []) {
    const idsLimpos = Array.from(new Set((idsUsuarios || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
    if (!idsLimpos.length) return [];

    const binds = {};
    const placeholders = idsLimpos.map((id, idx) => {
        const chave = `ID_${idx}`;
        binds[chave] = id;
        return `:${chave}`;
    }).join(',');

    const ssql = `
    SELECT A.ID_USUARIO,
                 A.EXPO_TOKEN,
                 A.PLATAFORMA
        FROM BSTAB_PUSH_TOKEN A
     WHERE A.ATIVO = 1
         AND A.EXPO_TOKEN IS NOT NULL
         AND A.ID_USUARIO IN (${placeholders})
    `;

    try {
        return await executeQuery(ssql, binds);
    } catch (error) {
        throw error;
    }
}