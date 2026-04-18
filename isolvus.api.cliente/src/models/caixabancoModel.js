import { executeQuery } from "../config/database.js";

export async function getCaixaBanco() {

    const ssql = `
        SELECT A.CODBANCO,
                A.NOME,
                A.CODFILIAL
            FROM PCBANCO A
            ORDER BY A.CODBANCO
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta usuario: '+error
    }

}