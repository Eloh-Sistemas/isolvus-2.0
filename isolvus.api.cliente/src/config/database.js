// src/config/database.js

import oracledb from 'oracledb';
import { dbConfig } from './dbConfig.js'; // Configurações do banco de dados

oracledb.initOracleClient({
  libDir: '/opt/oracle/instantclient_21_12'
});

export async function getConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);    
    return connection;
  } catch (err) {    
    throw new Error('Erro ao conectar ao banco de dados');
  }
}

export async function executeQuery(sql, binds = [], autoCommit = false) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: autoCommit, // Define se a transação será commitada automaticamente
    });

    // Converter apenas as chaves do resultado para minúsculas, mantendo os valores originais
    const normalizeKeys = (row) => 
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
      );

    return result.rows ? result.rows.map(normalizeKeys) : result;
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