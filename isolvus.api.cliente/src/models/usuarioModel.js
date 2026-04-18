import { executeQuery } from "../config/database.js";

export async function getConsultaUsuario() {

    const ssql = `
        SELECT 
        U.NOME,                       
        U.EMAIL,                      
        U.CODFILIAL AS ID_EMPRESA_ERP,   
        U.CODSETOR AS ID_SETOR_ERP,      
        U.MATRICULA AS ID_USUARIO_ERP,   
        1 AS ID_GRUPO_EMPRESA            
    FROM PCEMPR U                 
    WHERE U.SITUACAO = 'A'      
      AND U.CODFILIAL IS NOT NULL
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta usuario: '+error
    }

}


export async function getCredencias(jsonReq) {

    const ssql = `
    SELECT R.MATRICULA, 
       R.NOME_GUERRA, 
       DECRYPT(R.SENHABD, R.USUARIOBD) SENHA
    FROM PCEMPR R
    WHERE R.Matricula = :matricula
    `;

    
    try {
        
        const result = await executeQuery(ssql, {matricula: jsonReq.id_usuario_erp});
        return result[0];

    } catch (error) {
        throw 'consulta credenciais: '+error
    }

}