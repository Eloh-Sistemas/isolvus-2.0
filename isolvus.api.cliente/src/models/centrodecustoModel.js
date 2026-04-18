import { executeQuery } from "../config/database.js";

export async function getConsultaCentroDeCusto() {

    const ssql = `
        SELECT 
        C.DESCRICAO,         
        C.CODIGOCENTROCUSTO,        
        '1' AS ID_GRUPO_EMPRESA      
    FROM PCCENTROCUSTO C        
    WHERE C.ATIVO = 'S'       
      AND C.RECEBE_LANCTO = 'S'
    `;
    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta conta gerencial: '+error
    }

}