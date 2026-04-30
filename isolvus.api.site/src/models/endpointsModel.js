import { executeQuery } from "../config/database.js";

export async function GetListar(jsonReq) {
    try {
        const ssql = `
        
            SELECT id_servidor, 
                   id_integracao, 
                   integracao, 
                   datahora_proxima_atualizacao, 
                   intervalominutos, 
                   realizarintegracao,
                   metodo
            FROM bstab_integracao 
            WHERE upper(integracao) LIKE upper(:filtro)
        `;

        // Se houver um filtro, usa ele. Caso contrário, retorna tudo.
        const filtro = jsonReq.filtro ? `%${jsonReq.filtro}%` : '%';

        const result = await executeQuery(ssql, { filtro });

        return result;
    } catch (error) {
        console.error('Erro ao executar consulta:', error);
        throw error;
    }
}

export async function AtualizarIntegracao({ id_servidor, id_integracao, intervalominutos, realizarintegracao }) {
    const ssql = `
        UPDATE BSTAB_INTEGRACAO
           SET INTERVALOMINUTOS    = :intervalominutos,
               REALIZARINTEGRACAO  = :realizarintegracao
         WHERE ID_SERVIDOR   = :id_servidor
           AND ID_INTEGRACAO = :id_integracao
    `;
    try {
        await executeQuery(ssql, { id_servidor, id_integracao, intervalominutos, realizarintegracao }, true);
    } catch (error) {
        console.error('Erro ao atualizar integração:', error);
        throw error;
    }
}
