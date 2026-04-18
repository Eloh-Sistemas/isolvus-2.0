import { promises as fs } from "fs";
import path from "path";
import { getConnection } from "../config/database.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveStoredFilePath(filePath = "") {
  const normalizedPath = String(filePath || "")
    .replace(/^[/\\]+/, "")
    .replace(/\//g, path.sep);

  return path.resolve(__dirname, "..", normalizedPath);
}

export async function SetregistrarArquivo(id_rotina, id_relacional, filePath, id_grupo_empresa) {
  const ssqlInsert = `
    INSERT INTO bstab_arquivos
    (id_arquivo, id_rotina, id_relacional, file_path, id_grupo_empresa)
    VALUES (
      (SELECT NVL(MAX(id_arquivo) + 1, 1) FROM bstab_arquivos),
      :id_rotina,
      :id_relacional,
      :file_path,
      :id_grupo_empresa
    )
  `;

  const connection = await getConnection();
  try {
    await connection.execute(ssqlInsert, {
      id_rotina,
      id_relacional,
      file_path: filePath,
      id_grupo_empresa: id_grupo_empresa
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function ListarArquivosPorRotinaRelacional(id_rotina, id_relacional) {
  const ssql = `
    SELECT       
      f.valor || '/' ||REPLACE( REPLACE(REPLACE(a.file_path, 'src\\', ''), '\\', '/'), '//', '/') AS file_path,
      id_arquivo
    FROM 
      bstab_arquivos a
    JOIN 
      bstab_parametroporgrupoempresa f ON a.id_grupo_empresa = f.id_grupo_empresa
    WHERE a.id_rotina = :id_rotina
      AND a.id_relacional = :id_relacional
    ORDER BY 
      a.id_arquivo
  `;

  const connection = await getConnection();
  try {
    const result = await connection.execute(ssql, {
      id_rotina,
      id_relacional,
    });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}


export async function excluirArquivo(id_arquivo) {
  const connection = await getConnection();

  try {
    // Buscar o caminho do arquivo
    const selectSQL = `
      SELECT file_path caminho_arquivo
      FROM bstab_arquivos
      WHERE id_arquivo = :id_arquivo
    `;

    const resultSelect = await connection.execute(selectSQL, { id_arquivo });

    if (resultSelect.rows.length === 0) {
      return 0; // Arquivo não encontrado
    }

    const caminhoRelativo = resultSelect.rows[0][0]; // A coluna caminho_arquivo
    const caminhoAbsoluto = resolveStoredFilePath(caminhoRelativo);

    // Deletar o arquivo do diretório
    try {
      await fs.unlink(caminhoAbsoluto);
    } catch (fsError) {
      console.warn("Arquivo físico não encontrado ou já deletado:", fsError.message);
    }

    // Deletar do banco de dados
    const deleteSQL = `
      DELETE FROM bstab_arquivos
      WHERE id_arquivo = :id_arquivo
    `;
    const resultDelete = await connection.execute(deleteSQL, { id_arquivo });
    await connection.commit();

    return resultDelete.rowsAffected;
  } catch (err) {
    console.error("Erro ao excluir arquivo:", err);
    throw new Error("Erro ao excluir arquivo");
  } finally {
    await connection.close();
  }
}

export async function excluirArquivosPorIdRelacional(id_relacional, id_rotina) {
  const connection = await getConnection();

  try {
    // Buscar todos os caminhos de arquivos com o id_relacional
    const selectSQL = `
      SELECT file_path
      FROM bstab_arquivos
      WHERE id_relacional = :id_relacional
        and id_rotina = :id_rotina
    `;

    const resultSelect = await connection.execute(selectSQL, { id_relacional, id_rotina });

    if (resultSelect.rows.length === 0) {
      return 0; // Nenhum arquivo encontrado
    }

    // Excluir arquivos fisicamente
    for (const row of resultSelect.rows) {
      const caminhoRelativo = row[0];
      const caminhoAbsoluto = resolveStoredFilePath(caminhoRelativo);

      try {
        await fs.unlink(caminhoAbsoluto);
      } catch (fsError) {
        console.warn("Arquivo físico não encontrado ou já deletado:", fsError.message);
      }
    }

    // Excluir registros do banco de dados
    const deleteSQL = `
      DELETE FROM bstab_arquivos
      WHERE id_relacional = :id_relacional
        and id_rotina = :id_rotina
    `;
    const resultDelete = await connection.execute(deleteSQL, { id_relacional, id_rotina });
    await connection.commit();

    return resultDelete.rowsAffected;
  } catch (err) {
    console.error("Erro ao excluir arquivos:", err);
    throw new Error("Erro ao excluir arquivos");
  } finally {
    await connection.close();
  }
}


