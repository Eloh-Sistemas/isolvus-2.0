import { executeQuery } from "../config/database.js";

export async function getconsultarInstituicaoBancaria(filtros) {

    try {

        const ssql = `
          SELECT A.Id_Banco "codigo",  a.banco "descricao", a.id_banco||' - '||a.banco "descricao2" 
            FROM BSTAB_INSTITUICAOBANCARIA A            
            WHERE A.BANCO LIKE UPPER(:filtroLike)
        `;

        const params = {
            filtroLike: `%${filtros.descricao}%`
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}

