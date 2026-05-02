import { captureRef } from "react-native-view-shot";
import api from "./api";

class ScreenMirrorService {
  constructor() {
    this.viewShotRef = null;
    this.isCapturing = false;
    this.isSendingFrame = false;
    this.captureInterval = null;
    this.lastFrameTime = 0;
    this.ws = null;
    this.wsReady = false;
    this.wsUrl = "";
  }

  buildWsUrl() {
    const rawBase = String(api?.defaults?.baseURL || "").trim();
    if (!rawBase) return "";

    const origin = rawBase.replace(/\/v1\/?$/i, "").replace(/\/+$/, "");
    if (origin.startsWith("https://")) return `${origin.replace("https://", "wss://")}/v1/mobile/espelho/ws`;
    if (origin.startsWith("http://")) return `${origin.replace("http://", "ws://")}/v1/mobile/espelho/ws`;
    return "";
  }

  connectWs(ativacaoId) {
    try {
      if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;

      const baseWs = this.buildWsUrl();
      if (!baseWs) return;
      this.wsUrl = `${baseWs}?role=device&id_ativacao=${encodeURIComponent(String(ativacaoId))}`;
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.wsReady = true;
        console.log("[ESPELHO][WS] conectado");
      };

      this.ws.onclose = () => {
        this.wsReady = false;
        this.ws = null;
      };

      this.ws.onerror = () => {
        this.wsReady = false;
      };
    } catch {
      this.wsReady = false;
    }
  }

  /**
   * Inicia o espelhamento de tela
   * @param {Object} viewRef - Referência do ViewShot
   * @param {string} ativacaoId - ID da ativação
    * @param {number} intervalMs - Intervalo de captura em ms (default 140ms)
   */
    async startMirroring(viewRef, ativacaoId, intervalMs = 140) {
    if (this.isCapturing) {
      console.log("[ESPELHO] Captura já está ativa");
      return;
    }

    this.viewShotRef = viewRef;
    this.isCapturing = true;
    this.connectWs(ativacaoId);

    console.log(`[ESPELHO] Iniciando captura a cada ${intervalMs}ms para ativacao ${ativacaoId}`);

    this.captureInterval = setInterval(async () => {
      try {
        if (this.isSendingFrame) return;

        // Limite mínimo entre capturas para evitar sobrecarga.
        const agora = Date.now();
        if (agora - this.lastFrameTime < 110) return;

        this.lastFrameTime = agora;
        this.isSendingFrame = true;

        const base64Data = await captureRef(this.viewShotRef, {
          format: "jpg",
          quality: 0.35,
          width: 540,
          result: "base64",
        });

        const payload = {
          type: "frame",
          frame_base64: base64Data,
          timestamp: new Date().toISOString(),
        };

        // Caminho principal: WebSocket em tempo real
        if (this.wsReady && this.ws?.readyState === 1 && Number(this.ws?.bufferedAmount || 0) < 800000) {
          this.ws.send(JSON.stringify(payload));
        } else {
          // Fallback HTTP
          await api.post(
            `/v1/mobile/ativacao/${ativacaoId}/espelho/frame`,
            {
              frame_base64: base64Data,
              timestamp: payload.timestamp,
            },
            { timeout: 3500 },
          ).catch((err) => {
            console.log("[ESPELHO] Erro ao enviar frame:", err?.message || err);
          });
        }
      } catch (erro) {
        console.log("[ESPELHO] Erro ao capturar frame:", erro?.message || erro);
      } finally {
        this.isSendingFrame = false;
      }
    }, intervalMs);
  }

  /**
   * Para o espelhamento de tela
   */
  stopMirroring() {
    if (!this.isCapturing) return;

    console.log("[ESPELHO] Parando captura");
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    this.isCapturing = false;
    this.isSendingFrame = false;
    this.viewShotRef = null;
    this.lastFrameTime = 0;

    this.wsReady = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // noop
      }
      this.ws = null;
    }
  }

  /**
   * Simula um toque na coordenada
   * @param {string} ativacaoId - ID da ativação
   * @param {number} x - Coordenada X em pixels
   * @param {number} y - Coordenada Y em pixels
   */
  async simularToque(ativacaoId, x, y) {
    try {
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/espelho/toque`, {
        x,
        y,
        timestamp: new Date().toISOString(),
      });
      console.log(`[ESPELHO] Toque simulado em (${x}, ${y})`);
    } catch (erro) {
      console.log("[ESPELHO] Erro ao simular toque:", erro?.message || erro);
    }
  }

  /**
   * Verifica se está capturando
   */
  isCapturingActive() {
    return this.isCapturing;
  }
}

export default new ScreenMirrorService();
