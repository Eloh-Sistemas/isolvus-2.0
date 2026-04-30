import { executeQuery, getConnection } from "../config/database.js";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import OracleDB from "oracledb";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";

export async function getConsultarFilial(idgrupoempresa, descricao) {
    
    try {
      const ssql = `
      SELECT 
        F.ID_ERP AS "codigo", 
        'F' || LPAD(F.ID_ERP, 2, '0') || ' - ' || F.RAZAOSOCIAL AS "descricao",  
        CASE  
        WHEN LENGTH(REPLACE(REPLACE(REPLACE(F.CNPJ_CPF, '.', ''), '/', ''), '-', '')) = 14 
        THEN 'CNPJ: ' || 
            SUBSTR(F.CNPJ_CPF, 1, 2) || '.' ||
            SUBSTR(F.CNPJ_CPF, 3, 3) || '.' ||
            SUBSTR(F.CNPJ_CPF, 6, 3) || '/' ||
            SUBSTR(F.CNPJ_CPF, 9, 4) || '-' ||
            SUBSTR(F.CNPJ_CPF, 13, 2)
        WHEN LENGTH(REPLACE(REPLACE(REPLACE(F.CNPJ_CPF, '.', ''), '/', ''), '-', '')) = 11 
        THEN 'CPF: ' || 
            SUBSTR(F.CNPJ_CPF, 1, 3) || '.' ||
            SUBSTR(F.CNPJ_CPF, 4, 3) || '.' ||
            SUBSTR(F.CNPJ_CPF, 7, 3) || '-' ||
            SUBSTR(F.CNPJ_CPF, 10, 2)
        ELSE F.CNPJ_CPF  
        END AS "descricao2" 
      FROM BSTAB_EMPRESAS F 
      WHERE UPPER(F.ID_GRUPO_EMPRESA) = :id_grupo_empresa 
        AND (
          UPPER(F.RAZAOSOCIAL) LIKE UPPER(:filtroLike) 
          OR UPPER(F.CNPJ_CPF) LIKE UPPER(REPLACE(REPLACE(REPLACE(:filtroId, '.', ''), '/', ''), '-', '')) 
          OR UPPER(F.FANTARIA) LIKE UPPER(:filtroLike) 
        )
    `;

        
      const params = {
        filtroLike: `%${descricao}%`, // Para buscas parciais no nome     
        filtroId: `${descricao}%`,
        id_grupo_empresa : idgrupoempresa }

        const result = await executeQuery(ssql, params);
        return result;

    } catch (error) {
        throw new Error(error);
    }

}

export async function GetFilialComplet(id_empresa, idgrupoempresa, descricao) {

    var ssql = ``;
    var params = {};

    try {
      
      if (id_empresa > 0){

        ssql = `
        SELECT id_empresa as "id_empresa",
                razaosocial as "razaosocial",
                fantaria as "fantaria",
                cnpj_cpf as "cnpj_cpf",
                email as "email",
                contato as "contato",
                dtcadastro as "dtcadastro",
                id_erp as "id_erp",
                dtinativo as "dtinativo",
                id_grupo_empresa as "id_grupo_empresa",
                cep as "cep",
                rua as "rua",
                numero as "numero",
                uf as "uf",
                cidade as "cidade",
                bairro as "bairro",
                developer_application_key as "developer_application_key",
                chavebasic as "chavebasic",
                celular as "celular" 
          FROM BSTAB_EMPRESAS F 
          WHERE 1=1
            AND UPPER(F.id_empresa) = :idempresa 
      `;
         params = {idempresa: id_empresa }                  
      
      }else if (descricao || ''){

        ssql = `
                    SELECT id_empresa as "id_empresa",
                            razaosocial as "razaosocial",
                            fantaria as "fantaria",
                            cnpj_cpf as "cnpj_cpf",
                            email as "email",
                            contato as "contato",
                            dtcadastro as "dtcadastro",
                            id_erp as "id_erp",
                            dtinativo as "dtinativo",
                            id_grupo_empresa as "id_grupo_empresa",
                            cep as "cep",
                            rua as "rua",
                            numero as "numero",
                            uf as "uf",
                            cidade as "cidade",
                            bairro as "bairro",
                            developer_application_key as "developer_application_key",
                            chavebasic as "chavebasic",
                            celular as "celular" 
                      FROM BSTAB_EMPRESAS F 
                      WHERE UPPER(F.ID_GRUPO_EMPRESA) = :id_grupo_empresa
                      AND (
                          UPPER(F.RAZAOSOCIAL) LIKE UPPER(:filtroLike)
                          OR UPPER(REPLACE(REPLACE(REPLACE(F.CNPJ_CPF, '.', ''), '/', ''), '-', '')) LIKE REPLACE(REPLACE(REPLACE(:filtroId, '.', ''), '/', ''), '-', '')
                          OR UPPER(F.FANTARIA) LIKE UPPER(:filtroLike)
                      )
                  `;

              params = {
              filtroLike: `%${descricao}%`, // Para buscas parciais no nome     
              filtroId: `${descricao}%`,
              id_grupo_empresa : idgrupoempresa }          
          
      }
                     
        const result = await executeQuery(ssql, params);  
        return result;

    } catch (error) {
        throw new Error(error);
    }

}

export async function getConsultarSetor(idgrupoempresa, descricao) {
    
    try {
        const ssql = `
        SELECT 
          R.ID_SETOR_ERP AS "codigo", 
          R.ID_SETOR_ERP || ' - ' || R.SETOR AS "descricao", 
          R.SETOR AS "descricao2" 
        FROM BSTAB_USUARIO_SETOR R 
        WHERE UPPER(R.ID_GRUPO_EMPRESA) = :id_grupo_empresa 
          AND UPPER(R.SETOR) LIKE :filtroLike
      `;

        
      const params = {
        filtroLike: `%${descricao}%`, // Para buscas parciais no nome     
        id_grupo_empresa : idgrupoempresa }

        const result = await executeQuery(ssql, params);
        return result;

    } catch (error) {
        throw new Error(error);
    }

}


export async function SetCadastarFilial(dados) {

    try {
       
      const sSql1 = `
         select a.id_empresa as "id_empresa"
         from bstab_empresas a 
         where a.cnpj_cpf = :cnpj_cpf 
      `;    
      
      const sSql2 = `
         select a.id_empresa as "id_empresa"
           from bstab_empresas a 
          where a.id_erp = :id_erp 
      `;  

      const sqlInsert = `
         insert into bstab_empresas  
         ( id_empresa,  
         razaosocial,  
         fantaria,  
         cnpj_cpf,  
         email,  
         contato,  
         dtcadastro,  
         id_erp,  
         id_grupo_empresa,  
         cep,  
         rua,  
         numero,  
         uf,  
         cidade,  
         bairro,  
         developer_application_key,  
         chavebasic,  
         celular )  
         values  
         ( (SELECT NVL(MAX(id_empresa+1),1) FROM bstab_empresas ) ,   
         :razaosocial,  
         :fantaria,  
         :cnpj_cpf,  
         :email,  
         :contato,  
         sysdate,  
         :id_erp,  
         :id_grupo_empresa,  
         :cep,  
         :rua,  
         :numero,  
         :uf,  
         :cidade,  
         :bairro,  
         :developer_application_key,  
         :chavebasic,  
         :celular) 
      `;


      const lcnpj = dados.cnpj_cpf;

      // consultar se filial ja existe por cnpj
      const idempresa1 = await executeQuery(sSql1, {cnpj_cpf: dados.cnpj_cpf});

      // consultar se filial ja existe por id_erp
      const idempresa2 = await executeQuery(sSql2, {id_erp: dados.id_erp});
      // se não inserir      

      console.log(dados);    

      if (idempresa1.length > 0){
        throw new Error('Já existe uma empresa cadastrada com este CNPJ');
      }

      if (idempresa2.length > 0){
        throw new Error('Já existe uma empresa cadastrada com esse ID_ERP');
      }
      
      await executeQuery(sqlInsert, {
        razaosocial: dados.razaosocial,  
        fantaria: dados.fantasia,  
        cnpj_cpf: dados.cnpj_cpf,  
        email: dados.email,  
        contato: dados.contato,  
        id_erp: dados.id_erp,  
        id_grupo_empresa: dados.id_grupo_empresa,  
        cep: dados.cep,  
        rua: dados.rua,  
        numero: dados.numero,  
        uf: dados.uf,  
        cidade: dados.cidade,  
        bairro: dados.bairro,  
        developer_application_key: dados.developer_application_key,  
        chavebasic: dados.chavebasic,  
        celular: dados.celular
      }, true);

      const result = await executeQuery('select * from bstab_empresas where CNPJ_CPF = :cnpj', {cnpj: lcnpj});

      return result;


    } catch (error) {
       throw new Error(error);
    }

}


export async function SetAlterarFilial(dados, idEmprea) {
    try {
      const ssql1 =`
        update bstab_empresas  
        set   
        razaosocial = :razaosocial,  
        fantaria = :fantaria,  
        cnpj_cpf = :cnpj_cpf,  
        email = :email,  
        contato = :contato,  
        id_erp = :id_erp,  
        id_grupo_empresa = :id_grupo_empresa,  
        cep = :cep,  
        rua = :rua,  
        numero = :numero,  
        uf = :uf,  
        cidade = :cidade,  
        bairro = :bairro,  
        developer_application_key = :developer_application_key,  
        chavebasic = :chavebasic,  
        celular = :celular  
        where id_empresa = :id_empresa 
      `;

      const ssql2 = `
         SELECT id_empresa as "id_empresa",
                razaosocial as "razaosocial",
                fantaria as "fantaria",
                cnpj_cpf as "cnpj_cpf",
                email as "email",
                contato as "contato",
                dtcadastro as "dtcadastro",
                id_erp as "id_erp",
                dtinativo as "dtinativo",
                id_grupo_empresa as "id_grupo_empresa",
                cep as "cep",
                rua as "rua",
                numero as "numero",
                uf as "uf",
                cidade as "cidade",
                bairro as "bairro",
                developer_application_key as "developer_application_key",
                chavebasic as "chavebasic",
                celular as "celular" 
          FROM BSTAB_EMPRESAS F 
          WHERE 1=1
            AND UPPER(F.id_empresa) = :idempresa 
      `;


      await executeQuery(ssql1, {
        razaosocial :dados.razaosocial,  
        fantaria :dados.fantasia,  
        cnpj_cpf :dados.cnpj_cpf,  
        email :dados.email,  
        contato :dados.contato,  
        id_erp :dados.id_erp,  
        id_grupo_empresa :dados.id_grupo_empresa,  
        cep :dados.cep,  
        rua :dados.rua,  
        numero :dados.numero,  
        uf :dados.uf,  
        cidade :dados.cidade,  
        bairro :dados.bairro,  
        developer_application_key :dados.developer_application_key,  
        chavebasic :dados.chavebasic,  
        celular :dados.celular,  
        id_empresa :idEmprea 
      }, true);

      const result = await executeQuery(ssql2, {idempresa: idEmprea});
      return result;

    } catch (error) {
      throw new Error(error); 
    }
}


export async function buscarFilial(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/Filial`, authApiClient);

        if (respose.status == 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarFilial(respose.data);
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
        console.log("Erro ao integrar filial id host: " + integracao.host, error);
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


export async function armazenarFilial(dataFilial) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;

      const ssqlValidarFilial = `
      SELECT A.ID_EMPRESA,                       
      A.RAZAOSOCIAL,                             
      A.FANTARIA,                                
      A.CNPJ_CPF,                                
      A.EMAIL,                                   
      A.CONTATO,                                 
      A.ID_ERP,                                  
      A.ID_GRUPO_EMPRESA                         
      FROM BSTAB_EMPRESAS A                      
      WHERE A.ID_ERP = :id_erp                   
      AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa    
    `;

    const updateFilial = `
      update BSTAB_EMPRESAS set       
      RAZAOSOCIAL = :razaosocial,    
      FANTARIA = :fantaria,          
      CNPJ_CPF = :cnpj_cpf,          
      EMAIL = :email,                
      CONTATO = :contato
      WHERE ID_EMPRESA = :id_empresa
    `;

    const insertFilial = `
      insert into BSTAB_EMPRESAS 
      (ID_EMPRESA, RAZAOSOCIAL, FANTARIA, CNPJ_CPF, EMAIL, CONTATO, ID_GRUPO_EMPRESA, ID_ERP) 
      values 
      ((SELECT NVL(MAX(ID_EMPRESA+1),1) PROXIMONUMEMPRESA FROM BSTAB_EMPRESAS), 
      :razaosocial, :fantaria, :cnpj_cpf, :email, :contato, :id_grupo_empresa, :id_erp) 
    `;

 

  const connection = await getConnection();

  try {
          
    
      for (const filial of dataFilial) {

  
          const validar = await connection.execute(ssqlValidarFilial, {
            id_erp: filial.id_erp,
            id_grupo_empresa: filial.id_grupo_empresa  
          }, { outFormat: OracleDB.OUT_FORMAT_OBJECT }); 
          
          
          

          if (validar.rows.length  > 0){       

            await connection.execute(updateFilial, {
                razaosocial: filial.razaosocial,
                fantaria: filial.fantasia,          
                cnpj_cpf: filial.cnpj_cpf,          
                email: filial.email,                
                contato: filial.contato,
                id_empresa: validar.rows[0].ID_EMPRESA
            }); 
            atualizados++;
            sucessos.push({ operacao: 'U', id_registro_erp: String(filial.id_erp ?? ''), descricao_registro: filial.razaosocial ?? '' });

          }else{

            await connection.execute(insertFilial,{
                razaosocial: filial.razaosocial, 
                fantaria: filial.fantasia, 
                cnpj_cpf: filial.cnpj_cpf, 
                email: filial.email, 
                contato: filial.contato, 
                id_grupo_empresa: filial.id_grupo_empresa, 
                id_erp: filial.id_erp 
            });
            inseridos++;
            sucessos.push({ operacao: 'I', id_registro_erp: String(filial.id_erp ?? ''), descricao_registro: filial.razaosocial ?? '' });

          } 

      }

    await connection.commit();

  } catch (error) {
    await connection.rollback();
    erros.push({ id_registro_erp: null, descricao_registro: null, mensagem_erro: String(error?.message || error).substring(0, 4000) });
      console.log(error)
  } finally {
    await connection.close();
  }

    return { recebidos: dataFilial.length, inseridos, atualizados, erros, sucessos };
}