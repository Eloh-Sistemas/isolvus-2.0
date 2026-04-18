import { executeQuery, executeQueryFull, getConnection } from "../config/database.js";

export async function setcadastrarIntegracaoFornecedor(jsonReq) {

    const sql = `
    insert into bstab_cadarqintfornec
    (id_intfornec,
    nomedoarquivo,
    psql,
    id_fornecerp,
    id_grupo_empresa,
    id_funcultalt,
    dtultalt,
    id_filialerp,
    basededados,
    status,
    tipodoarquivo,
    separador,
    gerarcoluna)
    values
    ((select nvl(max(a.Id_Intfornec)+1,1) from bstab_cadarqintfornec a) ,
    :nomedoarquivo,
    :psql,
    :id_fornecerp,
    :id_grupo_empresa,
    :id_funcultalt,
    sysdate,
    :id_filialerp,
    :basededados,
    :status,
    :tipodoarquivo,
    :separador,
    :gerarcoluna)
    `;

    const connection = await getConnection();
    try {      

        await connection.execute(sql,{
            nomedoarquivo: jsonReq.nomedoarquivo,
            psql: jsonReq.psql ? Buffer.from(jsonReq.psql, 'utf-8') : '',
            id_fornecerp: jsonReq.id_fornecerp,
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_funcultalt: jsonReq.id_funcultalt,
            id_filialerp: jsonReq.id_filialerp,
            basededados: jsonReq.basededados,
            tipodoarquivo: jsonReq.tipodoarquivo,
            status: jsonReq.status,
            separador: jsonReq.separador,
            gerarcoluna: jsonReq.gerarcoluna
        });    

        connection.commit();

        return {mensagem: 'Cadastrada com sucesso!'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}

export async function setalterarIntegracaoFornecedor(jsonReq) {

    const sql = `
    update bstab_cadarqintfornec
    set 
        nomedoarquivo = :nomedoarquivo,
        psql = :psql,
        id_fornecerp = :id_fornecerp,
        id_grupo_empresa = :id_grupo_empresa,
        id_funcultalt = :id_funcultalt,
        dtultalt = :dtultalt,
        id_filialerp = :id_filialerp,
        basededados = :basededados,
        tipodoarquivo = :tipodoarquivo,
        status = :status,
        separador = :separador,
        gerarcoluna = :gerarcoluna
    where id_intfornec = :id_intfornec
    `;

    const connection = await getConnection();
    try {      

        await connection.execute(sql,{
            nomedoarquivo: jsonReq.nomedoarquivo,
            psql: jsonReq.psql ? Buffer.from(jsonReq.psql, 'utf-8') : '',
            id_fornecerp: jsonReq.id_fornecerp,
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_funcultalt: jsonReq.id_funcultalt,
            dtultalt: jsonReq.dtultalt,
            id_filialerp: jsonReq.id_filialerp,
            basededados: jsonReq.basededados,
            tipodoarquivo: jsonReq.tipodoarquivo,
            id_intfornec: jsonReq.id_intfornec,
            status: jsonReq.status,
            separador: jsonReq.separador,
            gerarcoluna: jsonReq.gerarcoluna
        });    

        connection.commit();

        return {mensagem: 'Alterada com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}

export async function setexluirIntegracaoFornecedorr(jsonReq) {

    const sql = `
    delete from bstab_cadarqintfornec where id_intfornec = :id_intfornec
    `;

    const connection = await getConnection();
    try {      

        await connection.execute(sql,{
            id_intfornec: jsonReq.id_intfornec
        });    

        connection.commit();

        return {mensagem: 'Excluida com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}

import oracledb from 'oracledb';

export async function getConsultarIntegracaoFornecedorr(jsonReq) {
  try {
    let ssql = `
      SELECT C.ID_INTFORNEC,
             C.NOMEDOARQUIVO,
             C.PSQL,
             C.ID_FORNECERP,
             F.FORNECEDOR,
             C.ID_FUNCULTALT,
             U.NOME AS FUNCIONARIO,
             C.DTULTALT,
             C.ID_FILIALERP,
             E.RAZAOSOCIAL,
             C.BASEDEDADOS,
             C.TIPODOARQUIVO,
             C.STATUS,
             c.separador,
             c.gerarcoluna
        FROM BSTAB_CADARQINTFORNEC C
        JOIN BSTAB_FORNECEDOR F ON C.ID_FORNECERP = F.ID_FORNEC_ERP 
                                AND C.ID_GRUPO_EMPRESA = F.ID_GRUPO_EMPRESA
        JOIN BSTAB_USUSARIOS U ON C.ID_FUNCULTALT = U.ID_USUARIO_ERP 
                               AND C.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA
        JOIN BSTAB_EMPRESAS E ON C.ID_FILIALERP = E.ID_ERP 
                               AND C.ID_GRUPO_EMPRESA = E.ID_GRUPO_EMPRESA
       WHERE C.ID_GRUPO_EMPRESA = :id_grupo_empresa
    `;

    let condicional = [];
    let parametros = { id_grupo_empresa: jsonReq.id_grupo_empresa };

    if (jsonReq.id_filialerp && jsonReq.id_filialerp > 0) {
      condicional.push("C.ID_FILIALERP = :id_filialerp");
      parametros.id_filialerp = jsonReq.id_filialerp;
    }

    if (jsonReq.id_fornecerp && jsonReq.id_fornecerp > 0) {
      condicional.push("C.ID_FORNECERP = :id_fornecerp");
      parametros.id_fornecerp = jsonReq.id_fornecerp;
    }

    if (jsonReq.nomedoarquivo && jsonReq.nomedoarquivo.trim() !== "") {
      condicional.push("C.NOMEDOARQUIVO LIKE :nomedoarquivo");
      parametros.nomedoarquivo = `%${jsonReq.nomedoarquivo.trim()}%`;
    }

    if (condicional.length > 0) {
      ssql += " AND " + condicional.join(" AND ");
    }

    ssql += " ORDER BY C.ID_FORNECERP, C.ID_FILIALERP DESC";

    const connection = await getConnection();
    const result = await connection.execute(ssql, parametros, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const rows = result.rows || [];

    // Função para converter LOB em string (já existente)
    function streamToString(lob) {
      return new Promise((resolve, reject) => {
        let content = '';
        lob.setEncoding('utf8');
        lob.on('data', chunk => content += chunk);
        lob.on('end', () => resolve(content));
        lob.on('error', err => reject(err));
      });
    }

    // Convertendo as chaves para minúsculas e tratando LOBs
    const convertedRows = await Promise.all(
      rows.map(async row => {
        const newRow = {};
        for (const key in row) {
          let value = row[key];
          if (value && typeof value === 'object' && typeof value.setEncoding === 'function') {
            // É um LOB (CLOB)
            value = await streamToString(value);
          }
          newRow[key.toLowerCase()] = value;
        }
        return newRow;
      })
    );

    await connection.close();

    return convertedRows;

  } catch (error) {
    console.error(error);
    throw new Error("Erro ao consultar integração do fornecedor.");
  }
}

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import axios from "axios";
import { authApiClient } from "../config/authApiClient.js";
import { isSqlSelectSafe } from "../utils/sqlValidator.js";
import os from 'os';

function escapeSqlValue(value) {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 10)}'`;
  }
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return value.toString();
}

function substituirParametros(sql, params) {
  let sqlSubstituido = sql;

  for (const [key, val] of Object.entries(params)) {
    const regex = new RegExp(`:${key}\\b`, 'g'); // substituir só parâmetros exatos
    sqlSubstituido = sqlSubstituido.replace(regex, escapeSqlValue(val));
  }

  return sqlSubstituido;
}

async function gerarNomeArquivoDinamico(template, integracao) {
  const regex = /\[(\w+)(?:,'([^']+)')?\]/g;
  const cache = {};

  const resolveDataAtual = (formato = 'YYYYMMDD') => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const dia = pad(now.getDate());
    const mes = pad(now.getMonth() + 1);
    const ano = now.getFullYear();
    const hora = pad(now.getHours());
    const min = pad(now.getMinutes());
    const seg = pad(now.getSeconds());

    switch (formato.toUpperCase()) {
      case 'DDMMYYYY': return `${dia}${mes}${ano}`;
      case 'YYYYMMDD': return `${ano}${mes}${dia}`;
      case 'YYYYMMDDHHMMSS': return `${ano}${mes}${dia}${hora}${min}${seg}`;
      default: return `${ano}${mes}${dia}`;
    }
  };

  async function resolveValor(chave, formato) {
    chave = chave.toUpperCase();

    if (cache[chave]) return cache[chave];

    switch (chave) {
      case 'DATAATUAL':
        return resolveDataAtual(formato);
      case 'CNPJFORNEC':
        {
          const sql = `SELECT cnpj_cpf FROM bstab_fornecedor WHERE id_fornec_erp = :id_fornec_erp`;
          const res = await executeQuery(sql, { id_fornec_erp: integracao.id_fornecerp });
          const cnpj = res[0]?.cnpj_cpf?.replace(/[^\d]/g, '') ?? '00000000000000';
          cache[chave] = cnpj;
          return cnpj;
        }
      case 'RAZAOSOCIAL':
      case 'RAZAO':
        {
          const sql = `SELECT razao_social FROM bstab_fornecedor WHERE id_fornec_erp = :id_fornec_erp`;
          const res = await executeQuery(sql, { id_fornec_erp: integracao.id_fornecerp });
          const razao = res[0]?.razao_social?.replace(/[^\w\s]/g, '').replace(/\s+/g, '_') ?? 'RAZAO';
          cache[chave] = razao;
          return razao;
        }
      case 'FILIAL':
        {
          const sql = `SELECT nome FROM bstab_filial WHERE id_filialerp = :id_filialerp AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa`;
          const res = await executeQuery(sql, { id_filialerp: integracao.id_filialerp, id_grupo_empresa: integracao.id_grupo_empresa });
          const nomeFilial = res[0]?.nome?.replace(/[^\w\s]/g, '').replace(/\s+/g, '_') ?? 'FILIAL';
          cache[chave] = nomeFilial;
          return nomeFilial;
        }
      case 'CNPJFILIAL':
        {
          const sql = `SELECT CNPJ_CPF FROM BSTAB_EMPRESAS  A WHERE A.ID_ERP = :id_filialerp AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa`;
          const res = await executeQuery(sql, { id_filialerp: integracao.id_filialerp, id_grupo_empresa: integracao.id_grupo_empresa });
          const cnpj_filial = res[0]?.cnpj_cpf?.replace(/[^\w\s]/g, '').replace(/\s+/g, '_') ?? 'FILIAL';
          cache[chave] = cnpj_filial;
          return cnpj_filial;
        }
      default:
        return `[${chave}]`; // placeholder inalterado
    }
  }

  let lastIndex = 0;
  const partes = [];

  for (const match of template.matchAll(regex)) {
    const [full, chave, formato] = match;
    const index = match.index;

    partes.push(template.slice(lastIndex, index));
    const valor = await resolveValor(chave, formato);
    partes.push(valor);

    lastIndex = index + full.length;
  }

  partes.push(template.slice(lastIndex));
  return partes.join('');
}



export async function getgerararquivoIntegracaoFornecedor(jsonReq) {

  try {
    const idarquivo = jsonReq.idsarquivogerar;

    let ssqlintegracoes = `
      select a.id_intfornec,
             a.nomedoarquivo,
             a.psql,
             a.tipodoarquivo,
             a.basededados,
             a.id_fornecerp,
             f.fornecedor,
             f.cnpj_cpf,
             a.id_grupo_empresa,
             h.host,
             a.separador,
             a.gerarcoluna,
             a.id_filialerp,
             a.id_fornecerp,
             a.id_filialerp
        from bstab_cadarqintfornec a
        join bstab_fornecedor f on (a.id_fornecerp = f.id_fornec_erp and a.id_grupo_empresa = f.id_grupo_empresa)
        join bstab_hostclientes h on (a.id_grupo_empresa = h.id_grupo_empresas)
            and a.id_intfornec = :id_intfornec
    `;

    for (const item of idarquivo) {

      const integracoes = await executeQuery(ssqlintegracoes, { id_intfornec: item.id_intfornec });
      const integracao = integracoes[0];

      console.log(integracao);

      //if (!isSqlSelectSafe(integracao.psql)) {
      //  throw new Error(`A consulta SQL fornecida para o item ${item.id_intfornec} não é permitida por razões de segurança, verifique o SQL.`);
      //}

      let dadosarquivo;

      if (integracao.basededados === "L") {
        const dadosResult = await executeQueryFull(integracao.psql, []);
        dadosarquivo = dadosResult;
      } else {
        const parametrosParaSubstituir = {};

        if (integracao.psql.includes(':codfilial')) {
          if (!integracao.id_filialerp) {
            throw new Error(`Parâmetro :codfilial está presente na SQL, mas não foi informado em integracao.id_filialerp.`);
          }
          parametrosParaSubstituir.codfilial = integracao.id_filialerp;
        }

        if (integracao.psql.includes(':codfornec')) {
          if (!integracao.id_fornecerp) {
            throw new Error(`Parâmetro :codfornec está presente na SQL, mas não foi informado em integracao.id_fornecerp.`);
          }
          parametrosParaSubstituir.codfornec = integracao.id_fornecerp;
        }

        if (integracao.psql.includes(':data1')) {
          if (!jsonReq.parametros?.data1) {
            throw new Error(`Parâmetro :data1 está presente na SQL, mas não foi informado em jsonReq.parametros.`);
          }
          parametrosParaSubstituir.data1 = jsonReq.parametros.data1;
        }

        if (integracao.psql.includes(':data2')) {
          if (!jsonReq.parametros?.data2) {
            throw new Error(`Parâmetro :data2 está presente na SQL, mas não foi informado em jsonReq.parametros.`);
          }
          parametrosParaSubstituir.data2 = jsonReq.parametros.data2;
        }

        const sqlPronto = substituirParametros(integracao.psql, parametrosParaSubstituir);

        const dadosResult = await axios.post(
          `${integracao.host}/v1/integracaofornecedor/dadosarquivo`,
          { sql: sqlPronto },
          authApiClient
        );

        if (dadosResult.data && Array.isArray(dadosResult.data)) {
          dadosarquivo = dadosResult.data;
        } else {
          throw new Error("Resposta da API remota não contém dados válidos.");
        }
      }

      const nomeBase = await gerarNomeArquivoDinamico(integracao.nomedoarquivo, integracao);
      const nomeArquivo = `${nomeBase}.${integracao.tipodoarquivo}`;


      const cnpjLimpo = integracao.cnpj_cpf.replace(/[^\d]/g, '');
      const pastaDestino = path.join(
        process.cwd(),
        '../arquivodeintegracaofornecedor',
        cnpjLimpo,
        `F${integracao.id_filialerp}`
      );

      fs.mkdirSync(pastaDestino, { recursive: true });

      const caminho = path.join(pastaDestino, nomeArquivo);
      const separador = integracao.separador || ';';
      const incluirCabecalho = integracao.gerarcoluna === 'S';

      if (!dadosarquivo || dadosarquivo.length === 0) {
        fs.writeFileSync(caminho, '', 'utf8');
        continue;
      }

      const colunasOriginais = Object.keys(dadosarquivo[0]);

      if (integracao.tipodoarquivo === 'txt' || integracao.tipodoarquivo === 'csv') {
        let conteudo = '';
        if (incluirCabecalho) {
          conteudo += colunasOriginais.join(separador) + os.EOL;
        }
        conteudo += dadosarquivo.map(obj =>
          colunasOriginais.map(col => obj[col] ?? '').join(separador)
        ).join(os.EOL);
        fs.writeFileSync(caminho, conteudo, 'utf8');
      } else if (integracao.tipodoarquivo === 'xlsx') {
        const worksheet = xlsx.utils.json_to_sheet(dadosarquivo, {
          skipHeader: !incluirCabecalho,
          header: colunasOriginais
        });
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
        xlsx.writeFile(workbook, caminho);
      } else {
        console.log(`Tipo de arquivo não suportado: ${integracao.tipodoarquivo}`);
      }
    }

    return { mensagem: 'Arquivos gerados com sucesso!' };

  } catch (error) {
    console.error(error);
    throw new Error(`Erro ao consultar dados de geração de arquivo fornecedor: ${error.message}`);
  }
}










