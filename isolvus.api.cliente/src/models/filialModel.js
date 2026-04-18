import { executeQuery } from "../config/database.js";

export async function getConsultaFilial() {

    const ssql = `
        SELECT 
        A.RAZAOSOCIAL,         
        A.FANTASIA,            
        A.CGC AS CNPJ_CPF,        
        A.EMAIL,               
        REPLACE(REPLACE(REPLACE(REPLACE(A.TELEFONE, '', ''), '(', ''), ')', ''), '-', '') AS CONTATO, 
        A.CODIGO AS ID_ERP,       
        '1' AS ID_GRUPO_EMPRESA 
        FROM PCFILIAL A        
        WHERE A.CODIGO <> 99
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta filial: '+error
    }

}