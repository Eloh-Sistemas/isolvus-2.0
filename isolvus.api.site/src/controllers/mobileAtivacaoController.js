import {
  gerarAtivacaoMobile,
  listarAtivacoesMobile,
  obterApiBaseUrlPorParametro,
  registrarMonitoramentoAtivacaoMobile,
  redefinirAtivacaoMobile,
  redefinirAtivacaoMobilePorUsuario,
  revogarAtivacaoMobile,
  validarAtivacaoPorCodigo,
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
      id_grupo_empresa,
      id_usuario_destino,
      validade_minutos,
    } = req.body || {};

    if (!id_empresa) {
      return res.status(400).json({ error: "id_empresa é obrigatório." });
    }

    if (!id_usuario) {
      return res.status(400).json({ error: "id_usuario é obrigatório." });
    }

    let urlParametro = "";
    try {
      urlParametro = await obterApiBaseUrlPorParametro({
        id_grupo_empresa,
        id_empresa,
      });
    } catch (erroParametro) {
      // Nao bloqueia geracao de QR por falha de leitura de parametro.
      console.warn("[mobile-ativacao] falha ao buscar URL em BSTAB_PARAMETROPORGRUPOEMPRESA:", erroParametro?.message || erroParametro);
    }

    const baseUrl = String(urlParametro || obterBaseUrl(req));
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

    const resultado = await revogarAtivacaoMobile({ id_ativacao, id_usuario: id_usuario || null });

    // Log temporario para auditoria de revogacao no ambiente.
    console.log("[mobile-ativacao:revogar]", {
      id_ativacao: Number(id_ativacao || 0),
      id_usuario: id_usuario || null,
      rowsAffected: resultado.rowsAffected,
      statusAtual: resultado.statusAtual,
      dtAlteracao: resultado.dtAlteracao,
      ip: req.ip,
      ts: new Date().toISOString(),
    });

    if (!resultado.rowsAffected) {
      const statusAtual = String(resultado.statusAtual || "").trim().toUpperCase();

      if (statusAtual === "U") {
        return res.status(409).json({
          error: "Ativação já utilizada. Revogação só é permitida antes da utilização.",
          status_atual: resultado.statusAtual,
        });
      }

      return res.status(404).json({
        error: "Ativação não encontrada ou não está pendente para revogação.",
        status_atual: resultado.statusAtual,
      });
    }

    return res.json({
      sucesso: true,
      status: resultado.statusAtual || "R",
      dt_alteracao: resultado.dtAlteracao,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao revogar ativação mobile." });
  }
}

export async function RevogarAtivacaoPorId(req, res) {

  

  try {
    const { id_ativacao } = req.params || {};
    const { id_usuario } = req.body || {};

    console.log(req.params, req.body);

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await revogarAtivacaoMobile({ id_ativacao, id_usuario: id_usuario || null });

    console.log("[mobile-ativacao:revogar:param]", {
      id_ativacao: Number(id_ativacao || 0),
      id_usuario: id_usuario || null,
      rowsAffected: resultado.rowsAffected,
      statusAtual: resultado.statusAtual,
      dtAlteracao: resultado.dtAlteracao,
      ip: req.ip,
      ts: new Date().toISOString(),
    });

    if (!resultado.rowsAffected) {
      const statusAtual = String(resultado.statusAtual || "").trim().toUpperCase();

      if (statusAtual === "U") {
        return res.status(409).json({
          error: "Ativação já utilizada. Revogação só é permitida antes da utilização.",
          status_atual: resultado.statusAtual,
        });
      }

      return res.status(404).json({
        error: "Ativação não encontrada ou não está pendente para revogação.",
        status_atual: resultado.statusAtual,
      });
    }

    return res.json({
      sucesso: true,
      status: resultado.statusAtual || "R",
      dt_alteracao: resultado.dtAlteracao,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao revogar ativação mobile." });
  }
}

export async function RedefinirAtivacaoPorUsuario(req, res) {
  try {
    const { id_usuario } = req.body || {};

    if (!id_usuario) {
      return res.status(400).json({ error: "id_usuario é obrigatório." });
    }

    const resultado = await redefinirAtivacaoMobilePorUsuario({ id_usuario });

    console.log("[mobile-ativacao:redefinir-por-usuario]", {
      id_usuario,
      rowsAffected: resultado.rowsAffected,
      ip: req.ip,
      ts: new Date().toISOString(),
    });

    return res.json({
      sucesso: true,
      rowsAffected: resultado.rowsAffected,
      status: "D",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao redefinir ativação mobile por usuário." });
  }
}

export async function RedefinirAtivacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { id_usuario } = req.body || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await redefinirAtivacaoMobile({ id_ativacao, id_usuario: id_usuario || null });

    console.log("[mobile-ativacao:redefinir]", {
      id_ativacao: Number(id_ativacao || 0),
      id_usuario: id_usuario || null,
      rowsAffected: resultado.rowsAffected,
      statusAtual: resultado.statusAtual,
      ip: req.ip,
      ts: new Date().toISOString(),
    });

    return res.json({
      sucesso: true,
      status: resultado.statusAtual || "D",
      dt_alteracao: resultado.dtAlteracao,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao redefinir ativação mobile." });
  }
}

export async function ValidarAtivacaoPorCodigo(req, res) {
  try {
    const { codigo_ativacao, dispositivo, dispositivo_info, id_usuario } = req.body || {};

    if (!codigo_ativacao) {
      return res.status(400).json({ error: "codigo_ativacao é obrigatório." });
    }

    const resultado = await validarAtivacaoPorCodigo({
      codigo_ativacao: String(codigo_ativacao).trim(),
      dispositivo,
      dispositivo_info,
      ip_utilizacao: req.ip,
      id_usuario_ativacao: id_usuario || null,
    });

    if (!resultado.ok) {
      if (resultado.motivo === "TOKEN_INVALIDO") {
        return res.status(404).json({ error: "Código de ativação inválido." });
      }
      if (resultado.motivo === "TOKEN_JA_UTILIZADO") {
        return res.status(409).json({ error: "Código de ativação já utilizado." });
      }
      return res.status(410).json({ error: "Código de ativação expirado." });
    }

    return res.json({ sucesso: true, ...resultado.dados });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao validar código de ativação mobile." });
  }
}

export async function ValidarAtivacao(req, res) {
  try {
    const { token_ativacao, dispositivo, dispositivo_info, id_usuario } = req.body || {};

    if (!token_ativacao) {
      return res.status(400).json({ error: "token_ativacao é obrigatório." });
    }

    const resultado = await validarAtivacaoMobile({
      token_ativacao,
      dispositivo,
      dispositivo_info,
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

export async function MonitorarAtivacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { dispositivo, dispositivo_info } = req.body || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await registrarMonitoramentoAtivacaoMobile({
      id_ativacao,
      dispositivo,
      dispositivo_info,
      ip_utilizacao: req.ip,
    });

    if (!resultado.rowsAffected) {
      const statusAtual = String(resultado.statusAtual || "").trim().toUpperCase();
      if (statusAtual && statusAtual !== "U") {
        return res.status(409).json({
          error: "Monitoramento permitido apenas para ativação utilizada (status U).",
          status_atual: statusAtual,
        });
      }

      return res.status(404).json({ error: "Ativação não encontrada." });
    }

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao registrar monitoramento do dispositivo." });
  }
}

export async function RegistrarErroAtivacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { contexto, mensagem, stack, timestamp } = req.body || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const erroInfo = {
      contexto: contexto || "desconhecido",
      mensagem: String(mensagem || "").slice(0, 1000),
      stack: String(stack || "").slice(0, 500),
      timestamp: timestamp || new Date().toISOString(),
      ip: req.ip,
    };

    console.error("[mobile-ativacao:erro]", JSON.stringify(erroInfo));

    // Salva o erro no DISPOSITIVO_INFO_JSON como campo `ultimo_erro`
    await registrarMonitoramentoAtivacaoMobile({
      id_ativacao,
      dispositivo_info: { source: "crash_report", ...erroInfo },
      ip_utilizacao: req.ip,
    }).catch(() => {});

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao registrar erro do dispositivo." });
  }
}
