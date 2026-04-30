import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";

export async function buscarFornecedor(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/fornecedor`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarFornecedor(respose.data);
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
        console.log("Erro ao integrar fornecedor id host: " + integracao.host, error);
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


export async function armazenarFornecedor(dataFornecedor) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;

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
                    atualizados++;
                    sucessos.push({ operacao: 'U', id_registro_erp: String(fornecedor.codfornec ?? ''), descricao_registro: fornecedor.fornecedor ?? '' });
                } else {
                    await connection.execute(insert,{
                        fornecedor: fornecedor.fornecedor , 
                        id_fornec_erp: fornecedor.codfornec, 
                        cnpj_cpf: fornecedor.cgc, 
                        id_grupo_empresa: fornecedor.id_grupo_empresa
                    });
                    inseridos++;
                    sucessos.push({ operacao: 'I', id_registro_erp: String(fornecedor.codfornec ?? ''), descricao_registro: fornecedor.fornecedor ?? '' });
                }

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error);
        } finally {
            await connection.close();
        }

        return { recebidos: dataFornecedor.length, inseridos, atualizados, erros, sucessos };
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
