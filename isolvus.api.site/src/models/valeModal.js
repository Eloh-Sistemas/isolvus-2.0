import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { executeQuery, getConnection } from "../config/database.js";
import OracleDB from "oracledb";
import moment from "moment";

export async function getconsultarVale (jsonReq) {

    try {
            const ssql = `
            
            SELECT VW1.*
            FROM (

            -- BAIXADO VINCULADO A SOLICITAÇÃO

            SELECT A.ID_VALE,
                    A.DATA_VENCIMENTO,
                    A.VALOR,
                    'B' FLEGAR,
                    ID_LANCAMENTO_ERP,
                    A.DATA_BAIXA
                FROM BSTAB_VALE A
                WHERE 1=1
                AND A.ID_FUNC = :ID_FUNC
                AND A.DATA_BAIXA IS NOT NULL
                AND A.ID_FUNC_BAIXA IS NOT NULL
                AND A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA 
            
            UNION ALL

            -- VINCULADO A SOLICITAÇÃO QUE NÃO FOI BAIXADO

            SELECT A.ID_VALE,
                    A.DATA_VENCIMENTO,
                    A.VALOR,
                    'S' FLEGAR,
                    ID_LANCAMENTO_ERP,
                    A.DATA_BAIXA
                FROM BSTAB_VALE A
                WHERE 1=1
                AND A.ID_FUNC = :ID_FUNC
                AND A.DATA_BAIXA IS NULL
                AND A.ID_FUNC_BAIXA IS NULL
                AND A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA 
                        
            UNION ALL 

            -- EM ABERTO

            SELECT A.ID_VALE,
                    A.DATA_VENCIMENTO,
                    A.VALOR,
                    'N' FLEGAR,
                    ID_LANCAMENTO_ERP,
                    A.DATA_BAIXA
                FROM BSTAB_VALE A
                WHERE 1=1
                AND A.ID_FUNC = :ID_FUNC
                AND A.DATA_BAIXA IS NULL
                AND A.ID_FUNC_BAIXA IS NULL
                AND A.ID_VICULOSOLCTDESPESA IS NULL ) VW1
    
            ORDER BY VW1.DATA_VENCIMENTO, VW1.ID_VALE

            `;
    
            const params = {
                id_func: jsonReq.id_func,
                ID_VICULOSOLCTDESPESA: jsonReq.id_viculosoctdespesa
            };
    
            const result = await executeQuery(ssql, params);
            return result;
    
        } catch (error) {
            throw new Error(error);        
        }

}

export async function buscarVale(integracao) {

    try {                            

        
        // consultar na api do caixa banco  
        const respose = await axios.get(integracao.host+`/v1/integracao/vale`, authApiClient);
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarVale(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar vale id host: "+integracao.host)        
        console.log(error)        
    }
  
}


export async function armazenarVale(dataVale) {
    const ssqlValidar = `
        SELECT id_lancamento
        FROM bstab_vale 
        WHERE id_lancamento_erp = :id_lancamento_erp
    `;

    const sqlUpdate = `
        UPDATE bstab_vale
           SET id_vale = :id_vale,
               id_filial = (SELECT E.ID_EMPRESA FROM BSTAB_EMPRESAS E WHERE E.ID_ERP = :id_filial),
               data_lancamento = TO_DATE(:data_lancamento, 'DD/MM/YYYY'),
               data_vencimento = TO_DATE(:data_vencimento, 'DD/MM/YYYY'),
               data_baixa = TO_DATE(:data_baixa, 'DD/MM/YYYY'),
               id_func = (SELECT B.ID_USUARIO FROM BSTAB_USUSARIOS B WHERE B.ID_USUARIO_ERP = :id_func),
               tipolanc = :tipolanc,
               valor = :valor,
               historico = :historico,
               id_func_baixa = :id_func_baixa,
               id_grupo_empresa = :id_grupo_empresa
         WHERE id_lancamento_erp = :id_lancamento_erp
    `;

    const sqlInsert = `
        INSERT INTO bstab_vale (
            id_lancamento, 
            id_vale, 
            id_filial, 
            data_lancamento, 
            data_vencimento, 
            data_baixa, 
            id_func, 
            tipolanc, 
            valor, 
            historico, 
            id_func_baixa, 
            id_lancamento_erp,
            id_grupo_empresa
        ) VALUES (
            (SELECT NVL(MAX(id_lancamento + 1), 1) FROM bstab_vale),
            :id_vale,
            (SELECT E.ID_EMPRESA FROM BSTAB_EMPRESAS E WHERE E.ID_ERP = :id_filial),
            TO_DATE(:data_lancamento, 'DD/MM/YYYY'),
            TO_DATE(:data_vencimento, 'DD/MM/YYYY'),
            TO_DATE(:data_baixa, 'DD/MM/YYYY'),
            (SELECT B.ID_USUARIO FROM BSTAB_USUSARIOS B WHERE B.ID_USUARIO_ERP = :id_func),
            :tipolanc,
            :valor,
            :historico,
            :id_func_baixa,
            :id_lancamento_erp,
            :id_grupo_empresa
        )
    `;
    
    const connection = await getConnection();        

    try {
        for (const vale of dataVale) {
            const params = {
                id_vale: vale.id_vale,
                id_filial: vale.id_filial,
                data_lancamento: vale.data_lancamento
                    ? moment.utc(vale.data_lancamento).format('DD/MM/YYYY')
                    : null,
                data_vencimento: vale.data_vencimento
                    ? moment.utc(vale.data_vencimento).format('DD/MM/YYYY')
                    : null,
                data_baixa: vale.data_baixa
                    ? moment.utc(vale.data_baixa).format('DD/MM/YYYY')
                    : null,
                id_func: vale.id_func,
                tipolanc: vale.tipolanc,
                valor: vale.valor,
                historico: vale.historico,
                id_func_baixa: vale.id_func_baixa,
                id_lancamento_erp: vale.id_lancamento_erp,
                id_grupo_empresa: vale.id_grupo_empresa
            };

            // Verifica se o registro já existe
            const validar = await connection.execute(
                ssqlValidar, 
                { id_lancamento_erp: vale.id_lancamento_erp }, 
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );

            if (validar.rows.length > 0) {
                // Faz UPDATE se já existir
                await connection.execute(sqlUpdate, params);
            } else {
                // Faz INSERT se não existir
                await connection.execute(sqlInsert, params);
            }
        }

        await connection.commit();

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao armazenar vale:', error);
    } finally {
        await connection.close();
    }
}


export async function baixaValeModel(dataVale, id_func_baixa, id_grupo_empresa, numsolicitacao){
    
    const ssqlBaixaVale = `
    UPDATE BSTAB_VALE SET 
    DATA_BAIXA = TRUNC(SYSDATE),
    ID_FUNC_BAIXA = :ID_FUNC_BAIXA,
    ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA
    WHERE ID_LANCAMENTO_ERP = :id_lancamento_erp
      AND ID_VALE = :ID_VALE
    `;

    const ssqlHost = `
        SELECT H.HOST FROM BSTAB_HOSTCLIENTES H WHERE H.ID_GRUPO_EMPRESAS = :id_grupo_empresa
    `;

    const ssqlConsultaFunc = `
    SELECT S.ID_USUARIO_ERP FROM BSTAB_USUSARIOS S WHERE S.ID_USUARIO = :id_usuario
    `;

    const connection = await getConnection();
    try {               
        
        // consultar host 
        const host = await executeQuery(ssqlHost, {id_grupo_empresa: id_grupo_empresa});
        const id_usuario_erp = await executeQuery(ssqlConsultaFunc, {id_usuario: id_func_baixa});

        if (!host.length || !host[0].host) {
            throw new Error('Host do cliente não localizado para a baixa do vale.');
        }

        if (!id_usuario_erp.length || !id_usuario_erp[0].id_usuario_erp) {
            throw new Error('Usuário ERP não localizado para a baixa do vale.');
        }

        // enviar baixa do vale no cliente se tive integração ativa
        await axios.post(host[0].host+'/v1/integracao/baixarVale', {
            vales: dataVale,
            id_func_baixa: id_usuario_erp[0].id_usuario_erp
        }, authApiClient);

        // baixa vale local e vincula à solicitação
        for (const vale of dataVale) {            
            const result = await connection.execute(ssqlBaixaVale, {
                id_func_baixa: id_func_baixa,
                id_lancamento_erp: vale.id_lancamento_erp,
                id_vale: vale.id_vale,
                ID_VICULOSOLCTDESPESA: numsolicitacao || null
            });

            if (!result.rowsAffected) {
                throw new Error(`Vale ${vale.id_vale} não encontrado para baixa local.`);
            }
        }

        await connection.commit();
        return { mensagem: 'Vale(s) baixado(s) com sucesso.' };

    } catch (error) {
        await connection.rollback(); 
        throw new Error(error?.response?.data?.message || error?.message || 'Erro na baixa do vale');                
    } finally {
        await connection.close();
    }

}