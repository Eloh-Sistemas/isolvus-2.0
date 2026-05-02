// Cache em memória para frames de espelhamento
// Em produção, usar Redis
import { enfileirarComandoAtivacaoMobile } from "../models/mobileAtivacaoModel.js";
import { broadcastFrameToViewers } from "../ws/mirrorWsHub.js";

const frameCache = new Map();
const MAX_CACHE_SIZE = 100; // Máximo de ativações com frames armazenados

/**
 * POST /mobile/ativacao/:id/espelho/frame
 * Recebe frame de captura de tela do dispositivo mobile
 */
export async function ReceberFrameEspelho(req, res) {
  try {
    const { id_ativacao } = req.params;
    const { frame_base64, timestamp } = req.body;

    if (!id_ativacao || !frame_base64) {
      return res.status(400).json({ error: "id_ativacao e frame_base64 são obrigatórios" });
    }

    // Validar tamanho da frame (máximo 2MB em base64)
    if (frame_base64.length > 2000000) {
      console.warn(`[ESPELHO] Frame muito grande para ativacao ${id_ativacao}: ${frame_base64.length} bytes`);
      return res.status(413).json({ error: "Frame muito grande (máx 2MB)" });
    }

    // Armazenar frame no cache
    frameCache.set(String(id_ativacao), {
      frame_base64,
      timestamp: timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    });

    broadcastFrameToViewers(String(id_ativacao), {
      frame_base64,
      timestamp: timestamp || new Date().toISOString(),
      transport: "http",
    });

    // Limpar cache se ficar muito grande
    if (frameCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(frameCache.entries());
      entries.slice(0, 20).forEach(([key]) => frameCache.delete(key));
    }

    console.log(`[ESPELHO] Frame recebido para ativacao ${id_ativacao}, tamanho: ${(frame_base64.length / 1024).toFixed(2)} KB`);

    return res.status(200).json({ success: true, message: "Frame recebido" });
  } catch (erro) {
    console.error("[ESPELHO] Erro ao receber frame:", erro);
    return res.status(500).json({ error: erro?.message || "Erro ao receber frame" });
  }
}

/**
 * GET /mobile/ativacao/:id/espelho/frame-atual
 * Retorna o frame mais recente da ativação
 */
export async function ObterFrameAtual(req, res) {
  try {
    const { id_ativacao } = req.params;

    if (!id_ativacao) {
      return res.status(400).json({ error: "id_ativacao é obrigatório" });
    }

    const frameData = frameCache.get(String(id_ativacao));

    if (!frameData) {
      return res.status(204).json(); // Sem conteúdo - ainda não há frame
    }

    return res.status(200).json(frameData);
  } catch (erro) {
    console.error("[ESPELHO] Erro ao obter frame:", erro);
    return res.status(500).json({ error: erro?.message || "Erro ao obter frame" });
  }
}

/**
 * POST /mobile/ativacao/:id/espelho/iniciar
 * Envia comando ao mobile para iniciar espelhamento
 * (Este endpoint será chamado pela web)
 */
export async function IniciarEspelhamento(req, res) {
  try {
    const { id_ativacao } = req.params;
    const { id_usuario } = req.body;

    if (!id_ativacao || !id_usuario) {
      return res.status(400).json({ error: "id_ativacao e id_usuario são obrigatórios" });
    }

    const resultado = await enfileirarComandoAtivacaoMobile({
      id_ativacao,
      tipo_comando: "iniciar_espelhamento",
      payload: null,
      id_usuario_criacao: id_usuario,
    });

    if (!resultado.ok) {
      return res.status(409).json({
        error: "Somente ativações com status U podem receber comandos.",
        status_atual: resultado.statusAtivacao,
      });
    }

    console.log(`[ESPELHO] Comando enfileirado para iniciar espelhamento da ativacao ${id_ativacao}`);

    return res.status(200).json({
      success: true,
      message: "Comando de espelhamento enfileirado para o próximo heartbeat",
      comando: resultado.comando,
    });
  } catch (erro) {
    console.error("[ESPELHO] Erro ao iniciar espelhamento:", erro);
    return res.status(500).json({ error: erro?.message || "Erro ao iniciar espelhamento" });
  }
}

/**
 * POST /mobile/ativacao/:id/espelho/parar
 * Envia comando ao mobile para parar espelhamento
 */
export async function PararEspelhamento(req, res) {
  try {
    const { id_ativacao } = req.params;
    const { id_usuario } = req.body;

    if (!id_ativacao || !id_usuario) {
      return res.status(400).json({ error: "id_ativacao e id_usuario são obrigatórios" });
    }

    // Limpar frame do cache
    frameCache.delete(String(id_ativacao));

    const resultado = await enfileirarComandoAtivacaoMobile({
      id_ativacao,
      tipo_comando: "parar_espelhamento",
      payload: null,
      id_usuario_criacao: id_usuario,
    });

    if (!resultado.ok) {
      return res.status(409).json({
        error: "Somente ativações com status U podem receber comandos.",
        status_atual: resultado.statusAtivacao,
      });
    }

    console.log(`[ESPELHO] Comando enfileirado para parar espelhamento da ativacao ${id_ativacao}`);

    return res.status(200).json({
      success: true,
      message: "Comando de parada enfileirado para o próximo heartbeat",
      comando: resultado.comando,
    });
  } catch (erro) {
    console.error("[ESPELHO] Erro ao parar espelhamento:", erro);
    return res.status(500).json({ error: erro?.message || "Erro ao parar espelhamento" });
  }
}

/**
 * POST /mobile/ativacao/:id/espelho/toque
 * Recebe coordenadas de toque da web (para implementação futura com Android)
 */
export async function ProcessarToque(req, res) {
  try {
    const { id_ativacao } = req.params;
    const { x, y, timestamp } = req.body;

    if (!id_ativacao || typeof x !== "number" || typeof y !== "number") {
      return res.status(400).json({ error: "id_ativacao, x e y são obrigatórios" });
    }

    console.log(`[ESPELHO] Toque recebido para ativacao ${id_ativacao} em (${x}, ${y})`);

    // TODO: Implementar lógica de toque no Android (via AccessibilityService)
    // Por enquanto, apenas registrar

    return res.status(200).json({
      success: true,
      message: "Toque registrado (implementação em progresso)",
    });
  } catch (erro) {
    console.error("[ESPELHO] Erro ao processar toque:", erro);
    return res.status(500).json({ error: erro?.message || "Erro ao processar toque" });
  }
}

/**
 * Função auxiliar para limpar cache
 * Útil para limpeza periódica
 */
export function LimparCacheAntigoEspelho() {
  const agora = Date.now();
  const ttl = 5 * 60 * 1000; // 5 minutos

  frameCache.forEach((value, key) => {
    const receivedTime = new Date(value.receivedAt).getTime();
    if (agora - receivedTime > ttl) {
      frameCache.delete(key);
      console.log(`[ESPELHO] Frame antigo removido do cache: ${key}`);
    }
  });
}

// Executar limpeza a cada 1 minuto
setInterval(LimparCacheAntigoEspelho, 60000);
