import { executeQuery } from "../config/database.js";

export async function getConsultaSetor() {

    const ssql = `
        SELECT 
        S.DESCRICAO, 
        S.CODSETOR AS ID_SETOR_ERP, 
        '1' AS ID_GRUPO_EMPRESA  
    FROM PCSETOR S  
    ORDER BY S.CODSETOR
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta Setor: '+error
    }

}