import { executeQuery } from "../config/database.js";


export async function ConsultarHosts() {
    
    try {
        
        const ssql = `
            SELECT I.ID_SERVIDOR,
                   H.HOST,
                   I.ID_INTEGRACAO,
                   I.INTEGRACAO,
                   I.REALIZARINTEGRACAO,
                   I.METODO
               FROM BSTAB_INTEGRACAO I, BSTAB_HOSTCLIENTES H
              WHERE I.ID_SERVIDOR = H.ID_GRUPO_EMPRESAS
                AND I.DATAHORA_PROXIMA_ATUALIZACAO <= SYSDATE
                AND I.REALIZARINTEGRACAO = 'S'
           ORDER BY I.ID_INTEGRACAO
        `;

        const result = await executeQuery(ssql);

        return result;

    } catch (error) {
        console.log(error);
        throw error;
    }

}

export async function atualizaDataProximaAtualizcao(id_grupo_empresa , id_integracao) {

    try {

        const sqlConsulta = `
           SELECT 
           A.DATAHORA_PROXIMA_ATUALIZACAO,               
           A.INTERVALOMINUTOS,                           
           A.REALIZARINTEGRACAO,                         
           B.HOST,                                       
           SYSDATE DATA_ATUAL                            
           FROM BSTAB_INTEGRACAO A, BSTAB_HOSTCLIENTES B 
           WHERE A.ID_SERVIDOR = :id_grupo_empresa            
           AND A.ID_SERVIDOR = B.ID_GRUPO_EMPRESAS       
           AND A.ID_INTEGRACAO = :id_integracao          
        `;

        const result = await executeQuery(sqlConsulta, {
            id_grupo_empresa,
            id_integracao               
        });

        const intervalo = result[0].intervalominutos;

        const sqlUpdate = `
         UPDATE BSTAB_INTEGRACAO S 
         SET S.DATAHORA_PROXIMA_ATUALIZACAO = 
         (SELECT SYSDATE + INTERVAL '${intervalo}' MINUTE PROXIMA_ATUALIZACAO 
         FROM DUAL) 
         WHERE S.ID_SERVIDOR = :id_grupo_empresa 
         AND S.ID_INTEGRACAO = :id_integracao 
        `;
                
        await executeQuery(sqlUpdate,{
            id_grupo_empresa,
            id_integracao  
        },true);                

    } catch (error) {
        console.log(error)
    }

}


export async function consultarIntegracao(id_grupo_empresa, id_integracao) {

    const ssqlConsultarIntegracao = `
            SELECT A.ID_SERVIDOR,
            B.HOST,
            A.INTEGRACAO,
            A.ID_INTEGRACAO,
            A.REALIZARINTEGRACAO
        FROM BSTAB_INTEGRACAO A
        JOIN BSTAB_HOSTCLIENTES B ON A.ID_SERVIDOR = B.ID_GRUPO_EMPRESAS
      WHERE A.ID_INTEGRACAO = :id_integracao
       AND ID_GRUPO_EMPRESAS = :id_grupo_empresa
      `;

    const param = {
       id_integracao: id_integracao,
       id_grupo_empresa:  id_grupo_empresa       
    }

    try {
        
        const retorno = await executeQuery(ssqlConsultarIntegracao, param);        
        return retorno;


    } catch (error) {
        throw error;
    }
    
}