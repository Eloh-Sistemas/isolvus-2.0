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