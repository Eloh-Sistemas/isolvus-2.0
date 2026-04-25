import { Fragment, useEffect, useState, useMemo, useCallback, useRef } from "react";
import Menu from "../../componentes/Menu/Menu";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import "./OrcamentoMensal.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";
import "../ImportacaoDespesa/ImportacaoDespesa.css";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import api from "../../servidor/api";
import { ToastContainer, toast } from "react-toastify";
import ChartView from "../../componentes/Charts/ChartView";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
const SUBPERMISSOES_ORCAMENTO = {
  ENVIAR: 10331,
  BUSCAR_ARQUIVO: 10332,
  ADICIONAR: 10333,
  EXCLUIR: 10334,
  EDITAR: 10335
};

function OrcamentoMensal() {
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [modoImportacao, setModoImportacao] = useState(false); // true = dados locais do XLSX ainda não enviados
  const [id_usuario, setIdUsuario] = useState("");
  const [id_grupo_empresa, setIdGrupoEmpresa] = useState("");

  // Filtros
  const [filtroFilial, setFiltroFilial] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroCodConta, setFiltroCodConta] = useState("");
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroFilialDescricao, setFiltroFilialDescricao] = useState("");
  const [filtroContaDescricao, setFiltroContaDescricao] = useState("");

  // Modal de edição / novo registro
  const [showModal, setShowModal] = useState(false);
  const [modalModo, setModalModo] = useState('edit'); // 'edit' | 'new'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editCompleteFilial, setEditCompleteFilial] = useState("");
  const [editCompleteConta, setEditCompleteConta] = useState("");
  const [savingModal, setSavingModal] = useState(false);

  // Subpermissões da rotina 1033 (Orçamento Mensal)
  const [permissoesAcoes, setPermissoesAcoes] = useState({
    enviar: false,
    buscarArquivo: false,
    adicionar: false,
    excluir: false,
    editar: false
  });

  // Impede o colapso do acordeão ao salvar/excluir (só colapsa ao trocar filtros)
  const skipAccordionResetRef = useRef(false);
  const [filiaisExpandidas, setFiliaisExpandidas] = useState([]);
  const [paginaDetalhe, setPaginaDetalhe] = useState(1);
  const [filtrosDetalhe, setFiltrosDetalhe] = useState(() => ({
    ano: "",
    codConta: "",
    conta: "",
    total: "",
    ...Object.fromEntries(MESES.map((mes) => [mes, ""]))
  }));

  // Inicializa credenciais e carrega dados do banco
  useEffect(() => {
    const usuario = localStorage.getItem("id_usuario_erp");
    const grupo = localStorage.getItem("id_grupo_empresa");
    setIdUsuario(usuario);
    setIdGrupoEmpresa(grupo);
  }, []);

  useEffect(() => {
    const matricula = localStorage.getItem("id_usuario");
    if (!matricula) return;

    api.post('/v1/consultarPermissoesDoUsuario', { matricula })
      .then((res) => {
        const modulos = Array.isArray(res.data) ? res.data : [];
        const idsPermitidos = new Set();

        const permitirAtivo = (valor) => {
          if (valor === true || valor === 1) return true;
          if (typeof valor === 'string') return valor.toUpperCase() === 'S' || valor === '1';
          return false;
        };

        modulos.forEach((modulo) => {
          (modulo.rotinas || []).forEach((rotina) => {
            const subpermissoes = rotina.subpermissoes || rotina.subPermissoes || [];
            subpermissoes.forEach((sub) => {
              const idSub = Number(sub.id_subpermissao ?? sub.idSubPermissao ?? sub.id);
              if (idSub && permitirAtivo(sub.permitir)) {
                idsPermitidos.add(idSub);
              }
            });
          });
        });

        setPermissoesAcoes({
          enviar: idsPermitidos.has(SUBPERMISSOES_ORCAMENTO.ENVIAR),
          buscarArquivo: idsPermitidos.has(SUBPERMISSOES_ORCAMENTO.BUSCAR_ARQUIVO),
          adicionar: idsPermitidos.has(SUBPERMISSOES_ORCAMENTO.ADICIONAR),
          excluir: idsPermitidos.has(SUBPERMISSOES_ORCAMENTO.EXCLUIR),
          editar: idsPermitidos.has(SUBPERMISSOES_ORCAMENTO.EDITAR)
        });
      })
      .catch(() => {
        setPermissoesAcoes({
          enviar: false,
          buscarArquivo: false,
          adicionar: false,
          excluir: false,
          editar: false
        });
      });
  }, []);

  const carregarDoBanco = useCallback(async (grupo, filtros = {}) => {
    if (!grupo) return;
    setLoadingData(true);
    try {
      const params = {};
      if (filtros.filial)   params.filial   = filtros.filial;
      if (filtros.ano)      params.ano      = filtros.ano;
      if (filtros.codconta) params.codconta = filtros.codconta;
      if (filtros.conta)    params.conta    = filtros.conta;
      const res = await api.get(`/v1/orcamentomensal/${grupo}`, { params });
      setData(res.data);
      setModoImportacao(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao carregar dados do banco.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (id_grupo_empresa) carregarDoBanco(id_grupo_empresa);
  }, [id_grupo_empresa, carregarDoBanco]);

  // Opções únicas para selects de filtro (baseadas nos dados atuais)
  const filiaisUnicas = useMemo(() =>
    [...new Set(data.map(r => String(r.Filial || "")))]
      .filter(Boolean)
      .sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      }), [data]);
  const anosUnicos = useMemo(() =>
    [...new Set(data.map(r => String(r.Ano || "")))].filter(Boolean).sort(), [data]);

  // Dados filtrados (filtragem local, para o XLSX pré-envio; após envio os filtros são via API)
  const dadosFiltrados = useMemo(() => data.filter(row => {
    if (filtroFilial && String(row.Filial) !== filtroFilial) return false;
    if (filtroAno && String(row.Ano) !== filtroAno) return false;
    if (filtroCodConta && !String(row.CodConta || "").toLowerCase().includes(filtroCodConta.toLowerCase())) return false;
    if (filtroConta && !String(row.Conta || "").toLowerCase().includes(filtroConta.toLowerCase())) return false;
    return true;
  }), [data, filtroFilial, filtroAno, filtroCodConta, filtroConta]);

  // Métricas do dashboard
  const totalPorMes = useMemo(() =>
    MESES.map(m => dadosFiltrados.reduce((sum, r) => sum + (Number(r[m]) || 0), 0)),
    [dadosFiltrados]);
  const totalGeral = useMemo(() => totalPorMes.reduce((a, b) => a + b, 0), [totalPorMes]);
  const mesesComValor = totalPorMes.filter(v => v > 0);
  const mediaMensal = mesesComValor.length > 0 ? mesesComValor.reduce((a, b) => a + b, 0) / mesesComValor.length : 0;
  const idxMaiorMes = totalPorMes.indexOf(Math.max(...totalPorMes));
  const maiorMesNome = MESES[idxMaiorMes] || "-";
  const maiorMesValor = totalPorMes[idxMaiorMes] || 0;

  const topContas = useMemo(() =>
    [...dadosFiltrados].sort((a, b) => (Number(b.Total) || 0) - (Number(a.Total) || 0)).slice(0, 5),
    [dadosFiltrados]);

  const porFilial = useMemo(() =>
    filiaisUnicas.map(f => ({
      filial: f,
      total: dadosFiltrados.filter(r => String(r.Filial) === f).reduce((sum, r) => sum + (Number(r.Total) || 0), 0),
      meses: MESES.map(m => dadosFiltrados.filter(r => String(r.Filial) === f).reduce((sum, r) => sum + (Number(r[m]) || 0), 0))
    })).sort((a, b) => {
      const totalCmp = (Number(b.total) || 0) - (Number(a.total) || 0);
      if (totalCmp !== 0) return totalCmp;
      const na = Number(a.filial), nb = Number(b.filial);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.filial.localeCompare(b.filial);
    }),
    [dadosFiltrados, filiaisUnicas]);

  const totalFiliais = porFilial.reduce((sum, f) => sum + f.total, 0);

  const dadosOrdenados = useMemo(() =>
    [...dadosFiltrados].sort((a, b) => {
      const fa = Number(a.Filial), fb = Number(b.Filial);
      const filialCmp = !isNaN(fa) && !isNaN(fb) ? fa - fb : String(a.Filial).localeCompare(String(b.Filial));
      if (filialCmp !== 0) return filialCmp;
      const anoCmp = String(a.Ano).localeCompare(String(b.Ano));
      if (anoCmp !== 0) return anoCmp;
      return String(a.CodConta || "").localeCompare(String(b.CodConta || ""));
    }), [dadosFiltrados]);

  const detalhesPorFilial = useMemo(() =>
    dadosOrdenados.reduce((acc, row) => {
      const filial = String(row.Filial || "");
      if (!acc[filial]) acc[filial] = [];
      acc[filial].push(row);
      return acc;
    }, {}), [dadosOrdenados]);

  const getDetalhesFilialFiltrados = useCallback((filial) => {
    return (detalhesPorFilial[filial] || []).filter((row) => {
      if (filtrosDetalhe.ano && !String(row.Ano || "").toLowerCase().includes(filtrosDetalhe.ano.toLowerCase())) return false;
      if (filtrosDetalhe.codConta && !String(row.CodConta || "").toLowerCase().includes(filtrosDetalhe.codConta.toLowerCase())) return false;
      if (filtrosDetalhe.conta && !String(row.Conta || "").toLowerCase().includes(filtrosDetalhe.conta.toLowerCase())) return false;
      if (filtrosDetalhe.total && (Number(row.Total) || 0) < Number(filtrosDetalhe.total)) return false;

      for (const mes of MESES) {
        if (filtrosDetalhe[mes] && (Number(row[mes]) || 0) < Number(filtrosDetalhe[mes])) return false;
      }

      return true;
    });
  }, [detalhesPorFilial, filtrosDetalhe]);

  const ITENS_DETALHE_POR_PAGINA = 10;

  // Total calculado no modal de edição
  const totalEditado = useMemo(() =>
    MESES.reduce((sum, m) => sum + (Number(editForm[m]) || 0), 0), [editForm]);

  // Handlers modal
  const handleRowClick = (row) => {
    if (!permissoesAcoes.editar) {
      toast.warning("Você não possui permissão para editar registro.");
      return;
    }
    setSelectedIndex(data.indexOf(row));
    setEditForm({ ...row });
    setEditCompleteFilial(String(row.Filial || ""));
    setEditCompleteConta(String(row.Conta || ""));
    setModalModo('edit');
    setShowModal(true);
  };

  const handleNovoRegistro = (filialInicial = "") => {
    if (!permissoesAcoes.adicionar) {
      toast.warning("Você não possui permissão para adicionar registro.");
      return;
    }
    setSelectedIndex(null);
    setEditForm({
      Filial: filialInicial,
      Ano: filtroAno || "",
      CodConta: "",
      Conta: "",
      ...Object.fromEntries(MESES.map(m => [m, ""]))
    });
    setEditCompleteFilial(String(filialInicial || ""));
    setEditCompleteConta("");
    setModalModo('new');
    setShowModal(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const resetFiltrosDetalhe = () => {
    setFiltrosDetalhe({
      ano: "",
      codConta: "",
      conta: "",
      total: "",
      ...Object.fromEntries(MESES.map((mes) => [mes, ""]))
    });
  };

  const toggleFilial = (filial) => {
    setFiliaisExpandidas((prev) => prev.includes(filial)
      ? prev.filter((f) => f !== filial)
      : [...prev, filial]);
    setPaginaDetalhe(1);
    resetFiltrosDetalhe();
  };

  const handleSaveEdit = async () => {
    if (modalModo === 'new' && !permissoesAcoes.adicionar) {
      toast.warning("Você não possui permissão para adicionar registro.");
      return;
    }
    if (modalModo === 'edit' && !permissoesAcoes.editar) {
      toast.warning("Você não possui permissão para editar registro.");
      return;
    }

    setSavingModal(true);
    try {
      if (modalModo === 'new') {
        if (modoImportacao) {
          skipAccordionResetRef.current = true;
          setData(prev => [...prev, { ...editForm, Total: totalEditado }]);
          toast.success("Registro adicionado!", { autoClose: 1500 });
          setShowModal(false);
        } else {
          await api.post(`/v1/orcamentomensal/${id_usuario}/${id_grupo_empresa}`, [{ ...editForm, Total: totalEditado }]);
          toast.success("Registro criado com sucesso!", { autoClose: 1500 });
          setShowModal(false);
          skipAccordionResetRef.current = true;
          await carregarDoBanco(id_grupo_empresa, {
            filial: filtroFilial, ano: filtroAno, codconta: filtroCodConta, conta: filtroConta
          });
        }
      } else {
        if (modoImportacao) {
          // dados locais ainda não enviados → só atualiza localmente
          const newData = [...data];
          newData[selectedIndex] = { ...editForm, Total: totalEditado };
          skipAccordionResetRef.current = true;
          setData(newData);
          toast.success("Linha atualizada!", { autoClose: 1500 });
          setShowModal(false);
        } else {
          // dados do banco → salva via API
          await api.put(`/v1/orcamentomensal/${id_usuario}/${id_grupo_empresa}`, {
            ...editForm,
            Total: totalEditado
          });
          toast.success("Registro atualizado com sucesso!", { autoClose: 1500 });
          setShowModal(false);
          // recarga os dados com os filtros atuais
          skipAccordionResetRef.current = true;
          await carregarDoBanco(id_grupo_empresa, {
            filial: filtroFilial, ano: filtroAno, codconta: filtroCodConta, conta: filtroConta
          });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao salvar.", { autoClose: 2500 });
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteRequest = async (row, e) => {
    e.stopPropagation();
    if (!permissoesAcoes.excluir) {
      toast.warning("Você não possui permissão para excluir registro.");
      return;
    }

    const confirmacao = await Swal.fire({
      title: "Confirmar Exclusão",
      html: `
        <div style="text-align:left; line-height:1.6; font-size:0.95rem;">
          <div><strong>Filial:</strong> ${row?.Filial || "-"}</div>
          <div><strong>Ano:</strong> ${row?.Ano || "-"}</div>
          <div><strong>Código:</strong> ${row?.CodConta || "-"}</div>
          <div><strong>Conta:</strong> ${row?.Conta || "-"}</div>
          <div><strong>Total:</strong> ${fmt(row?.Total)}</div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir Registro",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: "#dc3545"
    });

    if (!confirmacao.isConfirmed) return;

    try {
      if (modoImportacao) {
        skipAccordionResetRef.current = true;
        setData(prev => prev.filter(r => r !== row));
        toast.success("Registro removido.", { autoClose: 1500 });
      } else {
        await api.delete(`/v1/orcamentomensal/${id_usuario}/${id_grupo_empresa}`, { data: row });
        toast.success("Registro excluído com sucesso!", { autoClose: 1500 });
        skipAccordionResetRef.current = true;
        await carregarDoBanco(id_grupo_empresa, {
          filial: filtroFilial, ano: filtroAno, codconta: filtroCodConta, conta: filtroConta
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao excluir.", { autoClose: 2500 });
    }
  };

  // Aplicar filtros via API (quando não está em modo importação)
    // Reseta paginação ao mudar filtros — mas preserva o acordeão ao salvar/excluir
    useEffect(() => {
      if (skipAccordionResetRef.current) {
        skipAccordionResetRef.current = false;
        return;
      }
      setPaginaDetalhe(1);
      setFiliaisExpandidas([]);
      resetFiltrosDetalhe();
    }, [dadosFiltrados]);

  const handleAplicarFiltros = () => {
    if (!modoImportacao) {
      carregarDoBanco(id_grupo_empresa, {
        filial: filtroFilial, ano: filtroAno, codconta: filtroCodConta, conta: filtroConta
      });
    }
  };

  const handleLimparFiltros = () => {
    setFiltroFilial("");
    setFiltroAno("");
    setFiltroCodConta("");
    setFiltroConta("");
    setFiltroFilialDescricao("");
    setFiltroContaDescricao("");
    if (!modoImportacao) carregarDoBanco(id_grupo_empresa, {});
  };

  // Upload de arquivo
  const handleImageChange = (e) => {
    if (!permissoesAcoes.buscarArquivo) {
      toast.warning("Você não possui permissão para buscar arquivo.");
      e.target.value = "";
      return;
    }

    if (!e.target.files || !e.target.files[0]) return;

    const reader = new FileReader();
    reader.readAsBinaryString(e.target.files[0]);
    reader.onload = (ev) => {
      const workbook = XLSX.read(ev.target.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      setData(XLSX.utils.sheet_to_json(sheet));
      setModoImportacao(true);
    };
    setNomeArquivo(e.target.files[0].name);
  };

  const baixarLayoutExemplo = () => {
    const headers = ["Filial", "Ano", "CodConta", "Conta", ...MESES, "Total"];
    const exemplo = [{
      Filial: "1",
      Ano: "2026",
      CodConta: "3.1.01",
      Conta: "Despesas com pessoal",
      Janeiro: 1000,
      Fevereiro: 1000,
      Março: 1000,
      Abril: 1000,
      Maio: 1000,
      Junho: 1000,
      Julho: 1000,
      Agosto: 1000,
      Setembro: 1000,
      Outubro: 1000,
      Novembro: 1000,
      Dezembro: 1000,
      Total: 12000
    }];

    const worksheet = XLSX.utils.json_to_sheet(exemplo, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Layout");
    XLSX.writeFile(workbook, "layout_orcamento_mensal_exemplo.xlsx");
  };

  function enviarDados() {
    if (!permissoesAcoes.enviar) {
      toast.warning("Você não possui permissão para enviar orçamento.");
      return;
    }

    const notify = toast.loading("Enviando Orçamento...", { position: "top-center" });
    api.post("/v1/orcamentomensal/" + id_usuario + "/" + id_grupo_empresa, data)
      .then(() => {
        toast.update(notify, {
          render: "Dados enviados com sucesso!",
          type: "success",
          isLoading: false,
          closeOnClick: true,
          autoClose: 1700,
          pauseOnHover: false,
        });
        setNomeArquivo("");
        setTimeout(() => carregarDoBanco(id_grupo_empresa), 2000);
      })
      .catch((erro) => {
        toast.update(notify, {
          render: erro.response?.data?.error || "Erro ao enviar",
          type: "error",
          isLoading: false,
          autoClose: 2000,
          pauseOnHover: false
        });
      });
  }

  return (
    <>
      <Menu />
      <div className="container-fluid Containe-Tela cadastro-usuario-page">

        {/* Header */}
        <div className="row mb-4">
          <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="mb-1 titulo-da-pagina">Orçamento Mensal</h1>
              <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                Importe a planilha de orçamento, filtre os dados e analise os resultados.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <input
                type="text"
                className="form-control"
                style={{ width: 220 }}
                placeholder="Arquivo selecionado..."
                value={nomeArquivo}
                disabled
              />
              <label
                htmlFor="fileInputOrcamento"
                className={`btn btn-outline-secondary mb-0 ${!permissoesAcoes.buscarArquivo ? 'disabled' : ''}`}
                title={!permissoesAcoes.buscarArquivo ? "Sem permissão para buscar arquivo" : "Buscar arquivo"}
                aria-disabled={!permissoesAcoes.buscarArquivo}
              >
                Buscar Arquivo
              </label>
              <button type="button" className="btn btn-outline-primary" onClick={baixarLayoutExemplo}>
                Baixar layout exemplo
              </button>
              <button
                onClick={enviarDados}
                className="btn btn-primary"
                disabled={data.length === 0 || !permissoesAcoes.enviar}
                title={!permissoesAcoes.enviar ? "Sem permissão para enviar orçamento" : "Enviar orçamento"}
              >
                Enviar
              </button>
              <input
                type="file"
                accept=".xlsx, .xls"
                id="fileInputOrcamento"
                onChange={handleImageChange}
                disabled={!permissoesAcoes.buscarArquivo}
              />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="row mb-4 align-items-end g-3 cadastro-filtros">
          <div className="col-md-4 cadastro-filtro-col">
            <label className="form-label">Filial</label>
            <EditComplete
              placeholder={"Filial"}
              id={"fl-filtro-om"}
              onClickCodigo={(codigo) => setFiltroFilial(codigo ? String(codigo) : "")}
              onClickDescricao={(descricao) => setFiltroFilialDescricao(descricao || "")}
              value={filtroFilialDescricao}
            />
            <small className="text-muted">Filtrar por unidade/filial</small>
          </div>
          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label">Ano</label>
            <select className="form-select" value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
              <option value="">Todos</option>
              {anosUnicos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <small className="text-muted">Exercício fiscal</small>
          </div>
          <div className="col-md-4 cadastro-filtro-col">
            <label className="form-label">Conta Gerencial</label>
            <EditComplete
              placeholder={"Conta Gerencial"}
              id={"cg-filtro-om"}
              onClickCodigo={(codigo) => setFiltroCodConta(codigo ? String(codigo) : "")}
              onClickDescricao={(descricao) => {
                const valor = descricao || "";
                setFiltroConta(valor);
                setFiltroContaDescricao(valor);
              }}
              value={filtroContaDescricao}
            />
            <small className="text-muted">Selecione a conta para filtrar código e descrição</small>
          </div>
          <div className="col-md-2 cadastro-filtro-col">
            <label className="form-label invisible">-</label>
            <div className="d-flex gap-2">
              <button className="btn btn-primary flex-grow-1" onClick={handleAplicarFiltros} disabled={loadingData || modoImportacao}>
                {loadingData ? '...' : 'Buscar'}
              </button>
              <button className="btn btn-outline-secondary" onClick={handleLimparFiltros} disabled={loadingData}>
                Limpar
              </button>
            </div>
            <small className="text-muted invisible">-</small>
          </div>
        </div>

        {/* Indicador modo importação */}
        {modoImportacao && (
          <div className="alert alert-warning d-flex align-items-center gap-2 mb-4 py-2">
            <span>Dados carregados do arquivo <strong>{nomeArquivo}</strong>. Envie para salvar no banco ou <button className="btn btn-sm btn-link p-0 align-baseline" onClick={() => carregarDoBanco(id_grupo_empresa)}>carregar dados salvos</button>.</span>
          </div>
        )}

        {/* Dashboard de Análise */}
        {dadosFiltrados.length > 0 && (
          <>
            <p className="cadastro-section-title">Análise</p>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card">
                  <span className="orcamento-kpi-label">Total Orçado</span>
                  <span className="orcamento-kpi-value">{fmt(totalGeral)}</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card">
                  <span className="orcamento-kpi-label">Média Mensal</span>
                  <span className="orcamento-kpi-value">{fmt(mediaMensal)}</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card orcamento-kpi-card--destaque">
                  <span className="orcamento-kpi-label">Mês de Pico</span>
                  <span className="orcamento-kpi-value">{maiorMesNome}</span>
                  <span className="orcamento-kpi-sub">{fmt(maiorMesValor)}</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="orcamento-kpi-card">
                  <span className="orcamento-kpi-label">Total de Contas</span>
                  <span className="orcamento-kpi-value">{dadosFiltrados.length}</span>
                  <span className="orcamento-kpi-sub">registros filtrados</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="row g-3 mb-4">
              <div className={porFilial.length > 1 ? "col-12 col-lg-8" : "col-12"}>
                <ChartView
                  type="bar"
                  series={[{ name: "Total Orçado", data: totalPorMes }]}
                  options={{
                    labels: MESES,
                    legend: { show: true, showForSingleSeries: true },
                    colors: ["#0d6efd"],
                    yaxis: { labels: { formatter: (val) => fmt(val) } },
                    dataLabels: { enabled: false },
                    tooltip: { y: { formatter: (val) => fmt(val) } }
                  }}
                  height={320}
                  title="Distribuição Mensal do Orçamento"
                />
              </div>

              {porFilial.length > 1 && (
                <div className="col-12 col-lg-4">
                  <ChartView
                    type="donut"
                    series={porFilial.map(f => f.total)}
                    options={{
                      labels: porFilial.map(f => f.filial),
                      legend: { position: "bottom" },
                      tooltip: { y: { formatter: (val) => fmt(val) } }
                    }}
                    height={320}
                    title="Distribuição por Filial"
                  />
                </div>
              )}
            </div>

            {/* Top 5 Contas */}
            <div className="row g-3 mb-4">
              <div className="col-12">
                <div className="cadastro-card p-0">
                  <div className="orcamento-topcontas-header">
                    <label className="ChartTitle">Top 5 Contas por Valor Orçado</label>
                  </div>
                  <div className="orcamento-topcontas-body">
                    {topContas.map((row, i) => {
                      const pct = totalGeral > 0 ? Math.min(100, (Number(row.Total) / totalGeral) * 100) : 0;
                      return (
                        <div key={i} className="orcamento-topcontas-item">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="orcamento-topcontas-nome">
                              <span className="orcamento-topcontas-rank">{i + 1}</span>
                              {row.Conta}
                            </span>
                            <span className="orcamento-topcontas-valor">{fmt(row.Total)}</span>
                          </div>
                          <div className="orcamento-progress-track">
                            <div className="orcamento-progress-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted">{row.CodConta} · {row.Filial} · {row.Ano}</small>
                            <small className="text-muted">{pct.toFixed(1)}% do total</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo por Filial */}
            {porFilial.length > 0 && (
              <>
                <p className="cadastro-section-title">Resumo por Filial</p>
                <div className="cadastro-card cadastro-table-card mb-4">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 cadastro-table orcamento-table-resumo">
                      <thead>
                        <tr>
                          <th>Filial</th>
                          {MESES.map(m => <th key={m}>{m.substring(0, 3)}</th>)}
                          <th className="text-end">Total</th>
                          <th className="text-end">% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porFilial.map((f, i) => {
                          const expandida = filiaisExpandidas.includes(f.filial);
                          const detalhesFilialAtual = getDetalhesFilialFiltrados(f.filial);
                          const totalPaginasDetalheAtual = Math.max(1, Math.ceil(detalhesFilialAtual.length / ITENS_DETALHE_POR_PAGINA));
                          const detalhesPaginadosAtual = detalhesFilialAtual.slice(
                            (paginaDetalhe - 1) * ITENS_DETALHE_POR_PAGINA,
                            paginaDetalhe * ITENS_DETALHE_POR_PAGINA
                          );

                          return (
                            <Fragment key={f.filial || i}>
                              <tr>
                                <td style={{ fontWeight: 700 }}>
                                  <div className="orcamento-filial-cell">
                                    <button
                                      type="button"
                                      className="orcamento-expand-toggle"
                                      onClick={() => toggleFilial(f.filial)}
                                      aria-expanded={expandida}
                                      aria-label={expandida ? `Recolher detalhes da filial ${f.filial}` : `Expandir detalhes da filial ${f.filial}`}
                                      title={expandida ? "Recolher detalhes" : "Expandir detalhes"}
                                    >
                                      <i className={`bi bi-chevron-${expandida ? 'up' : 'right'}`} style={{fontSize: '0.9rem'}}></i>
                                    </button>
                                    <span>{f.filial}</span>
                                  </div>
                                </td>
                                {f.meses.map((v, j) => <td key={j}>{fmt(v)}</td>)}
                                <td className="text-end" style={{ fontWeight: 700 }}>{fmt(f.total)}</td>
                                <td className="text-end">
                                  <span
                                    className="orcamento-badge-pct"
                                    title={`${f.filial} representa ${totalFiliais > 0 ? ((f.total / totalFiliais) * 100).toFixed(2) : "0.00"}% do orçamento total de todas as filiais (${fmt(f.total)} de ${fmt(totalFiliais)})`}
                                    style={{ cursor: 'help' }}
                                  >
                                    {totalFiliais > 0 ? ((f.total / totalFiliais) * 100).toFixed(1) : "0.0"}%
                                  </span>
                                </td>
                              </tr>

                              {expandida && (
                                <tr className="orcamento-detalhe-row">
                                  <td colSpan={MESES.length + 3}>
                                    <div className="orcamento-detalhe-wrap">
                                      <div className="orcamento-detalhe-header">
                                        <span>Contas da filial {f.filial} ({detalhesFilialAtual.length})</span>
                                        <div className="d-flex align-items-center gap-2">
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-success"
                                            onClick={() => handleNovoRegistro(f.filial)}
                                            disabled={!permissoesAcoes.adicionar}
                                            title={!permissoesAcoes.adicionar ? "Sem permissão para adicionar registro" : "Adicionar registro"}
                                          >
                                            <i></i>Adicionar
                                          </button>
                                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetFiltrosDetalhe}>
                                            Limpar filtros do detalhe
                                          </button>
                                        </div>
                                      </div>
                                      <div className="table-responsive">
                                        <table className="table table-sm mb-0 cadastro-table orcamento-table orcamento-table-detalhe">
                                          <thead>
                                            <tr>
                                              <th>Ano</th>
                                              <th>Código</th>
                                              <th>Conta</th>
                                              {MESES.map(m => <th key={m}>{m.substring(0, 3)}</th>)}
                                              <th className="text-end">Total</th>
                                              <th></th>
                                            </tr>
                                            <tr className="orcamento-filtros-coluna">
                                              <th>
                                                <input
                                                  className="form-control form-control-sm"
                                                  value={filtrosDetalhe.ano}
                                                  onChange={(e) => { setPaginaDetalhe(1); setFiltrosDetalhe((prev) => ({ ...prev, ano: e.target.value })); }}
                                                  placeholder="Ano"
                                                />
                                              </th>
                                              <th>
                                                <input
                                                  className="form-control form-control-sm"
                                                  value={filtrosDetalhe.codConta}
                                                  onChange={(e) => { setPaginaDetalhe(1); setFiltrosDetalhe((prev) => ({ ...prev, codConta: e.target.value })); }}
                                                  placeholder="Código"
                                                />
                                              </th>
                                              <th>
                                                <input
                                                  className="form-control form-control-sm"
                                                  value={filtrosDetalhe.conta}
                                                  onChange={(e) => { setPaginaDetalhe(1); setFiltrosDetalhe((prev) => ({ ...prev, conta: e.target.value })); }}
                                                  placeholder="Conta"
                                                />
                                              </th>
                                              {MESES.map((mes) => (
                                                <th key={mes}>
                                                  <input
                                                    className="form-control form-control-sm"
                                                    type="number"
                                                    value={filtrosDetalhe[mes]}
                                                    onChange={(e) => { setPaginaDetalhe(1); setFiltrosDetalhe((prev) => ({ ...prev, [mes]: e.target.value })); }}
                                                    placeholder="Min"
                                                  />
                                                </th>
                                              ))}
                                              <th>
                                                <input
                                                  className="form-control form-control-sm"
                                                  type="number"
                                                  value={filtrosDetalhe.total}
                                                  onChange={(e) => { setPaginaDetalhe(1); setFiltrosDetalhe((prev) => ({ ...prev, total: e.target.value })); }}
                                                  placeholder="Total min"
                                                />
                                              </th>
                                              <th></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detalhesFilialAtual.length === 0 && (
                                              <tr>
                                                <td colSpan={MESES.length + 5} className="text-center py-3 text-muted">
                                                  Nenhuma conta encontrada com os filtros informados.
                                                </td>
                                              </tr>
                                            )}
                                            {detalhesPaginadosAtual.map((row, index) => (
                                              <tr
                                                key={`${f.filial}-${row.Ano}-${row.CodConta}-${index}`}
                                                className={permissoesAcoes.editar ? "cadastro-row-clickable" : ""}
                                                onClick={() => handleRowClick(row)}
                                              >
                                                <td style={{ fontWeight: 700 }}>{row.Ano}</td>
                                                <td style={{ fontWeight: 700 }}>{row.CodConta}</td>
                                                <td style={{ fontWeight: 700 }}>{row.Conta}</td>
                                                {MESES.map(m => <td key={m}>{fmt(row[m])}</td>)}
                                                <td className="text-end" style={{ fontWeight: 700 }}>{fmt(row.Total)}</td>
                                                <td className="text-center" style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                                  <button
                                                    type="button"
                                                    className="orcamento-btn-excluir"
                                                    title={!permissoesAcoes.excluir ? "Sem permissão para excluir registro" : "Excluir registro"}
                                                    onClick={(e) => handleDeleteRequest(row, e)}
                                                    disabled={!permissoesAcoes.excluir}
                                                  >
                                                    <i className="bi bi-trash3"></i>
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      {totalPaginasDetalheAtual > 1 && (
                                        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top gap-2 flex-wrap">
                                          <small className="text-muted">
                                            Exibindo {((paginaDetalhe - 1) * ITENS_DETALHE_POR_PAGINA) + 1}–{Math.min(paginaDetalhe * ITENS_DETALHE_POR_PAGINA, detalhesFilialAtual.length)} de {detalhesFilialAtual.length} contas
                                          </small>
                                          <nav>
                                            <ul className="pagination pagination-sm mb-0">
                                              <li className={`page-item ${paginaDetalhe === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPaginaDetalhe(1)}>«</button>
                                              </li>
                                              <li className={`page-item ${paginaDetalhe === 1 ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPaginaDetalhe((p) => p - 1)}>‹</button>
                                              </li>
                                              <li className={`page-item ${paginaDetalhe === totalPaginasDetalheAtual ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPaginaDetalhe((p) => p + 1)}>›</button>
                                              </li>
                                              <li className={`page-item ${paginaDetalhe === totalPaginasDetalheAtual ? 'disabled' : ''}`}>
                                                <button className="page-link" onClick={() => setPaginaDetalhe(totalPaginasDetalheAtual)}>»</button>
                                              </li>
                                            </ul>
                                          </nav>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="orcamento-table-total-row">
                          <td style={{ fontWeight: 700 }}>Total Geral</td>
                          {MESES.map((m, j) => (
                            <td key={j} style={{ fontWeight: 700 }}>
                              {fmt(porFilial.reduce((acc, f) => acc + (Number(f.meses[j]) || 0), 0))}
                            </td>
                          ))}
                          <td className="text-end" style={{ fontWeight: 700 }}>{fmt(totalFiliais)}</td>
                          <td className="text-end">
                            <span className="orcamento-badge-pct">100%</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Modal de Edição / Novo Registro */}
        {showModal && (
          <div
            className="modal-overlay-importacao"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <div className="modal-content-importacao">
              <div className="importacao-modal-header d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">{modalModo === 'new' ? 'Novo Registro' : 'Editar Orçamento'}</h4>
                  <p className="mb-0 text-muted">
                    {modalModo === 'new'
                      ? 'Preencha os dados para criar um novo registro de orçamento.'
                      : `${editForm.Filial} · ${editForm.Ano} · `}{modalModo !== 'new' && <strong>{editForm.CodConta}</strong>}{modalModo !== 'new' && ` — ${editForm.Conta}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-fechar-importacao"
                  onClick={() => setShowModal(false)}
                >
                  Fechar
                </button>
              </div>

              <div className="importacao-modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <label className="form-label">Filial</label>
                    <EditComplete
                      placeholder={"Filial"}
                      id={"fl-om"}
                      onClickCodigo={(codigo) => handleEditChange("Filial", codigo)}
                      onClickDescricao={(descricao) => setEditCompleteFilial(descricao)}
                      value={editCompleteFilial}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Ano</label>
                    <input
                      className="form-control"
                      value={editForm.Ano || ""}
                      onChange={e => handleEditChange("Ano", e.target.value)}
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label">Conta Gerencial</label>
                    <EditComplete
                      placeholder={"Conta Gerencial"}
                      id={"cg-om"}
                      onClickCodigo={(codigo) => handleEditChange("CodConta", codigo)}
                      onClickDescricao={(descricao) => {
                        setEditCompleteConta(descricao);
                        handleEditChange("Conta", descricao);
                      }}
                      value={editCompleteConta}
                    />
                  </div>
                </div>

                <p className="cadastro-section-title mb-3">Valores Mensais</p>
                <div className="row g-3 mb-4">
                  {MESES.map(m => (
                    <div className="col-6 col-md-4 col-lg-2" key={m}>
                      <label className="form-label">{m}</label>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        value={editForm[m] ?? ""}
                        onChange={e => handleEditChange(m, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="orcamento-total-box">
                  <span className="text-muted">Total calculado automaticamente</span>
                  <span className="orcamento-total-value">{fmt(totalEditado)}</span>
                </div>
              </div>

              <div className="importacao-modal-footer">
                <div className="importacao-modal-footer-start d-none d-md-block">
                  <small className="text-muted">
                    {modoImportacao ? "Dados do arquivo — envie para salvar no banco." : "O total é recalculado automaticamente ao alterar os meses."}
                  </small>
                </div>
                <div className="importacao-modal-footer-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={savingModal}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleSaveEdit}
                    disabled={savingModal || (modalModo === 'new' ? !permissoesAcoes.adicionar : !permissoesAcoes.editar)}
                  >
                    {savingModal ? 'Salvando...' : (modalModo === 'new' ? 'Criar Registro' : 'Salvar')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </>
  );
}

export default OrcamentoMensal;