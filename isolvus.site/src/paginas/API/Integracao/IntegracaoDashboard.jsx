import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Menu from "../../../componentes/Menu/Menu";
import api from "../../../servidor/api";
import moment from "moment";
import ReactApexChart from "react-apexcharts";
import "./IntegracaoDashboard.css";

// ─── Badge de status ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        S: { label: "Sucesso",  cls: "bg-success" },
        P: { label: "Parcial",  cls: "bg-warning text-dark" },
        E: { label: "Erro",     cls: "bg-danger" },
    };
    const s = map[status] ?? { label: status, cls: "bg-secondary" };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

// ─── Paginação ──────────────────────────────────────────────────────────────
const ITEMS_POR_PAGINA = 20;

function Paginacao({ total, pagina, onChange }) {
    const totalPaginas = Math.ceil(total / ITEMS_POR_PAGINA);
    if (totalPaginas <= 1) return null;

    const inicio = (pagina - 1) * ITEMS_POR_PAGINA + 1;
    const fim    = Math.min(pagina * ITEMS_POR_PAGINA, total);

    const delta = 2;
    const pages = [];
    for (let i = Math.max(1, pagina - delta); i <= Math.min(totalPaginas, pagina + delta); i++) {
        pages.push(i);
    }

    return (
        <div className="integ-paginacao">
            <span className="integ-paginacao-info">{inicio}–{fim} de {total} registros</span>
            <div className="d-flex gap-1">
                <button className="integ-pag-btn" disabled={pagina === 1} onClick={() => onChange(1)} title="Primeira">
                    <i className="bi bi-chevron-double-left"></i>
                </button>
                <button className="integ-pag-btn" disabled={pagina === 1} onClick={() => onChange(pagina - 1)} title="Anterior">
                    <i className="bi bi-chevron-left"></i>
                </button>
                {pages.map((p) => (
                    <button key={p} className={`integ-pag-btn ${p === pagina ? "active" : ""}`} onClick={() => onChange(p)}>{p}</button>
                ))}
                <button className="integ-pag-btn" disabled={pagina === totalPaginas} onClick={() => onChange(pagina + 1)} title="Próxima">
                    <i className="bi bi-chevron-right"></i>
                </button>
                <button className="integ-pag-btn" disabled={pagina === totalPaginas} onClick={() => onChange(totalPaginas)} title="Última">
                    <i className="bi bi-chevron-double-right"></i>
                </button>
            </div>
        </div>
    );
}

// ─── Badge de método HTTP ────────────────────────────────────────────────────
function MetodoBadge({ metodo }) {
    const m = (metodo ?? "").toUpperCase();
    const map = {
        GET:    "bg-primary",
        POST:   "bg-success",
        PUT:    "bg-warning text-dark",
        PATCH:  "bg-info text-dark",
        DELETE: "bg-danger",
    };
    const cls = map[m] ?? "bg-secondary";
    return <span className={`badge ${cls}`} style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>{m || "—"}</span>;
}

// ─── Ordenação helper ──────────────────────────────────────────────────────────
function sortarLista(lista, coluna, direcao) {
    if (!coluna) return lista;
    return [...lista].sort((a, b) => {
        let av = a[coluna], bv = b[coluna];
        if (typeof av === 'number' && typeof bv === 'number') {
            return direcao === 'asc' ? av - bv : bv - av;
        }
        if (coluna === 'data_hora_inicio' || coluna === 'datahora_proxima_atualizacao') {
            const da = moment(av).valueOf() || 0;
            const db = moment(bv).valueOf() || 0;
            return direcao === 'asc' ? da - db : db - da;
        }
        av = String(av ?? '').toLowerCase();
        bv = String(bv ?? '').toLowerCase();
        if (av < bv) return direcao === 'asc' ? -1 : 1;
        if (av > bv) return direcao === 'asc' ? 1 : -1;
        return 0;
    });
}

// ─── Cabeçalho de coluna ordenável ──────────────────────────────────────────
function ThSort({ coluna, atual, direcao, onSort, children, className, style }) {
    const ativo = atual === coluna;
    const icone = ativo
        ? (direcao === 'asc' ? 'bi-sort-up-alt' : 'bi-sort-down-alt')
        : 'bi-arrow-down-up';
    return (
        <th
            className={`integ-th-sort ${className ?? ''}`}
            style={style}
            onClick={() => onSort(coluna)}
        >
            {children}&nbsp;<i className={`bi ${icone} integ-sort-icon ${ativo ? 'text-primary' : ''}`}></i>
        </th>
    );
}

// ─── Card de resumo ──────────────────────────────────────────────────────────
function CardResumo({ icone, titulo, valor, cor }) {
    return (
        <div className="integ-resumo-card">
            <div className={`integ-resumo-icon ${cor}`}>
                <i className={`bi ${icone}`}></i>
            </div>
            <div>
                <div className="integ-resumo-label">{titulo}</div>
                <div className="integ-resumo-valor">{valor ?? "—"}</div>
            </div>
        </div>
    );
}

// ─── Modal de detalhes do log ────────────────────────────────────────────────
function ModalDetalhes({ log, detalhes, onClose }) {
    if (!log) return null;
    return createPortal(
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,.45)", zIndex: 100000 }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header py-2">
                        <div className="d-flex align-items-center gap-2">
                            <h5 className="modal-title mb-0">{log.integracao}</h5>
                            <StatusBadge status={log.status} />
                        </div>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Host e tempo */}
                        <p className="integ-section-title">Execução</p>
                        <div className="integ-card integ-card-info mb-3">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <small className="integ-section-title d-block mb-1">Host</small>
                                    <span className="text-break" style={{ fontSize: "0.875rem" }}>{log.host}</span>
                                </div>
                                <div className="col-md-3">
                                    <small className="integ-section-title d-block mb-1">Início</small>
                                    <span style={{ fontSize: "0.875rem" }}>{log.data_hora_inicio}</span>
                                </div>
                                <div className="col-md-3">
                                    <small className="integ-section-title d-block mb-1">Duração</small>
                                    <span style={{ fontSize: "0.875rem" }}>{log.duracao_segundos != null ? `${log.duracao_segundos}s` : "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* KPIs */}
                        <p className="integ-section-title">Contadores</p>
                        <div className="row g-2 mb-3">
                            {[{ label: "Recebidos", val: log.qtd_recebidos, cls: "text-secondary" },
                              { label: "Inseridos",  val: log.qtd_inseridos,  cls: "text-success"  },
                              { label: "Atualizados",val: log.qtd_atualizados,cls: "text-primary"  },
                              { label: "Erros",      val: log.qtd_erros,      cls: "text-danger"   },
                            ].map((k) => (
                                <div className="col-3" key={k.label}>
                                    <div className="integ-modal-kpi">
                                        <div className="label">{k.label}</div>
                                        <div className={`valor ${k.cls}`}>{k.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {log.mensagem_erro && (
                            <div className="alert alert-danger py-2 mb-3">
                                <small><strong>Erro geral:</strong> {log.mensagem_erro}</small>
                            </div>
                        )}

                        {/* Registros */}
                        {detalhes.length > 0 && (
                            <>
                                <p className="integ-section-title">Registros processados</p>
                                <div className="integ-card integ-table-card">
                                    <div className="table-responsive">
                                        <table className="table tablefont mb-0 integ-detalhe-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 100 }}>Operação</th>
                                                    <th>ID ERP</th>
                                                    <th>Registro</th>
                                                    <th>Mensagem</th>
                                                    <th style={{ width: 140 }}>Hora</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detalhes.map((d, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            {d.operacao === 'I' && <span className="badge bg-success">Inserido</span>}
                                                            {d.operacao === 'U' && <span className="badge bg-primary">Atualizado</span>}
                                                            {d.operacao === 'E' && <span className="badge bg-danger">Erro</span>}
                                                        </td>
                                                        <td>{d.id_registro_erp}</td>
                                                        <td>{d.descricao_registro}</td>
                                                        <td className={d.operacao === 'E' ? 'text-danger' : 'text-muted'}>{d.mensagem_erro ?? '—'}</td>
                                                        <td>{d.data_hora}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {detalhes.length === 0 && (
                            <p className="text-muted text-center mt-3" style={{ fontSize: "0.875rem" }}>
                                Nenhum detalhe de registro disponível.
                            </p>
                        )}
                    </div>

                    <div className="modal-footer py-2">
                        <button className="btn btn-secondary btn-sm" onClick={onClose}>Fechar</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Aba Logs ────────────────────────────────────────────────────────────────
function AbaLogs() {
    const [filtroIntegracao, setFiltroIntegracao] = useState("");
    const [filtroStatus,     setFiltroStatus]     = useState("");
    const hoje = moment().format("DD/MM/YYYY");
    const [filtroInicio,     setFiltroInicio]      = useState(hoje);
    const [filtroFim,        setFiltroFim]          = useState(hoje);
    const [logs,             setLogs]               = useState([]);
    const [carregando,       setCarregando]          = useState(false);
    const [logSelecionado,   setLogSelecionado]      = useState(null);
    const [detalhes,         setDetalhes]            = useState([]);
    const [pagina,           setPagina]              = useState(1);
    const [ordem,            setOrdem]               = useState({ coluna: 'data_hora_inicio', direcao: 'desc' });

    function alterarOrdem(coluna) {
        setOrdem(prev => ({
            coluna,
            direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
        }));
        setPagina(1);
    }

    const buscarLogs = useCallback(async () => {
        setCarregando(true);
        try {
            const params = new URLSearchParams();
            if (filtroIntegracao) params.append("integracao",  filtroIntegracao);
            if (filtroStatus)     params.append("status",      filtroStatus);
            if (filtroInicio)     params.append("data_inicio", filtroInicio);
            if (filtroFim)        params.append("data_fim",    filtroFim);

            const res = await api.get(`/v1/Integracao/Logs?${params.toString()}`);
            setLogs(res.data);
            setPagina(1);
        } catch (err) {
            console.error(err);
        } finally {
            setCarregando(false);
        }
    }, [filtroIntegracao, filtroStatus, filtroInicio, filtroFim]);

    useEffect(() => { buscarLogs(); }, []);

    async function abrirDetalhes(log) {
        setLogSelecionado(log);
        setDetalhes([]);
        try {
            const res = await api.get(`/v1/Integracao/Logs/${log.id_log}/Detalhes`);
            setDetalhes(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <>
            {/* Filtros */}
            <p className="integ-section-title">Filtros</p>
            <div className="integ-filtros mb-0">
                <div className="row g-2 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label">Integração</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="ex: Vale, Fornecedor..."
                            value={filtroIntegracao}
                            onChange={(e) => setFiltroIntegracao(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Status</label>
                        <select
                            className="form-select"
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="S">Sucesso</option>
                            <option value="P">Parcial</option>
                            <option value="E">Erro</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Data início</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filtroInicio ? moment(filtroInicio, "DD/MM/YYYY").format("YYYY-MM-DD") : ""}
                            onChange={(e) => setFiltroInicio(e.target.value ? moment(e.target.value).format("DD/MM/YYYY") : "")}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Data fim</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filtroFim ? moment(filtroFim, "DD/MM/YYYY").format("YYYY-MM-DD") : ""}
                            onChange={(e) => setFiltroFim(e.target.value ? moment(e.target.value).format("DD/MM/YYYY") : "")}
                        />
                    </div>
                    <div className="col-md-2">
                        <button
                            className="btn btn-primary w-100"
                            onClick={buscarLogs}
                            disabled={carregando}
                        >
                            {carregando
                                ? <span className="spinner-border spinner-border-sm me-1"></span>
                                : <i className="bi bi-search me-1"></i>
                            }
                            Consultar
                        </button>
                    </div>
                    <div className="col-md-1">
                        <label className="form-label">Total</label>
                        <input type="text" className="form-control text-center" value={carregando ? "..." : logs.length} readOnly disabled />
                    </div>
                </div>
            </div>

            {/* Aviso */}
            <p className="integ-section-title">Aviso</p>
            <div className="integ-card integ-card-info">
                <h6>
                    <i className="bi bi-exclamation-circle-fill text-warning me-1"></i>
                    Clique na lupa para ver os registros processados em cada execução.
                </h6>
            </div>

            {/* Tabela */}
            <p className="integ-section-title">Resultados</p>
            <div className="integ-card integ-table-card">
                <div className="table-responsive">
                    <table className="table tablefont table-hover mb-0 integ-table">
                        <thead>
                            <tr>
                                <ThSort coluna="data_hora_inicio" atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Data / Hora</ThSort>
                                <ThSort coluna="integracao"       atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Integração</ThSort>
                                <ThSort coluna="id_servidor"      atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Srv</ThSort>
                                <ThSort coluna="status"           atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Status</ThSort>
                                <ThSort coluna="qtd_recebidos"    atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Recebidos</ThSort>
                                <ThSort coluna="qtd_inseridos"    atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Inseridos</ThSort>
                                <ThSort coluna="qtd_atualizados"  atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Atualizados</ThSort>
                                <ThSort coluna="qtd_erros"        atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Erros</ThSort>
                                <ThSort coluna="duracao_segundos" atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center">Duração</ThSort>
                                <th className="text-center">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center text-muted py-4">
                                        {carregando ? "Carregando..." : "Nenhum log encontrado."}
                                    </td>
                                </tr>
                            ) : sortarLista(logs, ordem.coluna, ordem.direcao).slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA).map((log, i) => (
                                <tr key={i} className={
                                    log.status === 'E' ? 'integ-row-erro' :
                                    log.status === 'P' ? 'integ-row-parcial' : ''
                                }>
                                    <td className="text-nowrap">{log.data_hora_inicio}</td>
                                    <td>{log.integracao}</td>
                                    <td>{log.id_servidor}</td>
                                    <td className="text-center"><StatusBadge status={log.status} /></td>
                                    <td className="text-center integ-num text-secondary">{log.qtd_recebidos}</td>
                                    <td className="text-center integ-num text-success">{log.qtd_inseridos}</td>
                                    <td className="text-center integ-num text-primary">{log.qtd_atualizados}</td>
                                    <td className="text-center integ-num text-danger">{log.qtd_erros}</td>
                                    <td className="text-center text-muted">{log.duracao_segundos != null ? `${log.duracao_segundos}s` : "—"}</td>
                                    <td className="text-center">
                                        <button
                                            className="btn btn-link btn-sm p-0"
                                            title="Ver detalhes"
                                            onClick={() => abrirDetalhes(log)}
                                        >
                                            <i className="bi bi-zoom-in fs-5"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Paginacao total={logs.length} pagina={pagina} onChange={setPagina} />

            <ModalDetalhes
                log={logSelecionado}
                detalhes={detalhes}
                onClose={() => setLogSelecionado(null)}
            />
        </>
    );
}

// ─── Aba Integrações (filtro + edição inline + reprocessar) ─────────────────
function AbaIntegracoes() {
    const [integracoes,   setIntegracoes]   = useState([]);
    const [filtro,        setFiltro]        = useState("");
    const [loadingIds,    setLoadingIds]    = useState([]);
    const [savingIds,     setSavingIds]     = useState([]);
    const [editando,      setEditando]      = useState({}); // { "srv_integ": { intervalominutos, realizarintegracao } }
    const [mensagem,      setMensagem]      = useState(null);
    const [pagina,        setPagina]        = useState(1);
    const [ordem,         setOrdem]         = useState({ coluna: 'id_servidor', direcao: 'asc' });

    function alterarOrdem(coluna) {
        setOrdem(prev => ({
            coluna,
            direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc'
        }));
        setPagina(1);
    }
    function carregarIntegracoes(f) {
        const params = f ? `/${encodeURIComponent(f)}` : "";
        api.get(`/v1/EndPoints${params}`)
            .then((r) => setIntegracoes(r.data))
            .catch(console.error);
    }

    useEffect(() => { carregarIntegracoes(""); }, []);

    const chave = (item) => `${item.id_servidor}_${item.id_integracao}`;

    // Retorna os valores editados (ou originais) de um item
    function valoresAtual(item) {
        return editando[chave(item)] ?? {
            intervalominutos:  item.intervalominutos,
            realizarintegracao: item.realizarintegracao,
        };
    }

    function marcarEdicao(item, campo, valor) {
        const k = chave(item);
        setEditando((prev) => ({
            ...prev,
            [k]: { ...valoresAtual(item), [campo]: valor },
        }));
    }

    async function salvar(item) {
        const k = chave(item);
        const vals = valoresAtual(item);
        setSavingIds((prev) => [...prev, k]);
        setMensagem(null);
        try {
            await api.put("/v1/EndPoints", {
                id_servidor:        item.id_servidor,
                id_integracao:      item.id_integracao,
                intervalominutos:   Number(vals.intervalominutos),
                realizarintegracao: vals.realizarintegracao,
            });
            // Remove do editando e atualiza lista local
            setEditando((prev) => { const n = { ...prev }; delete n[k]; return n; });
            setIntegracoes((prev) =>
                prev.map((i) =>
                    chave(i) === k
                        ? { ...i, intervalominutos: Number(vals.intervalominutos), realizarintegracao: vals.realizarintegracao }
                        : i
                )
            );
            setMensagem({ tipo: "success", texto: `"${item.integracao}" atualizada.` });
        } catch (err) {
            setMensagem({ tipo: "danger", texto: `Erro ao salvar: ${err.message}` });
        } finally {
            setSavingIds((prev) => prev.filter((id) => id !== k));
        }
    }

    function cancelar(item) {
        const k = chave(item);
        setEditando((prev) => { const n = { ...prev }; delete n[k]; return n; });
    }

    async function reprocessar(item) {
        const k = chave(item);
        setLoadingIds((prev) => [...prev, k]);
        setMensagem(null);
        try {
            await api.post("/v1/Integracao/Reprocessar", {
                id_servidor:   item.id_servidor,
                id_integracao: item.id_integracao,
            });
            // Atualiza a data na linha para refletir o reprocessamento
            const novaData = moment().subtract(1, "minute").toISOString();
            setIntegracoes((prev) =>
                prev.map((i) =>
                    chave(i) === k
                        ? { ...i, datahora_proxima_atualizacao: novaData }
                        : i
                )
            );
            setMensagem({ tipo: "success", texto: `"${item.integracao}" agendada para reprocessamento imediato.` });
        } catch (err) {
            setMensagem({ tipo: "danger", texto: `Erro ao reprocessar: ${err.message}` });
        } finally {
            setLoadingIds((prev) => prev.filter((id) => id !== k));
        }
    }

    const temEdicao = (item) => !!editando[chave(item)];
    const isSaving  = (item) => savingIds.includes(chave(item));
    const isLoading = (item) => loadingIds.includes(chave(item));

    const integracoesFiltradas = integracoes.filter((i) =>
        filtro === "" ||
        i.integracao?.toLowerCase().includes(filtro.toLowerCase()) ||
        String(i.id_servidor).includes(filtro)
    );
    const integracoesSorted   = sortarLista(integracoesFiltradas, ordem.coluna, ordem.direcao);
    const integracoesPaginadas = integracoesSorted.slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA);

    return (
        <>
            {mensagem && (
                <div className={`alert alert-${mensagem.tipo} alert-dismissible mt-2`} role="alert">
                    {mensagem.texto}
                    <button type="button" className="btn-close" onClick={() => setMensagem(null)}></button>
                </div>
            )}

            {/* Filtros */}
            <p className="integ-section-title">Filtros</p>
            <div className="integ-filtros">
                <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Integração / Servidor</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="ex: Vale, Fornecedor, 1..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <button
                            className="btn btn-primary"
                            onClick={() => carregarIntegracoes(filtro)}
                        >
                            <i className="bi bi-search me-1"></i>Consultar
                        </button>
                    </div>
                    <div className="col-md-1 ms-auto">
                        <label className="form-label">Total</label>
                        <input type="text" className="form-control text-center" value={integracoesFiltradas.length} readOnly disabled />
                    </div>
                </div>
            </div>

            {/* Aviso */}
            <p className="integ-section-title">Aviso</p>
            <div className="integ-card integ-card-info">
                <h6>
                    <i className="bi bi-exclamation-circle-fill text-warning me-1"></i>
                    Altere o intervalo ou o status diretamente na linha — os botões ✓ e ✕ aparecem ao editar. Use <i className="bi bi-arrow-repeat"></i> para forçar reprocessamento imediato.
                </h6>
            </div>

            {/* Tabela */}
            <p className="integ-section-title">Integrações</p>
            <div className="integ-card integ-table-card">
                <div className="table-responsive">
                    <table className="table tablefont table-hover mb-0 integ-table">
                        <thead>
                            <tr>
                                <ThSort coluna="id_servidor"                   atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Srv</ThSort>
                                <ThSort coluna="id_integracao"                 atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center" style={{ width: 60 }}>Cód.</ThSort>
                                <ThSort coluna="integracao"                    atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Integração</ThSort>
                                <ThSort coluna="metodo"                        atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center" style={{ width: 80 }}>Método</ThSort>
                                <ThSort coluna="datahora_proxima_atualizacao"  atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem}>Próxima Atualização</ThSort>
                                <ThSort coluna="intervalominutos"              atual={ordem.coluna} direcao={ordem.direcao} onSort={alterarOrdem} className="text-center" style={{ minWidth: 120 }}>Intervalo (min)</ThSort>
                                <th className="text-center">Ativa</th>
                                <th className="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {integracoesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted py-4">Nenhuma integração encontrada.</td>
                                </tr>
                            ) : integracoesPaginadas.map((item, i) => {
                                const vals    = valoresAtual(item);
                                const editou  = temEdicao(item);
                                const saving  = isSaving(item);
                                const loading = isLoading(item);
                                return (
                                    <tr key={i} className={editou ? "integ-row-editando" : ""}>
                                        <td>{item.id_servidor}</td>
                                        <td className="text-center integ-num">{item.id_integracao}</td>
                                        <td>{item.integracao}</td>
                                        <td className="text-center">
                                            <MetodoBadge metodo={item.metodo} />
                                        </td>
                                        <td className="text-nowrap">
                                            {moment(item.datahora_proxima_atualizacao).format("DD/MM/YYYY HH:mm")}
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="number"
                                                min={1}
                                                className="form-control form-control-sm text-center"
                                                style={{ width: 90, margin: "0 auto" }}
                                                value={vals.intervalominutos}
                                                onChange={(e) => marcarEdicao(item, "intervalominutos", e.target.value)}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <div className="form-check form-switch d-inline-block m-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    style={{ cursor: "pointer", fontSize: "1.2rem" }}
                                                    checked={vals.realizarintegracao === "S"}
                                                    onChange={(e) =>
                                                        marcarEdicao(item, "realizarintegracao", e.target.checked ? "S" : "N")
                                                    }
                                                />
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex gap-1 justify-content-center">
                                                {editou ? (
                                                    <>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            title="Salvar alterações"
                                                            disabled={saving}
                                                            onClick={() => salvar(item)}
                                                        >
                                                            {saving
                                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                                : <i className="bi bi-check-lg"></i>
                                                            }
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            title="Cancelar"
                                                            disabled={saving}
                                                            onClick={() => cancelar(item)}
                                                        >
                                                            <i className="bi bi-x-lg"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="btn btn-outline-warning btn-sm"
                                                        title="Forçar reprocessamento agora"
                                                        disabled={loading}
                                                        onClick={() => reprocessar(item)}
                                                    >
                                                        {loading
                                                            ? <span className="spinner-border spinner-border-sm"></span>
                                                            : <i className="bi bi-arrow-repeat"></i>
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <Paginacao total={integracoesFiltradas.length} pagina={pagina} onChange={setPagina} />
        </>
    );
}

// ─── Aba Análise de dados ───────────────────────────────────────────────────
function AbaAnalise({ resumo }) {
    const [dias, setDias] = useState(7);
    const [logs, setLogs] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [resumoAtual, setResumoAtual] = useState(resumo ?? {});
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [intervaloSeg, setIntervaloSeg] = useState(60);
    const [proximaAtualizacao, setProximaAtualizacao] = useState(null);
    const fmt = (v) => (Number(v ?? 0) || 0).toLocaleString("pt-BR");

    useEffect(() => {
        setResumoAtual(resumo ?? {});
    }, [resumo]);

    const carregarAnalise = useCallback(async () => {
        setCarregando(true);
        try {
            const data_inicio = moment().subtract(dias - 1, "days").format("DD/MM/YYYY");
            const data_fim = moment().format("DD/MM/YYYY");
            const [resLogs, resResumo] = await Promise.all([
                api.get(`/v1/Integracao/Logs?data_inicio=${data_inicio}&data_fim=${data_fim}`),
                api.get("/v1/Integracao/Resumo"),
            ]);
            setLogs(resLogs.data ?? []);
            setResumoAtual(resResumo.data ?? {});
        } catch (err) {
            console.error(err);
            setLogs([]);
        } finally {
            setCarregando(false);
        }
    }, [dias]);

    useEffect(() => {
        carregarAnalise();
    }, [carregarAnalise]);

    useEffect(() => {
        if (!autoRefresh) {
            setProximaAtualizacao(null);
            return;
        }
        const seg = Math.max(10, Number(intervaloSeg) || 60);
        setProximaAtualizacao(moment().add(seg, 'seconds').format('HH:mm:ss'));
        const timer = setInterval(() => {
            carregarAnalise();
            setProximaAtualizacao(moment().add(seg, 'seconds').format('HH:mm:ss'));
        }, seg * 1000);
        return () => clearInterval(timer);
    }, [autoRefresh, intervaloSeg, carregarAnalise]);

    const analise = useMemo(() => {
        const n = (v) => Number(v ?? 0) || 0;
        const parseData = (v) => moment(v, "DD/MM/YYYY HH:mm:ss", true);
        const total = logs.length;
        const sucesso = logs.filter((l) => l.status === "S").length;
        const parcial = logs.filter((l) => l.status === "P").length;
        const erro = logs.filter((l) => l.status === "E").length;

        const totalRecebidos = logs.reduce((acc, l) => acc + n(l.qtd_recebidos), 0);
        const totalInseridos = logs.reduce((acc, l) => acc + n(l.qtd_inseridos), 0);
        const totalAtualizados = logs.reduce((acc, l) => acc + n(l.qtd_atualizados), 0);
        const totalErrosItens = logs.reduce((acc, l) => {
            const errosLog = n(l.qtd_erros);
            return acc + (l.status === "E" ? Math.max(errosLog, 1) : errosLog);
        }, 0);

        const duracaoMedia = total > 0
            ? (logs.reduce((acc, l) => acc + n(l.duracao_segundos), 0) / total).toFixed(1)
            : "0.0";
        const mediaExecucoesDia = dias > 0 ? (total / dias).toFixed(1) : "0.0";
        const duracaoTotal = logs.reduce((acc, l) => acc + n(l.duracao_segundos), 0);
        const totalProcessados = totalInseridos + totalAtualizados;
        const taxaSucesso = total > 0 ? ((sucesso / total) * 100).toFixed(1) : "0.0";
        const taxaFalhaExecucao = total > 0 ? (((parcial + erro) / total) * 100).toFixed(1) : "0.0";
        const eficienciaProcessamento = totalRecebidos > 0
            ? ((totalProcessados / totalRecebidos) * 100).toFixed(1)
            : "0.0";

        const mapaIntegracoes = {};
        for (const l of logs) {
            const nome = l.integracao || "(Sem nome)";
            if (!mapaIntegracoes[nome]) {
                mapaIntegracoes[nome] = {
                    integracao: nome,
                    execucoes: 0,
                    erros: 0,
                    sucessos: 0,
                    falhas: 0,
                    recebidos: 0,
                    processados: 0,
                    ultima_execucao: null,
                };
            }

            const m = parseData(l.data_hora_inicio);
            const falhaExec = l.status === "E" || l.status === "P" || n(l.qtd_erros) > 0;
            mapaIntegracoes[nome].execucoes += 1;
            // Em algumas falhas gerais da integração, qtd_erros vem 0 mesmo com status 'E'.
            // Nesse caso, contabilizamos ao menos 1 erro para refletir a ocorrência no ranking.
            const errosLog = n(l.qtd_erros);
            mapaIntegracoes[nome].erros += l.status === "E" ? Math.max(errosLog, 1) : errosLog;
            mapaIntegracoes[nome].recebidos += n(l.qtd_recebidos);
            mapaIntegracoes[nome].processados += n(l.qtd_inseridos) + n(l.qtd_atualizados);
            if (falhaExec) mapaIntegracoes[nome].falhas += 1;
            if (l.status === "S") mapaIntegracoes[nome].sucessos += 1;
            if (m.isValid() && (!mapaIntegracoes[nome].ultima_execucao || m.isAfter(mapaIntegracoes[nome].ultima_execucao))) {
                mapaIntegracoes[nome].ultima_execucao = m;
            }
        }

        const topErros = Object.values(mapaIntegracoes)
            .filter((item) => item.erros > 0)
            .sort((a, b) => b.erros - a.erros || b.execucoes - a.execucoes)
            .slice(0, 8)
            .map((item) => ({
                ...item,
                taxa_sucesso: item.execucoes > 0 ? ((item.sucessos / item.execucoes) * 100).toFixed(1) : "0.0",
            }));

        const integracoesCriticas = Object.values(mapaIntegracoes)
            .map((item) => ({
                ...item,
                taxa_falha: item.execucoes > 0 ? ((item.falhas / item.execucoes) * 100).toFixed(1) : "0.0",
                eficiencia: item.recebidos > 0 ? ((item.processados / item.recebidos) * 100).toFixed(1) : "0.0",
                ultima_execucao_fmt: item.ultima_execucao ? item.ultima_execucao.format("DD/MM HH:mm") : "—",
            }))
            .sort((a, b) => Number(b.taxa_falha) - Number(a.taxa_falha) || b.falhas - a.falhas)
            .slice(0, 8);

        const topVolume = Object.values(mapaIntegracoes)
            .map((item) => ({
                ...item,
                eficiencia: item.recebidos > 0 ? ((item.processados / item.recebidos) * 100).toFixed(1) : "0.0",
                media_execucoes_dia: dias > 0 ? (item.execucoes / dias).toFixed(1) : "0.0",
            }))
            .sort((a, b) => b.recebidos - a.recebidos || b.processados - a.processados)
            .slice(0, 10);

        const integracaoCampeaVolume = topVolume[0] ?? null;

        const serieDias = Array.from({ length: dias }, (_, idx) => {
            const m = moment().subtract(dias - 1 - idx, "days");
            return {
                chave: m.format("DD/MM/YYYY"),
                label: m.format("DD/MM"),
                total: 0,
                erros: 0,
            };
        });

        const indiceDia = Object.fromEntries(serieDias.map((d) => [d.chave, d]));
        for (const l of logs) {
            const m = moment(l.data_hora_inicio, "DD/MM/YYYY HH:mm:ss", true);
            if (!m.isValid()) continue;
            const chave = m.format("DD/MM/YYYY");
            if (!indiceDia[chave]) continue;
            indiceDia[chave].total += 1;
            indiceDia[chave].erros += n(l.qtd_erros);
        }

        const maxExecucoesDia = Math.max(1, ...serieDias.map((d) => d.total));

        const ultimasFalhas = [...logs]
            .filter((l) => l.status === "E" || l.status === "P" || n(l.qtd_erros) > 0)
            .sort((a, b) => {
                const ma = parseData(a.data_hora_inicio);
                const mb = parseData(b.data_hora_inicio);
                return mb.valueOf() - ma.valueOf();
            })
            .slice(0, 8)
            .map((l) => ({
                integracao: l.integracao || "(Sem nome)",
                status: l.status,
                data_hora_inicio: l.data_hora_inicio,
                erros: l.status === "E" ? Math.max(n(l.qtd_erros), 1) : n(l.qtd_erros),
                mensagem_erro: l.mensagem_erro || "—",
            }));

        return {
            total,
            sucesso,
            parcial,
            erro,
            taxaSucesso,
            duracaoMedia,
            mediaExecucoesDia,
            duracaoTotal,
            taxaFalhaExecucao,
            eficienciaProcessamento,
            totalRecebidos,
            totalInseridos,
            totalAtualizados,
            totalErrosItens,
            totalProcessados,
            topErros,
            integracoesCriticas,
            topVolume,
            integracaoCampeaVolume,
            serieDias,
            maxExecucoesDia,
            ultimasFalhas,
            totalIntegracoes: Object.keys(mapaIntegracoes).length,
        };
    }, [logs, dias]);

    return (
        <>
            {/* ── Filtro de período ────────────────────────────────────────── */}
            <p className="integ-section-title">Período</p>
            <div className="integ-filtros mb-2">
                <div className="row g-2 align-items-end">
                    <div className="col-md-2">
                        <label className="form-label">Janela de análise</label>
                        <select className="form-select" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                            <option value={7}>Últimos 7 dias</option>
                            <option value={15}>Últimos 15 dias</option>
                            <option value={30}>Últimos 30 dias</option>
                        </select>
                    </div>
                    <div className="col-md-auto">
                        <button className="btn btn-primary" onClick={carregarAnalise} disabled={carregando}>
                            {carregando ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-arrow-repeat me-1"></i>}
                            Atualizar
                        </button>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Intervalo (segundos)</label>
                        <input
                            type="number"
                            className="form-control"
                            min={10}
                            value={intervaloSeg}
                            onChange={(e) => setIntervaloSeg(Number(e.target.value))}
                            disabled={!autoRefresh}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Atualização automática</label>
                        <div className="integ-auto-switch form-control">
                            <div className="form-check form-switch m-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="chkAutoRefresh"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                />
                            </div>
                            <label className="integ-auto-switch-status" htmlFor="chkAutoRefresh">
                                {autoRefresh ? "Ligada" : "Desligada"}
                            </label>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Próxima atualização</label>
                        <input
                            type="text"
                            className="form-control text-center text-success fw-semibold"
                            value={proximaAtualizacao ?? "—"}
                            readOnly
                            disabled
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Logs no período</label>
                        <input type="text" className="form-control text-center" value={analise.total} readOnly disabled />
                    </div>
                </div>
            </div>

            {/* ── KPIs: hoje + período (1 fileira de 8) ────────────────────── */}
            <p className="integ-section-title">Resumo do dia &amp; Indicadores — últimos {dias} dias</p>
            <div className="row g-2 mb-2 row-cols-2 row-cols-md-4 row-cols-xl-8">
                <div className="col"><CardResumo icone="bi-arrow-repeat"              titulo="Execuções hoje"  valor={resumoAtual?.total_execucoes} cor="bg-secondary" /></div>
                <div className="col"><CardResumo icone="bi-check-circle-fill"         titulo="Sucesso hoje"    valor={resumoAtual?.total_sucesso}  cor="bg-success"   /></div>
                <div className="col"><CardResumo icone="bi-exclamation-triangle-fill" titulo="Parciais hoje"   valor={resumoAtual?.total_parcial}  cor="bg-warning"   /></div>
                <div className="col"><CardResumo icone="bi-x-circle-fill"             titulo="Erros hoje"      valor={resumoAtual?.total_erro}     cor="bg-danger"    /></div>
                <div className="col"><CardResumo icone="bi-check2-all"                titulo="Taxa sucesso"    valor={`${analise.taxaSucesso}%`}   cor="bg-success"   /></div>
                <div className="col"><CardResumo icone="bi-bug-fill"                  titulo="Exec. com erro"  valor={analise.erro}                cor="bg-danger"    /></div>
                <div className="col"><CardResumo icone="bi-stopwatch"                 titulo="Dur. média"      valor={`${analise.duracaoMedia}s`}  cor="bg-info"      /></div>
                <div className="col"><CardResumo icone="bi-diagram-3-fill"            titulo="Integrações"     valor={analise.totalIntegracoes}    cor="bg-secondary" /></div>
            </div>

            {/* ── Linha 2: Tendência diária | Distribuição + Qualidade ─────── */}
            <div className="row mb-2">
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    <p className="integ-section-title">Tendência diária</p>
                    <div className="integ-card flex-grow-1 d-flex flex-column" style={{ minHeight: 220 }}>
                        <ReactApexChart
                            type="line"
                            height="100%"
                            series={[
                                { name: "Execuções", data: analise.serieDias.map((d) => d.total) },
                                { name: "Erros",     data: analise.serieDias.map((d) => d.erros) },
                            ]}
                            options={{
                                chart: { toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true } },
                                stroke: { curve: "smooth", width: [3, 2] },
                                colors: ["#3b82f6", "#ef4444"],
                                markers: { size: 4 },
                                xaxis: {
                                    categories: analise.serieDias.map((d) => d.label),
                                    labels: { style: { fontSize: "0.72rem", colors: "#64748b" } },
                                    axisBorder: { show: false },
                                    axisTicks: { show: false },
                                },
                                yaxis: {
                                    labels: { style: { fontSize: "0.72rem", colors: "#64748b" } },
                                    min: 0,
                                },
                                grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
                                legend: { position: "top", fontSize: "0.78rem", labels: { colors: "#334155" } },
                                tooltip: { y: { formatter: (v) => `${v}` } },
                                dataLabels: { enabled: false },
                            }}
                        />
                    </div>
                </div>
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    <p className="integ-section-title">Distribuição por status</p>
                    <div className="integ-card flex-grow-1">
                        <div className="integ-status-bars">
                            {[
                                { label: "Sucesso", val: analise.sucesso, cls: "ok"   },
                                { label: "Parcial", val: analise.parcial, cls: "warn" },
                                { label: "Erro",    val: analise.erro,    cls: "err"  },
                            ].map((s) => {
                                const pct = analise.total > 0 ? (s.val / analise.total) * 100 : 0;
                                return (
                                    <div className="integ-status-row" key={s.label}>
                                        <div className="integ-status-meta">
                                            <span>{s.label}</span>
                                            <strong>{s.val}</strong>
                                        </div>
                                        <div className="integ-status-track">
                                            <div className={`integ-status-fill ${s.cls}`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                        <span className="integ-status-pct">{pct.toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                        <hr className="my-2" />
                        <div className="row g-2">
                            <div className="col-4"><div className="integ-mini-kpi"><small>Recebidos</small><strong className="text-secondary">{fmt(analise.totalRecebidos)}</strong></div></div>
                            <div className="col-4"><div className="integ-mini-kpi"><small>Processados</small><strong className="text-success">{fmt(analise.totalProcessados)}</strong></div></div>
                            <div className="col-4"><div className="integ-mini-kpi"><small>Inseridos</small><strong className="text-success">{fmt(analise.totalInseridos)}</strong></div></div>
                            <div className="col-4"><div className="integ-mini-kpi"><small>Atualizados</small><strong className="text-primary">{fmt(analise.totalAtualizados)}</strong></div></div>
                            <div className="col-4"><div className="integ-mini-kpi"><small>Erros regist.</small><strong className="text-danger">{fmt(analise.totalErrosItens)}</strong></div></div>
                            <div className="col-4"><div className="integ-mini-kpi"><small>Tempo total</small><strong>{fmt(analise.duracaoTotal)}s</strong></div></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Linha 3: Top erros | Últimas falhas ──────────────────────── */}
            <div className="row mb-2">
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    {analise.integracaoCampeaVolume && (
                        <>
                            <p className="integ-section-title">Líder de volumetria</p>
                            <div className="integ-card integ-campea-card mb-2">
                                <div className="integ-campea-topline">
                                    <span className="badge bg-primary">Líder</span>
                                    <strong>{analise.integracaoCampeaVolume.integracao}</strong>
                                </div>
                                <div className="row g-2 mt-1">
                                    <div className="col-3"><div className="integ-mini-kpi"><small>Recebidos</small><strong>{fmt(analise.integracaoCampeaVolume.recebidos)}</strong></div></div>
                                    <div className="col-3"><div className="integ-mini-kpi"><small>Processados</small><strong className="text-success">{fmt(analise.integracaoCampeaVolume.processados)}</strong></div></div>
                                    <div className="col-3"><div className="integ-mini-kpi"><small>Execuções</small><strong>{fmt(analise.integracaoCampeaVolume.execucoes)}</strong></div></div>
                                    <div className="col-3"><div className="integ-mini-kpi"><small>Eficiência</small><strong>{analise.integracaoCampeaVolume.eficiencia}%</strong></div></div>
                                </div>
                            </div>
                        </>
                    )}
                    <p className="integ-section-title">Top integrações com erro</p>
                    <div className="integ-card integ-table-card flex-grow-1">
                        <div className="table-responsive">
                            <table className="table tablefont mb-0 integ-table">
                                <thead>
                                    <tr>
                                        <th>Integração</th>
                                        <th className="text-center">Execuções</th>
                                        <th className="text-center">Erros</th>
                                        <th className="text-center">Taxa sucesso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analise.topErros.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center text-muted py-4">Sem dados para o período selecionado.</td></tr>
                                    ) : analise.topErros.map((item) => (
                                        <tr key={item.integracao}>
                                            <td>{item.integracao}</td>
                                            <td className="text-center integ-num">{item.execucoes}</td>
                                            <td className="text-center integ-num text-danger">{item.erros}</td>
                                            <td className="text-center">{item.taxa_sucesso}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    <p className="integ-section-title">Últimas falhas</p>
                    <div className="integ-card flex-grow-1">
                        <div className="integ-falhas-lista">
                            {analise.ultimasFalhas.length === 0 ? (
                                <p className="text-muted mb-0">Nenhuma falha no período selecionado.</p>
                            ) : analise.ultimasFalhas.map((f, idx) => (
                                <div className="integ-falha-item" key={`${f.integracao}_${idx}`}>
                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                        <div>
                                            <strong>{f.integracao}</strong>
                                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>{f.data_hora_inicio}</div>
                                        </div>
                                        <span className={`badge ${f.status === "E" ? "bg-danger" : "bg-warning text-dark"}`}>{f.status}</span>
                                    </div>
                                    <div className="mt-1 integ-falha-msg">{f.mensagem_erro}</div>
                                    <div className="text-end mt-1">
                                        <small className="text-danger fw-semibold">Erros: {f.erros}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Linha 4: Ranking | Integrações críticas ──────────────────── */}
            <div className="row mb-2">
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    <p className="integ-section-title">Ranking por dados trazidos</p>
                    <div className="integ-card integ-table-card flex-grow-1">
                        <div className="table-responsive">
                            <table className="table tablefont mb-0 integ-table">
                                <thead>
                                    <tr>
                                        <th>Integração</th>
                                        <th className="text-center">Execuções</th>
                                        <th className="text-center">Recebidos</th>
                                        <th className="text-center">Processados</th>
                                        <th className="text-center">Eficiência</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analise.topVolume.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center text-muted py-4">Sem dados no período selecionado.</td></tr>
                                    ) : analise.topVolume.map((item) => (
                                        <tr key={item.integracao}>
                                            <td>{item.integracao}</td>
                                            <td className="text-center integ-num">{fmt(item.execucoes)}</td>
                                            <td className="text-center integ-num">{fmt(item.recebidos)}</td>
                                            <td className="text-center integ-num text-success">{fmt(item.processados)}</td>
                                            <td className="text-center">{item.eficiencia}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6 mb-2 d-flex flex-column">
                    <p className="integ-section-title">Integrações críticas</p>
                    <div className="integ-card integ-table-card flex-grow-1">
                        <div className="table-responsive">
                            <table className="table tablefont mb-0 integ-table">
                                <thead>
                                    <tr>
                                        <th>Integração</th>
                                        <th className="text-center">Falhas</th>
                                        <th className="text-center">Taxa falha</th>
                                        <th className="text-center">Eficiência</th>
                                        <th className="text-center">Última execução</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analise.integracoesCriticas.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center text-muted py-4">Sem integrações críticas no período.</td></tr>
                                    ) : analise.integracoesCriticas.map((item) => (
                                        <tr key={item.integracao}>
                                            <td>{item.integracao}</td>
                                            <td className="text-center integ-num text-danger">{item.falhas}</td>
                                            <td className="text-center">{item.taxa_falha}%</td>
                                            <td className="text-center">{item.eficiencia}%</td>
                                            <td className="text-center">{item.ultima_execucao_fmt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Página principal ────────────────────────────────────────────────────────
function IntegracaoDashboard() {
    const [aba,     setAba]     = useState("integracoes");
    const [resumo,  setResumo]  = useState({});

    useEffect(() => {
        api.get("/v1/Integracao/Resumo")
            .then((r) => setResumo(r.data))
            .catch(console.error);
    }, []);

    return (
        <>
            <Menu />
            <div className="integ-scroll-wrap">
            <div className="container-fluid integ-page">                
                
                {/* Tabs */}
                <div className="integ-tabs mt-0">
                    <button
                        className={`integ-tab-btn ${aba === "integracoes" ? "active" : ""}`}
                        onClick={() => setAba("integracoes")}
                    >
                        <i className="bi bi-plug me-1"></i>Integrações
                    </button>
                    <button
                        className={`integ-tab-btn ${aba === "logs" ? "active" : ""}`}
                        onClick={() => setAba("logs")}
                    >
                        <i className="bi bi-journal-text me-1"></i>Logs
                    </button>
                    <button
                        className={`integ-tab-btn ${aba === "analise" ? "active" : ""}`}
                        onClick={() => setAba("analise")}
                    >
                        <i className="bi bi-bar-chart-line me-1"></i>Análise
                    </button>
                </div>

                <div className="mt-1">
                    {aba === "integracoes" && <AbaIntegracoes />}
                    {aba === "logs"        && <AbaLogs />}
                    {aba === "analise"     && <AbaAnalise resumo={resumo} />}
                </div>

            </div>
            </div>
        </>
    );
}

export default IntegracaoDashboard;
