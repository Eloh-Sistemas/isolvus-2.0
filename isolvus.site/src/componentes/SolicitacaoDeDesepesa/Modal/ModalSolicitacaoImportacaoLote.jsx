import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "react-modal/lib/components/Modal";
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import api from "../../../servidor/api";
import EditComplete from "../../EditComplete/EditComplete";
import "../../../paginas/ImportacaoDespesa/ImportacaoDespesa.css";

const ID_ROTINA_IMPORTACAO_REMESSA = '1030.2';

function ModalSolicitacaoImportacaoLote({
    isOpen,
    idleitura,
    tipoTela,
    onRequestClose,
    onAbrirSolicitacao,
    onAtualizarSolicitacoes
}) {
    const [registroSelecionado, setRegistroSelecionado] = useState(null);
    const [detalhesLeitura, setDetalhesLeitura] = useState([]);
    const [detalhesLoading, setDetalhesLoading] = useState(false);
    const [refreshingDetalhes, setRefreshingDetalhes] = useState(false);
    const [arquivoRemessaLoading, setArquivoRemessaLoading] = useState(false);
    const [arquivosRemessaDetalhe, setArquivosRemessaDetalhe] = useState([]);
    const [atualizandoCadastroBancarioId, setAtualizandoCadastroBancarioId] = useState('');
    const [filtroRegistros, setFiltroRegistros] = useState('');
    const [statusOrdenadorLote, setStatusOrdenadorLote] = useState('');
    const [obsOrdenadorLote, setObsOrdenadorLote] = useState('');
    const [salvandoOrdenacaoLote, setSalvandoOrdenacaoLote] = useState(false);
    const [integracaoFinanceiroLote, setIntegracaoFinanceiroLote] = useState(0);
    const [codCaixaBancoLote, setCodCaixaBancoLote] = useState(0);
    const [descricaoCaixaBancoLote, setDescricaoCaixaBancoLote] = useState('');
    const [obsFinanceiroLote, setObsFinanceiroLote] = useState('');
    const [historico1Lote, setHistorico1Lote] = useState('');
    const [historico2Lote, setHistorico2Lote] = useState('');
    const [salvandoFinanceiroLote, setSalvandoFinanceiroLote] = useState(false);
    const [salvandoDirecionamentoLote, setSalvandoDirecionamentoLote] = useState(false);
    const modalContentRef = useRef(null);

    useEffect(() => {
        if (isOpen && idleitura) {
            carregarDetalhesImportacao(idleitura);
            carregarArquivosRemessa(idleitura);
        }

        if (!isOpen) {
            setRegistroSelecionado(null);
            setDetalhesLeitura([]);
            setArquivosRemessaDetalhe([]);
            setDetalhesLoading(false);
            setRefreshingDetalhes(false);
            setAtualizandoCadastroBancarioId('');
            setFiltroRegistros('');
            setStatusOrdenadorLote('');
            setObsOrdenadorLote('');
            setSalvandoOrdenacaoLote(false);
            setIntegracaoFinanceiroLote(0);
            setCodCaixaBancoLote(0);
            setDescricaoCaixaBancoLote('');
            setObsFinanceiroLote('');
            setHistorico1Lote('');
            setHistorico2Lote('');
            setSalvandoFinanceiroLote(false);
            setSalvandoDirecionamentoLote(false);
        }
    }, [isOpen, idleitura]);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                if (modalContentRef.current) {
                    modalContentRef.current.scrollTop = 0;
                }
                window.scrollTo({ top: 0, behavior: 'auto' });
            });
        }
    }, [isOpen, tipoTela, registroSelecionado?.IDLEITURA]);

    const formatCurrency = (valor) => {
        const numero = Number(valor || 0);
        return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatPercent = (valor) => `${Number(valor || 0).toFixed(2)}%`;

    const formatDateTime = (valor) => {
        if (!valor) return '-';
        return new Date(valor).toLocaleString('pt-BR');
    };

    const getRemessaBadgeClass = (status) => {
        const statusNormalizado = String(status || 'SEM REMESSA').toUpperCase();

        if (statusNormalizado === 'OK') return 'bg-success';
        if (statusNormalizado === 'NÃO CONFERE' || statusNormalizado === 'NAO CONFERE') return 'bg-danger';
        return 'bg-secondary';
    };

    const possuiErroCampoRemessa = (item, campo) => {
        const chave = `REMESSA_ERRO_${String(campo || '').toUpperCase()}`;
        return String(item?.[chave] || 'N') === 'S';
    };

    const getLinhaCampoRemessa = (item, campo) => {
        const chave = `REMESSA_LINHA_${String(campo || '').toUpperCase()}`;
        const numeroLinha = Number(item?.[chave] || 0);
        return Number.isFinite(numeroLinha) && numeroLinha > 0 ? numeroLinha : null;
    };

    const formatarLinhaCampoRemessa = (item, campo) => {
        const linha = getLinhaCampoRemessa(item, campo);
        return linha ? `linha ${linha}` : (possuiErroCampoRemessa(item, campo) ? 'linha não encontrada' : '-');
    };

    const getClasseCampoRemessa = (item, campo, classePadrao = '') => {
        const classes = String(classePadrao || '').split(' ').filter(Boolean);

        if (possuiErroCampoRemessa(item, campo)) {
            classes.push('remessa-campo-divergente');
        }

        return classes.join(' ').trim();
    };

    const getTooltipCampoRemessa = (item, campo, fallback = '') => {
        if (!possuiErroCampoRemessa(item, campo)) {
            return fallback || '';
        }

        const mensagens = {
            cnpj: 'CNPJ do item não encontrado na remessa.',
            cpf: 'CPF do funcionário não encontrado na remessa.',
            valor: 'Valor do item difere do valor encontrado na remessa.'
        };

        const linha = getLinhaCampoRemessa(item, campo);
        const detalheLinha = linha ? ` Linha da remessa: ${linha}.` : ' Linha da remessa: não localizada.';

        return `${item?.REMESSA_ERRO || mensagens[String(campo || '').toLowerCase()] || fallback || ''}${detalheLinha}`;
    };

    const renderIndicadorCampoRemessa = (item, campo) => (
        possuiErroCampoRemessa(item, campo)
            ? <span className="remessa-campo-icone" title={getTooltipCampoRemessa(item, campo)}>⚠</span>
            : null
    );

    const possuiCampoObrigatorioInvalido = (item, campos = []) => {
        const listaCampos = Array.isArray(campos) ? campos : [campos];

        return listaCampos.some((campo) => {
            const valor = item?.[campo];

            if (campo === 'ID_BANCO') {
                return Number(valor || 0) <= 0;
            }

            if (valor === null || valor === undefined) return true;
            if (typeof valor === 'string' && valor.trim() === '') return true;
            return false;
        });
    };

    const getClasseCampoCadastro = (item, campos, classePadrao = '') => {
        const classes = String(classePadrao || '').split(' ').filter(Boolean);

        if (possuiCampoObrigatorioInvalido(item, campos)) {
            classes.push('table-danger');
        }

        return classes.join(' ').trim();
    };

    const getTooltipCampoCadastro = (item, campos, mensagem) => (
        possuiCampoObrigatorioInvalido(item, campos) ? mensagem : ''
    );

    const renderIndicadorCampoCadastro = (item, campos, mensagem) => (
        possuiCampoObrigatorioInvalido(item, campos)
            ? <span className="remessa-campo-icone" title={mensagem}>⚠</span>
            : null
    );

    const possuiAtualizacaoBancariaPorRemessa = (item) => (
        String(item?.REMESSA_PODE_ATUALIZAR_DADOS_BANCARIOS || 'N') === 'S'
    );

    const getChaveAtualizacaoBancaria = (item) => `${item?.IDLEITURA || 'nova'}-${item?.ID_FORNECEDOR || item?.CPF_FUNCIONARIO || 'sem-usuario'}`;

    const formatarDadosBancariosRemessa = (item) => {
        const partes = [];

        if (item?.REMESSA_ID_BANCO) partes.push(`Banco ${item.REMESSA_ID_BANCO}`);
        if (item?.REMESSA_AGENCIA) partes.push(`Ag. ${item.REMESSA_AGENCIA}`);
        if (item?.REMESSA_CONTABANCARIA) partes.push(`Conta ${item.REMESSA_CONTABANCARIA}`);
        if (item?.REMESSA_OPERACAO) partes.push(`Op. ${item.REMESSA_OPERACAO}`);

        return partes.join(' • ');
    };

    const atualizarCadastroBancarioComRemessa = async (item) => {
        const idUsuario = Number(item?.ID_FORNECEDOR || 0);
        const dadosRemessa = formatarDadosBancariosRemessa(item);

        if (!idUsuario) {
            toast.warning('Funcionário não identificado para atualização do cadastro bancário.');
            return;
        }

        if (!dadosRemessa) {
            toast.warning('A remessa não possui dados bancários suficientes para atualização.');
            return;
        }

        const confirmacao = await Swal.fire({
            title: 'Atualizar dados bancários?',
            html: `Deseja atualizar o cadastro bancário de <strong>${item?.NOME || 'funcionário'}</strong> com os dados da remessa?<br/><small class="text-muted">${dadosRemessa}</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, atualizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0d6efd'
        });

        if (!confirmacao.isConfirmed) {
            return;
        }

        const chaveAtualizacao = getChaveAtualizacaoBancaria(item);
        setAtualizandoCadastroBancarioId(chaveAtualizacao);

        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/atualizarDadosBancarios', {
                id_usuario: idUsuario,
                id_banco: item?.REMESSA_ID_BANCO || undefined,
                agencia: item?.REMESSA_AGENCIA || undefined,
                conta: item?.REMESSA_CONTABANCARIA || undefined,
                operacao: item?.REMESSA_OPERACAO || undefined
            });

            toast.success(response?.data?.message || 'Dados bancários atualizados com sucesso.');
            await carregarDetalhesImportacao(item?.IDLEITURA || idleitura);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar os dados bancários do funcionário.');
        } finally {
            setAtualizandoCadastroBancarioId('');
        }
    };

    const normalizarArquivosRetorno = (lista = []) => {
        if (!Array.isArray(lista)) return [];

        return lista.map((item) => {
            const url = Array.isArray(item) ? item[0] : (item?.url || item?.file_path || '');
            const id_arquivo = Array.isArray(item) ? item[1] : (item?.id_arquivo ?? null);
            const nome = decodeURIComponent(String(url || '').split('/').pop()?.split('?')[0] || '');

            return { url, id_arquivo, nome };
        }).filter((item) => !!item.url);
    };

    const normalizarUrlArquivo = (url = '') => {
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;

        const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
        return `${baseUrl}/${String(url).replace(/^\/+/, '')}`;
    };

    const baixarArquivoRemessa = async (arquivoOuUrl) => {
        const url = normalizarUrlArquivo(typeof arquivoOuUrl === 'string' ? arquivoOuUrl : arquivoOuUrl?.url);

        if (!url) {
            toast.warning('Arquivo de remessa indisponível para download.');
            return;
        }

        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Erro ao baixar arquivo');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = downloadUrl;
            link.download = typeof arquivoOuUrl === 'object' && arquivoOuUrl?.nome
                ? arquivoOuUrl.nome
                : decodeURIComponent(url.split('/').pop().split('?')[0]);

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(link);
            }, 100);
        } catch (error) {
            toast.error('Erro ao baixar o arquivo de remessa.');
        }
    };

    const carregarArquivosRemessa = async (idleituraAtual) => {
        if (!idleituraAtual) {
            setArquivosRemessaDetalhe([]);
            return [];
        }

        setArquivoRemessaLoading(true);
        try {
            const { data } = await api.get('/v1/listarArquivos', {
                params: {
                    id_rotina: ID_ROTINA_IMPORTACAO_REMESSA,
                    id_relacional: idleituraAtual,
                    id_grupo_empresa: localStorage.getItem('id_grupo_empresa')
                }
            });

            const arquivos = normalizarArquivosRetorno(data);
            setArquivosRemessaDetalhe(arquivos);
            return arquivos;
        } catch (error) {
            setArquivosRemessaDetalhe([]);
            toast.error('Erro ao carregar o arquivo de remessa desta importação.');
            return [];
        } finally {
            setArquivoRemessaLoading(false);
        }
    };

    const carregarDetalhesImportacao = async (idleituraAtual) => {
        if (!idleituraAtual) {
            return null;
        }

        setDetalhesLoading(true);
        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/consultarDespesasVinculadasLeitura', {
                idleitura: Number(idleituraAtual)
            });

            const leituraAtualizada = response?.data || null;

            if (!leituraAtualizada?.IDLEITURA) {
                setRegistroSelecionado(null);
                setDetalhesLeitura([]);
                toast.info(`A importação #${idleituraAtual} não foi encontrada.`);
                return null;
            }

            setRegistroSelecionado(leituraAtualizada);
            setDetalhesLeitura(
                Array.isArray(leituraAtualizada?.despesas)
                    ? leituraAtualizada.despesas
                    : Array.isArray(leituraAtualizada?.itens)
                        ? leituraAtualizada.itens
                        : []
            );
            return leituraAtualizada;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao carregar as despesas vinculadas à importação em lote.');
            return null;
        } finally {
            setDetalhesLoading(false);
        }
    };

    const handleRefreshDetalhes = async () => {
        if (!idleitura) {
            toast.info('Nenhuma importação selecionada para atualização.');
            return;
        }

        setRefreshingDetalhes(true);
        try {
            await carregarDetalhesImportacao(idleitura);
            await carregarArquivosRemessa(idleitura);
            toast.success(`Importação #${idleitura} atualizada.`);
        } finally {
            setRefreshingDetalhes(false);
        }
    };

    const salvarDirecionamentoLote = async () => {
        if (tipoTela !== 'Direcionar') {
            return;
        }

        if (!idleitura) {
            toast.info('Nenhum lote selecionado para direcionamento.');
            return;
        }

        if (!loteLiberadoParaDirecionamento) {
            toast.warning(mensagemBloqueioDirecionamentoLote);
            return;
        }

        if (lotePendenteOrdenadorDirecionamento) {
            toast.info('O lote já está pendente do ordenador. Esta tela está disponível apenas para visualização.');
            return;
        }

        if (orcamentoLoteResumo.ultrapassaOrcamento) {
            toast.warning('O lote ainda está sem orçamento disponível. Atualize após o ajuste da controladoria.');
            return;
        }

        const idUserControladoria = Number(localStorage.getItem('id_usuario') || 0);
        const idGrupoEmpresa = Number(localStorage.getItem('id_grupo_empresa') || 0);

        if (!idUserControladoria || !idGrupoEmpresa) {
            toast.warning('Usuário da controladoria ou grupo de empresa não identificado.');
            return;
        }

        if (solicitacoesGeradasLote.length === 0) {
            toast.info('Nenhuma solicitação gerada foi encontrada para direcionar o lote.');
            return;
        }

        const confirmacao = await Swal.fire({
            title: 'Direcionar lote para o ordenador?',
            html: `Esta ação vai reenviar <strong>${solicitacoesGeradasLote.length} solicitação(ões)</strong> do lote para o ordenador com status <strong>EA</strong>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, salvar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacao.isConfirmed) {
            return;
        }

        const toastId = toast.loading('Direcionando lote para o ordenador...', { position: 'top-center' });
        setSalvandoDirecionamentoLote(true);

        try {
            const { data } = await api.post('/v1/solicitacaoDespesa/importa/direcionarSolicitacoesLote', {
                idleitura: Number(idleitura),
                id_user_controladoria: idUserControladoria,
                id_usuario: Number(localStorage.getItem('id_usuario') || 0),
                id_grupo_empresa: idGrupoEmpresa
            });

            await carregarDetalhesImportacao(idleitura);

            toast.update(toastId, {
                render: data?.message || 'Lote direcionado para o ordenador com sucesso.',
                type: 'success',
                isLoading: false,
                closeOnClick: true,
                autoClose: 2000,
                pauseOnHover: false
            });

            if (typeof onAtualizarSolicitacoes === 'function') {
                onAtualizarSolicitacoes();
            }

            if (typeof onRequestClose === 'function') {
                onRequestClose();
            }
        } catch (error) {
            toast.update(toastId, {
                render: error?.response?.data?.detalhes?.[0]?.message || error?.response?.data?.message || 'Erro ao direcionar o lote para o ordenador.',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
                pauseOnHover: false
            });
        } finally {
            setSalvandoDirecionamentoLote(false);
        }
    };

    const salvarOrdenacaoLote = async () => {
        if (tipoTela !== 'Ordenar') {
            return;
        }

        if (!idleitura) {
            toast.info('Nenhum lote selecionado para aprovação.');
            return;
        }

        if (!loteLiberadoParaOrdenacao) {
            toast.warning(mensagemBloqueioOrdenacaoLote);
            return;
        }

        const idOrdenador = Number(localStorage.getItem('id_usuario') || 0);
        const idGrupoEmpresa = Number(localStorage.getItem('id_grupo_empresa') || 0);
        const parecer = String(obsOrdenadorLote || '').trim();

        if (!idOrdenador || !idGrupoEmpresa) {
            toast.warning('Usuário responsável pela aprovação ou grupo de empresa não identificado.');
            return;
        }

        if (!statusOrdenadorLote) {
            toast.warning('Selecione um status para o lote.');
            return;
        }

        if (statusOrdenadorLote !== 'L' && !parecer) {
            toast.warning('Informe o parecer do ordenador para continuar.');
            return;
        }

        if (solicitacoesGeradasLote.length === 0) {
            toast.info('Nenhuma solicitação gerada foi encontrada para aplicar a aprovação em lote.');
            return;
        }

        let statusParaSalvar = statusOrdenadorLote;
        let parecerParaSalvar = parecer;

        if (statusOrdenadorLote === 'L' && orcamentoLoteResumo.ultrapassaOrcamento) {
            const confirmacaoAjuste = await Swal.fire({
                title: 'Conta não tem mais orçamento disponível, deseja solicita análise da controladoria?',
                showDenyButton: true,
                icon: 'question',
                confirmButtonText: 'Sim',
                denyButtonText: 'Não'
            });

            if (confirmacaoAjuste.isConfirmed) {
                statusParaSalvar = 'AJ';
                parecerParaSalvar = 'Solicitado ajuste do orcamento';
            } else {
                return;
            }
        }

        const descricaoStatus = listaStatusOrdenador.find((item) => item.status === statusParaSalvar)?.descricao
            || getDescricaoStatusSolicitacao(statusParaSalvar);

        const confirmacao = await Swal.fire({
            title: 'Aplicar aprovação em lote?',
            html: `Esta ação vai atualizar <strong>${solicitacoesGeradasLote.length} solicitação(ões)</strong> do lote para <strong>${descricaoStatus}</strong>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, salvar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacao.isConfirmed) {
            return;
        }

        const toastId = toast.loading('Salvando aprovação do lote...', { position: 'top-center' });
        setSalvandoOrdenacaoLote(true);

        try {
            const { data } = await api.post('/v1/solicitacaoDespesa/importa/ordenarSolicitacoesLote', {
                idleitura: Number(idleitura),
                id_ordenador: idOrdenador,
                id_usuario: Number(localStorage.getItem('id_usuario') || 0),
                status: statusParaSalvar,
                obs_ordenador: parecerParaSalvar,
                id_grupo_empresa: idGrupoEmpresa
            });

            await carregarDetalhesImportacao(idleitura);

            toast.update(toastId, {
                render: data?.message || 'Aprovação do lote salva com sucesso.',
                type: 'success',
                isLoading: false,
                closeOnClick: true,
                autoClose: 2000,
                pauseOnHover: false
            });

            if (typeof onAtualizarSolicitacoes === 'function') {
                onAtualizarSolicitacoes();
            }

            if (typeof onRequestClose === 'function') {
                onRequestClose();
            }
        } catch (error) {
            toast.update(toastId, {
                render: error?.response?.data?.detalhes?.[0]?.message || error?.response?.data?.message || 'Erro ao salvar a aprovação do lote.',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
                pauseOnHover: false
            });
        } finally {
            setSalvandoOrdenacaoLote(false);
        }
    };

    const salvarFinanceiroLote = async () => {
        if (tipoTela !== 'Conformidade') {
            return;
        }

        if (!idleitura) {
            toast.info('Nenhum lote selecionado para conformidade financeira.');
            return;
        }

        if (!loteLiberadoParaFinanceiro) {
            toast.warning(mensagemBloqueioFinanceiroLote);
            return;
        }

        const idUserFinanceiro = Number(localStorage.getItem('id_usuario') || 0);
        const idGrupoEmpresa = Number(localStorage.getItem('id_grupo_empresa') || 0);
        const integracaoSelecionada = Number(integracaoFinanceiroLote || 0);

        if (!idUserFinanceiro || !idGrupoEmpresa) {
            toast.warning('Usuário ou grupo de empresa não identificado para a conformidade financeira.');
            return;
        }

        if (!integracaoSelecionada) {
            toast.warning('Selecione a integração para o lote.');
            return;
        }

        if (integracaoSelecionada === 631 && Number(codCaixaBancoLote || 0) <= 0) {
            toast.warning('Informe o Caixa/Banco para esta integração.');
            return;
        }

        if (!String(obsFinanceiroLote || '').trim()) {
            toast.warning('Informe o parecer financeiro do lote.');
            return;
        }

        if (!String(historico1Lote || '').trim()) {
            toast.warning('Informe o Histórico 1.');
            return;
        }

        if (!String(historico2Lote || '').trim()) {
            toast.warning('Informe o Histórico 2.');
            return;
        }

        if (solicitacoesGeradasLote.length === 0) {
            toast.info('Nenhuma solicitação gerada foi encontrada para aplicar a conformidade financeira.');
            return;
        }

        const descricaoIntegracao = listaRotinaIntegracao.find((item) => Number(item.rotina) === integracaoSelecionada)?.descricao || integracaoSelecionada;

        const confirmacao = await Swal.fire({
            title: 'Aplicar financeiro em lote?',
            html: `Esta ação vai aplicar os dados financeiros em <strong>${solicitacoesGeradasLote.length} solicitação(ões)</strong> do lote usando <strong>${descricaoIntegracao}</strong>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, salvar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacao.isConfirmed) {
            return;
        }

        const toastId = toast.loading('Salvando financeiro do lote...', { position: 'top-center' });
        setSalvandoFinanceiroLote(true);

        try {
            const { data } = await api.post('/v1/solicitacaoDespesa/importa/conformidadeSolicitacoesLote', {
                idleitura: Number(idleitura),
                id_rotina_integracao: integracaoSelecionada,
                obs_financeiro: String(obsFinanceiroLote || '').trim(),
                id_usuario: Number(localStorage.getItem('id_usuario') || 0),
                id_user_financeiro: idUserFinanceiro,
                id_caixabanco: Number(codCaixaBancoLote || 0) || undefined,
                historico1: String(historico1Lote || '').trim().toUpperCase(),
                historico2: String(historico2Lote || '').trim().toUpperCase(),
                id_grupo_empresa: idGrupoEmpresa,
                valesSelecionados: []
            });

            await carregarDetalhesImportacao(idleitura);

            const resultadosConformidade = Array.isArray(data?.resultadosConformidade)
                ? data.resultadosConformidade
                : [];
            const solicitacoesPendentes = resultadosConformidade.filter((item) => item?.status_final === 'F');
            const mensagemPendencia = solicitacoesPendentes
                .map((item) => `Solicitação ${item.numsolicitacao}: ${item.mensagem_integracao || 'pendente de integração.'}`)
                .join(' | ');

            if (solicitacoesPendentes.length > 0) {
                toast.update(toastId, {
                    render: mensagemPendencia || 'Uma ou mais solicitações ficaram pendentes de integração.',
                    type: 'warning',
                    isLoading: false,
                    closeOnClick: true,
                    autoClose: 6000,
                    pauseOnHover: true
                });
            } else {
                toast.update(toastId, {
                    render: data?.message || 'Dados financeiros do lote salvos com sucesso.',
                    type: 'success',
                    isLoading: false,
                    closeOnClick: true,
                    autoClose: 2000,
                    pauseOnHover: false
                });
            }

            if (typeof onAtualizarSolicitacoes === 'function') {
                onAtualizarSolicitacoes();
            }

            if (typeof onRequestClose === 'function') {
                onRequestClose();
            }
        } catch (error) {
            toast.update(toastId, {
                render: error?.response?.data?.detalhes?.[0]?.message || error?.response?.data?.message || error?.response?.data?.error || 'Erro ao salvar os dados financeiros do lote.',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
                pauseOnHover: false
            });
        } finally {
            setSalvandoFinanceiroLote(false);
        }
    };

    const tituloAcao = {
        Editar: 'Edição',
        Direcionar: 'Direcionamento',
        Ordenar: 'Aprovação',
        Conformidade: 'Conformidade Financeira'
    }[tipoTela] || 'Consulta';

    const listaStatusOrdenador = [
        { id: 1, status: '', descricao: 'Selecione uma opção' },
        { id: 2, status: 'N', descricao: 'NEGAR' },
        { id: 3, status: 'P', descricao: 'PEND. SOLICITANTE' },
        { id: 4, status: 'L', descricao: 'LIBERAR' }
    ];

    const getDescricaoStatusSolicitacao = (status, rotina) => {
        const statusNormalizado = String(status || '').trim().toUpperCase();

        const mapaStatus = {
            A: 'PEND. CONTROLADORIA',
            EA: 'PEND. ORDENADOR',
            AJ: 'AJUSTAR ORÇAMENTO',
            L: 'PEND. FINANCEIRO',
            P: 'PEND. SOLICITANTE',
            N: 'NEGADO. ORDENADOR',
            F: 'PEND. INTEGRAÇÃO'
        };

        if (statusNormalizado === 'I') {
            return `WINTHOR${rotina ? ` (${rotina})` : ''}`;
        }

        return mapaStatus[statusNormalizado] || (statusNormalizado || 'SEM SOLICITAÇÃO GERADA');
    };

    const listaRotinaIntegracao = [
        { id: 2, rotina: 631, descricao: 'LANÇAR DESPESAS (631)' },
        { id: 3, rotina: 746, descricao: 'ADIANTAMENTO AO FORNECEDOR (746)' },
        { id: 4, rotina: 749, descricao: 'INCLUIR TITULO A PAGAR (749)' },
        { id: 5, rotina: 99999, descricao: 'REJEIÇÃO FINANCEIRA' }
    ];

    const orcamentoLoteResumo = useMemo(() => {
        const dados = registroSelecionado?.ORCAMENTO_LOTE;

        return {
            totalLote: Number(dados?.totalLote || 0),
            despesasIntegradas: Number(dados?.despesasIntegradas || 0),
            vlOrcadoMes: Number(dados?.vlOrcadoMes || 0),
            saldoDisponivel: Number(dados?.saldoDisponivel || 0),
            totalComprometido: Number(dados?.totalComprometido || 0),
            quantidadeContasUltrapassadas: Number(dados?.quantidadeContasUltrapassadas || 0),
            ultrapassaOrcamento: Boolean(dados?.ultrapassaOrcamento),
            itens: Array.isArray(dados?.itens) ? dados.itens : []
        };
    }, [registroSelecionado]);

    const itensOrcamentoExcedidos = useMemo(() => (
        orcamentoLoteResumo.itens.filter((item) => Boolean(item?.ultrapassaOrcamento))
    ), [orcamentoLoteResumo]);

    const mensagemOrcamentoLote = useMemo(() => {
        if (!orcamentoLoteResumo.ultrapassaOrcamento) {
            return '';
        }

        if (itensOrcamentoExcedidos.length === 1) {
            return 'Atenção: a conta abaixo ultrapassou o orçamento mensal após somar as despesas integradas do mês com o total deste lote.';
        }

        return `Atenção: ${itensOrcamentoExcedidos.length} contas gerenciais ultrapassaram o orçamento mensal após somar as despesas integradas do mês com o total deste lote.`;
    }, [itensOrcamentoExcedidos, orcamentoLoteResumo.ultrapassaOrcamento]);

    const totalDetalhesLeitura = useMemo(() => detalhesLeitura.reduce((total, item) => {
        const valor = parseFloat((item?.VALOR ?? 0).toString().replace(',', '.'));
        return total + (Number.isNaN(valor) ? 0 : valor);
    }, 0), [detalhesLeitura]);

    const filtroRegistrosNormalizado = filtroRegistros.trim().toLowerCase();

    const detalhesFiltrados = useMemo(() => {
        if (!filtroRegistrosNormalizado) {
            return [...detalhesLeitura];
        }

        return detalhesLeitura.filter((item) => {
            const textoBase = [
                item?.NUMSOLICITACAO,
                item?.RAZAOSOCIAL,
                item?.CNPJ_FILIAL,
                item?.NOME,
                item?.CPF_FUNCIONARIO,
                item?.ID_ITEM,
                item?.DESCRICAO_ITEM,
                item?.HISTORICO
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return textoBase.includes(filtroRegistrosNormalizado);
        });
    }, [detalhesLeitura, filtroRegistrosNormalizado]);

    const despesasGeradas = useMemo(() => {
        return detalhesFiltrados
            .filter((item) => Number(item?.NUMSOLICITACAO || 0) > 0)
            .sort((a, b) => (
                Number(b?.NUMSOLICITACAO || 0) - Number(a?.NUMSOLICITACAO || 0)
                || String(a?.NOME || '').localeCompare(String(b?.NOME || ''))
            ));
    }, [detalhesFiltrados]);

    const registrosPendentes = useMemo(() => {
        return detalhesFiltrados
            .filter((item) => Number(item?.NUMSOLICITACAO || 0) <= 0)
            .sort((a, b) => (
                String(a?.NOME || '').localeCompare(String(b?.NOME || ''))
                || Number(a?.ID_ITEM || 0) - Number(b?.ID_ITEM || 0)
            ));
    }, [detalhesFiltrados]);

    const todosRegistros = useMemo(() => {
        return [
            ...despesasGeradas,
            ...registrosPendentes
        ];
    }, [despesasGeradas, registrosPendentes]);

    const solicitacoesGeradasLote = useMemo(() => {
        const mapa = new Map();

        detalhesLeitura
            .filter((item) => Number(item?.NUMSOLICITACAO || 0) > 0)
            .forEach((item) => {
                const numero = Number(item?.NUMSOLICITACAO || 0);

                if (!mapa.has(numero)) {
                    mapa.set(numero, {
                        NUMSOLICITACAO: numero,
                        STATUS_SOLICITACAO: String(item?.STATUS_SOLICITACAO || '').trim().toUpperCase(),
                        ID_ORDENADOR: Number(item?.ID_ORDENADOR || 0),
                        NOME_ORDENADOR: String(item?.ORDENADOR || item?.NOME_ORDENADOR || '').trim(),
                        DATAHORAORDENADOR: item?.DATAHORAORDENADOR || null,
                        OBS_ORDENADOR: String(item?.OBS_ORDENADOR || '').trim(),
                        ID_ROTINA_INTEGRACAO: Number(item?.ID_ROTINA_INTEGRACAO || 0),
                        ID_CAIXABANCO: Number(item?.ID_CAIXABANCO || 0),
                        CAIXABANCO: String(item?.CAIXABANCO || '').trim(),
                        OBS_FINANCEIRO: String(item?.OBS_FINANCEIRO || '').trim(),
                        HISTORICO1: String(item?.HISTORICO1 || '').trim(),
                        HISTORICO2: String(item?.HISTORICO2 || '').trim(),
                        ID_USER_FINANCEIRO: Number(item?.ID_USER_FINANCEIRO || 0),
                        NOME_FINANCEIRO: String(item?.NOME_FINANCEIRO || '').trim(),
                        DATAHORAFINANCEIRO: item?.DATAHORAFINANCEIRO || null
                    });
                }
            });

        return Array.from(mapa.values()).sort((a, b) => b.NUMSOLICITACAO - a.NUMSOLICITACAO);
    }, [detalhesLeitura]);

    const situacaoStatusLote = useMemo(() => {
        const statuses = [...new Set(solicitacoesGeradasLote.map((item) => item.STATUS_SOLICITACAO).filter(Boolean))];
        const observacoes = [...new Set(solicitacoesGeradasLote.map((item) => item.OBS_ORDENADOR).filter(Boolean))];

        return {
            statusUnico: statuses.length === 1 ? statuses[0] : '',
            observacaoUnica: observacoes.length === 1 ? observacoes[0] : '',
            possuiStatusMisto: statuses.length > 1,
            possuiObservacaoMista: observacoes.length > 1,
            statuses
        };
    }, [solicitacoesGeradasLote]);

    const loteBloqueadoPosFinanceiro = situacaoStatusLote.statuses.some((status) => ['F', 'I'].includes(String(status || '').trim().toUpperCase()));
    const lotePendenteFinanceiro = situacaoStatusLote.statuses.some((status) => String(status || '').trim().toUpperCase() === 'L');
    const loteLiberadoParaDirecionamento = solicitacoesGeradasLote.length > 0
        && situacaoStatusLote.statuses.every((status) => ['A', 'EA', 'AJ'].includes(String(status || '').trim().toUpperCase()));
    const lotePendenteOrdenadorDirecionamento = solicitacoesGeradasLote.length > 0
        && situacaoStatusLote.statuses.length > 0
        && situacaoStatusLote.statuses.every((status) => String(status || '').trim().toUpperCase() === 'EA');
    const exibirAcoesDirecionamentoLote = loteLiberadoParaDirecionamento && !lotePendenteOrdenadorDirecionamento;
    const loteLiberadoParaOrdenacao = solicitacoesGeradasLote.length > 0
        && situacaoStatusLote.statuses.every((status) => ['EA', 'P', 'N'].includes(String(status || '').trim().toUpperCase()));
    const loteLiberadoParaFinanceiro = solicitacoesGeradasLote.length > 0
        && situacaoStatusLote.statuses.every((status) => String(status || '').trim().toUpperCase() === 'L');

    const mensagemBloqueioDirecionamentoLote = loteBloqueadoPosFinanceiro
        ? 'Este lote já foi enviado pelo financeiro para o ERP e não pode mais ser alterado na controladoria.'
        : lotePendenteFinanceiro
            ? 'Este lote está pendente do financeiro e não pode voltar para o ordenador pela tela de direcionamento.'
            : 'O direcionamento em lote só pode ser aplicado quando todas as solicitações estiverem pendentes da controladoria ou em ajuste de orçamento.';

    const mensagemVisualizacaoDirecionamentoLote = lotePendenteOrdenadorDirecionamento
        ? 'Este lote já está como PEND. ORDENADOR. Nesta tela, a visualização é somente leitura.'
        : '';

    const mensagemBloqueioOrdenacaoLote = loteBloqueadoPosFinanceiro
        ? 'Este lote já foi enviado pelo financeiro para o ERP e não pode mais ser alterado na aprovação.'
        : lotePendenteFinanceiro
            ? 'Este lote está pendente do financeiro e a alteração deve ser feita somente na conformidade.'
            : 'A aprovação em lote só pode ser aplicada quando todas as solicitações estiverem pendentes do ordenador.';

    const mensagemBloqueioFinanceiroLote = loteBloqueadoPosFinanceiro
        ? 'Este lote já foi enviado pelo financeiro para o ERP e não pode mais ser alterado.'
        : 'A conformidade em lote só pode ser aplicada quando todas as solicitações estiverem pendentes do financeiro.';

    const descricaoStatusAtualLote = situacaoStatusLote.possuiStatusMisto
        ? 'MÚLTIPLOS STATUS'
        : getDescricaoStatusSolicitacao(situacaoStatusLote.statusUnico);

    const statusOrdenadorAtualExibicao = loteLiberadoParaOrdenacao
        ? statusOrdenadorLote
        : (situacaoStatusLote.possuiStatusMisto ? '' : (situacaoStatusLote.statusUnico || ''));

    const listaStatusOrdenadorExibicao = (() => {
        if (situacaoStatusLote.possuiStatusMisto) {
            return [
                { id: 0, status: '', descricao: 'MÚLTIPLOS STATUS' },
                ...listaStatusOrdenador.slice(1)
            ];
        }

        const statusAtual = String(statusOrdenadorAtualExibicao || '').trim().toUpperCase();

        if (!statusAtual || listaStatusOrdenador.some((item) => item.status === statusAtual)) {
            return listaStatusOrdenador;
        }

        const rotinaAtual = solicitacoesGeradasLote.find((item) => item.STATUS_SOLICITACAO === statusAtual)?.ID_ROTINA_INTEGRACAO;

        return [
            { id: 0, status: statusAtual, descricao: getDescricaoStatusSolicitacao(statusAtual, rotinaAtual) },
            ...listaStatusOrdenador
        ];
    })();

    useEffect(() => {
        if (!isOpen || tipoTela !== 'Ordenar') {
            return;
        }

        setStatusOrdenadorLote(['N', 'P', 'L'].includes(situacaoStatusLote.statusUnico) ? situacaoStatusLote.statusUnico : '');
        setObsOrdenadorLote(situacaoStatusLote.observacaoUnica || '');
    }, [isOpen, tipoTela, situacaoStatusLote.statusUnico, situacaoStatusLote.observacaoUnica]);

    const situacaoFinanceiraLote = useMemo(() => {
        const integracoes = [...new Set(solicitacoesGeradasLote.map((item) => Number(item.ID_ROTINA_INTEGRACAO || 0)).filter((item) => item > 0))];
        const caixas = [...new Set(solicitacoesGeradasLote.map((item) => Number(item.ID_CAIXABANCO || 0)).filter((item) => item > 0))];
        const caixasDescricao = [...new Set(solicitacoesGeradasLote.map((item) => String(item.CAIXABANCO || '').trim()).filter(Boolean))];
        const observacoes = [...new Set(solicitacoesGeradasLote.map((item) => String(item.OBS_FINANCEIRO || '').trim()).filter(Boolean))];
        const historicos1 = [...new Set(solicitacoesGeradasLote.map((item) => String(item.HISTORICO1 || '').trim()).filter(Boolean))];
        const historicos2 = [...new Set(solicitacoesGeradasLote.map((item) => String(item.HISTORICO2 || '').trim()).filter(Boolean))];
        const idsFinanceiro = [...new Set(solicitacoesGeradasLote.map((item) => Number(item.ID_USER_FINANCEIRO || 0)).filter((item) => item > 0))];
        const nomesFinanceiro = [...new Set(solicitacoesGeradasLote.map((item) => String(item.NOME_FINANCEIRO || '').trim()).filter(Boolean))];

        return {
            integracaoUnica: integracoes.length === 1 ? integracoes[0] : 0,
            caixaUnica: caixas.length === 1 ? caixas[0] : 0,
            descricaoCaixaUnica: caixasDescricao.length === 1 ? caixasDescricao[0] : '',
            obsFinanceiroUnico: observacoes.length === 1 ? observacoes[0] : '',
            historico1Unico: historicos1.length === 1 ? historicos1[0] : '',
            historico2Unico: historicos2.length === 1 ? historicos2[0] : '',
            idFinanceiroUnico: idsFinanceiro.length === 1 ? idsFinanceiro[0] : Number(localStorage.getItem('id_usuario') || 0),
            nomeFinanceiroUnico: nomesFinanceiro.length === 1 ? nomesFinanceiro[0] : String(localStorage.getItem('nome') || ''),
            possuiDadosMistos: integracoes.length > 1 || caixas.length > 1 || observacoes.length > 1 || historicos1.length > 1 || historicos2.length > 1
        };
    }, [solicitacoesGeradasLote]);

    useEffect(() => {
        if (!isOpen || tipoTela !== 'Conformidade') {
            return;
        }

        setIntegracaoFinanceiroLote(situacaoFinanceiraLote.integracaoUnica || 0);
        setCodCaixaBancoLote(situacaoFinanceiraLote.caixaUnica || 0);
        setDescricaoCaixaBancoLote(situacaoFinanceiraLote.descricaoCaixaUnica || '');
        setObsFinanceiroLote(situacaoFinanceiraLote.obsFinanceiroUnico || '');
        setHistorico1Lote(situacaoFinanceiraLote.historico1Unico || '');
        setHistorico2Lote(situacaoFinanceiraLote.historico2Unico || '');
    }, [
        isOpen,
        tipoTela,
        situacaoFinanceiraLote.integracaoUnica,
        situacaoFinanceiraLote.caixaUnica,
        situacaoFinanceiraLote.descricaoCaixaUnica,
        situacaoFinanceiraLote.obsFinanceiroUnico,
        situacaoFinanceiraLote.historico1Unico,
        situacaoFinanceiraLote.historico2Unico
    ]);

    const responsaveisLote = useMemo(() => {
        const nomesOrdenador = [...new Set(solicitacoesGeradasLote.map((item) => String(item.NOME_ORDENADOR || '').trim()).filter(Boolean))];
        const datasOrdenador = [...new Set(solicitacoesGeradasLote.map((item) => item.DATAHORAORDENADOR).filter(Boolean))];
        const nomesFinanceiro = [...new Set(solicitacoesGeradasLote.map((item) => String(item.NOME_FINANCEIRO || '').trim()).filter(Boolean))];
        const datasFinanceiro = [...new Set(solicitacoesGeradasLote.map((item) => item.DATAHORAFINANCEIRO).filter(Boolean))];

        const obterDataMaisRecente = (datas = []) => {
            const datasOrdenadas = datas
                .map((valor) => ({
                    valor,
                    timestamp: new Date(valor).getTime()
                }))
                .filter((item) => !Number.isNaN(item.timestamp))
                .sort((a, b) => b.timestamp - a.timestamp);

            return datasOrdenadas[0]?.valor || datas[0] || null;
        };

        return {
            nomeOrdenador: nomesOrdenador.length > 0 ? nomesOrdenador.join(', ') : '-',
            dataOrdenador: obterDataMaisRecente(datasOrdenador),
            nomeFinanceiro: nomesFinanceiro.length > 0 ? nomesFinanceiro.join(', ') : '-',
            dataFinanceiro: obterDataMaisRecente(datasFinanceiro)
        };
    }, [solicitacoesGeradasLote]);

    const totalItensProcessadosDetalhe = Number(
        registroSelecionado?.QTD_PROCESSADOS
        ?? detalhesLeitura.filter((item) => !!item?.NUMSOLICITACAO).length
        ?? 0
    );

    const registroPossuiInconsistencia = (detalhe) => (
        String(detalhe?.REMESSA_OK || '') === 'N'
        || possuiCampoObrigatorioInvalido(detalhe, ['ID_BANCO', 'BANCO', 'AGENCIA', 'CONTABANCARIA', 'OPERACAO'])
        || !detalhe?.CONTA
        || !detalhe?.DESCRICAO
        || !detalhe?.ID_ITEM
        || !detalhe?.HISTORICO
        || Number(detalhe?.PERRATEIO || 0) !== 100
    );

    const renderTabelaRegistros = (registros, tituloSecao, vazioTexto) => {
        const totalSecao = registros.reduce((total, item) => {
            const valor = parseFloat((item?.VALOR ?? 0).toString().replace(',', '.'));
            return total + (Number.isNaN(valor) ? 0 : valor);
        }, 0);

        return (
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">{tituloSecao}</h6>
                    <span className={`badge rounded-pill ${registros.length > 0 ? 'bg-primary' : 'bg-secondary'}`}>
                        {registros.length}
                    </span>
                </div>

                <div className="importacao-cards-mobile d-md-none">
                    {registros.length > 0 ? (
                        registros.map((detalhe, index) => {
                            const inconsistente = registroPossuiInconsistencia(detalhe);
                            const statusTexto = inconsistente
                                ? 'Inconsistente'
                                : detalhe.NUMSOLICITACAO
                                    ? 'Gerada'
                                    : 'Pendente';
                            const statusBadgeClass = inconsistente
                                ? 'bg-danger'
                                : detalhe.NUMSOLICITACAO
                                    ? 'bg-success'
                                    : 'bg-warning text-dark';
                            const cardClass = inconsistente
                                ? 'inconsistente'
                                : detalhe.NUMSOLICITACAO
                                    ? 'gerada'
                                    : 'pendente';

                            return (
                                <div key={`${tituloSecao}-mobile-${detalhe.IDLEITURA || 'item'}-${index}`} className={`importacao-card-mobile ${cardClass}`}>
                                    <div className="importacao-card-mobile-topo">
                                        <div>
                                            <span className="importacao-card-mobile-label">Solicitação</span>
                                            <strong>{detalhe.NUMSOLICITACAO || '-'}</strong>
                                        </div>
                                        <span className={`badge rounded-pill ${statusBadgeClass}`}>{statusTexto}</span>
                                    </div>

                                    <div className="importacao-card-mobile-grid">
                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Filial / CNPJ</span>
                                            <strong>{detalhe.ID_ERP && detalhe.RAZAOSOCIAL ? `${detalhe.ID_ERP} - ${detalhe.RAZAOSOCIAL}` : 'Filial não encontrada no SGS'}</strong>
                                            <small>{detalhe.CNPJ_FILIAL || 'CNPJ não informado no arquivo'}</small>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Funcionário / CPF</span>
                                            <strong>{detalhe.ID_USUARIO_ERP && detalhe.NOME ? `${detalhe.ID_USUARIO_ERP} - ${detalhe.NOME}` : 'Funcionário não encontrado no SGS'}</strong>
                                            <small>{detalhe.CPF_FUNCIONARIO || 'CPF não encontrado no SGS'}</small>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Banco</span>
                                            <strong>{detalhe.ID_BANCO && detalhe.BANCO ? `${detalhe.ID_BANCO} - ${detalhe.BANCO}` : 'Não encontrado'}</strong>
                                            <small>
                                                Ag. {detalhe.AGENCIA || 'Não encontrada'} • Conta {detalhe.CONTABANCARIA ? `${detalhe.CONTABANCARIA}${detalhe.OPERACAO ? ` / Op. ${detalhe.OPERACAO}` : ''}` : 'Não encontrada'}
                                            </small>
                                            {possuiAtualizacaoBancariaPorRemessa(detalhe) && (
                                                <>
                                                    <small className="text-primary">Remessa: {formatarDadosBancariosRemessa(detalhe)}</small>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary item-atualizar-cadastro-btn"
                                                        onClick={() => atualizarCadastroBancarioComRemessa(detalhe)}
                                                        disabled={atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(detalhe)}
                                                    >
                                                        {atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(detalhe) ? 'Atualizando...' : 'Atualizar cadastro'}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Conta gerencial</span>
                                            <strong>{detalhe.CONTA && detalhe.DESCRICAO ? `${detalhe.CONTA} - ${detalhe.DESCRICAO}` : 'Conta gerencial não encontrada'}</strong>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Item</span>
                                            <strong>{detalhe.ID_ITEM ? `${detalhe.ID_ITEM}${detalhe.DESCRICAO_ITEM ? ` - ${detalhe.DESCRICAO_ITEM}` : ' - Item não encontrado'}` : 'Item não informado no arquivo'}</strong>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Histórico</span>
                                            <strong>{detalhe.HISTORICO || 'Dados não encontrado no SGS'}</strong>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Centros de Custo</span>
                                            <div>
                                                {detalhe.CENTRODECUSTO
                                                    ? detalhe.CENTRODECUSTO.split(' / ').map((cc, i) => (
                                                        <div key={i} className="item-dado-secundario">{cc}</div>
                                                    ))
                                                    : <span className="text-muted">Não configurado</span>}
                                            </div>
                                        </div>

                                        <div className="importacao-card-mobile-linha importacao-card-mobile-duplo">
                                            <div>
                                                <span className="importacao-card-mobile-label">Remessa</span>
                                                <span className={`badge rounded-pill ${getRemessaBadgeClass(detalhe.REMESSA_STATUS)}`}>
                                                    {detalhe.REMESSA_STATUS || 'SEM REMESSA'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="importacao-card-mobile-linha">
                                            <span className="importacao-card-mobile-label">Valor</span>
                                            <strong className="text-success">{detalhe.VALOR ? formatCurrency(detalhe.VALOR) : 'Dados não encontrado'}</strong>
                                        </div>
                                    </div>

                                    {detalhe.NUMSOLICITACAO && typeof onAbrirSolicitacao === 'function' && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary w-100"
                                            onClick={() => onAbrirSolicitacao(detalhe.NUMSOLICITACAO)}
                                        >
                                            Abrir despesa
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="alert alert-light border text-center text-muted mb-0">
                            {vazioTexto}
                        </div>
                    )}

                    {registros.length > 0 && (
                        <div className="importacao-card-mobile-total">
                            <span>Total da seção</span>
                            <strong>{formatCurrency(totalSecao)}</strong>
                        </div>
                    )}
                </div>

                <div className="d-none d-md-block table-responsive tabela-importacao-wrapper">
                    <table className="table table-sm table-hover mb-0 tabela-importacao-linha-unica">
                        <thead className="Titulos-Table">
                            <tr>
                                <th className="text-center">Solicitação</th>
                                <th>Filial / CNPJ</th>
                                <th>Funcionário / CPF</th>
                                <th>Banco</th>
                                <th>Conta</th>
                                <th>Item</th>
                                <th>Histórico</th>
                                <th>Centros de Custo</th>
                                <th className="text-center">Conferência</th>
                                <th className="text-end">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.length > 0 ? (
                                registros.map((detalhe, index) => (
                                    <tr
                                        key={`${tituloSecao}-${detalhe.IDLEITURA || 'item'}-${index}`}
                                        className={registroPossuiInconsistencia(detalhe)
                                            ? 'table-danger'
                                            : Number(detalhe?.NUMSOLICITACAO || 0) > 0
                                                ? 'table-light'
                                                : 'table-warning'}
                                    >
                                        <td className="text-center align-middle">
                                            <div className="d-flex flex-column gap-1 align-items-center">
                                                <strong>{detalhe.NUMSOLICITACAO || '-'}</strong>
                                                <span className={`badge rounded-pill ${registroPossuiInconsistencia(detalhe)
                                                    ? 'bg-danger'
                                                    : detalhe.NUMSOLICITACAO
                                                        ? 'bg-success'
                                                        : 'bg-warning text-dark'}`}>
                                                    {registroPossuiInconsistencia(detalhe)
                                                        ? 'Inconsistente'
                                                        : detalhe.NUMSOLICITACAO
                                                            ? 'Gerada'
                                                            : 'Pendente'}
                                                </span>
                                                {detalhe.NUMSOLICITACAO && typeof onAbrirSolicitacao === 'function' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => onAbrirSolicitacao(detalhe.NUMSOLICITACAO)}
                                                    >
                                                        Abrir despesa
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className={getClasseCampoRemessa(detalhe, 'cnpj', detalhe.ID_ERP && detalhe.RAZAOSOCIAL && detalhe.CNPJ_FILIAL ? '' : 'table-danger')}
                                            title={getTooltipCampoRemessa(detalhe, 'cnpj', detalhe.CNPJ_FILIAL ? '' : 'CNPJ não informado no arquivo')}
                                        >
                                            <div className="item-dado-bloco">
                                                <strong>{detalhe.ID_ERP && detalhe.RAZAOSOCIAL ? `${detalhe.ID_ERP} - ${detalhe.RAZAOSOCIAL}` : 'Filial não encontrada no SGS'}</strong>
                                                <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                    <span>{detalhe.CNPJ_FILIAL || 'CNPJ não informado no arquivo'}</span>
                                                    {renderIndicadorCampoRemessa(detalhe, 'cnpj')}
                                                </span>
                                                {possuiErroCampoRemessa(detalhe, 'cnpj') && (
                                                    <span className="item-dado-secundario text-danger">{formatarLinhaCampoRemessa(detalhe, 'cnpj')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className={getClasseCampoRemessa(detalhe, 'cpf', detalhe.ID_USUARIO_ERP && detalhe.NOME && detalhe.CPF_FUNCIONARIO ? '' : 'table-danger')}
                                            title={getTooltipCampoRemessa(detalhe, 'cpf', detalhe.CPF_FUNCIONARIO ? '' : 'CPF não encontrado no SGS')}
                                        >
                                            <div className="item-dado-bloco">
                                                <strong>{detalhe.ID_USUARIO_ERP && detalhe.NOME ? `${detalhe.ID_USUARIO_ERP} - ${detalhe.NOME}` : 'Funcionário não encontrado no SGS'}</strong>
                                                <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                    <span>{detalhe.CPF_FUNCIONARIO || 'CPF não encontrado no SGS'}</span>
                                                    {renderIndicadorCampoRemessa(detalhe, 'cpf')}
                                                </span>
                                                {possuiErroCampoRemessa(detalhe, 'cpf') && (
                                                    <span className="item-dado-secundario text-danger">{formatarLinhaCampoRemessa(detalhe, 'cpf')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className={getClasseCampoCadastro(detalhe, ['ID_BANCO', 'BANCO', 'AGENCIA', 'CONTABANCARIA', 'OPERACAO'], possuiAtualizacaoBancariaPorRemessa(detalhe) ? 'remessa-campo-divergente' : '')}
                                            title={[
                                                getTooltipCampoCadastro(detalhe, ['ID_BANCO', 'BANCO'], 'Banco não encontrado no cadastro do funcionário.'),
                                                getTooltipCampoCadastro(detalhe, 'AGENCIA', 'Agência não encontrada no cadastro do funcionário.'),
                                                getTooltipCampoCadastro(detalhe, ['CONTABANCARIA', 'OPERACAO'], 'Conta bancária ou operação não encontrada no cadastro do funcionário.'),
                                                possuiAtualizacaoBancariaPorRemessa(detalhe) ? `Remessa: ${formatarDadosBancariosRemessa(detalhe)}` : ''
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <div className="item-dado-bloco">
                                                <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                    <strong>Banco:</strong>
                                                    <span>{detalhe.ID_BANCO && detalhe.BANCO ? `${detalhe.ID_BANCO} - ${detalhe.BANCO}` : 'Não encontrado'}</span>
                                                    {renderIndicadorCampoCadastro(detalhe, ['ID_BANCO', 'BANCO'], 'Banco não encontrado no cadastro do funcionário.')}
                                                </span>
                                                <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                    <strong>Ag:</strong>
                                                    <span>{detalhe.AGENCIA || 'Não encontrada'}</span>
                                                    {renderIndicadorCampoCadastro(detalhe, 'AGENCIA', 'Agência não encontrada no cadastro do funcionário.')}
                                                </span>
                                                <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                    <strong>Conta:</strong>
                                                    <span>{detalhe.CONTABANCARIA ? `${detalhe.CONTABANCARIA}${detalhe.OPERACAO ? ` / Op. ${detalhe.OPERACAO}` : ''}` : 'Não encontrada'}</span>
                                                    {renderIndicadorCampoCadastro(detalhe, ['CONTABANCARIA', 'OPERACAO'], 'Conta bancária ou operação não encontrada no cadastro do funcionário.')}
                                                </span>
                                                {possuiAtualizacaoBancariaPorRemessa(detalhe) && (
                                                    <>
                                                        <span className="item-dado-secundario item-dado-remessa text-primary">Remessa: {formatarDadosBancariosRemessa(detalhe)}</span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary item-atualizar-cadastro-btn"
                                                            onClick={() => atualizarCadastroBancarioComRemessa(detalhe)}
                                                            disabled={atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(detalhe)}
                                                        >
                                                            {atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(detalhe) ? 'Atualizando...' : 'Atualizar cadastro'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className={detalhe.CONTA && detalhe.DESCRICAO ? '' : 'table-danger'}>
                                            <div className="item-dado-bloco">
                                                <strong>{detalhe.CONTA && detalhe.DESCRICAO ? `${detalhe.CONTA} - ${detalhe.DESCRICAO}` : 'Conta gerencial não encontrada'}</strong>
                                            </div>
                                        </td>
                                        <td className={detalhe.ID_ITEM ? '' : 'table-danger'}>
                                            <div className="item-dado-bloco">
                                                <strong>{detalhe.ID_ITEM ? `${detalhe.ID_ITEM}${detalhe.DESCRICAO_ITEM ? ` - ${detalhe.DESCRICAO_ITEM}` : ' - Item não encontrado'}` : 'Item não informado no arquivo'}</strong>
                                            </div>
                                        </td>
                                        <td className={detalhe.HISTORICO ? '' : 'table-danger'}>
                                            {detalhe.HISTORICO || 'Dados não encontrado no SGS'}
                                        </td>
                                        <td className={!detalhe.CENTRODECUSTO ? 'table-danger' : ''}>
                                            {detalhe.CENTRODECUSTO
                                                ? detalhe.CENTRODECUSTO.split(' / ').map((cc, i) => (
                                                    <div key={i} className="item-dado-secundario">{cc}</div>
                                                ))
                                                : <span className="text-muted">Não configurado</span>}
                                        </td>
                                        <td className={String(detalhe.REMESSA_OK || '') === 'N' ? 'table-danger text-center' : 'text-center'} title={detalhe.REMESSA_ERRO || ''}>
                                            <span className={`badge rounded-pill ${getRemessaBadgeClass(detalhe.REMESSA_STATUS)}`}>
                                                {detalhe.REMESSA_STATUS || 'SEM REMESSA'}
                                            </span>
                                        </td>
                                        <td
                                            className={getClasseCampoRemessa(detalhe, 'valor', detalhe.VALOR ? 'text-end fw-semibold' : 'table-danger text-end')}
                                            title={getTooltipCampoRemessa(detalhe, 'valor', detalhe.VALOR ? '' : 'Valor não encontrado')}
                                        >
                                            <span className="d-inline-flex align-items-center justify-content-end gap-1 w-100">
                                                <span>{detalhe.VALOR ? formatCurrency(detalhe.VALOR) : 'Dados não encontrado'}</span>
                                                {renderIndicadorCampoRemessa(detalhe, 'valor')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="10" className="text-center text-muted py-4">
                                        {vazioTexto}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {registros.length > 0 && (
                            <tfoot>
                                <tr className="table-secondary">
                                    <td className="fw-bold">{registros.length} registro(s)</td>
                                    <td colSpan="8" className="text-end fw-bold">Total:</td>
                                    <td className="fw-bold text-end">{formatCurrency(totalSecao)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className="modal-content-importacao"
            overlayClassName="modal-overlay-importacao"
            shouldCloseOnOverlayClick={!detalhesLoading && !refreshingDetalhes}
        >
            <div className="importacao-modal-header d-flex justify-content-between align-items-center">
                <div>
                    <h4 className="mb-1">{tituloAcao} - Lote #{idleitura || '-'}</h4>
                    <p className="mb-0 text-muted">Os registros desta solicitação foram gerados por arquivo em lote e estão agrupados para conferência.</p>
                </div>
                <button className="btn btn-outline-secondary btn-fechar-importacao" onClick={onRequestClose}>Fechar</button>
            </div>

            <div className="importacao-modal-body" ref={modalContentRef}>

                <div className="alert alert-info mb-3 importacao-alerta-resumo">
                    Esta solicitação foi criada por <strong>importação em lote</strong>. Utilize este detalhamento para conferir os itens, remessa e dados bancários antes de seguir com a etapa de {tituloAcao.toLowerCase()}.
                </div>

                {tipoTela === 'Direcionar' && (
                    <div className="card border-warning shadow-sm mb-3 importacao-card-direcionamento">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="mb-1">2.0 - CONTROLADORIA</h5>
                                    <p className="mb-0 text-muted">Atualize o lote após o ajuste de orçamento e, quando houver saldo disponível, reenvie as solicitações para o ordenador.</p>
                                </div>
                                <span className="badge bg-warning text-dark">{solicitacoesGeradasLote.length} solicitação(ões)</span>
                            </div>

                            {solicitacoesGeradasLote.length > 0 ? (
                                <div className="row g-3">
                                    {!loteLiberadoParaDirecionamento && (
                                        <div className="col-12">
                                            <div className="alert alert-warning mb-0">
                                                {mensagemBloqueioDirecionamentoLote}
                                            </div>
                                        </div>
                                    )}

                                    {lotePendenteOrdenadorDirecionamento && (
                                        <div className="col-12">
                                            <div className="alert alert-info mb-0">
                                                {mensagemVisualizacaoDirecionamentoLote}
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-12">
                                        <label className="mb-2">Observação do Ordenador</label>
                                        <textarea
                                            rows="3"
                                            className="form-control"
                                            value={situacaoStatusLote.observacaoUnica || (situacaoStatusLote.possuiObservacaoMista ? 'O lote possui múltiplas observações do ordenador nas solicitações geradas.' : '')}
                                            disabled
                                            placeholder="Sem observação do ordenador."
                                        />
                                    </div>

                                    {exibirAcoesDirecionamentoLote && orcamentoLoteResumo.ultrapassaOrcamento && (
                                        <div className="col-12">
                                            <div className="alert alert-danger mb-0">
                                                <div>{mensagemOrcamentoLote}</div>
                                                {itensOrcamentoExcedidos.length > 0 && (
                                                    <ul className="mb-0 mt-2 ps-3">
                                                        {itensOrcamentoExcedidos.map((item, index) => {
                                                            const identificacaoConta = item?.codConta
                                                                ? `${item.codConta}${item.conta ? ` - ${item.conta}` : ''}`
                                                                : 'Conta gerencial não identificada';
                                                            const identificacaoEmpresa = item?.idEmpresaErp
                                                                ? `Filial ${item.idEmpresaErp}${item.empresa ? ` - ${item.empresa}` : ''}`
                                                                : 'Filial não identificada';

                                                            return (
                                                                <li key={`direcionar-orcamento-${item?.codConta || 'conta'}-${item?.idEmpresaErp || 'empresa'}-${index}`}>
                                                                    <strong>{identificacaoConta}</strong> • {identificacaoEmpresa}<br />
                                                                    Integradas: {formatCurrency(item.despesasIntegradas)} + Lote: {formatCurrency(item.totalLote)} = {formatCurrency(item.totalComprometido)} • Orçado no mês: {formatCurrency(item.vlOrcadoMes)} • Saldo atual: {formatCurrency(item.saldoDisponivel)}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {exibirAcoesDirecionamentoLote && !orcamentoLoteResumo.ultrapassaOrcamento && (
                                        <div className="col-12">
                                            <div className="alert alert-success mb-0">
                                                Orçamento atualizado com sucesso. Clique em enviar para reenviar o lote ao ordenador com status EA.
                                            </div>
                                        </div>
                                    )}

                                    {exibirAcoesDirecionamentoLote && (
                                        <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                            <small className="text-muted m-0">
                                                {orcamentoLoteResumo.ultrapassaOrcamento
                                                    ? 'Após o ajuste de orçamento pela controladoria, clique em atualizar para revalidar o lote.'
                                                    : 'Ao enviar, todas as solicitações do lote serão direcionadas novamente para o ordenador.'}
                                            </small>

                                            <div className="d-flex gap-2">
                                                {orcamentoLoteResumo.ultrapassaOrcamento && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-warning"
                                                        onClick={handleRefreshDetalhes}
                                                        disabled={refreshingDetalhes || detalhesLoading || salvandoDirecionamentoLote}
                                                    >
                                                        {refreshingDetalhes ? 'Atualizando...' : 'Atualizar'}
                                                    </button>
                                                )}

                                                {!orcamentoLoteResumo.ultrapassaOrcamento && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning"
                                                        onClick={salvarDirecionamentoLote}
                                                        disabled={salvandoDirecionamentoLote || detalhesLoading || refreshingDetalhes}
                                                    >
                                                        {salvandoDirecionamentoLote ? 'Enviando...' : 'Enviar para Ordenador'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="alert alert-secondary mb-0">
                                    Nenhuma solicitação gerada foi encontrada neste lote para aplicar o direcionamento em massa.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tipoTela === 'Ordenar' && (
                    <div className="card border-primary shadow-sm mb-3 importacao-card-ordenador">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="mb-1">3.0 - ORDENADOR</h5>
                                    <p className="mb-0 text-muted">Defina o status e o parecer que serão aplicados em todas as solicitações já geradas deste lote.</p>
                                </div>
                                <span className="badge bg-primary">{solicitacoesGeradasLote.length} solicitação(ões)</span>
                            </div>

                            {solicitacoesGeradasLote.length > 0 ? (
                                <div className="row g-3">
                                    {!loteLiberadoParaOrdenacao && (
                                        <div className="col-12">
                                            <div className="alert alert-warning mb-0">
                                                {mensagemBloqueioOrdenacaoLote}
                                            </div>
                                        </div>
                                    )}

                                    {loteLiberadoParaOrdenacao && orcamentoLoteResumo.ultrapassaOrcamento && (
                                        <div className="col-12">
                                            <div className="alert alert-danger mb-0">
                                                <div>{mensagemOrcamentoLote}</div>
                                                {itensOrcamentoExcedidos.length > 0 && (
                                                    <ul className="mb-0 mt-2 ps-3">
                                                        {itensOrcamentoExcedidos.map((item, index) => {
                                                            const identificacaoConta = item?.codConta
                                                                ? `${item.codConta}${item.conta ? ` - ${item.conta}` : ''}`
                                                                : 'Conta gerencial não identificada';
                                                            const identificacaoEmpresa = item?.idEmpresaErp
                                                                ? `Filial ${item.idEmpresaErp}${item.empresa ? ` - ${item.empresa}` : ''}`
                                                                : 'Filial não identificada';

                                                            return (
                                                                <li key={`ordenar-orcamento-${item?.codConta || 'conta'}-${item?.idEmpresaErp || 'empresa'}-${index}`}>
                                                                    <strong>{identificacaoConta}</strong> • {identificacaoEmpresa}<br />
                                                                    Integradas: {formatCurrency(item.despesasIntegradas)} + Lote: {formatCurrency(item.totalLote)} = {formatCurrency(item.totalComprometido)} • Orçado no mês: {formatCurrency(item.vlOrcadoMes)} • Saldo atual: {formatCurrency(item.saldoDisponivel)}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-lg-4">
                                        <label htmlFor="statusOrdenadorLote" className="mb-2">Status</label>
                                        <select
                                            id="statusOrdenadorLote"
                                            className="form-control"
                                            value={statusOrdenadorAtualExibicao}
                                            onChange={(e) => setStatusOrdenadorLote(e.target.value)}
                                            disabled={salvandoOrdenacaoLote || !loteLiberadoParaOrdenacao}
                                        >
                                            {listaStatusOrdenadorExibicao.map((item) => (
                                                <option key={item.id} value={item.status}>{item.descricao}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-lg-8">
                                        <label htmlFor="parecerOrdenadorLote" className="mb-2">Parecer do Ordenador</label>
                                        <textarea
                                            id="parecerOrdenadorLote"
                                            rows="3"
                                            className="form-control"
                                            placeholder="Observação do ordenador"
                                            value={obsOrdenadorLote}
                                            onChange={(e) => setObsOrdenadorLote(e.target.value)}
                                            disabled={salvandoOrdenacaoLote || !loteLiberadoParaOrdenacao}
                                        />
                                    </div>

                                    <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2 importacao-ordenador-acoes">
                                        <small className={`m-0 ${situacaoStatusLote.possuiStatusMisto || situacaoStatusLote.possuiObservacaoMista ? 'text-warning' : 'text-muted'}`}>
                                            {situacaoStatusLote.possuiStatusMisto || situacaoStatusLote.possuiObservacaoMista
                                                ? 'O lote possui solicitações com status ou parecer diferentes. Ao salvar, o novo valor será aplicado para todas.'
                                                : `Situação atual das solicitações geradas: ${descricaoStatusAtualLote}.`}
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-secondary mb-0">
                                    Nenhuma solicitação gerada foi encontrada neste lote para aplicar a aprovação em massa.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tipoTela === 'Conformidade' && (
                    <div className="card border-success shadow-sm mb-3 importacao-card-financeiro">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                <div>
                                    <h5 className="mb-1">4.0 - FINANCEIRO</h5>
                                    <p className="mb-0 text-muted">Defina os dados financeiros que serão replicados para todas as solicitações geradas deste lote.</p>
                                </div>
                                <span className="badge bg-success">{solicitacoesGeradasLote.length} solicitação(ões)</span>
                            </div>

                            {solicitacoesGeradasLote.length > 0 ? (
                                <div className="row g-3">
                                    {!loteLiberadoParaFinanceiro && (
                                        <div className="col-12">
                                            <div className="alert alert-warning mb-0">
                                                {mensagemBloqueioFinanceiroLote}
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-12">
                                        <label htmlFor="integracaoFinanceiroLote" className="mb-2">Integrar com</label>
                                        <select
                                            id="integracaoFinanceiroLote"
                                            className="form-control"
                                            value={integracaoFinanceiroLote}
                                            onChange={(e) => setIntegracaoFinanceiroLote(Number(e.target.value))}
                                            disabled={salvandoFinanceiroLote || !loteLiberadoParaFinanceiro}
                                        >
                                            <option value={0}>Selecione a integração</option>
                                            {listaRotinaIntegracao.map((item) => (
                                                <option key={item.id} value={item.rotina}>{item.descricao}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="caixaBancoLote" className="mb-2">Caixa/Banco</label>
                                        <EditComplete
                                            placeholder={"Caixa/Banco"}
                                            id={"caixaBancoLote"}
                                            tipoConsulta={"cb"}
                                            onClickCodigo={setCodCaixaBancoLote}
                                            onClickDescricao={setDescricaoCaixaBancoLote}
                                            value={descricaoCaixaBancoLote}
                                            disabled={salvandoFinanceiroLote || !loteLiberadoParaFinanceiro || Number(integracaoFinanceiroLote) !== 631}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="parecerFinanceiroLote" className="mb-2">Parecer Financeiro</label>
                                        <textarea
                                            id="parecerFinanceiroLote"
                                            rows="4"
                                            className="form-control"
                                            placeholder="Observação do Financeiro"
                                            value={obsFinanceiroLote}
                                            onChange={(e) => setObsFinanceiroLote(e.target.value)}
                                            disabled={salvandoFinanceiroLote || !loteLiberadoParaFinanceiro}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="historico1Lote" className="mb-2">Historico 1</label>
                                        <input
                                            type="text"
                                            id="historico1Lote"
                                            className="form-control"
                                            placeholder="Historico 1"
                                            maxLength={200}
                                            value={historico1Lote}
                                            onChange={(e) => setHistorico1Lote(e.target.value.toUpperCase())}
                                            disabled={salvandoFinanceiroLote || !loteLiberadoParaFinanceiro}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="historico2Lote" className="mb-2">Historico 2</label>
                                        <input
                                            type="text"
                                            id="historico2Lote"
                                            className="form-control"
                                            placeholder="Historico 2"
                                            maxLength={200}
                                            value={historico2Lote}
                                            onChange={(e) => setHistorico2Lote(e.target.value.toUpperCase())}
                                            disabled={salvandoFinanceiroLote || !loteLiberadoParaFinanceiro}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="responsavelFinanceiroLote" className="mb-2">Res. Lanc Financeiro</label>
                                        <input
                                            type="text"
                                            id="responsavelFinanceiroLote"
                                            className="form-control"
                                            value={situacaoFinanceiraLote.idFinanceiroUnico ? `${situacaoFinanceiraLote.idFinanceiroUnico} - ${situacaoFinanceiraLote.nomeFinanceiroUnico || localStorage.getItem('nome') || ''}` : `${localStorage.getItem('id_usuario') || ''} - ${localStorage.getItem('nome') || ''}`}
                                            disabled
                                        />
                                    </div>

                                    <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2 importacao-ordenador-acoes">
                                        <small className={`m-0 ${situacaoFinanceiraLote.possuiDadosMistos ? 'text-warning' : 'text-muted'}`}>
                                            {situacaoFinanceiraLote.possuiDadosMistos
                                                ? 'O lote possui dados financeiros diferentes entre as solicitações. Ao salvar, o novo preenchimento será aplicado para todas.'
                                                : 'Os dados financeiros informados abaixo serão replicados para todas as solicitações geradas deste lote.'}
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-secondary mb-0">
                                    Nenhuma solicitação gerada foi encontrada neste lote para aplicar a conformidade financeira em massa.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="row g-3 mb-3 importacao-resumo-lote">
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>ID Leitura</span>
                            <strong>{registroSelecionado?.IDLEITURA ?? idleitura ?? '-'}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Registros</span>
                            <strong>{Number(registroSelecionado?.QTD_REGISTROS || 0)}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Processados</span>
                            <strong>{totalItensProcessadosDetalhe}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className={`detalhe-importacao-card ${Number(registroSelecionado?.TOTAL_ERROS || 0) > 0 ? 'card-erro' : ''}`}>
                            <span>Erros</span>
                            <strong>{Number(registroSelecionado?.TOTAL_ERROS || 0)}</strong>
                        </div>
                    </div>
                </div>

                <div className="row g-3 mb-3 importacao-resumo-lote">
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Usuário de Envio</span>
                            <strong>{registroSelecionado?.USUARIOENV || '-'}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Data do Envio</span>
                            <strong>{formatDateTime(registroSelecionado?.DATAENV)}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Total</span>
                            <strong>{formatCurrency(registroSelecionado?.TOTAL_VALOR || totalDetalhesLeitura)}</strong>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 col-6">
                        <div className="detalhe-importacao-card">
                            <span>Status da Solicitação</span>
                            <strong>{descricaoStatusAtualLote}</strong>
                        </div>
                    </div>
                </div>

                <div className="row g-3 mb-3 importacao-resumo-lote">
                    <div className="col-lg-6 col-md-6 col-12">
                        <div className="detalhe-importacao-card">
                            <span>Quem Ordenou</span>
                            <strong>{responsaveisLote.nomeOrdenador}</strong>
                            {responsaveisLote.dataOrdenador && (
                                <small className="text-muted d-block mt-1">Data/Hora: {formatDateTime(responsaveisLote.dataOrdenador)}</small>
                            )}
                        </div>
                    </div>
                    <div className="col-lg-6 col-md-6 col-12">
                        <div className="detalhe-importacao-card">
                            <span>Quem Lançou no Financeiro</span>
                            <strong>{responsaveisLote.nomeFinanceiro}</strong>
                            {responsaveisLote.dataFinanceiro && (
                                <small className="text-muted d-block mt-1">Data/Hora: {formatDateTime(responsaveisLote.dataFinanceiro)}</small>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-12">
                        <div className="detalhe-importacao-card">
                            <span>Arquivo(s) de Remessa</span>
                            {arquivoRemessaLoading && arquivosRemessaDetalhe.length === 0 ? (
                                <strong>Carregando arquivo(s)...</strong>
                            ) : arquivosRemessaDetalhe.length > 0 ? (
                                <div className="arquivo-remessa-lista">
                                    {arquivosRemessaDetalhe.map((arquivoItem, index) => (
                                        <div key={arquivoItem.id_arquivo || `${arquivoItem.nome}-${index}`} className="arquivo-remessa-item">
                                            <div>
                                                <strong>{arquivoItem.nome || `REMESSA ${index + 1}`}</strong>
                                            </div>
                                            {tipoTela === 'Conformidade' ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={() => baixarArquivoRemessa(arquivoItem)}
                                                >
                                                    Baixar
                                                </button>
                                            ) : (
                                                <span className="badge bg-secondary">Download na conformidade</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <strong>Nenhum arquivo de remessa salvo para esta importação.</strong>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row mb-3 align-items-end importacao-filtro-box">
                    <div className="col-lg-6 mb-2">
                        <label htmlFor="filtroRegistrosLote" className="mb-2">Filtrar registros</label>
                        <input
                            id="filtroRegistrosLote"
                            type="text"
                            className="form-control"
                            placeholder="Solicitação, CPF, funcionário, item ou histórico"
                            value={filtroRegistros}
                            onChange={(e) => setFiltroRegistros(e.target.value)}
                        />
                    </div>
                    <div className="col-lg-6 mb-2 d-flex align-items-end justify-content-lg-end">
                        <div className="d-flex gap-2 flex-wrap importacao-badges-resumo">
                            <span className="badge bg-success">Geradas: {despesasGeradas.length}</span>
                            <span className="badge bg-warning text-dark">Pendentes: {registrosPendentes.length}</span>
                            <span className="badge bg-danger">Inconsistências: {detalhesFiltrados.filter((item) => registroPossuiInconsistencia(item)).length}</span>
                        </div>
                    </div>
                </div>

                <div className="alert alert-warning mb-3">
                    <strong>Atenção:</strong> linhas em vermelho indicam pendências ou divergências que precisam ser conferidas antes de seguir.
                </div>

                <div className="row mb-3">
                    <div className="col-12">
                        {renderTabelaRegistros(
                            todosRegistros,
                            'Todos os registros',
                            filtroRegistrosNormalizado
                                ? 'Nenhum registro encontrado com o filtro informado.'
                                : 'Nenhum registro encontrado para este lote.'
                        )}
                    </div>
                </div>
            </div>

            <div className="importacao-modal-footer">
                <div className="importacao-modal-footer-start d-none d-md-block">
                    <small className="text-muted">
                        Total de registros exibidos: {detalhesFiltrados.length}. Consulte os blocos acima para validar o lote por etapa.
                    </small>
                </div>
                <div className="importacao-modal-footer-actions">
                    {tipoTela === 'Ordenar' ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={salvarOrdenacaoLote}
                            disabled={salvandoOrdenacaoLote || detalhesLoading || solicitacoesGeradasLote.length === 0 || !loteLiberadoParaOrdenacao}
                        >
                            {salvandoOrdenacaoLote ? 'Salvando...' : 'Salvar aprovação do lote'}
                        </button>
                    ) : tipoTela === 'Conformidade' ? (
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={salvarFinanceiroLote}
                            disabled={salvandoFinanceiroLote || detalhesLoading || solicitacoesGeradasLote.length === 0 || !loteLiberadoParaFinanceiro}
                        >
                            {salvandoFinanceiroLote ? 'Salvando...' : 'Salvar financeiro do lote'}
                        </button>
                    ) : (
                        <button type="button" className="btn btn-outline-secondary" onClick={onRequestClose}>Fechar</button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default ModalSolicitacaoImportacaoLote;
