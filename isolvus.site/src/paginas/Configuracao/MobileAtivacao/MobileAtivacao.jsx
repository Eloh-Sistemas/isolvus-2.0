import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { MapPin, Smartphone, ShieldCheck, XCircle, Copy, CheckCheck, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import Menu from "../../../componentes/Menu/Menu";
import api from "../../../servidor/api";
import EspelhoScreenModal from "./EspelhoScreenModal";
import "./MobileAtivacao.css";

const deviceLocationIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function createNearbyPlaceIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const nearbyPlaceIcon = createNearbyPlaceIcon("violet");

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

function statusTag(status) {
  if (status === "P") return "Pendente";
  if (status === "U") return "Utilizado";
  if (status === "R") return "Revogado";
  if (status === "D") return "Redefinido pelo dispositivo";
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

function obterMacDispositivo(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const mac = info?.network?.mac_address || info?.device?.mac_address || "";

  if (mac) return String(mac).toUpperCase();
  return "Indisponível";
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

function LocalizacaoMapaController({ latitude, longitude, markerRef }) {
  const map = useMap();

  useEffect(() => {
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    map.setView([latitude, longitude], 16, { animate: false });
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [latitude, longitude, map, markerRef]);

  return null;
}

export default function MobileAtivacao() {
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [revogandoId, setRevogandoId] = useState(null);
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
  const [menuAcaoAberto, setMenuAcaoAberto] = useState({ id: null, top: 0, left: 0, up: false });
  const interagindoTabelaRef = useRef(false);
  const tabelaContainerRef = useRef(null);
  const menuAcaoRef = useRef(null);
  const localizacaoMarkerRef = useRef(null);
  const [localizacaoEndereco, setLocalizacaoEndereco] = useState(null);
  const [loadingEndereco, setLoadingEndereco] = useState(false);
  const [locaisProximos, setLocaisProximos] = useState([]);
  const [loadingLocaisProximos, setLoadingLocaisProximos] = useState(false);
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
      setResultadosUsuario(Array.isArray(data) ? data.slice(0, 10) : []);
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

  async function revogarAtivacao(item) {

    if (!item?.id_ativacao) return;

    const confirmacao = await Swal.fire({
      title: "Revogar ativação?",
      text: "Essa ação irá invalidar o QR Code e não poderá ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, revogar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmacao.isConfirmed) return;

    try {
      setRevogandoId(item.id_ativacao);
      let data;
      try {
        // Rota nova (com ID no path)
        const response = await api.post(`/v1/mobile/ativacao/${item.id_ativacao}/revogar`, {
          id_usuario: empresaInfo.id_usuario,
        });;

        console.log(response.data);
        data = response?.data;
      } catch (errorNovaRota) {
        // Fallback para rota legada já usada em produção
        console.log(errorNovaRota);
        if (errorNovaRota?.response?.status === 404) {
          const responseLegada = await api.post("/v1/mobile/ativacao/revogar", {
            id_ativacao: item.id_ativacao,
            id_usuario: empresaInfo.id_usuario,
          });
          data = responseLegada?.data;
          
        } else {
          throw errorNovaRota;
        }
      }

      if (!["R", "D"].includes(String(data?.status || ""))) {
        throw new Error("A API não confirmou status revogado.");
      }

      await carregarAtivacoes();
    } catch (error) {
      console.log("Erro ao revogar ativação mobile:", error);
      alert(error?.response?.data?.error || "Não foi possível revogar a ativação.");
    } finally {
      setRevogandoId(null);
    }
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

    setLocalizacaoEndereco(null);
    setLocaisProximos([]);
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
    });
    setLocalizacaoModalAberto(true);
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
    const alturaMenuEstimada = item.status === "P" ? 190 : 160;
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
    if (!localizacaoModalAberto || typeof localizacaoAtual?.latitude !== "number" || typeof localizacaoAtual?.longitude !== "number") return;

    let cancelado = false;
    setLoadingLocaisProximos(true);
    setLocaisProximos([]);

    const query = `
      [out:json][timeout:20];
      (
        node(around:700,${localizacaoAtual.latitude},${localizacaoAtual.longitude})[amenity];
        node(around:700,${localizacaoAtual.latitude},${localizacaoAtual.longitude})[shop];
        node(around:700,${localizacaoAtual.latitude},${localizacaoAtual.longitude})[tourism];
        node(around:700,${localizacaoAtual.latitude},${localizacaoAtual.longitude})[healthcare];
        node(around:700,${localizacaoAtual.latitude},${localizacaoAtual.longitude})[office];
      );
      out body 20;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: query,
    })
      .then((resposta) => resposta.json())
      .then((data) => {
        if (cancelado) return;

        const elementos = Array.isArray(data?.elements) ? data.elements : [];
        const itens = elementos
          .filter((item) => typeof item?.lat === "number" && typeof item?.lon === "number")
          .map((item) => ({
            id: item.id,
            latitude: item.lat,
            longitude: item.lon,
            nome: item?.tags?.name || traduzirTipoLocal(item),
            tipo: traduzirTipoLocal(item),
            endereco: [item?.tags?.addr_street, item?.tags?.addr_housenumber].filter(Boolean).join(", "),
          }))
          .slice(0, 20);

        setLocaisProximos(itens);
      })
      .catch(() => {
        if (!cancelado) setLocaisProximos([]);
      })
      .finally(() => {
        if (!cancelado) setLoadingLocaisProximos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [localizacaoModalAberto, localizacaoAtual?.latitude, localizacaoAtual?.longitude]);

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
                    <MapContainer
                      className="localizacao-leaflet-map"
                      center={[localizacaoAtual.latitude, localizacaoAtual.longitude]}
                      zoom={16}
                      scrollWheelZoom
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocalizacaoMapaController
                        latitude={localizacaoAtual.latitude}
                        longitude={localizacaoAtual.longitude}
                        markerRef={localizacaoMarkerRef}
                      />
                      <Marker
                        position={[localizacaoAtual.latitude, localizacaoAtual.longitude]}
                        icon={deviceLocationIcon}
                        ref={localizacaoMarkerRef}
                      >
                        <Popup autoPan className="localizacao-popup">
                          <div className="localizacao-popup-content">
                            <div className="localizacao-popup-title">
                              {localizacaoAtual?.dispositivo || "Dispositivo"}
                            </div>
                            <div className="localizacao-popup-line">
                              {loadingEndereco ? "Buscando endereço..." : (localizacaoEndereco || "Endereço não disponível")}
                            </div>
                            <div className="localizacao-popup-line">
                              Coordenadas: {localizacaoAtual.latitude.toFixed(6)}, {localizacaoAtual.longitude.toFixed(6)}
                            </div>
                            <div className="localizacao-popup-line">
                              Permissão: {localizacaoAtual?.permissao || "unknown"}
                            </div>
                            {typeof localizacaoAtual.accuracy === "number" && (
                              <div className="localizacao-popup-line">
                                Precisão: ± {localizacaoAtual.accuracy.toFixed(0)} m
                              </div>
                            )}
                            {typeof localizacaoAtual.altitude === "number" && (
                              <div className="localizacao-popup-line">
                                Altitude: {localizacaoAtual.altitude.toFixed(0)} m
                              </div>
                            )}
                            {typeof localizacaoAtual.speed === "number" && localizacaoAtual.speed >= 0 && (
                              <div className="localizacao-popup-line">
                                Velocidade: {(localizacaoAtual.speed * 3.6).toFixed(1)} km/h
                              </div>
                            )}
                            {localizacaoAtual.timestamp && (
                              <div className="localizacao-popup-line">
                                Atualizado em: {formatarData(localizacaoAtual.timestamp)}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                      {locaisProximos.map((local) => (
                        <Marker
                          key={String(local.id)}
                          position={[local.latitude, local.longitude]}
                          icon={nearbyPlaceIcon}
                        >
                          <Popup className="localizacao-popup localizacao-popup-poi">
                            <div className="localizacao-popup-content">
                              <div className="localizacao-popup-title">{local.nome}</div>
                              <div className="localizacao-popup-line">Tipo: {local.tipo}</div>
                              {local.endereco && (
                                <div className="localizacao-popup-line">Endereco: {local.endereco}</div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
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
                    {loadingLocaisProximos && (
                      <span className="localizacao-info-chip">Buscando locais próximos...</span>
                    )}
                    {!loadingLocaisProximos && locaisProximos.length > 0 && (
                      <span className="localizacao-info-chip" title="Quantidade de locais próximos mapeados">
                        {locaisProximos.length} locais próximos
                      </span>
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
      <div className="container-fluid Containe-Tela mobile-ativacao-page">
        <div className={`modal ${modalGerarAberto ? "show d-block" : ""}`} tabIndex="-1" role="dialog" aria-modal="true" style={{ background: "rgba(15,23,42,.45)" }}>
          <div className="modal-dialog modal-xl modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 700 }}>Gerar ativação mobile</h5>
                <button type="button" className="btn-close" onClick={() => setModalGerarAberto(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-lg-5">
                    <div className="card mobile-ativacao-card h-100">
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
                            <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 999, top: "100%" }}>
                              {resultadosUsuario.map((u) => (
                                <li
                                  key={u.codigo}
                                  className="list-group-item list-group-item-action"
                                  style={{ cursor: "pointer" }}
                                  onMouseDown={() => selecionarUsuario(u)}
                                >
                                  <strong>{u.codigo}</strong> — {u.descricao}
                                  {u.descricao2 ? <span className="text-muted ms-1">({u.descricao2})</span> : null}
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

                  <div className="col-12 col-lg-7">
                    <div className="card mobile-ativacao-card h-100">
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
            </div>
          </div>
        </div>

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
                      <th>Segurança</th>
                      <th>MAC</th>
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
                                  className="mobile-acao-item mobile-acao-item-danger"
                                  onClick={() => {
                                    fecharMenuAcao();
                                    revogarAtivacao(item);
                                  }}
                                  disabled={revogandoId === item.id_ativacao}
                                >
                                  {revogandoId === item.id_ativacao ? "Revogando..." : <><XCircle size={15} strokeWidth={1.8} /> Revogar</>}
                                </button>
                              ) : (
                                <span className="mobile-acao-item-disabled">Revogar indisponível</span>
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
                          {item.id_usuario_destino
                            ? `${item.id_usuario_destino} - ${item.nome_usuario_ativacao || "-"}`
                            : item.nome_usuario_ativacao || "-"}
                        </td>
                        <td>{item.dispositivo || "-"}</td>
                        <td>{obterPermissoes(item)}</td>
                        <td>{obterRede(item)}</td>
                        <td>{obterBateria(item)}</td>
                        <td>{obterStorage(item)}</td>
                        <td>{obterMemoria(item)}</td>
                        <td>{obterCpu(item)}</td>
                        <td>{obterVersaoApp(item)}</td>
                        <td>{obterSeguranca(item)}</td>
                        <td>{obterMacDispositivo(item)}</td>
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
