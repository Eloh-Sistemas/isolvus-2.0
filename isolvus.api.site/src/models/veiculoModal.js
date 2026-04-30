import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";

export async function buscarVeiculo(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/Veiculo`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarVeiculo(respose.data);
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
        console.log("Erro ao integrar veiculo id host: " + integracao.host, error);
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


  export async function armazenarVeiculo(dataVeiculo) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;
    // mudar o for para esta função para trabalhar melhor as transações  do banco

    const ssqlValidar = `
           select id_veiculo, 
                   placa, 
                   renavam, 
                   chassi, 
                   id_marca, 
                   id_modelo, 
                   ano_fabricacao, 
                   cor, 
                   id_combustivel, 
                   situacao, 
                   kmatual, 
                   dtsync, 
                    NVL(DTATUALIZADO,SYSDATE-1) DTATUALIZADO, 
                   id_grupo_empresa, 
                   id_veiculo_erp, 
                   descricao 
                   from bstab_veiculo 
                   where 1=1 
                   and id_veiculo_erp = :id_veiculo_erp 
                   and id_grupo_empresa = :id_grupo_empresa 
        `;
    
    const update = `
         update bstab_veiculo 
              set 
              placa = :placa, 
              renavam = :renavam, 
              chassi = :chassi, 
              cor = :cor, 
              situacao = :situacao, 
              dtsync = sysdate, 
              id_grupo_empresa = :id_grupo_empresa, 
              descricao = :descricao 
              where id_veiculo = :id_veiculo 
    `;

    const insert = `
            insert into bstab_veiculo 
                (id_veiculo, 
                placa, 
                renavam, 
                chassi, 
                cor, 
                situacao, 
                id_grupo_empresa, 
                id_veiculo_erp, 
                dtsync, 
                descricao) 
                values 
                ( (SELECT NVL(MAX(A.id_veiculo +1),1)  FROM bstab_veiculo A), 
                :placa, 
                :renavam, 
                :chassi, 
                :cor, 
                :situacao, 
                :id_grupo_empresa, 
                :id_veiculo_erp, 
                sysdate, 
                :descricao)                                                   
    `;
        
    const connection = await getConnection();        
    
        //console.log(dataVeiculo)

        try {
            
            for (const veiculo of dataVeiculo) {

                const validar = await connection.execute(ssqlValidar, {
                    id_veiculo_erp: veiculo.codveiculo,
                    id_grupo_empresa: veiculo.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });

                  //ID_VEICULO
               // console.log(validar.rows)
                if (validar.rows.length > 0){
                    await connection.execute(update, {
                        placa: veiculo.placa, 
                        renavam: veiculo.renavam, 
                        chassi: veiculo.chassi, 
                        cor: veiculo.cor, 
                        situacao: veiculo.situacao,                          
                        id_grupo_empresa: veiculo.id_grupo_empresa, 
                        descricao: veiculo.descricao,
                        id_veiculo: validar.rows[0].ID_VEICULO 
                    });
                    atualizados++;
                    sucessos.push({ operacao: 'U', id_registro_erp: String(veiculo.codveiculo ?? ''), descricao_registro: veiculo.descricao ?? veiculo.placa ?? '' });
                } else {
                    await connection.execute(insert,{
                        placa: veiculo.placa, 
                        renavam: veiculo.renavam, 
                        chassi: veiculo.chassi, 
                        cor: veiculo.cor, 
                        situacao: veiculo.situacao, 
                        id_grupo_empresa: veiculo.id_grupo_empresa, 
                        id_veiculo_erp: veiculo.codveiculo,                         
                        descricao: veiculo.descricao
                    });
                    inseridos++;
                    sucessos.push({ operacao: 'I', id_registro_erp: String(veiculo.codveiculo ?? ''), descricao_registro: veiculo.descricao ?? veiculo.placa ?? '' });
                }

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error);
        } finally {
            await connection.close();
        }

        return { recebidos: dataVeiculo.length, inseridos, atualizados, erros, sucessos };
}


export async function listaVeiculo(jsonReq) {

    try {
        
        const ssqlConsulta = `
        SELECT R.ID_VEICULO, R.ID_VEICULO_ERP, R.PLACA, R.DESCRICAO, R.SITUACAO
        FROM BSTAB_VEICULO R
        WHERE Id_Grupo_Empresa = :idGrupoEmpresa
        AND (UPPER(R.PLACA) LIKE UPPER(:filtro)
        OR UPPER(R.DESCRICAO) LIKE UPPER(:filtro))
        ORDER BY TRIM(R.PLACA)
        `;

        const params = {
            idGrupoEmpresa: jsonReq.id_grupo_empresa,
            filtro: `%${jsonReq.filtro}%`
        };

        const result = await executeQuery(ssqlConsulta, params);
        return result;

    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function listaDetalhe(jsonReq) {

    try {
     
        const sql = `
            SELECT 
                A.ID_VEICULO, 
                A.ID_VEICULO_ERP, 
                A.DESCRICAO, 
                A.PLACA, 
                A.RENAVAM, 
                A.CHASSI, 
                A.ID_MARCA, 
                M.MARCA, 
                A.ID_MODELO, 
                MD.MODELO, 
                A.ANO_FABRICACAO, 
                A.COR, 
                A.ID_COMBUSTIVEL, 
                C.COMBUSTIVEL, 
                A.KMATUAL, 
                A.SITUACAO,
                NVL(A.TIPO_VEICULO, '') TIPO_VEICULO,
                NVL(A.CATEGORIA_CNH, '') CATEGORIA_CNH,
                A.ID_FILIAL,
                F.RAZAOSOCIAL FILIAL,
                A.ID_MOTORISTA,
                U.NOME MOTORISTA,
                A.VENC_IPVA,
                A.VENC_LICENCIAMENTO,
                A.VENC_SEGURO,
                NVL(A.KM_PROXIMA_REVISAO, 0) KM_PROXIMA_REVISAO,
                NVL(A.NUM_MOTOR, '') NUM_MOTOR,
                NVL(A.CAPACIDADE, 0) CAPACIDADE,
                NVL(A.OBSERVACOES, '') OBSERVACOES
            FROM BSTAB_VEICULO A
            LEFT JOIN BSTAB_MARCAVEICULO M ON A.ID_MARCA = M.ID_MARCA 
                AND A.ID_GRUPO_EMPRESA = M.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_MODELOVEICULO MD ON A.ID_MODELO = MD.ID_MODELO 
                AND A.ID_GRUPO_EMPRESA = MD.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_COMBUSTIVELVEICULO C ON A.ID_COMBUSTIVEL = C.ID_COMBUSTIVEL 
                AND A.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_EMPRESAS F ON F.ID_ERP = A.ID_FILIAL
                AND F.ID_GRUPO_EMPRESA = A.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_USUSARIOS U ON U.ID_USUARIO = A.ID_MOTORISTA
                AND U.ID_GRUPO_EMPRESA = A.ID_GRUPO_EMPRESA
            WHERE A.ID_VEICULO = :idVeiculo
            AND A.ID_GRUPO_EMPRESA = :idGrupoEmpresa
            `;

            const params = {
            idVeiculo: jsonReq.id_veiculo,
            idGrupoEmpresa: jsonReq.id_grupo_empresa
            };

        const result = await executeQuery(sql, params);
        return result;

    } catch (error) {
        console.log(error);
        throw error;
    }
    
}


export async function listarMarcaVeiculoEditComplet(jsonReq) {

  

    try {
     
        const sql = `
        SELECT 
            R.ID_MARCA AS CODIGO, 
            R.ID_MARCA || ' - ' || R.MARCA AS DESCRICAO, 
            R.MARCA AS DESCRICAO2
        FROM BSTAB_MARCAVEICULO R
        WHERE Id_Grupo_Empresa = :idGrupoEmpresa
        AND UPPER(R.MARCA) LIKE UPPER(:filtro)
        ORDER BY TRIM(R.MARCA)
        `;

        const params = {
        idGrupoEmpresa: jsonReq.id_grupo_empresa,
        filtro: `%${jsonReq.descricao}%`
        };

        const result = await executeQuery(sql, params);
        return result;

    } catch (error) {
        console.log(error);
        throw error;
    } 
    
}


export async function listarModeloVeiculoEditComplet(jsonReq) {

  

    try {
     
        const sql = `
        SELECT 
            R.ID_MODELO AS CODIGO, 
            R.ID_MODELO || ' - ' || R.MODELO AS DESCRICAO, 
            R.MODELO AS DESCRICAO2
        FROM BSTAB_MODELOVEICULO R
        WHERE Id_Grupo_Empresa = :idGrupoEmpresa
        AND UPPER(R.MODELO) LIKE UPPER(:filtro)
        ORDER BY TRIM(R.MODELO)
        `;

        const params = {
        idGrupoEmpresa: jsonReq.id_grupo_empresa,
        filtro: `%${jsonReq.descricao}%`
        };

        const result = await executeQuery(sql, params);
        return result;

    } catch (error) {
        console.log(error);
        throw error;
    } 
    
}


export async function listarCombustivelVeiculoEditComplet(jsonReq) {

  

    try {
     
        const sql = `
        SELECT 
            R.ID_COMBUSTIVEL AS CODIGO, 
            R.ID_COMBUSTIVEL || ' - ' || R.COMBUSTIVEL AS DESCRICAO, 
            R.COMBUSTIVEL AS DESCRICAO2
        FROM BSTAB_COMBUSTIVELVEICULO R
        WHERE Id_Grupo_Empresa = :idGrupoEmpresa
        AND UPPER(R.COMBUSTIVEL) LIKE UPPER(:filtro)
        ORDER BY TRIM(R.COMBUSTIVEL)
        `;

        const params = {
        idGrupoEmpresa: jsonReq.id_grupo_empresa,
        filtro: `%${jsonReq.descricao}%`
        };

        const result = await executeQuery(sql, params);
        return result;

    } catch (error) {
        console.log(error);
        throw error;
    } 
    
}

export async function SetCadastrarVeiculo(jsonReq) {

    try {
     
        const sql = `
            INSERT INTO BSTAB_VEICULO (
                id_veiculo,
                placa,
                renavam,
                chassi,
                id_marca,
                id_modelo,
                ano_fabricacao,
                cor,
                id_combustivel,
                situacao,
                kmatual,
                dtatualizado,
                id_grupo_empresa,
                id_veiculo_erp,
                descricao,
                tipo_veiculo,
                categoria_cnh,
                id_filial,
                id_motorista,
                venc_ipva,
                venc_licenciamento,
                venc_seguro,
                km_proxima_revisao,
                num_motor,
                capacidade,
                observacoes
            ) VALUES (
                (SELECT NVL(MAX(id_veiculo) + 1, 1) FROM BSTAB_VEICULO),
                :placa,
                :renavam,
                :chassi,
                :id_marca,
                :id_modelo,
                :ano_fabricacao,
                :cor,
                :id_combustivel,
                :situacao,
                :kmatual,
                SYSDATE,
                :id_grupo_empresa,
                :id_veiculo_erp,
                :descricao,
                :tipo_veiculo,
                :categoria_cnh,
                :id_filial,
                :id_motorista,
                :venc_ipva,
                :venc_licenciamento,
                :venc_seguro,
                :km_proxima_revisao,
                :num_motor,
                :capacidade,
                :observacoes
            )
            `;

            const params = {
            placa: jsonReq.placa,
            renavam: jsonReq.renavam,
            chassi: jsonReq.chassi,
            id_marca: jsonReq.idmarca,
            id_modelo: jsonReq.idmodelo,
            ano_fabricacao: jsonReq.anofabricacao,
            cor: jsonReq.cor,
            id_combustivel: jsonReq.idcombustivel,
            situacao: jsonReq.situacao,
            kmatual: jsonReq.kmatual,
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_veiculo_erp: jsonReq.idveiculoerp,
            descricao: jsonReq.descricao,
            tipo_veiculo: jsonReq.tipoveiculo || null,
            categoria_cnh: jsonReq.categoriacnh || null,
            id_filial: jsonReq.idfilial || null,
            id_motorista: jsonReq.idmotorista || null,
            venc_ipva: jsonReq.vencipva || null,
            venc_licenciamento: jsonReq.venclicenciamento || null,
            venc_seguro: jsonReq.vencseguro || null,
            km_proxima_revisao: jsonReq.kmproximarevisao || null,
            num_motor: jsonReq.nummotor || null,
            capacidade: jsonReq.capacidade || null,
            observacoes: jsonReq.observacoes || null
            };

           
        const connection = await getConnection();
        try {
            const sqlWithReturn = sql + ` RETURNING id_veiculo INTO :novo_id`;
            const paramsWithReturn = { ...params, novo_id: { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER } };
            const result = await connection.execute(sqlWithReturn, paramsWithReturn, { autoCommit: true });
            const novoId = result.outBinds.novo_id[0];
            return { Mensagem: 'Veículo Cadastrado com Sucesso !', id_veiculo: novoId };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.close();
        }

    } catch (error) {
        console.log(error);
        throw error;
    } 
}

export async function SetAtualizarVeiculo(jsonReq) {

    try {
     
        const sql = `
            UPDATE BSTAB_VEICULO 
            SET 
                placa = :placa,
                renavam = :renavam,
                chassi = :chassi,
                id_marca = :id_marca,
                id_modelo = :id_modelo,
                ano_fabricacao = :ano_fabricacao,
                cor = :cor,
                id_combustivel = :id_combustivel,
                situacao = :situacao,
                kmatual = :kmatual,
                id_grupo_empresa = :id_grupo_empresa,
                id_veiculo_erp = :id_veiculo_erp,
                dtatualizado = SYSDATE,
                descricao = :descricao,
                tipo_veiculo = :tipo_veiculo,
                categoria_cnh = :categoria_cnh,
                id_filial = :id_filial,
                id_motorista = :id_motorista,
                venc_ipva = :venc_ipva,
                venc_licenciamento = :venc_licenciamento,
                venc_seguro = :venc_seguro,
                km_proxima_revisao = :km_proxima_revisao,
                num_motor = :num_motor,
                capacidade = :capacidade,
                observacoes = :observacoes
            WHERE id_veiculo = :id_veiculo
            `;

            const params = {
            placa: jsonReq.placa,
            renavam: jsonReq.renavam,
            chassi: jsonReq.chassi,
            id_marca: jsonReq.idmarca,
            id_modelo: jsonReq.idmodelo,
            ano_fabricacao: jsonReq.anofabricacao,
            cor: jsonReq.cor,
            id_combustivel: jsonReq.idcombustivel,
            situacao: jsonReq.situacao,
            kmatual: jsonReq.kmatual,
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_veiculo_erp: jsonReq.idveiculoerp,
            descricao: jsonReq.descricao,
            tipo_veiculo: jsonReq.tipoveiculo || null,
            categoria_cnh: jsonReq.categoriacnh || null,
            id_filial: jsonReq.idfilial || null,
            id_motorista: jsonReq.idmotorista || null,
            venc_ipva: jsonReq.vencipva || null,
            venc_licenciamento: jsonReq.venclicenciamento || null,
            venc_seguro: jsonReq.vencseguro || null,
            km_proxima_revisao: jsonReq.kmproximarevisao || null,
            num_motor: jsonReq.nummotor || null,
            capacidade: jsonReq.capacidade || null,
            observacoes: jsonReq.observacoes || null,
            id_veiculo: jsonReq.idveiculo
            };

           
        const result = await executeQuery(sql, params, true);
        return {Mensagem: 'Veículo atualizado com Sucesso !'};

    } catch (error) {
        console.log(error);
        throw error;
    } 
}