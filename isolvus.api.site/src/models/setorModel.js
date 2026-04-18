import axios from "axios";
import { authApiClient } from "../config/authApiClient.js";
import { executeQuery, getConnection } from "../config/database.js";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import OracleDB from "oracledb";

export async function buscarSetor(integracao) {

    try {
                                            
        // consultar na api do cliente
  
        const respose = await axios.get(integracao.host+`/v1/Setor`, authApiClient);      
  
        if (respose.status == 200){                       
            // Atualiza na base do intranet
            await armazenarSetor(respose.data);   
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);                                                                   
        }
  
    } catch (error) {
        console.log("Erro ao integrar setor id host: "+host)        
        console.log(error)        
    }
  
  }


  export async function armazenarSetor(dataSetor) {


    const ssqlValidar = `
           select A.ID_SETOR, 
           A.SETOR, 
           A.ID_SETOR_ERP, 
           A.ID_GRUPO_EMPRESA 
           from bstab_usuario_setor A 
           WHERE ID_SETOR_ERP = : id_setor_erp 
           AND ID_GRUPO_EMPRESA = :id_grupo_empresa
        `;
    
    const update = `
        update bstab_usuario_setor set 
        SETOR = :descricao 
        WHERE ID_SETOR = :id_setor
    `;

    const insert = `
        insert into bstab_usuario_setor 
        (ID_SETOR, SETOR, ID_SETOR_ERP, ID_GRUPO_EMPRESA) 
        values 
        ((SELECT NVL(MAX(ID_SETOR+1),1) PROXIMONUMSETOR FROM bstab_usuario_setor), 
        :descricao, :id_setor_erp, :id_grupo_empresa) 
    `;

    const connection = await getConnection();

    try {            
        
        for (const setor of dataSetor) {
            
            const validar = await connection.execute(ssqlValidar, {
                id_setor_erp: setor.id_setor_erp,
                id_grupo_empresa: setor.id_grupo_empresa
            }, { outFormat: OracleDB.OUT_FORMAT_OBJECT }); 
            
            if (validar.rows.length > 0){       
        
              await connection.execute(update, {
                descricao: setor.descricao,
                id_setor: validar.rows[0].ID_SETOR
              });
        
            }else{
        
              await connection.execute(insert,{
                descricao: setor.descricao, 
                id_setor_erp: setor.id_setor_erp, 
                id_grupo_empresa: setor.id_grupo_empresa
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