import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import Menu from "../../../componentes/Menu/Menu";
import api from "../../../servidor/api";
import "./MobileAtivacao.css";

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
      <span style={{ color: fillColor, fontWeight: 600, fontSize: 13 }}>
        {pct}%
      </span>
      {lowPower && (
        <span title="Modo economia ativo" style={{ fontSize: 11, color: "#f59e0b" }}>🔋</span>
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
    <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>
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
    <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>
      v{version}
      {build ? <span className="text-muted"> ({build})</span> : null}
      {state ? <span style={{ marginLeft: 4, color: stateColor, fontSize: 10, fontWeight: 600 }}>● {state}</span> : null}
    </span>
  );
}

function obterMemoria(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const bytes = info?.hardware?.total_memory_bytes;
  if (typeof bytes !== "number") return <span className="text-muted">-</span>;
  return <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>{(bytes / 1e9).toFixed(1)} GB</span>;
}

function obterCpu(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const archs = info?.hardware?.cpu_architectures;
  if (!Array.isArray(archs) || archs.length === 0) return <span className="text-muted">-</span>;
  return <span style={{ fontSize: 11, whiteSpace: "nowrap" }} title={archs.join(", ")}>{archs[0]}</span>;
}

function obterSeguranca(item) {
  const info = parseDispositivoInfo(item?.dispositivo_info_json);
  const isRooted = info?.security?.is_rooted;

  if (isRooted === null || isRooted === undefined) return <span className="text-muted">-</span>;

  return isRooted
    ? <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }} title="Dispositivo com root/jailbreak">⚠ Root</span>
    : <span style={{ color: "#22c55e", fontSize: 12 }}>✓ OK</span>;
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
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 3 }}>
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
              fontSize: 10,
              fontWeight: 700,
              color,
              background: bg,
              border: `1px solid ${color}`,
              borderRadius: 3,
              padding: "1px 5px",
              whiteSpace: "nowrap",
            }}
          >
            {icon} {label}
          </span>
        );
      })}
    </span>
  );
}

export default function MobileAtivacao() {
  const [validadeMinutos, setValidadeMinutos] = useState(10);
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
  const [revogandoId, setRevogandoId] = useState(null);
  const [tokenAtual, setTokenAtual] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [ativacoes, setAtivacoes] = useState([]);

  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [resultadosUsuario, setResultadosUsuario] = useState([]);
  const [loadingUsuario, setLoadingUsuario] = useState(false);

  const empresaInfo = useMemo(() => ({
    id_empresa: String(localStorage.getItem("id_empresa") || ""),
    razaosocial: String(localStorage.getItem("razaosocial") || ""),
    id_usuario: Number(localStorage.getItem("id_usuario") || 0),
    id_grupo_empresa: String(localStorage.getItem("id_grupo_empresa") || ""),
  }), []);

  async function carregarAtivacoes() {
    setLoadingLista(true);
    try {
      const { data } = await api.get("/v1/mobile/ativacao/listar", {
        params: { id_empresa: empresaInfo.id_empresa || undefined },
      });
      setAtivacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Erro ao listar ativações mobile:", error);
      alert("Não foi possível consultar as ativações mobile.");
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => {
    carregarAtivacoes();

    const timer = setInterval(() => {
      carregarAtivacoes();
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

    const minutos = Number(validadeMinutos || 0);
    if (!Number.isFinite(minutos) || minutos < 1) {
      alert("Informe uma validade em minutos maior ou igual a 1.");
      return;
    }

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

  return (
    <>
      <Menu />
      <div className="container-fluid Containe-Tela">
        <div className="row mb-3">
          <h1 className="mb-2 titulo-da-pagina">Configuração - Ativação Mobile por QR Code</h1>
          <p className="text-muted mb-0">
            Gere o QR Code para o usuário vincular o app mobile ao servidor desta empresa.
          </p>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-5">
            <div className="card card-ativacao h-100">
              <div className="card-body">
                <h5 className="card-title mb-3">Gerar nova ativação</h5>

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

                <div className="mb-3">
                  <label className="form-label">Validade (minutos)</label>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={validadeMinutos}
                    onChange={(e) => setValidadeMinutos(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-100"
                  onClick={gerarAtivacao}
                  disabled={loadingGerar}
                >
                  {loadingGerar ? "Gerando..." : "Gerar QR Code"}
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
            <div className="card card-ativacao h-100">
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

        <div className="row mt-3">
          <div className="col-12">
            <div className="card card-ativacao">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Controle de ativações</h5>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={carregarAtivacoes}>
                    Atualizar
                  </button>
                </div>

                {loadingLista ? (
                  <p className="text-muted mb-0">Consultando ativações...</p>
                ) : ativacoes.length === 0 ? (
                  <p className="text-muted mb-0">Nenhuma ativação encontrada.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Código</th>
                          <th>Status</th>
                          <th>Destinatário</th>
                          <th>Nome usuário</th>
                          <th>Dispositivo</th>
                          <th>MAC</th>
                          <th>Bateria</th>
                          <th>Localização</th>
                          <th>Armazenamento</th>
                          <th>Memória RAM</th>
                          <th>CPU</th>
                          <th>Versão app</th>
                          <th>Segurança</th>
                          <th>Permissões</th>
                          <th>Uso apps</th>
                          <th>Criação</th>
                          <th>Expiração</th>
                          <th>Uso</th>
                          <th className="text-end">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ativacoes.map((item) => (
                          <tr key={String(item.id_ativacao)}>
                            <td>{item.id_ativacao}</td>
                            <td>{item.codigo_ativacao}</td>
                            <td>
                              <span className={`status-pill status-${String(item.status || "").toLowerCase()}`}>
                                {statusTag(item.status)}
                              </span>
                            </td>
                            <td>{item.id_usuario_destino || "-"}</td>
                            <td>{item.nome_usuario_ativacao || "-"}</td>
                            <td>{item.dispositivo || "-"}</td>
                            <td>{obterMacDispositivo(item)}</td>
                            <td>{obterBateria(item)}</td>
                            <td>{obterLocalizacao(item)}</td>
                            <td>{obterStorage(item)}</td>
                            <td>{obterMemoria(item)}</td>
                            <td>{obterCpu(item)}</td>
                            <td>{obterVersaoApp(item)}</td>
                            <td>{obterSeguranca(item)}</td>
                            <td>{obterPermissoes(item)}</td>
                            <td>{obterUsoApps(item)}</td>
                            <td>{formatarData(item.dt_criacao)}</td>
                            <td>{formatarData(item.dt_expiracao)}</td>
                            <td>{formatarData(item.dt_utilizacao)}</td>
                            <td className="text-end">
                              {item.status === "P" ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => revogarAtivacao(item)}
                                  disabled={revogandoId === item.id_ativacao}
                                >
                                  {revogandoId === item.id_ativacao ? "Revogando..." : "Revogar"}
                                </button>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
