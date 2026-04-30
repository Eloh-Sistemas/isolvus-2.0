import axios from "axios";
import { authApiClient } from "../config/authApiClient.js";
import { executeQuery, getConnection } from "../config/database.js";
import { atualizaDataProximaAtualizcao, consultarIntegracao } from "./integracaoComClienteModel.js";
import { gravarLogIntegracao, gravarLogDetalhe } from "./logIntegracaoModel.js";
import OracleDB from "oracledb";

export async function buscarUsuario(integracao) {
    const inicio = new Date();
    try {
        const respose = await axios.get(integracao.host + `/v1/Usuario`, authApiClient);

        if (respose.status === 200) {
            const { recebidos, inseridos, atualizados, erros, sucessos } = await armazenarUsuario(respose.data);
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
        console.log("Erro ao integrar Usuario id host: " + integracao.host, error);
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


  export async function armazenarUsuario(dataUsuario) {
    const erros = [];
    const sucessos = [];
    let inseridos = 0, atualizados = 0;

    const ssqlValidar = `
            SELECT A.ID_USUARIO,                       
            A.NOME,                                    
            A.EMAIL,                                   
            A.ID_EMPRESA_ERP ,                         
            A.ID_USUARIO_ERP,                          
            A.ID_SETOR_ERP,                            
            A.ID_GRUPO_EMPRESA                         
            FROM BSTAB_USUSARIOS A                     
            WHERE ID_USUARIO_ERP = :id_usuario_erp
              AND ID_GRUPO_EMPRESA = :id_grupo_empresa
        `;
    
    const update = `
        update BSTAB_USUSARIOS set        
        NOME = :nome,            
        ID_EMPRESA_ERP = :id_empresa_erp,
        ID_SETOR_ERP =  :id_setor_erp
        WHERE ID_USUARIO = :id_usuario
    `;

    const insert = `
            insert into BSTAB_USUSARIOS                                                
            (ID_USUARIO,                                                               
            NOME,                                                                                                                                          
            ID_EMPRESA_ERP,                                                            
            ID_USUARIO_ERP,                                                            
            ID_SETOR_ERP,                                                              
            ID_GRUPO_EMPRESA )                                                         
            values                                                                     
            (SEQ_BSTAB_USUARIO_ID.NEXTVAL, 
            :nome,                                                                                                                                        
            :id_empresa_erp,                                                          
            :id_usuario_erp,                                                           
            :id_setor_erp,                                                             
            :id_grupo_empresa )                                                        
    `;
        
    const connection = await getConnection();
    
        try {
            
            for (const usuario of dataUsuario) {

                const validar = await connection.execute(ssqlValidar, {
                    id_usuario_erp: usuario.id_usuario_erp,
                    id_grupo_empresa: usuario.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });
               
                  
                if (validar.rows.length > 0){
            
                    await connection.execute(update, {
                        nome: usuario.nome,                                                                                                                                                        
                        id_empresa_erp: usuario.id_empresa_erp,                                                          
                        id_usuario: validar.rows[0].ID_USUARIO,                                                           
                        id_setor_erp: usuario.id_setor_erp
                    });
                    atualizados++;
                    sucessos.push({ operacao: 'U', id_registro_erp: String(usuario.id_usuario_erp ?? ''), descricao_registro: usuario.nome ?? '' });
                                        
                }else{
            
                    await connection.execute(insert,{
                        nome: usuario.nome,                                                                                                                                                 
                        id_empresa_erp: usuario.id_empresa_erp,                                                          
                        id_usuario_erp: usuario.id_usuario_erp,                                                           
                        id_setor_erp: usuario.id_setor_erp,
                        id_grupo_empresa: usuario.id_grupo_empresa
                    });
                    inseridos++;
                    sucessos.push({ operacao: 'I', id_registro_erp: String(usuario.id_usuario_erp ?? ''), descricao_registro: usuario.nome ?? '' });
                }

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error);
        } finally {
            await connection.close();
        }

        return { recebidos: dataUsuario.length, inseridos, atualizados, erros, sucessos };
}

  


export async function GetLogar(email, senha) {
    
    const ssql =`
        SELECT U.ID_USUARIO as "id_usuario",   
                U.ID_USUARIO_ERP as "id_usuario_erp",   
                U.NOME as "nome",   
                UPPER(U.EMAIL) as "usuario",   
                ST.ID_SETOR_ERP as "id_setor_erp",   
                U.ID_GRUPO_EMPRESA as "id_grupo_empresa",   
                ST.SETOR as "setor",   
                LPAD( E.Id_Erp , 4,0) as "id_empresa",   
                INITCAP(E.RAZAOSOCIAL) as "razaosocial"   
          FROM BSTAB_USUSARIOS U, BSTAB_EMPRESAS E, BSTAB_USUARIO_SETOR ST   
                WHERE 1=1   
                AND U.ID_EMPRESA_ERP = E.ID_ERP   
                AND U.ID_GRUPO_EMPRESA = E.ID_GRUPO_EMPRESA   
                AND U.ID_SETOR_ERP = ST.ID_SETOR_ERP (+)   
                AND U.ID_GRUPO_EMPRESA = ST.ID_GRUPO_EMPRESA (+)   
                AND UPPER(U.EMAIL) = UPPER(:email)   
                AND UPPER(U.SENHA) = UPPER(:senha) `;

    try {
        const result = await executeQuery(ssql, {email , senha});
        return result;
    } catch (error) {
        console.log(error);
    }
    
};

export async function GetRateioFuncionario(matricula) {
    
    const ssql =`
    SELECT A.ID ID_RATEIO,
           A.ID_CENTRODECUSTO,
           B.DESCRICAO,
           A.ID_USUARIO,
           A.PERRATEIO PERCENTUAL
      FROM BSTAB_USUARIO_RATEIO A
      JOIN BSTAB_CENTRODECUSTO B ON A.ID_CENTRODECUSTO = B.ID_CENTRODECUSTO_ERP
     WHERE A.ID_USUARIO = :matricula`;

    try {
        const result = await executeQuery(ssql, {matricula});
        return result;
    } catch (error) {
        console.log(error);
    }

}


export async function SetRateioFuncionario(rateio) {

    if (!rateio.id_centrodecusto) throw new Error('id_centrodecusto é obrigatório para rateio');

    if (!rateio.id_usuario && rateio.id_usuario_erp) {
        const usuarioInfo = await executeQuery(
            `SELECT ID_USUARIO FROM BSTAB_USUSARIOS WHERE ID_USUARIO_ERP = :id_usuario_erp`,
            {id_usuario_erp: rateio.id_usuario_erp}
        );
        if (!usuarioInfo || usuarioInfo.length === 0) {
            throw new Error('Usuário ERP não encontrado para rateio');
        }
        rateio.id_usuario = usuarioInfo[0].ID_USUARIO;
    }

    if (!rateio.id_usuario) throw new Error('id_usuario é obrigatório para rateio');

    const percentual = Number(rateio.percentual || rateio.perrateio || 0);
    if (isNaN(percentual) || percentual <= 0) {
        throw new Error('percentual de rateio deve ser número maior que 0');
    }

    if (percentual > 100) {
        throw new Error('Percentual não pode ser maior que 100%');
    }

    // consultar se já existe rateio para o mesmo centro de custo
    const consultaExistente = await executeQuery(
        `SELECT PERRATEIO FROM BSTAB_USUARIO_RATEIO WHERE ID_USUARIO = :id_usuario AND ID_CENTRODECUSTO = :id_centrodecusto`,
        {id_usuario: rateio.id_usuario, id_centrodecusto: rateio.id_centrodecusto}
    );

    if (consultaExistente.length > 0) {
        throw new Error('Rateio já existe para este centro de custo. Use atualização se necessário.');
    }

    // somatório total de rateios do funcionário (todos centros)
    const totalExistenteResultado = await executeQuery(
        `SELECT NVL(SUM(PERRATEIO),0) TOTAL
           FROM BSTAB_USUARIO_RATEIO
          WHERE ID_USUARIO = :id_usuario`,
        {id_usuario: rateio.id_usuario}
    );

  
    const totalExistente = Number(totalExistenteResultado[0]?.total || 0);
    const total = totalExistente + percentual;
   
    // valida se ultrapassa 100%
    if (total > 100) {
        throw new Error(`O %Rateio não pode ser maior que 100%.`);
    }

    await executeQuery(
        `INSERT INTO BSTAB_USUARIO_RATEIO (ID, ID_USUARIO, ID_CENTRODECUSTO, PERRATEIO) VALUES ((SELECT NVL(MAX(ID),0)+1 FROM BSTAB_USUARIO_RATEIO), :id_usuario, :id_centrodecusto, :percentual)`,
        {id_usuario: rateio.id_usuario, id_centrodecusto: rateio.id_centrodecusto, percentual},
        true
    );

    // retorna a lista completa de rateios do funcionário
    return await GetRateioFuncionario(rateio.id_usuario);
}

export async function DeleteRateioFuncionario(id) {
    if (!id) throw new Error('ID de rateio é obrigatório para exclusão');

    // consultar o id_usuario antes de deletar
    const rateioExistente = await executeQuery(
        `SELECT ID_USUARIO FROM BSTAB_USUARIO_RATEIO WHERE ID = :id`,
        {id}
    );

    if (!rateioExistente || rateioExistente.length === 0) {
        throw new Error('Rateio não encontrado');
    }

    const id_usuario = rateioExistente[0].ID_USUARIO;

    await executeQuery(
        `DELETE FROM BSTAB_USUARIO_RATEIO WHERE ID = :id`,
        {id},
        true
    );

    // retorna a lista completa de rateios do funcionário
    return await GetRateioFuncionario(id_usuario);
}

export async function GetDadosFuncionario(matricula) {
    
    const ssql =`
        select a.id_usuario  as "id_usuario",   
          a.nome as "nome",   
          a.email as "email",   
          a.dtcadastro as "dtcadastro",   
          a.dtinativo as "dtinativo",   
          a.id_empresa_erp as "id_empresa_erp",   
          b.razaosocial as "razaosocial",   
          a.id_usuario_erp as "id_usuario_erp",   
          a.id_setor_erp as "id_setor_erp",   
          c.setor as "setor",   
          a.id_grupo_empresa as "id_grupo_empresa",   
          a.cpf as "cpf",   
          a.rg as "rg",   
          a.telefone as "telefone",   
          a.cep as "cep",   
          a.rua as "rua",   
          a.numero as "numero",   
          a.uf as "uf",   
          a.cidade as "cidade",   
          a.bairro as "bairro",   
          a.complemento as "complemento",   
          a.id_filial_erp as "id_filial_erp",   
          a.datanascimento as "datanascimento",   
          a.sexo as "sexo",   
          a.nacionalidade as "nacionalidade",   
          a.naturalidade as "naturalidade",   
          a.cargo as "cargo",   
          a.dataadmissao as "dataadmissao",   
          a.tipodecontrato as "tipodecontrato",   
          a.cnh as "cnh",   
          a.dataexpiracaocnh as "dataexpiracaocnh",
          nvl(a.id_banco,0) "id_banco",
          (select bb.banco From BSTAB_INSTITUICAOBANCARIA bb where bb.id_banco = a.id_banco) "banco",
          a.agencia "agencia",
          a.conta "conta",
          a.operacao,
          a.chavepix,
          a.id_bancoterceiro,
          (select bb.banco From BSTAB_INSTITUICAOBANCARIA bb where bb.id_banco = a.id_bancoterceiro) "bancoterceiro",
          a.agenciaterceiro,
          a.contaterceiro,
          a.operacaoterceiro,
          a.chavepixterceiro,
          a.beneficiadoterceiro

          from bstab_ususarios a, bstab_empresas b, bstab_usuario_setor c   
          where 1=1   
          and id_usuario = :matricula   
          and a.id_empresa_erp = b.id_erp   
          and a.id_grupo_empresa = b.id_grupo_empresa   
          and a.id_setor_erp = c.id_setor_erp   
          and a.id_grupo_empresa = c.id_grupo_empresa  `;

    try {
        const result = await executeQuery(ssql, {matricula});
        return result;
    } catch (error) {
        console.log(error);
    }
    
};

export async function GetListar(filtro) {

    const ssql = `
     SELECT  R.ID_USUARIO as "id_usuario",  
     INITCAP(R.NOME) as "nome"  
     FROM BSTAB_USUSARIOS R  
     WHERE R.DTINATIVO IS NULL  
     AND (UPPER(R.NOME) LIKE UPPER(:filtroLike)  
     OR UPPER(R.ID_USUARIO) LIKE UPPER(:filtro) )  
     ORDER BY TRIM(R.NOME) 
    `;

    try {

        const params = {
            filtroLike: `%${filtro}%`, // Para buscas parciais no nome
            filtro: filtro // Para buscar pelo ID exato
        };

        const result = await executeQuery(ssql, params)
        return result;
    } catch (error) {
        console.log(error); 
    }
    
}

export async function GetUsuarioComplet(id_grupo_empresa, descricao) {

    const ssql = `
     SELECT  R.ID_USUARIO as "codigo", 
     UPPER(R.ID_USUARIO|| ' - '||R.NOME) "descricao", 
     UPPER(S.SETOR) "descricao2" 
     FROM BSTAB_USUSARIOS R, BSTAB_USUARIO_SETOR S 
     WHERE R.DTINATIVO IS NULL 
     AND R.ID_SETOR_ERP = S.ID_SETOR_ERP  
     AND R.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA 
     AND R.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND S.ID_SETOR <> 0 
     AND R.ID_GRUPO_EMPRESA = :id_grupo_empresa 
     AND (UPPER(R.NOME) LIKE UPPER(:filtroLike) 
     OR UPPER(R.ID_USUARIO_ERP) LIKE UPPER(:filtroId) ) 
     ORDER BY TRIM(R.NOME) 
    `;

    try {
        const params = {
            filtroLike: `%${descricao}%`, // Para buscas parciais no nome     
            filtroId: `${descricao}%`,
            id_grupo_empresa : id_grupo_empresa
        }

        const result = await executeQuery(ssql, params);
        return result;
    } catch (error) {
        console.log(error);
    }
    
}

export async function SetCadastrarFuncionario(dados) {

    console.log(dados);

    // validação de rateio no cadastro do funcionário
    if (dados.rateios && Array.isArray(dados.rateios)) {
        const somaRateio = dados.rateios.reduce((acc, item) => {
            return acc + Number(item.percentual || item.perrateio || 0);
        }, 0);

        if (somaRateio > 100) {
            throw new Error('Total de rateio do funcionário ultrapassa 100%');
        }
    }

    // consultar se grupo de empresa existe
    const idgrupoempresa = await executeQuery('SELECT ID_GRUPO_EMPRESA FROM BSTAB_GRUPO_EMPRESA WHERE ID_GRUPO_EMPRESA = :id_grupo_empresa', [dados.id_grupo_empresa]);
    // consultar se filial existe
    const idfilial = await executeQuery('SELECT A.ID_EMPRESA FROM BSTAB_EMPRESAS A WHERE A.Id_Erp = :id_empresa_erp AND A.id_grupo_empresa = :id_grupo_empresa', {id_empresa_erp: dados.id_empresa_erp , id_grupo_empresa: dados.id_grupo_empresa});
    // consultar se setor existe
    const idsetor = await executeQuery('SELECT A.ID_SETOR_ERP FROM BSTAB_USUARIO_SETOR A WHERE A.ID_SETOR_ERP = :id_setor_erp AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa', {id_setor_erp: dados.id_setor_erp, id_grupo_empresa: dados.id_grupo_empresa});
    // consultar se CPF ja esta cadastrado
    const cpf = await executeQuery('SELECT A.ID_USUARIO FROM BSTAB_USUSARIOS A WHERE A.CPF = :cpf AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa',{cpf: dados.cpf, id_grupo_empresa: dados.id_grupo_empresa});
    // verificar se email ja esta cadastrado
    const email = await executeQuery('SELECT A.ID_USUARIO FROM BSTAB_USUSARIOS A WHERE upper(A.email) = upper(:email) AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa',{email: dados.email, id_grupo_empresa: dados.id_grupo_empresa});
        
   //console.log(!idgrupoempresa);

    if (idgrupoempresa.length <= 0){
        throw new Error('Grupo de empresa informado não encontrado !');
    };

    if (idfilial.length <= 0){
        throw new Error('Filial informado não encontrado !');
    };
    
    if (idsetor.length <= 0){
        throw new Error('Setor informado não encontrado !');
    };


    const ssqlInsert = `
          insert into bstab_ususarios  
          (id_usuario, 
          id_usuario_erp,  
          nome,  
          email,  
          dtcadastro,  
          id_empresa_erp,  
          id_setor_erp,  
          id_grupo_empresa,  
          cpf,  
          rg,  
          telefone,  
          cep,  
          rua,  
          numero,  
          uf,  
          cidade,  
          bairro,  
          complemento,  
          id_filial_erp,  
          datanascimento,  
          sexo,  
          nacionalidade,  
          naturalidade,  
          cargo,  
          dataadmissao,  
          tipodecontrato,  
          cnh,  
          dataexpiracaocnh,
          id_banco,
          agencia,
          conta,
          operacao,
          id_bancoterceiro,
          agenciaterceiro,
          contaterceiro,
          operacaoterceiro,
          beneficiadoterceiro,
          chavepix,
          chavepixterceiro
          )  
          values  
          ((SELECT NVL(MAX(A.ID_USUARIO),0)+1 FROM BSTAB_USUSARIOS A),  
          :id_usuario_erp,
          :nome,  
          :email,  
          sysdate,  
          :id_empresa_erp,  
          :id_setor_erp,  
          :id_grupo_empresa,  
          :cpf,  
          :rg,  
          :telefone,  
          :cep,  
          :rua,  
          :numero,  
          :uf,  
          :cidade,  
          :bairro,  
          :complemento,  
          :id_filial_erp,  
          TO_DATE(:datanascimento, 'YYYY-MM-DD'),  
          :sexo,  
          :nacionalidade,  
          :naturalidade,  
          :cargo,  
          TO_DATE(:dataadmissao, 'YYYY-MM-DD'),  
          :tipodecontrato,  
          :cnh,  
          TO_DATE(:dataexpiracaocnh, 'YYYY-MM-DD'),
          :id_banco,
          :agencia,
          :conta,
          :operacao,
          :id_bancoterceiro,
          :agenciaterceiro,
          :contaterceiro,
          :operacaoterceiro,
          :beneficiadoterceiro,
          :chavepix,
          :chavepixterceiro
          )
        `;

    // processo de insert ou update
    if (!dados.id_usuario){
            
        if (cpf.length > 0){
            throw new Error('CPF informado ja existe !');
        };
        
        if (email.length > 0){
            throw new Error('E-mail informado ja existe !');
        };

        
       try {     
        
            // CADASTRAR NO WINTHOR
            const integracao = await consultarIntegracao(dados.id_grupo_empresa, 17);

            const jsonReq = {
                nome: dados.Nome,  
                email: dados.email,  
                id_empresa_erp: dados.id_empresa_erp,  
                id_setor_erp: dados.id_setor_erp,  
                id_grupo_empresa: dados.id_grupo_empresa,  
                cpf: dados.cpf,  
                rg: dados.rg,  
                telefone: dados.telefone,  
                cep: dados.cep,  
                rua: dados.rua,  
                numero: dados.numero,  
                uf: dados.uf,  
                cidade: dados.cidade,  
                bairro: dados.bairro,  
                complemento: dados.complemento,  
                id_filial_erp: dados.id_filial_erp,  
                datanascimento: dados.datanascimento,  
                sexo: dados.sexo,  
                nacionalidade: dados.nacionalidade,  
                naturalidade: dados.naturalidade,  
                cargo: dados.cargo,  
                dataadmissao: dados.dataadmissao,  
                tipodecontrato: dados.tipodecontrato,  
                cnh: dados.cnh,  
                dataexpiracaocnh: dados.dataexpiracaocnh,
                id_banco: dados.id_banco,
                agencia: dados.agencia,
                conta: dados.conta,
                operacao: dados.operacao,
                id_usuario_erp: dados.id_usuario_erp,
                id_bancoterceiro: dados.id_bancoterceiro,
                agenciaterceiro: dados.agenciaterceiro,
                contaterceiro: dados.contaterceiro,
                operacaoterceiro: dados.operacaoterceiro,
                beneficiadoterceiro: dados.beneficiadoterceiro,
                chavepix: dados.chavepix,
                chavepixterceiro: dados.chavepixterceiro
                
            }

            if (integracao[0].realizarintegracao == 'S'){

              axios.post(integracao[0].host+`/v1/clientesfull`, jsonReq)
              .then((resposta) =>{
                 console.log("Cadastro realizado com sucesso no cliente.");                 
              })
              .catch((err) =>{    
                 console.log("Servidor Cliente Inativo");
                return { sucesso: false, mensagem: 'Servidor Cliente Indisponivel !' }; 
              });

            }

            await executeQuery(ssqlInsert, jsonReq, true);

            // inserir rateios de funcionário caso existam
            if (dados.rateios && Array.isArray(dados.rateios)) {
                const idUsuarioCadastro = dados.id_usuario || (await executeQuery(
                    `SELECT ID_USUARIO FROM BSTAB_USUSARIOS WHERE ID_USUARIO_ERP = :id_usuario_erp AND ID_GRUPO_EMPRESA = :id_grupo_empresa`,
                    {id_usuario_erp: dados.id_usuario_erp, id_grupo_empresa: dados.id_grupo_empresa}
                ))[0]?.ID_USUARIO;

                if (idUsuarioCadastro) {
                    for (const rateio of dados.rateios) {
                        await SetRateioFuncionario({
                            id_usuario: idUsuarioCadastro,
                            id_centrodecusto: rateio.id_centrodecusto,
                            percentual: rateio.percentual || rateio.perrateio
                        });
                    }
                }
            }

            return { sucesso: true, mensagem: 'Cadastrado realizado com sucesso !'}

       } catch (error) {
            throw error;
       }
        

    }else{
       

        const ssqlInsert = `
        update bstab_ususarios set  
          nome = :nome,  
          email = :email,  
          id_empresa_erp = :id_empresa_erp,  
          id_setor_erp = :id_setor_erp,  
          id_grupo_empresa = :id_grupo_empresa,  
          cpf = :cpf,  
          rg = :rg,  
          telefone = :telefone,  
          cep = :cep,  
          rua = :rua,  
          numero = :numero,  
          uf = :uf,  
          cidade = :cidade,  
          bairro = :bairro,  
          complemento = :complemento,  
          id_filial_erp = :id_filial_erp,  
          datanascimento = TO_DATE(:datanascimento, 'YYYY-MM-DD'),  
          sexo = :sexo,  
          nacionalidade = :nacionalidade,  
          naturalidade = :naturalidade,  
          cargo = :cargo,  
          dataadmissao = TO_DATE(:dataadmissao, 'YYYY-MM-DD'),  
          tipodecontrato = :tipodecontrato,  
          cnh = :cnh,  
          dataexpiracaocnh = TO_DATE(:dataexpiracaocnh, 'YYYY-MM-DD'),
          id_banco = :id_banco,
          agencia = :agencia,
          conta = :conta,
          id_usuario_erp = :id_usuario_erp,
          operacao = :operacao,
          id_bancoterceiro = :id_bancoterceiro,
          agenciaterceiro = :agenciaterceiro,
          contaterceiro = :contaterceiro,
          operacaoterceiro = :operacaoterceiro,
          beneficiadoterceiro = :beneficiadoterceiro,
          chavepix =:chavepix,
          chavepixterceiro = :chavepixterceiro
          where id_usuario = :id_usuario
      `;

     try {      
        
          // ATUALIZAR NO WINTHOR
          const integracao = await consultarIntegracao(dados.id_grupo_empresa, 17);

          const jsonReq = {
              nome: dados.Nome,  
              email: dados.email,  
              id_empresa_erp: dados.id_empresa_erp,  
              id_setor_erp: dados.id_setor_erp,  
              id_grupo_empresa: dados.id_grupo_empresa,  
              cpf: dados.cpf,  
              rg: dados.rg,  
              telefone: dados.telefone,  
              cep: dados.cep,  
              rua: dados.rua,  
              numero: dados.numero,  
              uf: dados.uf,  
              cidade: dados.cidade,  
              bairro: dados.bairro,  
              complemento: dados.complemento,  
              id_filial_erp: dados.id_filial_erp,  
              datanascimento: dados.datanascimento,  
              sexo: dados.sexo,  
              nacionalidade: dados.nacionalidade,  
              naturalidade: dados.naturalidade,  
              cargo: dados.cargo,  
              dataadmissao: dados.dataadmissao,  
              tipodecontrato: dados.tipodecontrato,  
              cnh: dados.cnh,  
              dataexpiracaocnh: dados.dataexpiracaocnh,  
              id_usuario: dados.id_usuario ,
              id_banco: dados.id_banco,
              agencia: dados.agencia,
              conta: dados.conta,
              operacao: dados.operacao,
              id_bancoterceiro :dados.id_bancoterceiro,              
              agenciaterceiro :dados.agenciaterceiro,
              contaterceiro :dados.contaterceiro,
              operacaoterceiro :dados.operacaoterceiro,
              beneficiadoterceiro :dados.beneficiadoterceiro,
              chavepix: dados.chavepix,
              chavepixterceiro: dados.chavepixterceiro,
              id_usuario_erp: dados.id_usuario_erp 
          }

          if (integracao[0].realizarintegracao == 'S'){

              axios.post(integracao[0].host+`/v1/clientesfull`, jsonReq)
              .then((resposta) =>{
                 console.log("Cadastro realizado com sucesso no cliente.");
              })
              .catch((err) =>{
                console.log("Servidor Cliente Inativo");
                return { sucesso: false, mensagem: 'Servidor Cliente Indisponivel !' };
              });

          }

          await executeQuery(ssqlInsert, jsonReq , true);

          if (dados.rateios && Array.isArray(dados.rateios)) {
              for (const rateio of dados.rateios) {
                  await SetRateioFuncionario({
                      id_usuario: dados.id_usuario,
                      id_centrodecusto: rateio.id_centrodecusto,
                      percentual: rateio.percentual || rateio.perrateio
                  });
              }
          }

          return { sucesso: true, mensagem: 'Cadastro alterado com sucesso !'}

     } catch (error) {
          throw error;
     }


    }    

}


export async function setCredencias(jsonReq) {

    

    const ssqlHost = `
    SELECT * FROM BSTAB_HOSTCLIENTES A WHERE A.ID_GRUPO_EMPRESAS = :id_grupo_empresa
    `;

    const updatCredenciais = `
    update bstab_ususarios a set a.email = :email, a.senha = :senha where a.id_usuario_erp = :id_usuario_erp and a.id_grupo_empresa = :id_grupo_empresa
    `;    

    const sqlidusuarioerp = `
    SELECT s.id_usuario_erp FROM BSTAB_USUSARIOS S WHERE S.Id_Usuario = :id_usuario
    `;

    try {

        const host = await executeQuery(ssqlHost,{id_grupo_empresa: jsonReq.id_grupo_empresa});
        const idusuarioerp = await executeQuery(sqlidusuarioerp, {id_usuario: jsonReq.id_usuario});

        const respose = await axios.post(host[0].host+`/v1/Usuario/Credencias`, {id_usuario_erp: idusuarioerp[0].id_usuario_erp});  

        if (respose.status == 200){    
            
            await executeQuery(updatCredenciais,{
                email: respose.data.nome_guerra,
                senha: respose.data.senha,
                id_usuario_erp: respose.data.matricula,
                id_grupo_empresa: jsonReq.id_grupo_empresa
            },true);

        } 
        
        return {mensagem: 'Credenciais atualizada com sucesso !'}

    } catch (error) {
        throw error; 
    }
}

// ---------------------------------------------------------------
// FOTO DO USUÁRIO
// Requer coluna FOTO VARCHAR2(500) na tabela BSTAB_USUSARIOS:
//   ALTER TABLE BSTAB_USUSARIOS MODIFY FOTO VARCHAR2(500);
// ---------------------------------------------------------------

export async function SetFotoUsuario(id_usuario, foto_caminho) {
    const ssql = `UPDATE BSTAB_USUSARIOS SET FOTO = :foto WHERE ID_USUARIO = :id_usuario`;
    try {
        await executeQuery(ssql, { foto: foto_caminho || null, id_usuario }, true);
        return { mensagem: 'Foto salva com sucesso!' };
    } catch (error) {
        throw error;
    }
}

export async function GetFotoAtualUsuario(id_usuario) {
    const ssql = `SELECT FOTO as "foto" FROM BSTAB_USUSARIOS WHERE ID_USUARIO = :id_usuario`;
    try {
        const result = await executeQuery(ssql, { id_usuario });
        return result[0]?.foto || null;
    } catch {
        return null;
    }
}

export async function GetFotoUsuario(id_usuario) {
    const ssql = `SELECT FOTO as "foto" FROM BSTAB_USUSARIOS WHERE ID_USUARIO = :id_usuario`;
    try {
        const result = await executeQuery(ssql, { id_usuario });
        return result[0] || { foto: null };
    } catch (error) {
        throw error;
    }
}