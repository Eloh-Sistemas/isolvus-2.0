import React, { useEffect, useRef, useState } from "react";
import api from "../../../servidor/api";

export default function EspelhoScreenModal({ isOpen, onClose, id_ativacao, id_usuario, dispositivo }) {
  const [frameBase64, setFrameBase64] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMirroring, setIsMirroring] = useState(false);
  const [erro, setErro] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const pollingRef = useRef(false);
  const lastTimestampRef = useRef(null);
  const wsRef = useRef(null);
  const wsConnectedRef = useRef(false);

  function buildWsUrl() {
    const rawBase = String(api?.defaults?.baseURL || "").trim();
    if (!rawBase) return "";

    const origin = rawBase.replace(/\/v1\/?$/i, "").replace(/\/+$/, "");
    if (origin.startsWith("https://")) return `${origin.replace("https://", "wss://")}/v1/mobile/espelho/ws`;
    if (origin.startsWith("http://")) return `${origin.replace("http://", "ws://")}/v1/mobile/espelho/ws`;
    return "";
  }

  // Polling para buscar frames
  useEffect(() => {
    if (!isOpen || !isMirroring || !id_ativacao) return;

    const wsBase = buildWsUrl();
    if (wsBase) {
      try {
        const wsUrl = `${wsBase}?role=viewer&id_ativacao=${encodeURIComponent(String(id_ativacao))}`;
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => {
          wsConnectedRef.current = true;
        };
        wsRef.current.onmessage = (evt) => {
          try {
            const msg = JSON.parse(String(evt.data || "{}"));
            if (msg?.type !== "frame" || !msg?.frame_base64) return;
            if (msg?.timestamp && msg.timestamp === lastTimestampRef.current) return;

            lastTimestampRef.current = msg?.timestamp || null;
            setFrameBase64(`data:image/jpeg;base64,${msg.frame_base64}`);
            setErro(null);
          } catch {
            // noop
          }
        };
        wsRef.current.onclose = () => {
          wsConnectedRef.current = false;
          wsRef.current = null;
        };
        wsRef.current.onerror = () => {
          wsConnectedRef.current = false;
        };
      } catch {
        wsRef.current = null;
        wsConnectedRef.current = false;
      }
    }

    const pollInterval = setInterval(async () => {
      try {
        if (wsConnectedRef.current) return;
        if (pollingRef.current) return;
        pollingRef.current = true;

        const { data } = await api.get(
          `/v1/mobile/ativacao/${id_ativacao}/espelho/frame-atual`,
          { timeout: 1200 },
        ).catch((err) => {
          if (err?.response?.status === 204) return { data: null };
          throw err;
        });

        if (data && data.frame_base64 && data.timestamp !== lastTimestampRef.current) {
          lastTimestampRef.current = data.timestamp;
          setFrameBase64(`data:image/jpeg;base64,${data.frame_base64}`);
          setErro(null);
        }
      } catch (err) {
        console.log("Erro ao buscar frame:", err?.message);
      } finally {
        pollingRef.current = false;
      }
    }, 100);

    return () => {
      clearInterval(pollInterval);
      pollingRef.current = false;
      lastTimestampRef.current = null;
      wsConnectedRef.current = false;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // noop
        }
        wsRef.current = null;
      }
    };
  }, [isOpen, isMirroring, id_ativacao]);

  async function iniciarEspelhamento() {
    try {
      setIsLoading(true);
      setErro(null);
      setStatusMsg("Iniciando espelhamento...");

      await api.post(`/v1/mobile/ativacao/${id_ativacao}/espelho/iniciar`, {
        id_usuario,
      });

      setIsMirroring(true);
      localStorage.setItem("espelhamento_ativo", "1");
      setStatusMsg("Espelhamento ativo - transmitindo tela do dispositivo");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Erro ao iniciar espelhamento";
      setErro(msg);
      setStatusMsg("");
      console.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function pararEspelhamento() {
    try {
      setIsLoading(true);
      setErro(null);
      setStatusMsg("Parando espelhamento...");

      await api.post(`/v1/mobile/ativacao/${id_ativacao}/espelho/parar`, {
        id_usuario,
      });

      setIsMirroring(false);
      localStorage.removeItem("espelhamento_ativo");
      setFrameBase64(null);
      setStatusMsg("Espelhamento parado");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Erro ao parar espelhamento";
      setErro(msg);
      console.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="modal show espelho-modal"
      style={{ display: "block" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-fullscreen m-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content espelho-modal-content">
          {/* Header */}
          <div className="modal-header espelho-modal-header">
            <div>
              <h5 className="modal-title mb-0" style={{ fontWeight: 700 }}>
                Espelhamento do Dispositivo
              </h5>
              <small className="text-muted">
                {dispositivo || `Ativação ${id_ativacao}`}
              </small>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isLoading}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-2 p-md-3 espelho-modal-body">
            {/* Status em overlay para não consumir área útil */}
            {statusMsg && !erro && (
              <div className="espelho-status-overlay espelho-status-info px-3 py-2">
                {statusMsg}
              </div>
            )}
            {erro && (
              <div className="espelho-status-overlay espelho-status-error px-3 py-2">
                <strong>Erro:</strong> {erro}
              </div>
            )}

            {/* Frame Display */}
            {isMirroring ? (
              <div className="text-center h-100 d-flex align-items-center justify-content-center">
                {frameBase64 ? (
                  <div className="espelho-frame-wrap">
                    <img
                      src={frameBase64}
                      alt="Espelhamento de tela"
                      className="espelho-frame-image"
                    />
                  </div>
                ) : (
                  <div className="espelho-frame-placeholder">
                    <div className="text-center">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                      <small className="text-muted d-block">
                        Aguardando frames do dispositivo...
                      </small>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="espelho-frame-placeholder">
                <div className="text-center">
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📵</div>
                  <p className="text-muted mb-1">Espelhamento não iniciado</p>
                  <small className="text-muted">
                    Clique em "Iniciar" para começar a transmitir a tela do dispositivo
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer espelho-modal-footer">
            <small className="text-muted me-auto">
              Baixa latência ativa
            </small>
            {isMirroring ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={pararEspelhamento}
                disabled={isLoading}
              >
                {isLoading ? "Parando..." : "⏹ Parar Espelhamento"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={iniciarEspelhamento}
                disabled={isLoading}
              >
                {isLoading ? "Iniciando..." : "▶ Iniciar Espelhamento"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
