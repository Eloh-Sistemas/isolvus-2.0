import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
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
  return status || "-";
}

export default function MobileAtivacao() {
  const [validadeMinutos, setValidadeMinutos] = useState(10);
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);
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

    const minutos = Number(validadeMinutos || 0);
    if (!Number.isFinite(minutos) || minutos < 1) {
      alert("Informe uma validade em minutos maior ou igual a 1.");
      return;
    }

    setLoadingGerar(true);
    try {
      const { data } = await api.post("/v1/mobile/ativacao/gerar", {
        id_empresa: empresaInfo.id_empresa,
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
      alert("Não foi possível gerar a ativação mobile.");
    } finally {
      setLoadingGerar(false);
    }
  }

  async function revogarAtivacao(item) {
    if (!item?.id_ativacao) return;

    const confirmado = window.confirm("Deseja revogar esta ativação?");
    if (!confirmado) return;

    try {
      await api.post("/v1/mobile/ativacao/revogar", {
        id_ativacao: item.id_ativacao,
        id_usuario: empresaInfo.id_usuario,
      });
      await carregarAtivacoes();
    } catch (error) {
      console.log("Erro ao revogar ativação mobile:", error);
      alert("Não foi possível revogar a ativação.");
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
                          <th>Usuário ativou</th>
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
                            <td>{item.id_usuario_ativacao || "-"}</td>
                            <td>{formatarData(item.dt_criacao)}</td>
                            <td>{formatarData(item.dt_expiracao)}</td>
                            <td>{formatarData(item.dt_utilizacao)}</td>
                            <td className="text-end">
                              {item.status === "P" ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => revogarAtivacao(item)}
                                >
                                  Revogar
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
