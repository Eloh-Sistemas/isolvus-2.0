import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";


export async function buscarCentroDeCusto(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/CentroDeCusto`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarCentroDeCusto(respose.data);
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
        console.log("Erro ao integrar centrodecusto id host: " + integracao.host, error);
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


  export async function armazenarCentroDeCusto(dataCentroDeCusto) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;
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
                    atualizados++;
                    sucessos.push({ operacao: 'U', id_registro_erp: String(centroDeCusto.codigocentrocusto ?? ''), descricao_registro: centroDeCusto.descricao ?? '' });
                } else {
                    await connection.execute(insert,{
                        descricao: centroDeCusto.descricao, 
                        id_centrodecusto_erp: centroDeCusto.codigocentrocusto,             
                        id_grupo_empresa: centroDeCusto.id_grupo_empresa
                    });
                    inseridos++;
                    sucessos.push({ operacao: 'I', id_registro_erp: String(centroDeCusto.codigocentrocusto ?? ''), descricao_registro: centroDeCusto.descricao ?? '' });
                }

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error);
        } finally {
            await connection.close();
        }

        return { recebidos: dataCentroDeCusto.length, inseridos, atualizados, erros, sucessos };
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