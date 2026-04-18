import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";

export async function buscarFornecedor(integracao) {

    try {
                                            
        // consultar na api do cliente
  
        const respose = await axios.get(integracao.host+`/v1/fornecedor`, authApiClient);  
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarFornecedor(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


export async function armazenarFornecedor(dataFornecedor) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlValidar = `
           select id_fornec, fornecedor, id_fornec_erp, id_grupo_empresa, cnpj_cpf 
            from bstab_fornecedor a 
            where 1=1 
            and a.id_fornec_erp = :id_fornec_erp 
            and a.id_grupo_empresa = :id_grupo_empresa
        `;
    
    const update = `
         update bstab_fornecedor 
         set fornecedor = :fornecedor, 
         id_fornec_erp = :id_fornec_erp, 
         id_grupo_empresa = :id_grupo_empresa, 
         cnpj_cpf = :cnpj_cpf 
          WHERE id_fornec = :id_fornec 
    `;

    const insert = `
            insert into bstab_fornecedor 
             (id_fornec, 
             fornecedor, 
             id_fornec_erp, 
             cnpj_cpf, 
             id_grupo_empresa) 
             values 
             ( (SELECT NVL(MAX(A.ID_FORNEC+1),1) PROXIMONUMSETOR FROM BSTAB_FORNECEDOR A) , 
             :fornecedor, 
             :id_fornec_erp, 
             :cnpj_cpf, 
             :id_grupo_empresa)                                                    
    `;
        
    const connection = await getConnection();        
    
        try {
            
            for (const fornecedor of dataFornecedor) {

                const validar = await connection.execute(ssqlValidar, {
                    id_fornec_erp: fornecedor.codfornec,
                    id_grupo_empresa: fornecedor.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });

                if (validar.rows.length > 0){                                         
            
                    await connection.execute(update, {
                        fornecedor: fornecedor.fornecedor, 
                        id_fornec_erp: fornecedor.codfornec, 
                        id_grupo_empresa: fornecedor.id_grupo_empresa, 
                        cnpj_cpf: fornecedor.cgc,
                        id_fornec: validar.rows[0].ID_FORNEC 
                    });
                                        
                }else{
            
                    await connection.execute(insert,{
                        fornecedor: fornecedor.fornecedor , 
                        id_fornec_erp: fornecedor.codfornec, 
                        cnpj_cpf: fornecedor.cgc, 
                        id_grupo_empresa: fornecedor.id_grupo_empresa
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


export async function GetConsultarFornecedor(filtros) {    

    try {
        const ssql = `
            SELECT vw1.*
            FROM (  
                SELECT 
                    B.ID_FORNEC_ERP AS "codigo", 
                    B.FORNECEDOR   AS "descricao", 
                    B.CNPJ_CPF     AS "descricao2"  
                FROM BSTAB_FORNECEDOR B  
                WHERE 1=1  
                  AND B.ID_GRUPO_EMPRESA = :id_grupo_empresa  
                  AND (  
                        REGEXP_REPLACE(B.CNPJ_CPF, '[^0-9]', '') LIKE :filtroCNPJ  
                     OR UPPER(B.FORNECEDOR) LIKE UPPER(:filtroNome)  
                  )  
                ORDER BY B.ID_FORNEC_ERP  
            ) vw1 
            WHERE ROWNUM < 6
        `;

        const params = {
            id_grupo_empresa: filtros.id_grupo_empresa,
            filtroCNPJ: filtros.descricao 
                ? `%${filtros.descricao}%` // remove tudo que não for número
                : '%',
            filtroNome: filtros.descricao 
                ? `%${filtros.descricao}%` 
                : '%'
        };

        const result = await executeQuery(ssql, params);
        return result;

    } catch (error) {
        throw new Error(error);        
    }
}
