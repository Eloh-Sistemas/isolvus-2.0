import { WebSocketServer } from "ws";

const viewersByAtivacao = new Map();
const devicesByAtivacao = new Map();
const lastFrameByAtivacao = new Map();

function parseQuery(url = "") {
  try {
    const u = new URL(url, "http://localhost");
    return {
      role: String(u.searchParams.get("role") || "").trim().toLowerCase(),
      idAtivacao: String(u.searchParams.get("id_ativacao") || "").trim(),
    };
  } catch {
    return { role: "", idAtivacao: "" };
  }
}

function ensureViewerSet(idAtivacao) {
  if (!viewersByAtivacao.has(idAtivacao)) viewersByAtivacao.set(idAtivacao, new Set());
  return viewersByAtivacao.get(idAtivacao);
}

function safeSend(ws, payload) {
  try {
    if (ws?.readyState === 1) ws.send(JSON.stringify(payload));
  } catch {
    // noop
  }
}

export function broadcastFrameToViewers(idAtivacao, framePayload) {
  const id = String(idAtivacao || "").trim();
  if (!id) return;

  lastFrameByAtivacao.set(id, framePayload);
  const viewers = viewersByAtivacao.get(id);
  if (!viewers || viewers.size === 0) return;

  const msg = {
    type: "frame",
    id_ativacao: id,
    ...framePayload,
  };

  for (const ws of viewers) {
    safeSend(ws, msg);
  }
}

export function initMirrorWsHub(server) {
  const wss = new WebSocketServer({
    server,
    path: "/v1/mobile/espelho/ws",
    perMessageDeflate: false,
  });

  wss.on("connection", (ws, req) => {
    const { role, idAtivacao } = parseQuery(req.url || "");

    if (!idAtivacao || (role !== "viewer" && role !== "device")) {
      safeSend(ws, { type: "error", message: "Parametros invalidos: role e id_ativacao sao obrigatorios." });
      ws.close(1008, "invalid params");
      return;
    }

    ws._mirrorRole = role;
    ws._idAtivacao = idAtivacao;

    if (role === "viewer") {
      const set = ensureViewerSet(idAtivacao);
      set.add(ws);
      safeSend(ws, { type: "connected", role, id_ativacao: idAtivacao });

      const lastFrame = lastFrameByAtivacao.get(idAtivacao);
      if (lastFrame) {
        safeSend(ws, { type: "frame", id_ativacao: idAtivacao, ...lastFrame });
      }
    }

    if (role === "device") {
      devicesByAtivacao.set(idAtivacao, ws);
      safeSend(ws, { type: "connected", role, id_ativacao: idAtivacao });
    }

    ws.on("message", (raw) => {
      let data;
      try {
        data = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (ws._mirrorRole === "device" && data?.type === "frame") {
        const frameBase64 = data?.frame_base64;
        if (!frameBase64 || typeof frameBase64 !== "string") return;

        broadcastFrameToViewers(ws._idAtivacao, {
          frame_base64: frameBase64,
          timestamp: data?.timestamp || new Date().toISOString(),
          transport: "ws",
        });
      }
    });

    ws.on("close", () => {
      const roleLocal = ws._mirrorRole;
      const id = ws._idAtivacao;
      if (!id) return;

      if (roleLocal === "viewer") {
        const set = viewersByAtivacao.get(id);
        if (set) {
          set.delete(ws);
          if (set.size === 0) viewersByAtivacao.delete(id);
        }
      }

      if (roleLocal === "device") {
        const current = devicesByAtivacao.get(id);
        if (current === ws) devicesByAtivacao.delete(id);
      }
    });
  });

  console.log("[WS] Mirror hub ativo em /v1/mobile/espelho/ws");
}
