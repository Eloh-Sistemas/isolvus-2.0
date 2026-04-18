import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";

export async function buscarVeiculo(integracao) {

    try {
                                            
        // consultar na api do cliente
  
        const respose = await axios.get(integracao.host+`/v1/Veiculo`, authApiClient);  
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarVeiculo(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar fornecedor id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


  export async function armazenarVeiculo(dataVeiculo) {
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
                                        
                }else{
            
                    await connection.execute(insert,{
                        placa: veiculo.placa, 
                        renavam: veiculo.renavam, 
                        chassi: veiculo.chassi, 
                        cor: veiculo.cor, 
                        situacao: veiculo.situacao, 
                        id_grupo_empresa: veiculo.id_grupo_empresa, 
                        id_veiculo_erp: veiculo.codveiculo,                         
                        descricao: veiculo.descricao
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
                A.SITUACAO 
            FROM BSTAB_VEICULO A
            LEFT JOIN BSTAB_MARCAVEICULO M ON A.ID_MARCA = M.ID_MARCA 
                AND A.ID_GRUPO_EMPRESA = M.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_MODELOVEICULO MD ON A.ID_MODELO = MD.ID_MODELO 
                AND A.ID_GRUPO_EMPRESA = MD.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_COMBUSTIVELVEICULO C ON A.ID_COMBUSTIVEL = C.ID_COMBUSTIVEL 
                AND A.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA
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
                descricao
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
                :descricao
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
            descricao: jsonReq.descricao
            };

           
        const result = await executeQuery(sql, params, true);
        return {Mensagem: 'Veículo Cadastrado com Sucesso !'};

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
                descricao = :descricao
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
            id_veiculo: jsonReq.idveiculo
            };

           
        const result = await executeQuery(sql, params, true);
        return {Mensagem: 'Veículo atualizado com Sucesso !'};

    } catch (error) {
        console.log(error);
        throw error;
    } 
}