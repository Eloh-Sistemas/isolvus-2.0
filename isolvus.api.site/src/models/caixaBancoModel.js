import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";
import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";

export async function buscarCaixaBanco(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/caixabanco`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarCaixaBanco(respose.data);
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
        console.log("Erro ao integrar caixabanco id host: " + integracao.host, error);
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

export async function armazenarCaixaBanco(dataBanco) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;
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
                    atualizados++;
                    sucessos.push({ operacao: 'U', id_registro_erp: String(caixaBanco.codbanco ?? ''), descricao_registro: caixaBanco.nome ?? '' });
                } else {
                    await connection.execute(insert,{
                        caixabanco: caixaBanco.nome, 
                        id_banco_erp: caixaBanco.codbanco,
                        id_filial_erp: caixaBanco.codfilial                                    
                    });
                    inseridos++;
                    sucessos.push({ operacao: 'I', id_registro_erp: String(caixaBanco.codbanco ?? ''), descricao_registro: caixaBanco.nome ?? '' });
                }

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error);
        } finally {
            await connection.close();
        }

        return { recebidos: dataBanco.length, inseridos, atualizados, erros, sucessos };
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