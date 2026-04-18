import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";


export async function buscarCentroDeCusto(integracao) {

    try {
                                            
        // consultar na api do cliente  
        const respose = await axios.get(integracao.host+`/v1/CentroDeCusto`, authApiClient);  
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarCentroDeCusto(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


  export async function armazenarCentroDeCusto(dataCentroDeCusto) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlValidar = `
            SELECT a.id_centrodecusto, a.descricao, a.id_centrodecusto_erp, a.id_grupo_empresa 
            FROM BSTAB_CENTRODECUSTO a 
            where 1=1 
            and a.id_centrodecusto_erp = :id_centrodecusto_erp 
            and a.id_grupo_empresa = :id_grupo_empresa 
        `;
    
    const update = `
        update BSTAB_CENTRODECUSTO set descricao = :descricao where id_centrodecusto = :id_centrodecusto
    `;

    const insert = `
                insert into BSTAB_CENTRODECUSTO 
                (id_centrodecusto, descricao, id_centrodecusto_erp, id_grupo_empresa) 
                values 
                ((SELECT NVL(MAX(id_centrodecusto+1),1) PROXIMONUMCONTA FROM BSTAB_CENTRODECUSTO), :descricao, :id_centrodecusto_erp, :id_grupo_empresa) 
    `;
    
    const connection = await getConnection();        
            
        

        try {
            
            for (const centroDeCusto of dataCentroDeCusto) {

                const validar = await connection.execute(ssqlValidar, {
                    id_centrodecusto_erp: centroDeCusto.codigocentrocusto,
                    id_grupo_empresa: centroDeCusto.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });                  

                if (validar.rows.length > 0){                                         
            
                    await connection.execute(update, {
                        descricao: centroDeCusto.descricao,
                        id_centrodecusto: validar.rows[0].ID_CENTRODECUSTO
                    });
                                        
                }else{
            
                    await connection.execute(insert,{
                        descricao: centroDeCusto.descricao, 
                        id_centrodecusto_erp: centroDeCusto.codigocentrocusto,             
                        id_grupo_empresa: centroDeCusto.id_grupo_empresa
                    })
                
                } 

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error)
        } finally {
            await connection.close();
        }

}

export async function GetConsultarCentroDeCusto(filtros) {

    try {

        const ssql = `
          SELECT VW1.* FROM ( SELECT A.ID_CENTRODECUSTO_ERP as "codigo", A.DESCRICAO as "descricao", A.ID_CENTRODECUSTO_ERP "descricao2"   
          FROM BSTAB_CENTRODECUSTO A   
          WHERE 1=1   
          AND A.id_grupo_empresa IN ( :id_grupo_empresa )   
          AND ( UPPER(A.ID_CENTRODECUSTO_ERP) LIKE UPPER(:filtroId)  
          OR UPPER(A.DESCRICAO) LIKE UPPER(:filtroLike) ) ) VW1 WHERE ROWNUM < 6   
        `;

        const params = {
            filtroLike: `%${filtros.descricao}%`, // Para buscas parciais no nome     
            filtroId: `${filtros.descricao}%`,
            id_grupo_empresa : filtros.id_grupo_empresa
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}