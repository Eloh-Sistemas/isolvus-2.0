import { executeQuery } from "../config/database.js";

export async function getConsultaFornecedor() {

    const ssql = `
        SELECT 
        f.codfornec, 
        f.fornecedor, 
        REPLACE(REPLACE(REPLACE(f.cgc, '.', ''), '-', ''), '/', '') AS cgc, 
        1 AS id_grupo_empresa 
    FROM pcfornec f 
    WHERE f.codfornec NOT IN (999999, 99999) 
      AND f.dtexclusao IS NULL 
      AND f.revenda <> 'S' 
      AND trunc(f.DTCADASTRO) = trunc(sysdate)
      AND trunc(f.DTULTALTER ) = trunc(sysdate)
    ORDER BY f.codfornec
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta fornecedor: '+error
    }

}