import {
  gerarAtivacaoMobile,
  listarAtivacoesMobile,
  revogarAtivacaoMobile,
  validarAtivacaoMobile,
} from "../models/mobileAtivacaoModel.js";

function obterBaseUrl(req) {
  const header = req.headers["x-forwarded-proto"];
  const protocolo = (header ? String(header).split(",")[0] : req.protocol) || "http";
  return `${protocolo}://${req.get("host")}`;
}

export async function GerarAtivacao(req, res) {
  try {
    const {
      id_empresa,
      razaosocial,
      id_usuario,
      id_usuario_destino,
      validade_minutos,
      api_base_url,
    } = req.body || {};

    if (!id_empresa) {
      return res.status(400).json({ error: "id_empresa é obrigatório." });
    }

    if (!id_usuario) {
      return res.status(400).json({ error: "id_usuario é obrigatório." });
    }

    const baseUrl = String(api_base_url || obterBaseUrl(req));
    const gerado = await gerarAtivacaoMobile({
      id_empresa,
      razaosocial,
      id_usuario,
      id_usuario_destino: id_usuario_destino || null,
      api_base_url: baseUrl,
      validade_minutos,
    });

    const qr_payload = JSON.stringify({
      versao: 1,
      api_url: baseUrl,
      token_ativacao: gerado.token_ativacao,
      codigo_ativacao: gerado.codigo_ativacao,
    });

    return res.json({
      sucesso: true,
      ...gerado,
      api_url: baseUrl,
      qr_payload,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao gerar ativação mobile." });
  }
}

export async function ListarAtivacao(req, res) {
  try {
    const { id_empresa } = req.query || {};
    const dados = await listarAtivacoesMobile({ id_empresa });
    return res.json(dados);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao listar ativações mobile." });
  }
}

export async function RevogarAtivacao(req, res) {
  try {
    const { id_ativacao, id_usuario } = req.body || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const linhas = await revogarAtivacaoMobile({ id_ativacao, id_usuario: id_usuario || null });
    if (!linhas) {
      return res.status(404).json({ error: "Ativação não encontrada ou já finalizada." });
    }

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao revogar ativação mobile." });
  }
}

export async function ValidarAtivacao(req, res) {
  try {
    const { token_ativacao, dispositivo, id_usuario } = req.body || {};

    if (!token_ativacao) {
      return res.status(400).json({ error: "token_ativacao é obrigatório." });
    }

    const resultado = await validarAtivacaoMobile({
      token_ativacao,
      dispositivo,
      ip_utilizacao: req.ip,
      id_usuario_ativacao: id_usuario || null,
    });

    if (!resultado.ok) {
      if (resultado.motivo === "TOKEN_INVALIDO") {
        return res.status(404).json({ error: "Token de ativação inválido." });
      }
      if (resultado.motivo === "TOKEN_JA_UTILIZADO") {
        return res.status(409).json({ error: "Token de ativação já utilizado." });
      }
      return res.status(410).json({ error: "Token de ativação expirado." });
    }

    return res.json({ sucesso: true, ...resultado.dados });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao validar ativação mobile." });
  }
}
