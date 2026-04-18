import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";

export async function buscarCaixaBanco(integracao) {

    try {                            

        
        // consultar na api do caixa banco  
        const respose = await axios.get(integracao.host+`/v1/caixabanco`, authApiClient);
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarCaixaBanco(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
}

export async function armazenarCaixaBanco(dataBanco) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlValidar = `
            select A.ID_BANCO, A.ID_BANCO_ERP, A.CAIXABANCO, A.ID_FILIAL_ERP from bstab_caixabanco A WHERE A.ID_BANCO_ERP = :id_banco_erp
        `;
    
    const update = `
          update bstab_caixabanco
            set caixabanco = :caixabanco,
                id_filial_erp = :id_filial_erp
        where id_banco_erp = :id_banco_erp
    `;

    const insert = `
        insert into bstab_caixabanco
            (id_banco, id_banco_erp, caixabanco, id_filial_erp)
            values
            ( (SELECT NVL(MAX(id_banco+1),1) PROXNUMCAIXABANCO FROM bstab_caixabanco), :id_banco_erp, :caixabanco, :id_filial_erp)
    `;
    
    const connection = await getConnection();        
                    
        try {
            
            for (const caixaBanco of dataBanco) {

                const validar = await connection.execute(ssqlValidar, {
                    id_banco_erp: caixaBanco.codbanco
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });                                   

                if (validar.rows.length > 0){       
                                
                    await connection.execute(update, {
                        caixabanco: caixaBanco.nome,
                        id_filial_erp: caixaBanco.codfilial,
                        id_banco_erp: caixaBanco.codbanco
                    });
                                        
                }else{
            
                    await connection.execute(insert,{
                        caixabanco: caixaBanco.nome, 
                        id_banco_erp: caixaBanco.codbanco,
                        id_filial_erp:  caixaBanco.codfilial                                    
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

export async function GetConsultarCaixaBanco(filtros) {

    try {

        const ssql = `
        SELECT VW1.*
          FROM (
          SELECT A.ID_BANCO_ERP CODIGO,
            A.ID_BANCO_ERP || '-' || A.CAIXABANCO DESCRICAO,
            A.ID_BANCO_ERP || '-' ||A.CAIXABANCO DESCRICAO2
        FROM BSTAB_CAIXABANCO A
        WHERE 1=1
        AND (  UPPER(A.CAIXABANCO) LIKE UPPER(:filtroLike) 
            OR UPPER(A.ID_BANCO_ERP) LIKE UPPER(:filtroID) ) ) 
        VW1 WHERE ROWNUM < 6  
        `;

        const params = {
            filtroLike: `%${filtros.descricao}%`,
            filtroID: `${filtros.descricao}`
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}