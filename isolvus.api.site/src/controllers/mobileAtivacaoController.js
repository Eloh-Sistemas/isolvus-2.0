import os from "os";
import {
  atualizarStatusComandoAtivacaoMobile,
  enfileirarComandoAtivacaoMobile,
  excluirAtivacaoMobile,
  gerarAtivacaoMobile,
  listarAtivacoesMobile,
  listarRotaAtivacaoMobile,
  obterPoliticaAtualizacaoMobilePorPlataforma,
  obterProximoComandoPendenteAtivacaoMobile,
  obterApiBaseUrlPorParametro,
  registrarMonitoramentoAtivacaoMobile,
  redefinirAtivacaoMobile,
  redefinirAtivacaoMobilePorUsuario,
  validarAtivacaoPorCodigo,
  validarAtivacaoMobile,
} from "../models/mobileAtivacaoModel.js";

function obterIpLocal() {
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return null;
}

function obterBaseUrl(req) {
  const header = req.headers["x-forwarded-proto"];
  const protocolo = (header ? String(header).split(",")[0] : req.protocol) || "http";
  const host = req.get("host") || "";

  // Se variável de ambiente API_HOST estiver configurada, usa ela
  const apiHostEnv = process.env.API_HOST || null;
  if (apiHostEnv) return `${protocolo}://${apiHostEnv}`;

  // Se o host for localhost/127.0.0.1, substitui pelo IP da rede local
  // para que o celular consiga alcançar a API
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (isLocal) {
    const porta = host.includes(":") ? host.split(":")[1] : null;
    const ipLocal = obterIpLocal();
    if (ipLocal) {
      const baseComIp = porta ? `${protocolo}://${ipLocal}:${porta}` : `${protocolo}://${ipLocal}`;
      console.log(`[mobile-ativacao] Host era localhost, substituído por IP local: ${baseComIp}`);
      return baseComIp;
    }
    console.warn("[mobile-ativacao] Não foi possível detectar IP local. Configure API_HOST no .env (ex: API_HOST=192.168.0.9:3011).");
  }

  return `${protocolo}://${host}`;
}

function toBuildNumber(valor) {
  if (valor == null) return null;
  const apenasDigitos = String(valor).replace(/\D/g, "");
  if (!apenasDigitos) return null;
  const numero = Number(apenasDigitos);
  return Number.isFinite(numero) ? numero : null;
}

async function avaliarPoliticaAtualizacaoObrigatoria(dispositivo_info) {
  const plataforma = String(dispositivo_info?.plataforma || dispositivo_info?.app?.platform || "").toLowerCase();
  const plataformaAtual = plataforma || "android";
  const buildAtual = toBuildNumber(dispositivo_info?.app?.build);

  const politica = await obterPoliticaAtualizacaoMobilePorPlataforma({
    plataforma: plataformaAtual,
  }).catch(() => null);

  const minBuild = toBuildNumber(politica?.min_build);
  const storeUrl = politica?.store_url || null;

  const mensagemPadrao = "Uma nova versao obrigatoria do aplicativo esta disponivel. Atualize para continuar.";
  const mensagem = String(politica?.mensagem || mensagemPadrao).trim();

  if (!minBuild || !buildAtual) {
    return {
      obrigatoria: false,
      motivo: null,
      plataforma: plataformaAtual,
      build_atual: buildAtual,
      min_build: minBuild,
      store_url: storeUrl,
      mensagem,
    };
  }

  const obrigatoria = buildAtual < minBuild;

  return {
    obrigatoria,
    motivo: obrigatoria ? "build_abaixo_minimo" : null,
    plataforma: plataformaAtual,
    build_atual: buildAtual,
    min_build: minBuild,
    store_url: storeUrl,
    mensagem,
  };
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
    console.log(`[mobile-ativacao] QR gerado com api_url: ${baseUrl} (parametro_db: "${urlParametro || "(vazio)"}")`);
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

export async function ExcluirAtivacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await excluirAtivacaoMobile({ id_ativacao });

    if (!resultado.rowsAffected) {
      return res.status(404).json({ error: "Ativação não encontrada para exclusão." });
    }

    return res.json({
      sucesso: true,
      excluido: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao excluir ativação mobile." });
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

    const comando = await obterProximoComandoPendenteAtivacaoMobile({ id_ativacao });
    const atualizacao = await avaliarPoliticaAtualizacaoObrigatoria(dispositivo_info || {});

    return res.json({
      sucesso: true,
      comando,
      atualizacao,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao registrar monitoramento do dispositivo." });
  }
}

export async function ListarRotaAtivacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { minutos, dt_inicio, dt_fim } = req.query || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const dados = await listarRotaAtivacaoMobile({ id_ativacao, minutos, dt_inicio, dt_fim });
    return res.json({
      sucesso: true,
      pontos: Array.isArray(dados) ? dados : [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao consultar rota do dispositivo." });
  }
}

export async function EnviarComandoLocalizacao(req, res) {
  try {
    const { id_ativacao } = req.params || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await enfileirarComandoAtivacaoMobile({
      id_ativacao,
      tipo_comando: "solicitar_localizacao",
      payload: {},
      id_usuario_criacao: req.body?.id_usuario || null,
    });

    if (!resultado.ok) {
      return res.status(409).json({
        error: "Somente ativações com status U podem receber comandos.",
        status_atual: resultado.statusAtivacao,
      });
    }

    return res.json({ sucesso: true, comando: resultado.comando });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao enviar comando para dispositivo." });
  }
}

export async function EnviarComandoPermissao(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { permissao } = req.body || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const permissoesPermitidas = new Set([
      "camera",
      "microfone",
      "notificacoes",
      "localizacao_foreground",
      "localizacao_background",
    ]);

    if (!permissoesPermitidas.has(String(permissao || ""))) {
      return res.status(400).json({ error: "Permissão inválida." });
    }

    const resultado = await enfileirarComandoAtivacaoMobile({
      id_ativacao,
      tipo_comando: "solicitar_permissao",
      payload: { permissao: String(permissao) },
      id_usuario_criacao: req.body?.id_usuario || null,
    });

    if (!resultado.ok) {
      return res.status(409).json({
        error: "Somente ativações com status U podem receber comandos.",
        status_atual: resultado.statusAtivacao,
      });
    }

    return res.json({ sucesso: true, comando: resultado.comando });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao enviar comando para dispositivo." });
  }
}

export async function EnviarComandoInativarDispositivo(req, res) {
  try {
    const { id_ativacao } = req.params || {};

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório." });
    }

    const resultado = await enfileirarComandoAtivacaoMobile({
      id_ativacao,
      tipo_comando: "redefinir_ativacao",
      payload: { motivo: "inativacao_remota_web" },
      id_usuario_criacao: req.body?.id_usuario || null,
    });

    if (!resultado.ok) {
      return res.status(409).json({
        error: "Somente ativações com status U podem ser inativadas remotamente.",
        status_atual: resultado.statusAtivacao,
      });
    }

    return res.json({ sucesso: true, comando: resultado.comando });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao enviar comando de inativação para dispositivo." });
  }
}

export async function ConfirmarComandoMobile(req, res) {
  try {
    const { id_ativacao } = req.params || {};
    const { id_comando, status_execucao, erro } = req.body || {};

    if (!id_ativacao || !id_comando) {
      return res.status(400).json({ error: "id_ativacao e id_comando são obrigatórios." });
    }

    const ok = await atualizarStatusComandoAtivacaoMobile({
      id_ativacao,
      id_comando,
      status_execucao: status_execucao || "done",
      erro_execucao: erro,
    });

    if (!ok) {
      return res.status(404).json({ error: "Comando não encontrado para esta ativação." });
    }

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erro ao confirmar execução de comando." });
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
