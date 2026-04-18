import { executeQueryFull } from "../config/database.js";
import { isSqlSelectSafe } from "../utils/sqlValidator.js";

export async function getintegracaoFornecedorDadosArquivo(jsonReq) {

  console.log(jsonReq);

  try {
    // ✅ Validação de segurança da SQL
    if (!jsonReq.sql || !isSqlSelectSafe(jsonReq.sql)) {
      throw new Error('A consulta SQL fornecida é inválida ou não permitida. Apenas comandos SELECT são aceitos.');
    }

    const result = await executeQueryFull(jsonReq.sql, []);
    return result;

  } catch (error) {
    console.error('Erro ao executar SQL:', error.message);
    throw new Error('Erro ao executar consulta de dados do fornecedor: ' + error.message);
  }
}

