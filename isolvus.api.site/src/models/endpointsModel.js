import { executeQuery } from "../config/database.js";

export async function GetListar(jsonReq) {
    try {
        const ssql = `
        
            SELECT id_servidor, 
                   id_integracao, 
                   integracao, 
                   datahora_proxima_atualizacao, 
                   intervalominutos, 
                   realizarintegracao 
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
