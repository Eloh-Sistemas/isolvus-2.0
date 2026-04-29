import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import moment from "moment";
import { ToastContainer, toast } from "react-toastify";
import Menu from "../../componentes/Menu/Menu";
import ChartView from "../../componentes/Charts/ChartView";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import api from "../../servidor/api";
import "./AcompanhamentoDespesa1.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";
import "../ImportacaoDespesa/ImportacaoDespesa.css";
import "../OracamentoMensal/OrcamentoMensal.css";

const SUBPERMISSOES_ACOMPANHAMENTO = {
  VISUALIZAR_TODAS_CONTAS_GERENCIAIS: 10801
};

const fmtCurrency = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
}).format(Number(value) || 0);

const fmtPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

function AcompanhamentoDespesa1() {
  const [loading, setLoading] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [dadosTabela, setDadosTabela] = useState([]);
  const [detalhesCentroCusto, setDetalhesCentroCusto] = useState([]);
  const [lancamentosCentroCusto, setLancamentosCentroCusto] = useState([]);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);

  const [idFilial, setIdFilial] = useState(0);
  const [filial, setFilial] = useState("");
  const [codConta, setCodConta] = useState(0);
  const [descricaoConta, setDescricaoConta] = useState("");
  const [codOrdenador, setCodOrdenador] = useState(0);
  const [descricaoOrdenador, setDescricaoOrdenador] = useState("");
  const [dataInicial, setDataInicial] = useState(`${moment().format("YYYY-MM")}-01`);
  const [dataFinal, setDataFinal] = useState(moment().format("YYYY-MM-DD"));
  const [forcarOrdenadorLogado, setForcarOrdenadorLogado] = useState(false);
  const [permissoesCarregadas, setPermissoesCarregadas] = useState(false);
  const [filtroContaDashboard, setFiltroContaDashboard] = useState("");
  const [filtroFaixaDashboard, setFiltroFaixaDashboard] = useState(null);

  const codOrdenadorLogado = Number(localStorage.getItem("id_usuario")) || 0;
  const nomeOrdenadorLogado = localStorage.getItem("nome") || "";
  const descricaoOrdenadorLogado = codOrdenadorLogado > 0 && nomeOrdenadorLogado
    ? `${codOrdenadorLogado} - ${nomeOrdenadorLogado}`
    : nomeOrdenadorLogado;
  const codOrdenadorEfetivo = forcarOrdenadorLogado ? codOrdenadorLogado : (Number(codOrdenador) || 0);

  useEffect(() => {
    const matricula = localStorage.getItem("id_usuario");
    if (!matricula) {
      setPermissoesCarregadas(true);
      return;
    }

    api.post("/v1/consultarPermissoesDoUsuario", { matricula })
      .then((res) => {
        const modulos = Array.isArray(res.data) ? res.data : [];
        let permitirVisualizarTodas = null;

        const normalizarPermitir = (valor) => {
          if (valor === true || valor === 1) return "S";
          if (valor === false || valor === 0) return "N";
          if (typeof valor === "string") {
            const valorNormalizado = valor.trim().toUpperCase();
            if (valorNormalizado === "S" || valorNormalizado === "1") return "S";
            if (valorNormalizado === "N" || valorNormalizado === "0") return "N";
          }
          return null;
        };

        modulos.forEach((modulo) => {
          (modulo.rotinas || []).forEach((rotina) => {
            const subpermissoes = rotina.subpermissoes || rotina.subPermissoes || [];
            subpermissoes.forEach((sub) => {
              const idSub = Number(sub.id_subpermissao ?? sub.idSubPermissao ?? sub.id);
              if (idSub === SUBPERMISSOES_ACOMPANHAMENTO.VISUALIZAR_TODAS_CONTAS_GERENCIAIS) {
                permitirVisualizarTodas = normalizarPermitir(sub.permitir);
              }
            });
          });
        });

        const deveForcar = permitirVisualizarTodas === "N";
        setForcarOrdenadorLogado(deveForcar);

        if (deveForcar) {
          setCodOrdenador(codOrdenadorLogado);
          setDescricaoOrdenador(descricaoOrdenadorLogado);
        }
      })
      .catch(() => {
        setForcarOrdenadorLogado(false);
      })
      .finally(() => {
        setPermissoesCarregadas(true);
      });
  }, [codOrdenadorLogado, descricaoOrdenadorLogado]);

  const montarPayloadConsulta = useCallback((conta = codConta) => ({
    id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
    id_empresaerp: Number(idFilial) || 0,
    dataInicial: moment(dataInicial).format("DD/MM/YYYY"),
    dataFinal: moment(dataFinal).format("DD/MM/YYYY"),
    id_contaerp: Number(conta) || 0,
    codordenador: codOrdenadorEfetivo
  }), [codConta, codOrdenadorEfetivo, dataFinal, dataInicial, idFilial]);

  const consultarTabela = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post("/v1/acompanhamentodedepsesa1/tabela", montarPayloadConsulta());
      setDadosTabela(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao consultar acompanhamento de despesa.");
    } finally {
      setLoading(false);
    }
  }, [montarPayloadConsulta]);

  useEffect(() => {
    if (!permissoesCarregadas) return;
    consultarTabela();
  }, [consultarTabela, permissoesCarregadas]);

  const linhasTabela = useMemo(() => (Array.isArray(dadosTabela) ? dadosTabela : []).map((item) => {
    const orcado = Number(item?.orcado ?? item?.ORCADO ?? 0);
    const realizado = Number(item?.realizado ?? item?.REALIZADO ?? 0);
    const percentual = Number(item?.perrealizado ?? item?.PERREALIZADO ?? item?.percentual_realizado ?? 0);

    return {
      codconta: String(item?.codconta ?? item?.CODCONTA ?? ""),
      conta: String(item?.conta ?? item?.CONTA ?? "Sem descrição"),
      orcado,
      realizado,
      restante: orcado - realizado,
      percentual
    };
  }), [dadosTabela]);

  const linhasTela = useMemo(() => linhasTabela.filter((item) => {
    const aplicaConta = filtroContaDashboard ? String(item.codconta) === String(filtroContaDashboard) : true;

    let aplicaFaixa = true;
    if (filtroFaixaDashboard === 0) aplicaFaixa = item.percentual < 80;
    if (filtroFaixaDashboard === 1) aplicaFaixa = item.percentual >= 80 && item.percentual < 100;
    if (filtroFaixaDashboard === 2) aplicaFaixa = item.percentual >= 100;

    return aplicaConta && aplicaFaixa;
  }), [linhasTabela, filtroContaDashboard, filtroFaixaDashboard]);

  const totalOrcado = useMemo(() => linhasTela.reduce((sum, item) => sum + item.orcado, 0), [linhasTela]);
  const totalRealizado = useMemo(() => linhasTela.reduce((sum, item) => sum + item.realizado, 0), [linhasTela]);
  const totalRestante = totalOrcado - totalRealizado;
  const percentualGeral = totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0;
  const mediaRealizada = linhasTela.length > 0 ? totalRealizado / linhasTela.length : 0;

  const topContas = useMemo(() =>
    [...linhasTela].sort((a, b) => b.realizado - a.realizado).slice(0, 5),
  [linhasTela]);

  const contasComparativo = useMemo(() =>
    [...linhasTela].sort((a, b) => b.orcado - a.orcado).slice(0, 8),
  [linhasTela]);

  const distribuicaoFaixas = useMemo(() => {
    const dentro = linhasTela.filter((item) => item.percentual < 80).length;
    const atencao = linhasTela.filter((item) => item.percentual >= 80 && item.percentual < 100).length;
    const excedido = linhasTela.filter((item) => item.percentual >= 100).length;
    return [dentro, atencao, excedido];
  }, [linhasTela]);

  const descricaoFaixaAtiva = useMemo(() => {
    if (filtroFaixaDashboard === 0) return "Consumo controlado";
    if (filtroFaixaDashboard === 1) return "Atenção";
    if (filtroFaixaDashboard === 2) return "Estourado";
    return "";
  }, [filtroFaixaDashboard]);

  const handleSelecionarContaComparativo = useCallback((_event, _chartContext, config) => {
    const index = Number(config?.dataPointIndex ?? -1);
    if (index < 0) return;
    const conta = contasComparativo[index];
    if (!conta?.codconta) return;
    setFiltroContaDashboard((atual) => (String(atual) === String(conta.codconta) ? "" : String(conta.codconta)));
  }, [contasComparativo]);

  const handleSelecionarFaixaConsumo = useCallback((_event, _chartContext, config) => {
    const index = Number(config?.dataPointIndex ?? -1);
    if (index < 0) return;
    setFiltroFaixaDashboard((atual) => (atual === index ? null : index));
  }, []);

  const limparFiltrosDashboard = useCallback(() => {
    setFiltroContaDashboard("");
    setFiltroFaixaDashboard(null);
  }, []);

  const detalheCentroCustoNormalizado = useMemo(() => {
    const totalDetalhe = detalhesCentroCusto.reduce((sum, item) => sum + (Number(item?.realizado ?? item?.REALIZADO ?? 0)), 0);

    return detalhesCentroCusto.map((item) => {
      const realizado = Number(item?.realizado ?? item?.REALIZADO ?? 0);
      const quantidadeSolicitacoes = Number(item?.quantidadesolicitacoes ?? item?.QUANTIDADESOLICITACOES ?? 0);
      return {
        codCentroCusto: String(item?.codcentrodecusto ?? item?.CODCENTRODECUSTO ?? "0"),
        centroCusto: String(item?.centrodecusto ?? item?.CENTRODECUSTO ?? "Sem centro de custo"),
        realizado,
        quantidadeSolicitacoes,
        participacao: totalDetalhe > 0 ? (realizado / totalDetalhe) * 100 : 0
      };
    });
  }, [detalhesCentroCusto]);

  const lancamentosCentroCustoNormalizado = useMemo(() =>
    (Array.isArray(lancamentosCentroCusto) ? lancamentosCentroCusto : []).map((item) => ({
      numSolicitacao: String(item?.numsolicitacao ?? item?.NUMSOLICITACAO ?? ""),
      dataSolicitacao: String(item?.datasolicitacao ?? item?.DATASOLICITACAO ?? ""),
      historico: String(item?.historico ?? item?.HISTORICO ?? "Sem histórico"),
      quantidade: Number(item?.quantidade ?? item?.QUANTIDADE ?? 0),
      vlUnit: Number(item?.vlunit ?? item?.VLUNIT ?? 0),
      valorItem: Number(item?.valoritem ?? item?.VALORITEM ?? 0),
      percentualRateio: Number(item?.percentualrateio ?? item?.PERCENTUALRATEIO ?? 0),
      valorRateio: Number(item?.valorrateio ?? item?.VALORRATEIO ?? 0)
    })),
  [lancamentosCentroCusto]);

  const handleLimparFiltros = async () => {
    const novaDataInicial = `${moment().format("YYYY-MM")}-01`;
    const novaDataFinal = moment().format("YYYY-MM-DD");
    setIdFilial(0);
    setFilial("");
    setCodConta(0);
    setDescricaoConta("");
    setCodOrdenador(forcarOrdenadorLogado ? codOrdenadorLogado : 0);
    setDescricaoOrdenador(forcarOrdenadorLogado ? descricaoOrdenadorLogado : "");
    setDataInicial(novaDataInicial);
    setDataFinal(novaDataFinal);
    limparFiltrosDashboard();

    setLoading(true);
    try {
      const response = await api.post("/v1/acompanhamentodedepsesa1/tabela", {
        id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
        id_empresaerp: 0,
        dataInicial: moment(novaDataInicial).format("DD/MM/YYYY"),
        dataFinal: moment(novaDataFinal).format("DD/MM/YYYY"),
        id_contaerp: 0,
        codordenador: forcarOrdenadorLogado ? codOrdenadorLogado : 0
      });
      setDadosTabela(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao limpar filtros.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalDetalhe = useCallback(async (row) => {
    setContaSelecionada(row);
    setShowModal(true);
    setCentroCustoSelecionado(null);
    setLancamentosCentroCusto([]);
    setLoadingDetalhe(true);
    try {
      const response = await api.post("/v1/acompanhamentodedepsesa1/detalhecentrocusto", montarPayloadConsulta(row.codconta));
      setDetalhesCentroCusto(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao carregar detalhe por centro de custo.");
      setDetalhesCentroCusto([]);
    } finally {
      setLoadingDetalhe(false);
    }
  }, [montarPayloadConsulta]);

  const carregarLancamentosCentroCusto = useCallback(async (centro) => {
    setCentroCustoSelecionado(centro);
    setLoadingLancamentos(true);
    try {
      const payload = {
        ...montarPayloadConsulta(contaSelecionada?.codconta),
        id_centrodecusto: String(centro?.codCentroCusto ?? "").trim()
      };

      const response = await api.post("/v1/acompanhamentodedepsesa1/lancamentoscentrocusto", payload);
      setLancamentosCentroCusto(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao carregar lançamentos do centro de custo.");
      setLancamentosCentroCusto([]);
    } finally {
      setLoadingLancamentos(false);
    }
  }, [contaSelecionada?.codconta, montarPayloadConsulta]);

  const determinarCorPercentual = (percentual) => {
    if (percentual < 30) return { backgroundColor: "#C6EFCD", color: "#218838" };
    if (percentual < 60) return { backgroundColor: "#FEEB9C", color: "#856404" };
    if (percentual < 100) return { backgroundColor: "#F7C11B", color: "#D97A00" };
    return { backgroundColor: "#FCC7CD", color: "#721C24" };
  };

  return (
    <>
      <Menu />
      <div className="container-fluid Containe-Tela cadastro-usuario-page acompanhamento-page">
        <div className="acompanhamento-page-inner">
        <div className="row mb-4">
          <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="mb-1 titulo-da-pagina">Acompanhamento de Despesa</h1>
              <p className="text-muted mb-0 acompanhamento-subtitle">
                Analise o orçado x realizado, acompanhe o consumo por conta e aprofunde o detalhamento por centro de custo.
              </p>
            </div>

          </div>
        </div>

        <div className="row mb-4 align-items-end g-2 cadastro-filtros">
          <div className="col-md-3 cadastro-filtro-col">
            <label className="form-label mb-1">Filial</label>
            <EditComplete
              autoFocus
              placeholder={"Razão social ou CNPJ"}
              id={"fl-1"}
              tipoConsulta={"filial1"}
              onClickCodigo={setIdFilial}
              onClickDescricao={setFilial}
              value={filial}
            />
          </div>

          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label mb-1">Ordenador</label>
            <EditComplete
              placeholder={"Nome"}
              id={"us"}
              tipoConsulta={"us"}
              onClickCodigo={setCodOrdenador}
              onClickDescricao={setDescricaoOrdenador}
              value={descricaoOrdenador}
              disabled={forcarOrdenadorLogado}
            />
          </div>

          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label mb-1">Conta Gerencial</label>
            <EditComplete
              placeholder={"Código ou descrição"}
              id={"cg"}
              tipoConsulta={"cg"}
              onClickCodigo={setCodConta}
              onClickDescricao={setDescricaoConta}
              value={descricaoConta}
            />
          </div>

          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label mb-1">Data Inicial</label>
            <input type="date" className="form-control form-control-sm" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
          </div>

          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label mb-1">Data Final</label>
            <input type="date" className="form-control form-control-sm" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
          </div>

          <div className="col-md-1 cadastro-filtro-col">
            <label className="form-label mb-1 invisible">Ações</label>
            <div className="d-flex flex-column gap-1">
              <button className="btn btn-primary btn-sm w-100" onClick={consultarTabela} disabled={loading}>
                {loading ? "..." : "Buscar"}
              </button>
              <button className="btn btn-outline-secondary btn-sm w-100" onClick={handleLimparFiltros} disabled={loading}>
                Limpar
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center mt-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <div className="mt-3">Consultando acompanhamento de despesa...</div>
          </div>
        )}

        {!loading && linhasTabela.length > 0 && (
          <>
            <p className="cadastro-section-title">Análise</p>

            {(filtroContaDashboard || filtroFaixaDashboard !== null) && (
              <div className="cadastro-card p-2 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small className="text-muted">
                  Filtro da dashboard ativo:
                  {filtroContaDashboard ? ` Conta ${filtroContaDashboard}` : ""}
                  {filtroFaixaDashboard !== null ? ` | Faixa ${descricaoFaixaAtiva}` : ""}
                </small>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limparFiltrosDashboard}>
                  Limpar filtro da dashboard
                </button>
              </div>
            )}

            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card">
                  <span className="orcamento-kpi-label">Total Orçado</span>
                  <span className="orcamento-kpi-value">{fmtCurrency(totalOrcado)}</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card acompanhamento-kpi-card--realizado">
                  <span className="orcamento-kpi-label">Total Realizado</span>
                  <span className="orcamento-kpi-value">{fmtCurrency(totalRealizado)}</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card orcamento-kpi-card--destaque">
                  <span className="orcamento-kpi-label">Saldo Disponível</span>
                  <span className="orcamento-kpi-value">{fmtCurrency(totalRestante)}</span>
                  <span className="orcamento-kpi-sub">{fmtPercent(percentualGeral)} realizado</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card">
                  <span className="orcamento-kpi-label">Média Realizada</span>
                  <span className="orcamento-kpi-value">{fmtCurrency(mediaRealizada)}</span>
                  <span className="orcamento-kpi-sub">{linhasTela.length} contas analisadas</span>
                </div>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-12 col-lg-8">
                {contasComparativo.length > 0 ? (
                  <ChartView
                    type="bar"
                    series={[
                      { name: "Orçado", data: contasComparativo.map((item) => item.orcado) },
                      { name: "Realizado", data: contasComparativo.map((item) => item.realizado) }
                    ]}
                    options={{
                      chart: {
                        stacked: false,
                        toolbar: { show: false },
                        zoom: { enabled: false },
                        selection: { enabled: false },
                        events: {
                          dataPointSelection: handleSelecionarContaComparativo
                        }
                      },
                      legend: { show: true, position: "top" },
                      colors: ["#0d6efd", "#20c997"],
                      dataLabels: { enabled: false },
                      xaxis: { 
                        tickPlacement: "on",
                        categories: contasComparativo.map((item) => {
                          const texto = String(item.conta || "");
                          return texto.trim().split(/\s+/).filter(Boolean);
                        }),
                        labels: {
                          rotate: 0,
                          offsetX: -6,
                          offsetY: 0,
                          trim: false,
                          minHeight: 48,
                          maxHeight: 120,
                          style: { fontSize: "12px" }
                        }
                      },
                      yaxis: { labels: { formatter: (value) => fmtCurrency(value) } },
                      tooltip: { y: { formatter: (value) => fmtCurrency(value) } }
                    }}
                    height={420}
                    title="Comparativo Orçado x Realizado por Conta"
                  />
                ) : (
                  <div className="cadastro-card h-100 d-flex align-items-center justify-content-center">
                    <span className="text-muted">Sem dados para exibir</span>
                  </div>
                )}
              </div>

              <div className="col-12 col-lg-4">
                {distribuicaoFaixas.some((v) => v > 0) ? (
                  <ChartView
                    type="donut"
                    series={distribuicaoFaixas}
                    options={{
                      chart: {
                        events: {
                          dataPointSelection: handleSelecionarFaixaConsumo
                        }
                      },
                      labels: ["Consumo controlado", "Atenção", "Estourado"],
                      legend: { position: "bottom" },
                      colors: ["#20c997", "#ffc107", "#dc3545"],
                      tooltip: { y: { formatter: (value) => `${value} conta(s)` } }
                    }}
                    height={320}
                    title="Faixas de Consumo"
                  />
                ) : (
                  <div className="cadastro-card h-100 d-flex align-items-center justify-content-center">
                    <span className="text-muted">Sem dados para exibir</span>
                  </div>
                )}
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-12">
                <div className="cadastro-card p-0">
                  <div className="orcamento-topcontas-header">
                    <label className="ChartTitle">Top 5 Contas por Realizado</label>
                  </div>
                  <div className="orcamento-topcontas-body">
                    {topContas.map((item, index) => {
                      const percentual = totalRealizado > 0 ? (item.realizado / totalRealizado) * 100 : 0;
                      return (
                        <button
                          key={`${item.codconta}-${index}`}
                          type="button"
                          className="orcamento-topcontas-item orcamento-topcontas-button"
                          onClick={() => abrirModalDetalhe(item)}
                          title={`Ver detalhe da conta ${item.conta}`}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="orcamento-topcontas-nome">
                              <span className="orcamento-topcontas-rank">{index + 1}</span>
                              {item.conta}
                            </span>
                            <span className="orcamento-topcontas-valor">{fmtCurrency(item.realizado)}</span>
                          </div>
                          <div className="orcamento-progress-track">
                            <div className="orcamento-progress-bar acompanhamento-progress-bar" style={{ width: `${Math.min(percentual, 100)}%` }} />
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted">{item.codconta}</small>
                            <small className="text-muted">{fmtPercent(percentual)} do realizado</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <p className="cadastro-section-title">Resumo por Conta</p>
            <div className="cadastro-card cadastro-table-card mb-4">
              <div className="acompanhamento-legend-row">
                <span><span className="acompanhamento-legend-dot acompanhamento-legend-dot--ok"></span>Abaixo de 30%</span>
                <span><span className="acompanhamento-legend-dot acompanhamento-legend-dot--mid"></span>Entre 30% e 60%</span>
                <span><span className="acompanhamento-legend-dot acompanhamento-legend-dot--warn"></span>Entre 60% e 100%</span>
                <span><span className="acompanhamento-legend-dot acompanhamento-legend-dot--over"></span>Acima de 100%</span>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0 cadastro-table orcamento-table-resumo acompanhamento-table-resumo">
                  <thead>
                    <tr>
                      <th>Conta Gerencial</th>
                      <th className="text-end">Orçado</th>
                      <th className="text-end">Realizado</th>
                      <th className="text-end">Restante</th>
                      <th className="text-end">% Realizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasTela.map((item) => (
                      <tr key={item.codconta} className="cadastro-row-clickable" onClick={() => abrirModalDetalhe(item)}>
                        <td>
                          <div className="acompanhamento-account-cell">
                            <strong>{item.codconta}</strong>
                            <span>{item.conta}</span>
                          </div>
                        </td>
                        <td className="text-end">{fmtCurrency(item.orcado)}</td>
                        <td className="text-end">{fmtCurrency(item.realizado)}</td>
                        <td className="text-end">{fmtCurrency(item.restante)}</td>
                        <td className="text-end">
                          <span className="acompanhamento-percent-pill" style={determinarCorPercentual(item.percentual)}>
                            {fmtPercent(item.percentual)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="orcamento-table-total-row">
                      <td style={{ fontWeight: 700 }}>Total Geral</td>
                      <td className="text-end" style={{ fontWeight: 700 }}>{fmtCurrency(totalOrcado)}</td>
                      <td className="text-end" style={{ fontWeight: 700 }}>{fmtCurrency(totalRealizado)}</td>
                      <td className="text-end" style={{ fontWeight: 700 }}>{fmtCurrency(totalRestante)}</td>
                      <td className="text-end" style={{ fontWeight: 700 }}>{fmtPercent(percentualGeral)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && linhasTabela.length === 0 && (
          <div className="cadastro-card acompanhamento-empty-state">
            <h4>Nenhum dado encontrado</h4>
            <p className="text-muted mb-0">Ajuste os filtros e execute uma nova consulta para visualizar o acompanhamento.</p>
          </div>
        )}

        {showModal && createPortal((
          <div className="modal-overlay-importacao" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="modal-content-importacao acompanhamento-modal-content">
              <div className="importacao-modal-header d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Detalhe por Centro de Custo</h4>
                  <p className="mb-0 text-muted"><strong>{contaSelecionada?.codconta}</strong> - {contaSelecionada?.conta}</p>
                </div>
                <button type="button" className="btn btn-outline-secondary btn-fechar-importacao" onClick={() => setShowModal(false)}>
                  Fechar
                </button>
              </div>

              <div className="importacao-modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <div className="orcamento-kpi-card">
                      <span className="orcamento-kpi-label">Orçado da Conta</span>
                      <span className="orcamento-kpi-value">{fmtCurrency(contaSelecionada?.orcado)}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="orcamento-kpi-card acompanhamento-kpi-card--realizado">
                      <span className="orcamento-kpi-label">Realizado da Conta</span>
                      <span className="orcamento-kpi-value">{fmtCurrency(contaSelecionada?.realizado)}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="orcamento-kpi-card orcamento-kpi-card--destaque">
                      <span className="orcamento-kpi-label">Restante</span>
                      <span className="orcamento-kpi-value">{fmtCurrency(contaSelecionada?.restante)}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="orcamento-kpi-card">
                      <span className="orcamento-kpi-label">% Realizado</span>
                      <span className="orcamento-kpi-value">{fmtPercent(contaSelecionada?.percentual)}</span>
                    </div>
                  </div>
                </div>

                {loadingDetalhe ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row g-3 mb-4">
                      <div className="col-12 col-lg-5">
                        {detalheCentroCustoNormalizado.some((item) => item.realizado > 0) ? (
                          <ChartView
                            type="donut"
                            series={detalheCentroCustoNormalizado.map((item) => item.realizado)}
                            options={{
                              labels: detalheCentroCustoNormalizado.map((item) => String(item.centroCusto || "")),
                              legend: { position: "bottom" },
                              tooltip: { y: { formatter: (value) => fmtCurrency(value) } }
                            }}
                            height={300}
                            title="Participação por Centro de Custo"
                          />
                        ) : (
                          <div className="cadastro-card h-100 d-flex align-items-center justify-content-center">
                            <span className="text-muted">Sem dados para exibir</span>
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-lg-7">
                        <div className="cadastro-card h-100">
                          <div className="orcamento-topcontas-header">
                            <label className="ChartTitle">Centros com Maior Consumo</label>
                          </div>
                          <div className="orcamento-topcontas-body">
                            {detalheCentroCustoNormalizado.map((item) => (
                              <div key={`${item.codCentroCusto}-${item.centroCusto}`} className="orcamento-topcontas-item">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="orcamento-topcontas-nome">{item.centroCusto}</span>
                                  <span className="orcamento-topcontas-valor">{fmtCurrency(item.realizado)}</span>
                                </div>
                                <div className="orcamento-progress-track">
                                  <div className="orcamento-progress-bar acompanhamento-progress-bar" style={{ width: `${Math.min(item.participacao, 100)}%` }} />
                                </div>
                                <div className="d-flex justify-content-between mt-1">
                                  <small className="text-muted">Centro {item.codCentroCusto}</small>
                                  <small className="text-muted">{fmtPercent(item.participacao)}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover mb-0 cadastro-table orcamento-table-resumo acompanhamento-table-resumo">
                        <thead>
                          <tr>
                            <th>Centro de Custo</th>
                            <th className="text-end">Solicitações</th>
                            <th className="text-end">Realizado</th>
                            <th className="text-end">Participação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalheCentroCustoNormalizado.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-3 text-muted">Nenhum centro de custo encontrado para esta conta no período.</td>
                            </tr>
                          )}
                          {detalheCentroCustoNormalizado.map((item) => (
                            <tr
                              key={`${item.codCentroCusto}-table`}
                              className="cadastro-row-clickable"
                              onClick={() => carregarLancamentosCentroCusto(item)}
                            >
                              <td>
                                <div className="acompanhamento-account-cell">
                                  <strong>{item.codCentroCusto}</strong>
                                  <span>{item.centroCusto}</span>
                                </div>
                              </td>
                              <td className="text-end">{item.quantidadeSolicitacoes}</td>
                              <td className="text-end">{fmtCurrency(item.realizado)}</td>
                              <td className="text-end">{fmtPercent(item.participacao)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {centroCustoSelecionado && (
                      <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h5 className="mb-0">
                            Lançamentos do Centro de Custo <strong>{centroCustoSelecionado.codCentroCusto}</strong> - {centroCustoSelecionado.centroCusto}
                          </h5>
                          <small className="text-muted">Clique em outro centro para alternar</small>
                        </div>

                        {loadingLancamentos ? (
                          <div className="text-center py-3">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Carregando...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover mb-0 cadastro-table orcamento-table-resumo acompanhamento-table-resumo">
                              <thead>
                                <tr>
                                  <th>Solicitação</th>
                                  <th>Data</th>
                                  <th>Item</th>
                                  <th className="text-end">Qtd</th>
                                  <th className="text-end">Vl. Unit</th>
                                  <th className="text-end">Vl. Item</th>
                                  <th className="text-end">% Rateio</th>
                                  <th className="text-end">Vl. Rateio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lancamentosCentroCustoNormalizado.length === 0 && (
                                  <tr>
                                    <td colSpan={8} className="text-center py-3 text-muted">Nenhum lançamento encontrado para este centro no período.</td>
                                  </tr>
                                )}
                                {lancamentosCentroCustoNormalizado.map((item, index) => (
                                  <tr key={`${item.numSolicitacao}-${index}`}>
                                    <td>{item.numSolicitacao}</td>
                                    <td>{item.dataSolicitacao}</td>
                                    <td>{item.historico}</td>
                                    <td className="text-end">{item.quantidade}</td>
                                    <td className="text-end">{fmtCurrency(item.vlUnit)}</td>
                                    <td className="text-end">{fmtCurrency(item.valorItem)}</td>
                                    <td className="text-end">{fmtPercent(item.percentualRateio)}</td>
                                    <td className="text-end">{fmtCurrency(item.valorRateio)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ), document.body)}

        <ToastContainer />
        </div>
      </div>
    </>
  );
}

export default AcompanhamentoDespesa1;
