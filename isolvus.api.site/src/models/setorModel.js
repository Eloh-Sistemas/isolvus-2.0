import axios from "axios";
import { authApiClient } from "../config/authApiClient.js";
import { executeQuery, getConnection } from "../config/database.js";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";
import OracleDB from "oracledb";

export async function buscarSetor(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/Setor`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarSetor(respose.data);
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);

            const id_log = await gravarLogIntegracao({
                id_servidor: integracao.id_servidor,
                id_integracao: integracao.id_integracao,
                integracao: integracao.integracao,
                host: integracao.host,
                data_hora_inicio: inicio,
                data_hora_fim: new Date(),
                status: erros.length > 0 ? 'P' : 'S',
                qtd_recebidos: recebidos,
                qtd_inseridos: inseridos,
                qtd_atualizados: atualizados,
                qtd_erros: erros.length
            });

            for (const s of sucessos) {
                await gravarLogDetalhe({ id_log, ...s });
            }
            for (const erro of erros) {
                await gravarLogDetalhe({ id_log, operacao: 'E', ...erro });
            }
        }
    } catch (error) {
        console.log("Erro ao integrar setor id host: " + integracao.host, error);
        await gravarLogIntegracao({
            id_servidor: integracao.id_servidor,
            id_integracao: integracao.id_integracao,
            integracao: integracao.integracao,
            host: integracao.host,
            data_hora_inicio: inicio,
            data_hora_fim: new Date(),
            status: 'E',
            mensagem_erro: (() => {
                const body = error?.response?.data;
                const detail = body
                    ? (typeof body === 'object' ? JSON.stringify(body) : String(body))
                    : null;
                return [error?.message || String(error), detail].filter(Boolean).join(' | ').substring(0, 4000);
            })()
        });
    }
}


  export async function armazenarSetor(dataSetor) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;

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
                atualizados++;
                sucessos.push({ operacao: 'U', id_registro_erp: String(setor.id_setor_erp ?? ''), descricao_registro: setor.descricao ?? '' });
            } else {
                await connection.execute(insert,{
                    descricao: setor.descricao, 
                    id_setor_erp: setor.id_setor_erp, 
                    id_grupo_empresa: setor.id_grupo_empresa
                });
                inseridos++;
                sucessos.push({ operacao: 'I', id_registro_erp: String(setor.id_setor_erp ?? ''), descricao_registro: setor.descricao ?? '' });
            }
        }

        await connection.commit();
    
      } catch (error) {
        await connection.rollback();
        console.log(error);
      } finally {
        await connection.close();
      }

      return { recebidos: dataSetor.length, inseridos, atualizados, erros, sucessos };
  }