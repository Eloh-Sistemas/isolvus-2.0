import { executeQuery } from "../config/database.js";

export async function getcamposformulario(jsonReq) {
    const ssql = `
    SELECT A.ID_ROTINA,
       A.ID_TELA,
       A.ID_CAMPO,
       B.CAMPO,
       B.TYPE,
       B.PLACEHOLDER,
       A.ATIVO,
       A.OBRIGATORIO
  FROM BSTAB_CAMPOSTELA A JOIN BSTAB_CAMPOSPARAFORMULARIO B
    ON (A.ID_CAMPO = B.ID_CAMPO)
    AND A.ID_TELA = :id_tela
    AND A.ID_ROTINA = :id_rotina
   ORDER BY A.ID_CAMPO
    `

    const param ={
        id_tela: jsonReq.id_tela,
        id_rotina: jsonReq.id_rotina
    }

    try {
        
        const result = await executeQuery(ssql, param);
        return result;
        
    } catch (error) {
    throw error;
    }
}