import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  ListarArquivosPorRotinaRelacional,
  SetregistrarArquivo,
  excluirArquivo,
} from "../models/uploadArquivosModal.js";

// Resolve corretamente o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ID_ROTINA_IMPORTACAO_REMESSA = "1030.2";
const pastaDocumentos = path.resolve(__dirname, "..", "documentos");
const pastaRemessas = path.resolve(__dirname, "..", "remessas");

function obterDestinoUpload(idRotina) {
  if (String(idRotina) === ID_ROTINA_IMPORTACAO_REMESSA) {
    return {
      pastaUploads: pastaRemessas,
      caminhoBase: "/remessas",
    };
  }

  return {
    pastaUploads: pastaDocumentos,
    caminhoBase: "/documentos",
  };
}

export async function uploadArquivosController(req, res) {
  try {
    const { id_rotina, id_relacional, id_grupo_empresa } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    const { pastaUploads, caminhoBase } = obterDestinoUpload(id_rotina);

    // Garante que a pasta exista
    if (!fs.existsSync(pastaUploads)) {
      fs.mkdirSync(pastaUploads, { recursive: true });
    }

    const arquivosSalvos = [];

    for (const file of req.files) {
      const nomeOriginal = path.basename(file.originalname);
      const isRemessa = String(id_rotina) === ID_ROTINA_IMPORTACAO_REMESSA;
      const nomeArquivo = isRemessa
        ? nomeOriginal
        : `${Date.now()}-${nomeOriginal}`;
      const caminhoAbsoluto = path.join(pastaUploads, nomeArquivo);
      const caminhoRelativo = `${caminhoBase}/${nomeArquivo}`;

      if (isRemessa && fs.existsSync(caminhoAbsoluto)) {
        return res.status(409).json({
          error: `Já existe um arquivo de remessa com o nome "${nomeArquivo}". Renomeie o arquivo antes de enviar.`
        });
      }

      // Salva o arquivo da memória no disco
      fs.writeFileSync(caminhoAbsoluto, file.buffer);

      // Registra no banco de dados o caminho RELATIVO
      await SetregistrarArquivo(id_rotina, id_relacional, caminhoRelativo, id_grupo_empresa);

      arquivosSalvos.push(caminhoRelativo);
    }

    // Retorna lista atualizada de arquivos (com caminhos relativos)
    const arquivos = await ListarArquivosPorRotinaRelacional(id_rotina, id_relacional);
    return res.status(200).json(arquivos);
  } catch (error) {
    console.error("Erro no uploadArquivosController:", error);
    return res.status(500).json({ error: "Erro ao processar upload." });
  }
}

export async function listarArquivosController(req, res) {
  try {
    const { id_rotina, id_relacional } = req.query;

    if (!id_rotina || !id_relacional) {
      return res.status(400).json({ error: "id_rotina e id_relacional são obrigatórios." });
    }

    const arquivos = await ListarArquivosPorRotinaRelacional(id_rotina, id_relacional);
    return res.status(200).json(arquivos);
  } catch (error) {
    console.error("Erro no listarArquivosController:", error);
    return res.status(500).json({ error: "Erro ao listar arquivos." });
  }
}

export async function excluirArquivoController(req, res) {
  const { id_arquivo } = req.params;

  try {
    const rowsAffected = await excluirArquivo(id_arquivo);

    if (rowsAffected > 0) {
      return res.status(200).json({ message: "Arquivo excluído com sucesso." });
    } else {
      return res.status(404).json({ message: "Arquivo não encontrado." });
    }
  } catch (err) {
    console.error("Erro ao excluir arquivo:", err);
    return res.status(500).json({ message: "Erro interno ao excluir arquivo." });
  }
}
