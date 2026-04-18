import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";

export async function buscarContaGerencial(integracao) {

    try {
                                            
        // consultar na api do cliente
  
        const respose = await axios.get(integracao.host+`/v1/ContaGerencial`, authApiClient);  
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarContaGerencial(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


  export async function armazenarContaGerencial(dataContaGerencial) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlValidar = `
           select a.id_conta, a.descricao, a.id_contaerp, a.id_grupo_empresa  
           from bstab_contagerencial a 
           where 1=1 
           and a.id_contaerp = :id_contaerp 
           and a.id_grupo_empresa = :id_grupo_empresa 
        `;
    
    const update = `
        update bstab_contagerencial set descricao = :descricao where id_conta = :id_conta
    `;

    const insert = `
             insert into bstab_contagerencial 
              (id_conta, descricao, id_contaerp, id_grupo_empresa) 
              values 
              ((SELECT NVL(MAX(ID_CONTA+1),1) PROXIMONUMCONTA FROM BSTAB_CONTAGERENCIAL), :descricao, :id_contaerp, :id_grupo_empresa)                                                   
    `;
    
    const connection = await getConnection();        
            
        try {
            
            for (const contagerencial of dataContaGerencial) {

                const validar = await connection.execute(ssqlValidar, {
                    id_contaerp: contagerencial.codconta,
                    id_grupo_empresa: contagerencial.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });


                if (validar.rows.length > 0){                                         
            
                    await connection.execute(update, {
                        descricao: contagerencial.conta,
                        id_conta: validar.rows[0].ID_CONTA
                    });
                                        
                }else{
            
                    await connection.execute(insert,{
                        descricao: contagerencial.conta, 
                        id_contaerp: contagerencial.codconta,             
                        id_grupo_empresa: contagerencial.id_grupo_empresa
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

export async function GetConsultarContaGerencial(filtros) {

    try {

        const ssql = `
          SELECT VW1.* FROM ( SELECT A.ID_CONTAERP as "codigo", A.DESCRICAO as "descricao", A.ID_CONTAERP "descricao2"   
          FROM BSTAB_CONTAGERENCIAL A   
          WHERE 1=1   
          AND A.id_grupo_empresa IN ( :id_grupo_empresa )   
          AND ( UPPER(A.ID_CONTAERP) LIKE UPPER(:filtroId)  
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