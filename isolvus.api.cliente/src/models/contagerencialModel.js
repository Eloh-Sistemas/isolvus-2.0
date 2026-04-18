import { executeQuery } from "../config/database.js";

export async function getConsultaContaGerencial() {

    const ssql = `
        SELECT 
        A.CONTA, 
        A.CODCONTA, 
        1 AS ID_GRUPO_EMPRESA 
    FROM PCCONTA A 
    WHERE A.TIPO IN ('D', 'T')
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta conta gerencial: '+error
    }

}