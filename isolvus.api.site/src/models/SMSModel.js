import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";


export async function buscarSMS(integracao) {

    try {
                                            
        // consultar na api do cliente  
        const respose = await axios.get(integracao.host+`/v1/SMS`, authApiClient);  
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarSMS(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


  export async function armazenarSMS(dataSMS) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlInsert = `
             insert into BSTAB_ENVIASMS                                           
            (numero,                                                              
            servico,                                                              
            mensagem,                                                             
            nome_campanha,                                                        
            codificacao )                                                         
            values                                                                  
            ( :numero,                                                              
            :servico,                                                              
            :mensagem,                                                             
            :nome_campanha,                                                        
            :codificacao ) 
        `;        
    
    const connection = await getConnection();        
                    
        try {
            
            for (const sms of dataSMS) {            
                
                await connection.execute(ssqlInsert, {
                    numero: sms.numero,
                    servico: sms.servico,
                    mensagem: sms.mensagem,
                    nome_campanha: sms.nome_campanha,
                    codificacao: sms.codificacao
                });
                
            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error)
        } finally {
            await connection.close();
        }

}