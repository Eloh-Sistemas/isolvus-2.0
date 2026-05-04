import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Smartphone, ShieldCheck, XCircle, Copy, CheckCheck, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import Menu from "../../../componentes/Menu/Menu";
import api from "../../../servidor/api";
import EspelhoScreenModal from "./EspelhoScreenModal";
import "./MobileAtivacao.css";

let leafletLoaderPromise = null;
const ROTA_PERIODO_OPCOES = [
  { label: "Ultimos 30 minutos", value: 30 },
  { label: "Ultima 1 hora", value: 60 },
  { label: "Ultimas 3 horas", value: 180 },
  { label: "Ultimas 6 horas", value: 360 },
  { label: "Ultimas 12 horas", value: 720 },
  { label: "Ultimas 24 horas", value: 1440 },
  { label: "Ultimos 7 dias", value: 10080 },
];

function carregarLeafletCDN() {
  if (typeof window === "undefined") return Promise.reject(new Error("window indisponível"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoaderPromise) return leafletLoaderPromise;

  leafletLoaderPromise = new Promise((resolve, reject) => {
    const head = document.head || document.getElementsByTagName("head")[0];

    if (!document.getElementById("leaflet-css-cdn")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-cdn";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      head.appendChild(link);
    }

    const scriptExistente = document.getElementById("leaflet-js-cdn");
    if (scriptExistente) {
      scriptExistente.addEventListener("load", () => resolve(window.L));
      scriptExistente.addEventListener("error", () => reject(new Error("Falha ao carregar Leaflet")));
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js-cdn";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Falha ao carregar Leaflet"));
    head.appendChild(script);
  });

  return leafletLoaderPromise;
}


function traduzirTipoLocal(item) {
  const amenity = item?.tags?.amenity;
  const shop = item?.tags?.shop;
  const tourism = item?.tags?.tourism;
  const healthcare = item?.tags?.healthcare;
  const leisure = item?.tags?.leisure;
  const office = item?.tags?.office;

  const tipo = amenity || healthcare || shop || tourism || leisure || office || "local";

  const mapa = {
    hospital: "Hospital",
    clinic: "Clinica",
    pharmacy: "Farmacia",
    doctors: "Consultorio",
    school: "Escola",
    restaurant: "Restaurante",
    cafe: "Cafeteria",
    fast_food: "Lanchonete",
    fuel: "Posto",
    bank: "Banco",
    atm: "Caixa eletronico",
    supermarket: "Supermercado",
    convenience: "Conveniência",
    bakery: "Padaria",
    clothes: "Loja de roupas",
    mall: "Shopping",
    hotel: "Hotel",
    guest_house: "Hospedagem",
    attraction: "Ponto turistico",
    park: "Parque",
    company: "Empresa",
  };

  return mapa[tipo] || String(tipo).replace(/_/g, " ");
}

function formatarData(value) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("pt-BR");
}

function formatarDuracao(segundos) {
  const s = Number(segundos || 0);
  if (!Number.isFinite(s) || s <= 0) return "0s";

  const total = Math.floor(s);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (horas > 0) return `${horas}h ${minutos}m`;
  if (minutos > 0) return `${minutos}m ${secs}s`;
  return `${secs}s`;
}

function statusTag(status) {
  if (status === "P") return "Pendente";
  if (status === "U") return "Utilizado";
  if (status === "R") return "Revogado";
  if (status === "D") return "Desativado";
  return status || "-";
}

function parseDispositivoInfo(infoJson) {
  if (!infoJson) return null;
  if (typeof infoJson === "object") return infoJson;
  try {
    return JSON.parse(String(infoJson));
  } catch {
    return null;
  }
}

function obterDeviceId(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const deviceId = info?.hardware?.device_id || null;

  if (!deviceId) return <span className="text-muted">-</span>;

  return (
    <span
      style={{ fontFamily: "monospace", fontSize: "11px", whiteSpace: "nowrap", cursor: "default" }}
    >
      {deviceId}
    </span>
  );
}

function obterBateria(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const level = info?.battery?.level;
  const state = info?.battery?.state;

  if (typeof level !== "number") return <span className="text-muted">-</span>;

  const isCharging = state === "charging" || state === "full";
  const lowPower = info?.battery?.low_power_mode;
  const pct = Math.min(Math.max(level, 0), 100);

  let fillColor;
  if (isCharging) fillColor = "#22c55e";
  else if (pct >= 80) fillColor = "#22c55e";
  else if (pct >= 50) fillColor = "#f59e0b";
  else if (pct >= 20) fillColor = "#f97316";
  else fillColor = "#ef4444";

  const barWidth = Math.round((pct / 100) * 20);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <svg width="28" height="14" viewBox="0 0 28 14" xmlns="http://www.w3.org/2000/svg">
        {/* corpo */}
        <rect x="0.5" y="0.5" width="24" height="13" rx="2.5" fill="none" stroke="#6b7280" strokeWidth="1" />
        {/* terminal positivo */}
        <rect x="25" y="4" width="2.5" height="6" rx="1" fill="#6b7280" />
        {/* preenchimento */}
        <rect x="2" y="2" width={barWidth} height="10" rx="1.5" fill={fillColor} />
        {/* raio quando carregando */}
        {isCharging && (
          <text x="12" y="11" fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">⚡</text>
        )}
      </svg>
      <span style={{ color: fillColor, fontWeight: 600, fontSize: "inherit" }}>
        {pct}%
      </span>
      {lowPower && (
        <span title="Modo economia ativo" style={{ fontSize: "inherit", color: "#f59e0b" }}>🔋</span>
      )}
    </span>
  );
}

function obterLocalizacao(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const latitude = info?.location?.latitude;
  const longitude = info?.location?.longitude;

  if (typeof latitude === "number" && typeof longitude === "number") {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  const permissao = info?.location?.permission;
  if (permissao && permissao !== "granted") {
    return `Sem permissão (${permissao})`;
  }

  return "Indisponível";
}

function obterRede(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const net = info?.network;
  if (!net) return <span className="text-muted">-</span>;

  const tipo = String(net.type || "").toUpperCase();
  const ip = net.ip_local || null;
  const internet = net.is_internet_reachable;
  const conectado = net.is_connected;

  const tipoColor = tipo === "WIFI" ? "#38bdf8" : tipo === "CELLULAR" ? "#a78bfa" : "#94a3b8";
  const tipoLabel = tipo === "WIFI" ? "WiFi" : tipo === "CELLULAR" ? "Dados" : tipo || "?";

  const internetColor = internet === true ? "#22c55e" : internet === false ? "#ef4444" : "#94a3b8";

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, fontSize: "inherit", whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: tipoColor, fontWeight: 700 }}>{tipoLabel}</span>
        <span
          title={internet === true ? "Internet OK" : internet === false ? "Sem internet" : "Internet desconhecida"}
          style={{ color: internetColor, fontSize: "inherit", fontWeight: 700 }}
        >
          {internet === true ? "● online" : internet === false ? "● offline" : "● ?"}
        </span>
      </span>
      {ip && <span style={{ color: "#64748b", fontSize: "inherit" }}>{ip}</span>}
    </span>
  );
}

function obterUsoApps(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const usage = info?.apps_usage;
  if (!usage) return "Indisponível";

  if (usage.supported === false) return "Não suportado";
  if (usage.supported === true) return "Disponível";
  return "Indisponível";
}

function obterStorage(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const free = info?.storage?.free_bytes;
  const total = info?.storage?.total_bytes;

  if (typeof free !== "number" || typeof total !== "number") return <span className="text-muted">-</span>;

  const freeGB = (free / 1e9).toFixed(1);
  const totalGB = (total / 1e9).toFixed(1);
  const usedPct = Math.round(((total - free) / total) * 100);

  let color = "#22c55e";
  if (usedPct >= 90) color = "#ef4444";
  else if (usedPct >= 75) color = "#f97316";
  else if (usedPct >= 50) color = "#f59e0b";

  return (
    <span style={{ whiteSpace: "nowrap", fontSize: "inherit" }}>
      <span style={{ color, fontWeight: 600 }}>{freeGB} GB</span>
      <span className="text-muted"> / {totalGB} GB</span>
    </span>
  );
}

function obterVersaoApp(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const version = info?.app?.version;
  const build = info?.app?.build;
  const state = info?.app?.state;

  if (!version) return <span className="text-muted">-</span>;

  const stateColor = state === "active" ? "#22c55e" : state === "background" ? "#f59e0b" : "#94a3b8";

  return (
    <span style={{ whiteSpace: "nowrap", fontSize: "inherit" }}>
      v{version}
      {build ? <span className="text-muted"> ({build})</span> : null}
      {state ? <span style={{ marginLeft: 4, color: stateColor, fontSize: "inherit", fontWeight: 600 }}>● {state}</span> : null}
    </span>
  );
}

function obterMemoria(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const bytes = info?.hardware?.total_memory_bytes;
  if (typeof bytes !== "number") return <span className="text-muted">-</span>;
  return <span style={{ whiteSpace: "nowrap", fontSize: "inherit" }}>{(bytes / 1e9).toFixed(1)} GB</span>;
}

function obterCpu(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const archs = info?.hardware?.cpu_architectures;
  if (!Array.isArray(archs) || archs.length === 0) return <span className="text-muted">-</span>;
  return <span style={{ fontSize: "inherit", whiteSpace: "nowrap" }} title={archs.join(", ")}>{archs[0]}</span>;
}

function obterSeguranca(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const isRooted = info?.security?.is_rooted;

  if (isRooted === null || isRooted === undefined) return <span className="text-muted">-</span>;

  return isRooted
    ? <span style={{ color: "#ef4444", fontWeight: 600, fontSize: "inherit" }} title="Dispositivo com root/jailbreak">⚠ Root</span>
    : <span style={{ color: "#22c55e", fontSize: "inherit" }}>✓ OK</span>;
}

function obterTempoUso(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const usage = info?.usage;
  const sessao = usage?.session_seconds;
  const total = usage?.total_seconds;

  const source = String(info?.source || "");
  const appState = String(info?.app?.state || "");
  const capturedAt = info?.captured_at ? new Date(info.captured_at) : null;
  const now = Date.now();
  const staleMs = capturedAt && !Number.isNaN(capturedAt.getTime())
    ? now - capturedAt.getTime()
    : Number.POSITIVE_INFINITY;

  // Heartbeat normal acontece a cada ~10s; acima disso já consideramos que não está mais em uso ativo.
  const emUsoJanelaMs = 25000;
  const semAtualizacaoJanelaMs = 180000;

  let statusLabel = "Inativo";
  let statusColor = "#94a3b8";

  if (staleMs > semAtualizacaoJanelaMs) {
    statusLabel = "Sem atualização";
    statusColor = "#ef4444";
  } else if (source === "background_task" || appState === "background" || appState === "inactive") {
    statusLabel = "Fora do app";
    statusColor = "#f59e0b";
  } else if ((usage?.active_now === true || appState === "active") && staleMs <= emUsoJanelaMs) {
    statusLabel = "Em uso";
    statusColor = "#22c55e";
  } else {
    statusLabel = "Fora do app";
    statusColor = "#f59e0b";
  }

  if (!usage && !info?.app && !info?.source) {
    return <span className="text-muted">-</span>;
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, whiteSpace: "nowrap" }}>
      <span title="Tempo de uso da sessão atual" style={{ fontSize: "inherit" }}>
        Sessao: <strong>{formatarDuracao(sessao)}</strong>
      </span>
      <span title="Tempo total acumulado de uso do app" style={{ fontSize: "inherit" }}>
        Total: <strong>{formatarDuracao(total)}</strong>
      </span>
      <span style={{ color: statusColor, fontSize: "11px", fontWeight: 600 }}>
        ● {statusLabel}
      </span>
    </span>
  );
}

const PERM_LABELS = {
  camera: "Cam",
  notificacoes: "Notif",
  microfone: "Mic",
  localizacao_foreground: "GPS",
  localizacao_background: "GPS BG",
};

function obterPermissoes(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const perms = info?.permissoes;
  if (!perms) return <span className="text-muted">-</span>;

  return (
    <span
      style={{
        display: "inline-grid",
        gridAutoFlow: "column",
        gridTemplateRows: "repeat(2, auto)",
        gap: 2,
      }}
    >
      {Object.entries(perms).map(([key, status]) => {
        const label = PERM_LABELS[key] || key;
        const granted = status === "granted";
        const denied = status === "denied";
        const color = granted ? "#22c55e" : denied ? "#ef4444" : "#94a3b8";
        const bg = granted ? "#052e16" : denied ? "#2d0a0a" : "#1e293b";
        const icon = granted ? "✓" : denied ? "✗" : "?";
        const statusPt = granted ? "Permitida" : denied ? "Negada" : `Não definida (${status})`;
        return (
          <span
            key={key}
            title={`${label}: ${statusPt}`}
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color,
              background: bg,
              border: `1px solid ${color}`,
              borderRadius: 3,
              padding: "0 4px",
              whiteSpace: "nowrap",
              lineHeight: 1.25,
            }}
          >
            <span style={{ fontSize: "12px", lineHeight: 1 }}>{icon}</span> {label}
          </span>
        );
      })}
    </span>
  );
}

export default function MobileAtivacao() {
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [modalGerarAberto, setModalGerarAberto] = useState(false);
  const [tokenAtual, setTokenAtual] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [ativacoes, setAtivacoes] = useState([]);

  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroUsuarioTabela, setFiltroUsuarioTabela] = useState("");
  const [filtroDispositivo, setFiltroDispositivo] = useState("");

  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [resultadosUsuario, setResultadosUsuario] = useState([]);
  const [loadingUsuario, setLoadingUsuario] = useState(false);

  // States para espelhamento
  const [espelhoModalAberto, setEspelhoModalAberto] = useState(false);
  const [espelhoAtivacaoId, setEspelhoAtivacaoId] = useState(null);
  const [espelhoDispositivo, setEspelhoDispositivo] = useState("");
  const [localizacaoModalAberto, setLocalizacaoModalAberto] = useState(false);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  const [rotaModalAberto, setRotaModalAberto] = useState(false);
  const [rotaPontos, setRotaPontos] = useState([]);
  const [rotaLoading, setRotaLoading] = useState(false);
  const [rotaDispositivo, setRotaDispositivo] = useState("");
  const [rotaAtivacaoId, setRotaAtivacaoId] = useState(null);
  const [rotaPeriodoMinutos, setRotaPeriodoMinutos] = useState(1440);
  const [mapaTodosModalAberto, setMapaTodosModalAberto] = useState(false);
  const [menuAcaoAberto, setMenuAcaoAberto] = useState({ id: null, top: 0, left: 0, up: false });
  const interagindoTabelaRef = useRef(false);
  const tabelaContainerRef = useRef(null);
  const menuAcaoRef = useRef(null);
  const mapaTodosRef = useRef(null);
  const mapaTodosInstanciaRef = useRef(null);
  const mapaTodosLayerRef = useRef(null);
  const rotaMapaRef = useRef(null);
  const rotaMapaInstanciaRef = useRef(null);
  const rotaMapaLayerRef = useRef(null);
  const [localizacaoEndereco, setLocalizacaoEndereco] = useState(null);
  const [loadingEndereco, setLoadingEndereco] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const empresaInfo = useMemo(() => ({
    id_empresa: String(localStorage.getItem("id_empresa") || ""),
    razaosocial: String(localStorage.getItem("razaosocial") || ""),
    id_usuario: Number(localStorage.getItem("id_usuario") || 0),
    id_grupo_empresa: String(localStorage.getItem("id_grupo_empresa") || ""),
  }), []);

  const ativacoesFiltradas = useMemo(() => {
    const codigo = filtroCodigo.trim().toLowerCase();
    const usuario = filtroUsuarioTabela.trim().toLowerCase();
    const dispositivo = filtroDispositivo.trim().toLowerCase();

    return ativacoes.filter((item) => {
      if (filtroStatus && String(item?.status || "") !== filtroStatus) return false;

      if (codigo) {
        const idAtiv = String(item?.id_ativacao || "").toLowerCase();
        const codAtiv = String(item?.codigo_ativacao || "").toLowerCase();
        if (!idAtiv.includes(codigo) && !codAtiv.includes(codigo)) return false;
      }

      if (usuario) {
        const idDestino = String(item?.id_usuario_destino || "").toLowerCase();
        const nomeUsuario = String(item?.nome_usuario_ativacao || "").toLowerCase();
        if (!idDestino.includes(usuario) && !nomeUsuario.includes(usuario)) return false;
      }

      if (dispositivo) {
        const nomeDispositivo = String(item?.dispositivo || "").toLowerCase();
        if (!nomeDispositivo.includes(dispositivo)) return false;
      }

      return true;
    });
  }, [ativacoes, filtroCodigo, filtroStatus, filtroUsuarioTabela, filtroDispositivo]);

  const dispositivosComCoordenadas = useMemo(() => {
    return ativacoesFiltradas
      .map((item) => {
        const info = parseDispositivoInfo(item?.dispositivo_info_json);
        const latitude = info?.location?.latitude;
        const longitude = info?.location?.longitude;
        if (typeof latitude !== "number" || typeof longitude !== "number") return null;
        return {
          id: item?.id_ativacao,
          dispositivo: item?.dispositivo || `Ativação ${item?.id_ativacao || ""}`,
          usuario: item?.nome_usuario_ativacao || "-",
          latitude,
          longitude,
          status: statusTag(item?.status),
          atualizadoEm: info?.captured_at || null,
        };
      })
      .filter(Boolean);
  }, [ativacoesFiltradas]);

  async function carregarAtivacoes({ silencioso = false } = {}) {
    if (!silencioso) setLoadingLista(true);
    try {
      const { data } = await api.get("/v1/mobile/ativacao/listar", {
        params: { id_empresa: empresaInfo.id_empresa || undefined },
      });
      setAtivacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Erro ao listar ativações mobile:", error);
      alert("Não foi possível consultar as ativações mobile.");
    } finally {
      if (!silencioso) setLoadingLista(false);
    }
  }

  useEffect(() => {
    carregarAtivacoes();

    const timer = setInterval(() => {
      const tabela = tabelaContainerRef.current;
      const existeMenuAberto = Boolean(tabela?.querySelector(".mobile-acao-dropdown"));

      if (interagindoTabelaRef.current || existeMenuAberto) return;
      carregarAtivacoes({ silencioso: true });
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  async function buscarUsuarios(valor) {
    setBuscaUsuario(valor);
    setUsuarioSelecionado(null);
    if (!valor || valor.length < 2) {
      setResultadosUsuario([]);
      return;
    }
    setLoadingUsuario(true);
    try {
      const { data } = await api.post("/v1/consultarUsuarioComplete", {
        descricao: valor,
        id_grupo_empresa: empresaInfo.id_grupo_empresa,
      });
      setResultadosUsuario(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch {
      setResultadosUsuario([]);
    } finally {
      setLoadingUsuario(false);
    }
  }

  function selecionarUsuario(item) {
    setUsuarioSelecionado(item);
    setBuscaUsuario(item.descricao);
    setResultadosUsuario([]);
  }

  function fecharModalGerarAtivacao() {
    setModalGerarAberto(false);
    setTokenAtual(null);
    setQrDataUrl("");
    setBuscaUsuario("");
    setUsuarioSelecionado(null);
    setResultadosUsuario([]);
  }

  async function gerarAtivacao() {
    if (!empresaInfo.id_empresa || !empresaInfo.id_usuario) {
      alert("Sessão inválida. Faça login novamente para gerar o QR Code.");
      return;
    }

    if (!usuarioSelecionado?.codigo) {
      await Swal.fire({
        icon: "warning",
        title: "Usuário obrigatório",
        text: "Selecione o usuário destinatário antes de gerar o QR Code.",
      });
      return;
    }

    const minutos = 10;

    setLoadingGerar(true);
    try {
      const { data } = await api.post("/v1/mobile/ativacao/gerar", {
        id_empresa: empresaInfo.id_empresa,
        id_grupo_empresa: empresaInfo.id_grupo_empresa,
        razaosocial: empresaInfo.razaosocial,
        id_usuario: empresaInfo.id_usuario,
        id_usuario_destino: usuarioSelecionado?.codigo || null,
        validade_minutos: minutos,
      });

      const qrPayload = String(data?.qr_payload || "");
      if (!qrPayload) throw new Error("Payload do QR não retornado.");

      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      setQrDataUrl(qrUrl);
      setTokenAtual(data);
      await carregarAtivacoes();
    } catch (error) {
      console.log("Erro ao gerar ativação mobile:", error);
      alert(error?.response?.data?.error || "Não foi possível gerar a ativação mobile.");
    } finally {
      setLoadingGerar(false);
    }
  }

  function abrirModalReativacao(item) {
    const idUsuarioDestino = Number(item?.id_usuario_destino || 0);
    if (!idUsuarioDestino) {
      Swal.fire({
        icon: "warning",
        title: "Usuário não vinculado",
        text: "Não foi possível reativar: a ativação não possui usuário destino vinculado.",
      });
      return;
    }

    const nomeUsuario = String(item?.nome_usuario_ativacao || `Usuário ${idUsuarioDestino}`);

    setTokenAtual(null);
    setQrDataUrl("");
    setResultadosUsuario([]);
    setUsuarioSelecionado({
      codigo: idUsuarioDestino,
      descricao: nomeUsuario,
    });
    setBuscaUsuario(nomeUsuario);
    setModalGerarAberto(true);
  }

  function abrirModalGerarNovoQr(item) {
    const idUsuarioDestino = Number(item?.id_usuario_destino || 0);
    if (!idUsuarioDestino) {
      Swal.fire({
        icon: "warning",
        title: "Usuário não vinculado",
        text: "Não foi possível gerar novo QR Code: a ativação não possui usuário destino vinculado.",
      });
      return;
    }

    const nomeUsuario = String(item?.nome_usuario_ativacao || `Usuário ${idUsuarioDestino}`);

    setTokenAtual(null);
    setQrDataUrl("");
    setResultadosUsuario([]);
    setUsuarioSelecionado({
      codigo: idUsuarioDestino,
      descricao: nomeUsuario,
    });
    setBuscaUsuario(nomeUsuario);
    setModalGerarAberto(true);
  }

  async function solicitarPermissaoRemota(item) {
    if (!item?.id_ativacao) return;

    const { value: permissao } = await Swal.fire({
      title: "Solicitar permissão no dispositivo",
      text: "Selecione a permissão que o app mobile deve solicitar ao usuário.",
      input: "select",
      inputOptions: {
        camera: "Câmera",
        microfone: "Microfone",
        notificacoes: "Notificações",
        localizacao_foreground: "Localização (em uso)",
        localizacao_background: "Localização em segundo plano (GPS BG)",
      },
      inputPlaceholder: "Escolha uma permissão",
      showCancelButton: true,
      confirmButtonText: "Enviar solicitação",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      inputValidator: (value) => (!value ? "Selecione uma permissão" : null),
    });

    if (!permissao) return;

    try {
      await api.post(`/v1/mobile/ativacao/${item.id_ativacao}/comandos/solicitar-permissao`, {
        permissao,
        id_usuario: empresaInfo.id_usuario,
      });

      await Swal.fire({
        icon: "success",
        title: "Comando enviado",
        text: "O comando será processado pelo mobile no próximo heartbeat.",
      });
    } catch (error) {
      console.log("Erro ao enviar comando de permissão:", error);
      await Swal.fire({
        icon: "error",
        title: "Falha ao enviar comando",
        text: error?.response?.data?.error || "Não foi possível enviar a solicitação para o dispositivo.",
      });
    }
  }

  async function inativarDispositivo(item) {
    if (!item?.id_ativacao) return;

    const confirmacao = await Swal.fire({
      title: "Inativar dispositivo?",
      text: "O dispositivo será inativado. O histórico será mantido para rastreamento do aparelho. No próximo heartbeat, o app mobile perderá acesso e voltará para a tela de QR Code.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, inativar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmacao.isConfirmed) return;

    try {
      await api.post(`/v1/mobile/ativacao/${item.id_ativacao}/redefinir`, {
        id_usuario: empresaInfo.id_usuario,
      });

      await Swal.fire({
        icon: "success",
        title: "Dispositivo inativado",
        text: "O dispositivo foi inativado com sucesso. O histórico foi preservado.",
      });

      await carregarAtivacoes({ silencioso: true });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Falha ao inativar dispositivo",
        text: error?.response?.data?.error || "Não foi possível inativar o dispositivo.",
      });
    }
  }

  function abrirEspelhoModal(item) {
    setEspelhoAtivacaoId(item.id_ativacao);
    setEspelhoDispositivo(item.dispositivo || `Ativação ${item.id_ativacao}`);
    setEspelhoModalAberto(true);
  }

  function abrirLocalizacaoModal(item) {
    const info = parseDispositivoInfo(item?.dispositivo_info_json);
    const latitude = info?.location?.latitude;
    const longitude = info?.location?.longitude;
    const permissao = info?.location?.permission || "unknown";
    const accuracy = info?.location?.accuracy ?? null;
    const altitude = info?.location?.altitude ?? null;
    const speed = info?.location?.speed ?? null;
    const timestamp = info?.location?.timestamp || info?.location?.last_updated || null;
    const batteryLevel = info?.battery?.level ?? null;
    const batteryState = info?.battery?.state ?? null;

    setLocalizacaoEndereco(null);
    setLocalizacaoAtual({
      idAtivacao: item?.id_ativacao,
      dispositivo: item?.dispositivo || `Ativação ${item?.id_ativacao || ""}`,
      latitude,
      longitude,
      permissao,
      accuracy,
      altitude,
      speed,
      timestamp,
      batteryLevel,
      batteryState,
    });
    setLocalizacaoModalAberto(true);
  }

  async function carregarRotaAtivacao(idAtivacao, minutosFiltro) {
    if (!idAtivacao) return;

    setRotaLoading(true);
    try {
      const { data } = await api.get(`/v1/mobile/ativacao/${idAtivacao}/rota`, {
        params: {
          minutos: minutosFiltro,
        },
      });
      const pontos = Array.isArray(data?.pontos)
        ? data.pontos
          .map((p) => ({
            latitude: Number(p?.latitude),
            longitude: Number(p?.longitude),
            dt_captura: p?.dt_captura || p?.dt_captura?.toString?.() || null,
            source: p?.source || null,
            accuracy_meters: p?.accuracy_meters ?? null,
          }))
          .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        : [];
      setRotaPontos(pontos);
    } catch (error) {
      setRotaPontos([]);
      Swal.fire({
        icon: "error",
        title: "Falha ao carregar rota",
        text: error?.response?.data?.error || "Não foi possível consultar o histórico de rota.",
      });
    } finally {
      setRotaLoading(false);
    }
  }

  async function abrirRotaModal(item) {
    if (!item?.id_ativacao) return;

    const periodoPadrao = 1440;
    setRotaDispositivo(item?.dispositivo || `Ativação ${item?.id_ativacao || ""}`);
    setRotaAtivacaoId(item.id_ativacao);
    setRotaPeriodoMinutos(periodoPadrao);
    setRotaPontos([]);
    setRotaModalAberto(true);
    await carregarRotaAtivacao(item.id_ativacao, periodoPadrao);
  }

  async function onAlterarPeriodoRota(event) {
    const novoPeriodo = Number(event?.target?.value || 1440);
    setRotaPeriodoMinutos(novoPeriodo);
    if (!rotaAtivacaoId) return;
    await carregarRotaAtivacao(rotaAtivacaoId, novoPeriodo);
  }

  function fecharRotaModal() {
    setRotaModalAberto(false);
    setRotaAtivacaoId(null);
  }

  function fecharMenuAcao() {
    setMenuAcaoAberto({ id: null, top: 0, left: 0, up: false });
  }

  function toggleMenuAcao(item, event) {
    event.stopPropagation();

    if (menuAcaoAberto.id === item.id_ativacao) {
      fecharMenuAcao();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const larguraMenu = 210;
    const alturaMenuEstimada = item.status === "P" ? 230 : 160;
    const margem = 8;

    const espacoAbaixo = viewportHeight - rect.bottom;
    const espacoAcima = rect.top;
    const up = espacoAbaixo < alturaMenuEstimada && espacoAcima > espacoAbaixo;

    const topBase = up ? rect.top - alturaMenuEstimada - 6 : rect.bottom + 6;
    const top = Math.max(margem, Math.min(topBase, viewportHeight - alturaMenuEstimada - margem));
    const left = Math.max(margem, Math.min(rect.left, viewportWidth - larguraMenu - margem));

    setMenuAcaoAberto({ id: item.id_ativacao, top, left, up });
  }

  useEffect(() => {
    if (!menuAcaoAberto.id) return;

    function handleClickFora(event) {
      if (menuAcaoRef.current?.contains(event.target)) return;
      if (event.target?.closest?.(".mobile-acao-trigger")) return;
      fecharMenuAcao();
    }

    function handleEsc(event) {
      if (event.key === "Escape") fecharMenuAcao();
    }

    function handleReflow() {
      fecharMenuAcao();
    }

    document.addEventListener("mousedown", handleClickFora);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);

    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [menuAcaoAberto.id]);

  useEffect(() => {
    if (!localizacaoModalAberto || typeof localizacaoAtual?.latitude !== "number") return;
    let cancelado = false;
    setLoadingEndereco(true);
    setLocalizacaoEndereco(null);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${localizacaoAtual.latitude}&lon=${localizacaoAtual.longitude}`,
      { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } }
    )
      .then((r) => r.json())
      .then((data) => { if (!cancelado) setLocalizacaoEndereco(data?.display_name || null); })
      .catch(() => { if (!cancelado) setLocalizacaoEndereco(null); })
      .finally(() => { if (!cancelado) setLoadingEndereco(false); });
    return () => { cancelado = true; };
  }, [localizacaoModalAberto, localizacaoAtual?.latitude, localizacaoAtual?.longitude]);

  useEffect(() => {
    let cancelado = false;

    async function montarMapaTodos() {
      if (!mapaTodosModalAberto || !mapaTodosRef.current || !dispositivosComCoordenadas.length) return;

      try {
        const L = await carregarLeafletCDN();
        if (cancelado || !mapaTodosRef.current) return;

        if (!mapaTodosInstanciaRef.current) {
          mapaTodosInstanciaRef.current = L.map(mapaTodosRef.current, {
            zoomControl: true,
            attributionControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(mapaTodosInstanciaRef.current);

          mapaTodosLayerRef.current = L.layerGroup().addTo(mapaTodosInstanciaRef.current);
        }

        // Corrige ícones padrão do Leaflet quando carregado via CDN
        if (L?.Icon?.Default) {
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
        }

        mapaTodosLayerRef.current?.clearLayers();

        const bounds = L.latLngBounds([]);

        dispositivosComCoordenadas.forEach((d) => {
          const marker = L.marker([d.latitude, d.longitude]);
          marker.bindPopup(`
            <div style="font-size:12px;line-height:1.35;min-width:180px">
              <div style="font-weight:700;margin-bottom:4px">${String(d.dispositivo || "Dispositivo")}</div>
              <div><strong>ID:</strong> ${String(d.id || "-")}</div>
              <div><strong>Status:</strong> ${String(d.status || "-")}</div>
              <div><strong>Usuário:</strong> ${String(d.usuario || "-")}</div>
              <div><strong>Atualizado:</strong> ${formatarData(d.atualizadoEm)}</div>
            </div>
          `);
          marker.addTo(mapaTodosLayerRef.current);
          bounds.extend([d.latitude, d.longitude]);
        });

        if (dispositivosComCoordenadas.length === 1) {
          const unico = dispositivosComCoordenadas[0];
          mapaTodosInstanciaRef.current.setView([unico.latitude, unico.longitude], 15);
        } else if (bounds.isValid()) {
          mapaTodosInstanciaRef.current.fitBounds(bounds.pad(0.2));
        }

        setTimeout(() => mapaTodosInstanciaRef.current?.invalidateSize(), 30);
      } catch (erro) {
        console.log("Falha ao montar mapa de dispositivos:", erro);
      }
    }

    montarMapaTodos();

    return () => {
      cancelado = true;
      if (!mapaTodosModalAberto && mapaTodosInstanciaRef.current) {
        mapaTodosInstanciaRef.current.remove();
        mapaTodosInstanciaRef.current = null;
        mapaTodosLayerRef.current = null;
      }
    };
  }, [mapaTodosModalAberto, dispositivosComCoordenadas]);

  useEffect(() => {
    let cancelado = false;

    async function montarMapaRota() {
      if (!rotaModalAberto || !rotaMapaRef.current || !rotaPontos.length) return;
      try {
        const L = await carregarLeafletCDN();
        if (cancelado || !rotaMapaRef.current) return;

        if (!rotaMapaInstanciaRef.current) {
          rotaMapaInstanciaRef.current = L.map(rotaMapaRef.current, {
            zoomControl: true,
            attributionControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(rotaMapaInstanciaRef.current);

          rotaMapaLayerRef.current = L.layerGroup().addTo(rotaMapaInstanciaRef.current);
        }

        rotaMapaLayerRef.current?.clearLayers();

        const latLngs = rotaPontos.map((p) => [p.latitude, p.longitude]);
        const bounds = L.latLngBounds(latLngs);

        const polyline = L.polyline(latLngs, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.85,
        });
        polyline.addTo(rotaMapaLayerRef.current);

        const inicio = rotaPontos[0];
        const fim = rotaPontos[rotaPontos.length - 1];

        L.circleMarker([inicio.latitude, inicio.longitude], {
          radius: 7,
          color: "#16a34a",
          fillColor: "#16a34a",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`<strong>Início</strong><br/>${formatarData(inicio.dt_captura)}`)
          .addTo(rotaMapaLayerRef.current);

        L.circleMarker([fim.latitude, fim.longitude], {
          radius: 7,
          color: "#dc2626",
          fillColor: "#dc2626",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`<strong>Fim</strong><br/>${formatarData(fim.dt_captura)}`)
          .addTo(rotaMapaLayerRef.current);

        if (bounds.isValid()) {
          rotaMapaInstanciaRef.current.fitBounds(bounds.pad(0.2));
        }

        setTimeout(() => rotaMapaInstanciaRef.current?.invalidateSize(), 30);
      } catch (erro) {
        console.log("Falha ao montar mapa da rota:", erro);
      }
    }

    montarMapaRota();

    return () => {
      cancelado = true;
      if (!rotaModalAberto && rotaMapaInstanciaRef.current) {
        rotaMapaInstanciaRef.current.remove();
        rotaMapaInstanciaRef.current = null;
        rotaMapaLayerRef.current = null;
      }
    };
  }, [rotaModalAberto, rotaPontos]);

  async function copiarCoordenadas() {
    const texto = `${localizacaoAtual.latitude.toFixed(6)}, ${localizacaoAtual.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  async function solicitarAtualizacaoLocalizacao() {
    try {
      await api.post(`/v1/mobile/ativacao/${localizacaoAtual.idAtivacao}/comandos/solicitar-localizacao`, {
        id_usuario: empresaInfo.id_usuario,
      });
      await Swal.fire({
        icon: "success",
        title: "Comando enviado",
        text: "O dispositivo irá reportar a localização no próximo heartbeat.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Falha ao enviar comando",
        text: error?.response?.data?.error || "Não foi possível solicitar atualização de localização.",
      });
    }
  }

  function abrirMapaTodosDispositivos() {
    if (!dispositivosComCoordenadas.length) {
      Swal.fire({
        icon: "info",
        title: "Sem coordenadas disponíveis",
        text: "Nenhum dispositivo possui localização válida para exibir no mapa.",
      });
      return;
    }
    setMapaTodosModalAberto(true);
  }

  return (
    <>
      <Menu />
      <EspelhoScreenModal
        isOpen={espelhoModalAberto}
        onClose={() => setEspelhoModalAberto(false)}
        id_ativacao={espelhoAtivacaoId}
        id_usuario={empresaInfo.id_usuario}
        dispositivo={espelhoDispositivo}
      />
      {localizacaoModalAberto ? (
        <div
          className="modal show espelho-modal localizacao-modal"
          style={{ display: "block" }}
          onClick={() => setLocalizacaoModalAberto(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered localizacao-modal-dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content espelho-modal-content localizacao-modal-content">
              <div className="modal-header espelho-modal-header">
                <div>
                  <h5 className="modal-title mb-0" style={{ fontWeight: 700 }}>
                    Localizacao do Dispositivo
                  </h5>
                  <small className="text-muted">{localizacaoAtual?.dispositivo || "-"}</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setLocalizacaoModalAberto(false)} />
              </div>

              <div className="modal-body p-0 espelho-modal-body localizacao-modal-body">
                {typeof localizacaoAtual?.latitude === "number" && typeof localizacaoAtual?.longitude === "number" ? (
                  <div className="localizacao-map-shell">
                    <iframe
                      title="Mapa de localização do dispositivo"
                      className="localizacao-leaflet-map"
                      src={`https://maps.google.com/maps?q=${localizacaoAtual.latitude},${localizacaoAtual.longitude}&z=16&output=embed`}
                      allowFullScreen
                      loading="lazy"
                      style={{ border: 0 }}
                    />
                    <div className="localizacao-device-overlay-card">
                      <div className="localizacao-device-card-title">{localizacaoAtual.dispositivo || "Dispositivo"}</div>
                      {loadingEndereco ? (
                        <div className="localizacao-device-card-row">Buscando endereço...</div>
                      ) : localizacaoEndereco ? (
                        <div className="localizacao-device-card-row localizacao-device-card-address" title={localizacaoEndereco}>
                          📍 {localizacaoEndereco.length > 60 ? localizacaoEndereco.slice(0, 60) + "…" : localizacaoEndereco}
                        </div>
                      ) : null}
                      <div className="localizacao-device-card-row">
                        🗺 {localizacaoAtual.latitude.toFixed(6)}, {localizacaoAtual.longitude.toFixed(6)}
                      </div>
                      <div className="localizacao-device-card-row">GPS: {localizacaoAtual.permissao}</div>
                      {typeof localizacaoAtual.accuracy === "number" && (
                        <div className="localizacao-device-card-row">Precisão: ± {localizacaoAtual.accuracy.toFixed(0)} m</div>
                      )}
                      {typeof localizacaoAtual.altitude === "number" && (
                        <div className="localizacao-device-card-row">Altitude: {localizacaoAtual.altitude.toFixed(0)} m</div>
                      )}
                      {typeof localizacaoAtual.speed === "number" && localizacaoAtual.speed >= 0 && (
                        <div className="localizacao-device-card-row">Velocidade: {(localizacaoAtual.speed * 3.6).toFixed(1)} km/h</div>
                      )}
                      {typeof localizacaoAtual.batteryLevel === "number" && (
                        <div className="localizacao-device-card-row">
                          🔋 Bateria: {Math.min(Math.max(localizacaoAtual.batteryLevel, 0), 100)}%
                          {localizacaoAtual.batteryState === "charging" || localizacaoAtual.batteryState === "full" ? " ⚡" : ""}
                        </div>
                      )}
                      {localizacaoAtual.timestamp && (
                        <div className="localizacao-device-card-row">🕐 {formatarData(localizacaoAtual.timestamp)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="espelho-frame-placeholder">
                    <div className="text-center">
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📍</div>
                      <p className="text-muted mb-1">Localizacao indisponivel no momento</p>
                      <small className="text-muted">
                        Permissao atual: {localizacaoAtual?.permissao || "unknown"}
                      </small>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer espelho-modal-footer localizacao-footer">
                {typeof localizacaoAtual?.latitude === "number" && typeof localizacaoAtual?.longitude === "number" ? (
                  <div className="localizacao-footer-info">
                    {loadingEndereco && (
                      <span className="localizacao-info-chip">
                        <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Buscando endereço...
                      </span>
                    )}
                    {!loadingEndereco && localizacaoEndereco && (
                      <span className="localizacao-info-chip localizacao-endereco-chip" title={localizacaoEndereco}>
                        📍 {localizacaoEndereco.length > 70 ? localizacaoEndereco.slice(0, 70) + "…" : localizacaoEndereco}
                      </span>
                    )}
                    <button
                      type="button"
                      className="localizacao-info-chip localizacao-info-chip-btn"
                      onClick={copiarCoordenadas}
                      title="Copiar coordenadas"
                    >
                      {copiado ? <CheckCheck size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
                      {localizacaoAtual.latitude.toFixed(6)}, {localizacaoAtual.longitude.toFixed(6)}
                    </button>
                    {typeof localizacaoAtual.accuracy === "number" && (
                      <span className="localizacao-info-chip" title="Precisão do GPS">± {localizacaoAtual.accuracy.toFixed(0)} m</span>
                    )}
                    {typeof localizacaoAtual.altitude === "number" && (
                      <span className="localizacao-info-chip" title="Altitude">↑ {localizacaoAtual.altitude.toFixed(0)} m alt</span>
                    )}
                    {typeof localizacaoAtual.speed === "number" && localizacaoAtual.speed >= 0 && (
                      <span className="localizacao-info-chip" title="Velocidade">{(localizacaoAtual.speed * 3.6).toFixed(1)} km/h</span>
                    )}
                    {localizacaoAtual.timestamp && (
                      <span className="localizacao-info-chip" title="Última atualização">🕐 {formatarData(localizacaoAtual.timestamp)}</span>
                    )}
                  </div>
                ) : (
                  <small className="text-muted">Sem coordenadas para exibição</small>
                )}
                <div className="localizacao-footer-acoes">
                  {typeof localizacaoAtual?.latitude === "number" && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={solicitarAtualizacaoLocalizacao}
                      title="Solicitar atualização de localização no dispositivo"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      <RefreshCw size={13} strokeWidth={2} /> Atualizar
                    </button>
                  )}
                  {typeof localizacaoAtual?.latitude === "number" && (
                    <a
                      className="btn btn-outline-primary btn-sm localizacao-maps-btn"
                      href={`https://www.google.com/maps?q=${encodeURIComponent(`${localizacaoAtual.latitude},${localizacaoAtual.longitude}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir no Maps
                    </a>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLocalizacaoModalAberto(false)}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {rotaModalAberto ? (
        <div
          className="modal show espelho-modal localizacao-modal"
          style={{ display: "block" }}
          onClick={fecharRotaModal}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1400px", width: "98vw" }}
          >
            <div className="modal-content espelho-modal-content" style={{ height: "92vh", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="modal-header espelho-modal-header">
                <div>
                  <h5 className="modal-title mb-0" style={{ fontWeight: 700 }}>Rota do dispositivo</h5>
                  <small className="text-muted">{rotaDispositivo || "-"}</small>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <select
                    className="form-select form-select-sm"
                    value={rotaPeriodoMinutos}
                    onChange={onAlterarPeriodoRota}
                    style={{ width: 180 }}
                    disabled={rotaLoading}
                  >
                    {ROTA_PERIODO_OPCOES.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={rotaLoading || !rotaAtivacaoId}
                    onClick={() => carregarRotaAtivacao(rotaAtivacaoId, rotaPeriodoMinutos)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                    title="Recarregar rota"
                  >
                    <RefreshCw size={13} strokeWidth={2} /> Atualizar
                  </button>
                  <button type="button" className="btn-close" onClick={fecharRotaModal} />
                </div>
              </div>

              <div className="modal-body p-0" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "2.4fr 1fr" }}>
                <div style={{ borderRight: "1px solid #e2e8f0" }}>
                  {rotaLoading ? (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="text-muted">Carregando rota...</span>
                    </div>
                  ) : rotaPontos.length > 0 ? (
                    <div ref={rotaMapaRef} style={{ width: "100%", height: "100%", minHeight: 0, background: "#e2e8f0" }} />
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                      <span className="text-muted">Sem histórico de rota para o período selecionado.</span>
                    </div>
                  )}
                </div>
                <div style={{ overflowY: "auto", background: "#f8fafc" }}>
                  <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
                    Pontos da rota ({rotaPontos.length})
                  </div>
                  {rotaPontos.map((p, idx) => (
                    <div key={`${idx}-${p.latitude}-${p.longitude}`} style={{ padding: 10, borderBottom: "1px solid #e2e8f0", fontSize: 12, lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 700 }}>
                        {idx === 0 ? "Inicio" : idx === rotaPontos.length - 1 ? "Fim" : `Ponto ${idx + 1}`}
                      </div>
                      <div>{p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</div>
                      <div className="text-muted">{formatarData(p.dt_captura)}</div>
                      {p.source ? <div className="text-muted">Fonte: {p.source}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer espelho-modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={fecharRotaModal}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {mapaTodosModalAberto ? (
        <div
          className="modal show espelho-modal localizacao-modal"
          style={{ display: "block" }}
          onClick={() => setMapaTodosModalAberto(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1500px", width: "99vw" }}
          >
            <div className="modal-content espelho-modal-content" style={{ height: "94vh", maxHeight: "94vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="modal-header espelho-modal-header">
                <div>
                  <h5 className="modal-title mb-0" style={{ fontWeight: 700 }}>
                    Mapa de todos os dispositivos
                  </h5>
                  <small className="text-muted">
                    {dispositivosComCoordenadas.length} dispositivo(s) com localização disponível
                  </small>
                </div>
                <button type="button" className="btn-close" onClick={() => setMapaTodosModalAberto(false)} />
              </div>

              <div className="modal-body p-0" style={{ display: "grid", gridTemplateColumns: "2.6fr 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
                <div style={{ borderRight: "1px solid #e2e8f0" }}>
                  <div
                    ref={mapaTodosRef}
                    style={{ width: "100%", height: "100%", minHeight: 0, background: "#e2e8f0" }}
                  />
                </div>
                <div style={{ overflowY: "auto", background: "#f8fafc" }}>
                  <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
                    Dispositivos no mapa
                  </div>
                  {dispositivosComCoordenadas.map((d) => (
                    <div
                      key={String(d.id)}
                      style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontSize: 12, lineHeight: 1.35 }}
                    >
                      <div style={{ fontWeight: 700 }}>{d.dispositivo}</div>
                      <div className="text-muted">ID: {d.id} • Status: {d.status}</div>
                      <div className="text-muted">Usuário: {d.usuario}</div>
                      <div>
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(`${d.latitude},${d.longitude}`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.latitude.toFixed(6)}, {d.longitude.toFixed(6)}
                        </a>
                      </div>
                      <div className="text-muted">Atualizado: {formatarData(d.atualizadoEm)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer espelho-modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMapaTodosModalAberto(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {modalGerarAberto ? (
        <div
          className="modal show espelho-modal gerar-ativacao-modal"
          style={{ display: "block" }}
          onClick={fecharModalGerarAtivacao}
        >
          <div
            className="modal-dialog modal-dialog-centered gerar-ativacao-modal-dialog"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content espelho-modal-content gerar-ativacao-modal-content">
              <div className="modal-header espelho-modal-header">
                <div>
                  <h5 className="modal-title mb-0" style={{ fontWeight: 700 }}>Gerar ativação mobile</h5>
                  <small className="text-muted">Gere o QR Code para o usuário vincular o app</small>
                </div>
                <button type="button" className="btn-close" onClick={fecharModalGerarAtivacao} />
              </div>
              <div className="modal-body espelho-modal-body gerar-ativacao-modal-body">
                <div className="row g-3 h-100">
                  <div className="col-12 col-lg-5 d-flex flex-column">
                    <div className="card mobile-ativacao-card flex-fill">
                      <div className="card-body">
                        <h5 className="card-title mb-3">Nova ativação</h5>

                        <div className="mb-3 position-relative">
                          <label className="form-label">Usuário destinatário</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Digite o nome ou código do usuário..."
                            value={buscaUsuario}
                            onChange={(e) => buscarUsuarios(e.target.value)}
                            autoComplete="off"
                          />
                          {loadingUsuario && (
                            <div className="position-absolute end-0 top-50 me-2" style={{ marginTop: "12px" }}>
                              <span className="spinner-border spinner-border-sm text-secondary" />
                            </div>
                          )}
                          {resultadosUsuario.length > 0 && (
                            <ul className="list-group position-absolute w-100" style={{ zIndex: 999, top: "100%", border: "1px solid #dbe3ef", borderRadius: "0 0 6px 6px", height: "auto", overflow: "hidden" }}>
                              {resultadosUsuario.map((u) => (
                                <li
                                  key={u.codigo}
                                  className="list-group-item list-group-item-action"
                                  style={{ cursor: "pointer" }}
                                  onMouseDown={() => selecionarUsuario(u)}
                                >
                                  <div>{u.descricao}</div>
                                  {u.descricao2 ? <div className="text-muted" style={{ fontSize: "0.8em" }}>CPF: {u.descricao2}</div> : null}
                                </li>
                              ))}
                            </ul>
                          )}
                          {!usuarioSelecionado && buscaUsuario.length > 1 && !loadingUsuario && resultadosUsuario.length === 0 && (
                            <div className="text-muted small mt-1">Nenhum usuário encontrado.</div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          onClick={gerarAtivacao}
                          disabled={loadingGerar}
                        >
                          {loadingGerar ? "Gerando..." : "Gerar token e QR Code"}
                        </button>

                        {!!tokenAtual && (
                          <div className="alert alert-info mt-3 mb-0" role="alert">
                            <div><strong>Código:</strong> {tokenAtual.codigo_ativacao}</div>
                            <div><strong>Expira em:</strong> {tokenAtual.validade_minutos} min</div>
                            <div className="text-break"><strong>Token:</strong> {tokenAtual.token_ativacao}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-7 d-flex flex-column">
                    <div className="card mobile-ativacao-card flex-fill">
                      <div className="card-body qr-preview-wrap">
                        <h5 className="card-title mb-3">QR Code de ativação</h5>

                        {qrDataUrl ? (
                          <>
                            <img src={qrDataUrl} alt="QR Code de ativação mobile" className="qr-image" />
                            <p className="text-muted mt-2 mb-0 text-center">
                              O usuário deve escanear este QR no primeiro acesso do aplicativo.
                            </p>
                          </>
                        ) : (
                          <div className="placeholder-qrcode">Nenhum QR gerado ainda.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer espelho-modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={fecharModalGerarAtivacao}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="container-fluid Containe-Tela mobile-ativacao-page">

        <div className="row text-body-secondary mb-3">
          <h1 className="mb-2 titulo-da-pagina">Configuração - Ativação Mobile por QR Code</h1>
          <p className="text-muted mb-0">
            Gere o QR Code para o usuário vincular o app mobile ao servidor desta empresa.
          </p>
        </div>

        <p className="mobile-ativacao-section-title">Filtros</p>
        <div className="mobile-ativacao-card mobile-ativacao-filtros-card">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label">Código / ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="Filtrar por código ou ID"
                value={filtroCodigo}
                onChange={(e) => setFiltroCodigo(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="P">Pendente</option>
                <option value="U">Utilizado</option>
                <option value="R">Revogado</option>
                <option value="D">Redefinido</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Usuário</label>
              <input
                type="text"
                className="form-control"
                placeholder="Filtrar por usuário"
                value={filtroUsuarioTabela}
                onChange={(e) => setFiltroUsuarioTabela(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Dispositivo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Filtrar por dispositivo"
                value={filtroDispositivo}
                onChange={(e) => setFiltroDispositivo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">Meus Dispositivos</h5>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={abrirMapaTodosDispositivos}>
                  Visualizar todos no mapa
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setModalGerarAberto(true)}>
                  Nova ativação
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => carregarAtivacoes()}>
                  Atualizar
                </button>
              </div>
            </div>

            {loadingLista ? (
              <p className="text-muted mb-0">Consultando ativações...</p>
            ) : ativacoesFiltradas.length === 0 ? (
              <p className="text-muted mb-0">Nenhuma ativação encontrada.</p>
            ) : (
              <div
                className="table-responsive"
                ref={tabelaContainerRef}
                onMouseEnter={() => {
                  interagindoTabelaRef.current = true;
                }}
                onMouseLeave={() => {
                  interagindoTabelaRef.current = false;
                }}
                onFocusCapture={() => {
                  interagindoTabelaRef.current = true;
                }}
                onBlurCapture={() => {
                  setTimeout(() => {
                    const ativo = document.activeElement;
                    if (!tabelaContainerRef.current?.contains(ativo)) {
                      interagindoTabelaRef.current = false;
                    }
                  }, 0);
                }}
              >
                <table className="table table-sm table-hover align-middle mb-0 mobile-ativacao-table">
                  <thead>
                    <tr>
                      <th className="text-start">Ação</th>
                      <th>ID</th>
                      <th>Código</th>
                      <th>Status</th>
                      <th>Usuário</th>
                      <th>Dispositivo</th>
                      <th>Permissões</th>
                      <th>Rede</th>
                      <th>Bateria</th>
                      <th>Armazenamento</th>
                      <th>Memória RAM</th>
                      <th>CPU</th>
                      <th>Versão app</th>
                      <th>Tempo de uso</th>
                      <th>Segurança</th>
                      <th>ID Dispositivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ativacoesFiltradas.map((item) => (
                      <tr key={String(item.id_ativacao)}>
                        <td className="text-start mobile-acao-col">
                          <div className="mobile-acao-menu">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm mobile-acao-trigger"
                              onClick={(event) => toggleMenuAcao(item, event)}
                              aria-expanded={menuAcaoAberto.id === item.id_ativacao}
                            >
                              Opções
                            </button>
                            {menuAcaoAberto.id === item.id_ativacao ? (
                              <div
                                ref={menuAcaoRef}
                                className={`mobile-acao-dropdown${menuAcaoAberto.up ? " mobile-acao-dropdown-up" : ""}`}
                                style={{ top: menuAcaoAberto.top, left: menuAcaoAberto.left }}
                                role="menu"
                                aria-label={`Ações da ativação ${item.id_ativacao}`}
                              >
                              <button
                                type="button"
                                className="mobile-acao-item"
                                title="Localizar dispositivo no mapa"
                                onClick={() => {
                                  fecharMenuAcao();
                                  abrirLocalizacaoModal(item);
                                }}
                              >
                                <MapPin size={15} strokeWidth={1.8} /> Localizar
                              </button>
                              <button
                                type="button"
                                className="mobile-acao-item"
                                title="Visualizar rota do dispositivo"
                                onClick={() => {
                                  fecharMenuAcao();
                                  abrirRotaModal(item);
                                }}
                              >
                                <MapPin size={15} strokeWidth={1.8} /> Rota
                              </button>
                              <button
                                type="button"
                                className="mobile-acao-item"
                                title="Espelhar tela do dispositivo"
                                onClick={() => {
                                  fecharMenuAcao();
                                  abrirEspelhoModal(item);
                                }}
                              >
                                <Smartphone size={15} strokeWidth={1.8} /> Espelhar
                              </button>
                              <button
                                type="button"
                                className="mobile-acao-item"
                                title="Solicitar permissão no dispositivo"
                                onClick={() => {
                                  fecharMenuAcao();
                                  solicitarPermissaoRemota(item);
                                }}
                              >
                                <ShieldCheck size={15} strokeWidth={1.8} /> Permissões
                              </button>
                              {item.status === "P" ? (
                                <button
                                  type="button"
                                  className="mobile-acao-item"
                                  title="Gerar um novo QR Code para esta ativação"
                                  onClick={() => {
                                    fecharMenuAcao();
                                    abrirModalGerarNovoQr(item);
                                  }}
                                >
                                  <RefreshCw size={15} strokeWidth={1.8} /> Gerar novo QR Code
                                </button>
                              ) : null}
                              {item.status === "U" || item.status === "P" ? (
                                <button
                                  type="button"
                                  className="mobile-acao-item mobile-acao-item-danger"
                                  title="Inativar dispositivo (histórico preservado)"
                                  onClick={() => {
                                    fecharMenuAcao();
                                    inativarDispositivo(item);
                                  }}
                                >
                                  <XCircle size={15} strokeWidth={1.8} /> Inativar dispositivo
                                </button>
                              ) : null}
                              {item.status === "D" ? (
                                <button
                                  type="button"
                                  className="mobile-acao-item"
                                  onClick={() => {
                                    fecharMenuAcao();
                                    abrirModalReativacao(item);
                                  }}
                                >
                                  <RefreshCw size={15} strokeWidth={1.8} /> Reativar
                                </button>
                              ) : (
                                <span className="mobile-acao-item-disabled">Reativar indisponível</span>
                              )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>{item.id_ativacao}</td>
                        <td>{item.codigo_ativacao}</td>
                        <td>
                          <span className={`status-pill status-${String(item.status || "").toLowerCase()}`}>
                            {statusTag(item.status)}
                          </span>
                        </td>
                        <td>
                          {item.nome_usuario_ativacao
                            ? (item.id_usuario_destino ? `${item.id_usuario_destino} - ${item.nome_usuario_ativacao}` : item.nome_usuario_ativacao)
                            : "-"}
                        </td>
                        <td>{item.dispositivo || "-"}</td>
                        <td>{obterPermissoes(item)}</td>
                        <td>{obterRede(item)}</td>
                        <td>{obterBateria(item)}</td>
                        <td>{obterStorage(item)}</td>
                        <td>{obterMemoria(item)}</td>
                        <td>{obterCpu(item)}</td>
                        <td>{obterVersaoApp(item)}</td>
                        <td>{obterTempoUso(item)}</td>
                        <td>{obterSeguranca(item)}</td>
                        <td>{obterDeviceId(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
