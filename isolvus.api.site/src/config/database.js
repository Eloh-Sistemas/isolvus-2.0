// src/config/database.js

import oracledb from 'oracledb';
import { dbConfig } from './dbConfig.js'; // Configurações do banco de dados

if (process.env.ORACLE_CLIENT_DIR) {
  oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_DIR });
}

export async function getConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);    
    return connection;
  } catch (err) {    
    console.log(err);
    throw new Error('Erro ao conectar ao banco de dados');
  }
}

function lerLobComoTexto(lob) {
  return new Promise((resolve, reject) => {
    let texto = '';
    lob.setEncoding('utf8');

    lob.on('data', (chunk) => {
      texto += chunk;
    });

    lob.on('end', () => {
      resolve(texto);
    });

    lob.on('error', (err) => {
      reject(err);
    });
  });
}

export async function executeQuery(sql, binds = {}, autoCommit = false) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit,
    });

    const processarRow = async (row) => {
      const newRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'object' && value.constructor.name === 'Lob') {
          newRow[key.toLowerCase()] = await lerLobComoTexto(value);
        } else {
          newRow[key.toLowerCase()] = value;
        }
      }
      return newRow;
    };

    if (result.rows) {
      const dadosConvertidos = await Promise.all(result.rows.map(processarRow));
      return dadosConvertidos;
    }

    return result;
  } catch (err) {
    throw new Error(`Erro ao executar consulta: ${err.message}`);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

export async function executeQueryFull(sql, binds = [], autoCommit = false) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: autoCommit,
    });

    // NÃO altera os nomes das chaves (mantém conforme definido no SELECT)
    return result.rows ?? result;
  } catch (err) {
    throw new Error(`Erro ao executar consulta (Full): ${err.message}`);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}