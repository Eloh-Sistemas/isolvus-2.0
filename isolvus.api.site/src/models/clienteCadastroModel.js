import oracledb from "oracledb";
import { getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";

export async function buscarClientePorCGC(cgcEnt) {
  const connection = await getConnection();
  try {
    const query = `
      SELECT * 
       FROM (
          SELECT * FROM BSTAB_CLIENTEVENDA WHERE REGEXP_REPLACE(cgc, '[^0-9]', '') =  REGEXP_REPLACE(:cgcEnt, '[^0-9]', '')
          ORDER BY IDCLIENTEVENDA DESC
      )
      WHERE ROWNUM = 1
    `;

    const result = await connection.execute(query, { cgcEnt }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    return result.rows[0] || null;

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    throw error;
  } finally {
    await connection.close();
  }
}

export async function inserirCliente({
  nome,
  cgc,
  email = '',
  telefone,
  latitude = '',
  longitude = '',
  endereco = '',
  numerocasa = '',
  bairro = '',
  cidade = '',
  cep = '',
  estado = '',
  idclientevendaerp = '',
  idgrupoempresa
}) {
  const connection = await getConnection();

  try {
    const integracaoQuery = `
      SELECT I.ID_SERVIDOR,
             H.HOST,
             I.ID_INTEGRACAO,
             I.INTEGRACAO,
             I.REALIZARINTEGRACAO,
             I.METODO
        FROM BSTAB_INTEGRACAO I
        JOIN BSTAB_HOSTCLIENTES H ON I.ID_SERVIDOR = H.ID_GRUPO_EMPRESAS
       WHERE I.ID_SERVIDOR = :idgrupoempresa
       ORDER BY I.ID_INTEGRACAO
    `;

    const integracaoResult = await connection.execute(
      integracaoQuery,
      { idgrupoempresa },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (integracaoResult.rows.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhuma configuração de integração encontrada para este grupo de empresa.",
        cliente: null
      };
    }

    const { HOST, REALIZARINTEGRACAO } = integracaoResult.rows[0];

    const checkQuery = `
      SELECT * 
       FROM (
          SELECT * FROM BSTAB_CLIENTEVENDA WHERE CGC = :cgc
          ORDER BY IDCLIENTEVENDA DESC
      )
      WHERE ROWNUM = 1       
    `;
    const checkResult = await connection.execute(
      checkQuery,
      { cgc },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length > 0) {
      return {
        sucesso: false,
        mensagem: "Cliente já existe no banco local.",
        cliente: checkResult.rows[0]
      };
    }
      const maxIdResult = await connection.execute(
        `SELECT NVL(MAX(idclientevenda), 0) + 1 as NOVOID FROM bstab_clientevenda`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

    let clienteFinal = null;

    if (REALIZARINTEGRACAO === 'S') {

      try {
        const response = await axios.post(
          `${HOST}/v1/clientes`,
          {
            cgcEnt: cgc,
            clienteNome: nome,
            telEnt: telefone
          },
          authApiClient
        );       
        
        console.log(response.data.cliente);

        if (response.status === 201 || response.status === 200) {
          const c = response.data.cliente;

          clienteFinal = {
            IDCLIENTEVENDA: maxIdResult.rows[0].NOVOID,
            CLIENTE: c.CLIENTE,
            CGC: c.CGCENT,
            CONTATO: c.TELENT,
            EMAIL: '',
            LATITUDE: '',
            LONGITUDE: '',
            ENDERECO: c.ENDERENT,
            NUMEROCASA: '',
            BAIRRO: c.BAIRROENT,
            CIDADE: c.MUNICENT,
            CEP: c.CEPENT,
            ESTADO: c.ESTENT,
            IDCLIENTEVENDAERP: c.CODCLI,
            IDGRUPOEMPRESA: idgrupoempresa
          };
        } else {
          return {
            sucesso: false,
            mensagem: `Erro ao cadastrar cliente na API externa. Status: ${response.status}`,
            cliente: null
          };
        }
      } catch (error) {
        return {
          sucesso: false,
          mensagem: `Erro ao criar cliente na API externa: ${error.message}`,
          cliente: null
        };
      }
    } else {

      clienteFinal = {
        IDCLIENTEVENDA: maxIdResult.rows[0].NOVOID,
        CLIENTE: nome,
        CGC: cgc,
        CONTATO: telefone,
        EMAIL: email,
        LATITUDE: latitude,
        LONGITUDE: longitude,
        ENDERECO: endereco,
        NUMEROCASA: numerocasa,
        BAIRRO: bairro,
        CIDADE: cidade,
        CEP: cep,
        ESTADO: estado,
        IDCLIENTEVENDAERP: idclientevendaerp,
        IDGRUPOEMPRESA: idgrupoempresa
      };
    }

    const insertQuery = `
      INSERT INTO bstab_clientevenda (
        idclientevenda,
        cliente,
        cgc,
        contato,
        email,
        latitude,
        longitude,
        endereco,
        numerocasa,
        bairro,
        cidade,
        cep,
        estado,
        idclientevendaerp,
        idgrupoempresa
      ) VALUES (
        :idclientevenda,
        :cliente,
        :cgc,
        :contato,
        :email,
        :latitude,
        :longitude,
        :endereco,
        :numerocasa,
        :bairro,
        :cidade,
        :cep,
        :estado,
        :idclientevendaerp,
        :idgrupoempresa
      )
    `;

    const binds = {
      idclientevenda: clienteFinal.IDCLIENTEVENDA,
      cliente: clienteFinal.CLIENTE,
      cgc: clienteFinal.CGC,
      contato: clienteFinal.CONTATO,
      email: clienteFinal.EMAIL,
      latitude: clienteFinal.LATITUDE,
      longitude: clienteFinal.LONGITUDE,
      endereco: clienteFinal.ENDERECO,
      numerocasa: clienteFinal.NUMEROCASA,
      bairro: clienteFinal.BAIRRO,
      cidade: clienteFinal.CIDADE,
      cep: clienteFinal.CEP,
      estado: clienteFinal.ESTADO,
      idclientevendaerp: clienteFinal.IDCLIENTEVENDAERP,
      idgrupoempresa: clienteFinal.IDGRUPOEMPRESA
    };

    await connection.execute(insertQuery, binds, { autoCommit: true });

    return {
      sucesso: true,
      mensagem: "Cliente cadastrado com sucesso.",
      cliente: clienteFinal
    };

  } catch (error) {
    return {
      sucesso: false,
      mensagem: `Erro ao executar operação: ${error.message}`,
      cliente: null
    };
  } finally {
    await connection.close();
  }
}
