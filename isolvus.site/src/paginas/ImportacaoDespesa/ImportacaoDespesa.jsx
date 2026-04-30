import React, { useState, useEffect, useRef } from "react";
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import Menu from "../../componentes/Menu/Menu";
import api from "../../servidor/api";
import './ImportacaoDespesa.css';

const ID_ROTINA_IMPORTACAO_REMESSA = '1030.2';

function ImportacaoDespesa(){
    const [arquivo, setArquivo] = useState(null);
    const [arquivoRemessa, setArquivoRemessa] = useState(null);
    const [dados, setDados] = useState([]);
    const [erros, setErros] = useState([]);
    const [loading, setLoading] = useState(false);
    const [preAnaliseLoading, setPreAnaliseLoading] = useState(false);
    const [descricao, setDescricao] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [consultaHistorico, setConsultaHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const [historicoConsultado, setHistoricoConsultado] = useState(false);
    const [sortBy, setSortBy] = useState('DATAENV');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [dataInicial, setDataInicial] = useState(() => {
        const hoje = new Date();
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return primeiroDia.toISOString().split('T')[0];
    });
    const [dataFinal, setDataFinal] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [modalTipo, setModalTipo] = useState('importacao');
    const [registroSelecionado, setRegistroSelecionado] = useState(null);
    const [detalhesLeitura, setDetalhesLeitura] = useState([]);
    const [detalhesLoading, setDetalhesLoading] = useState(false);
    const [totalErrosRetorno, setTotalErrosRetorno] = useState(0);
    const [excluindo, setExcluindo] = useState(false);
    const [refreshingDetalhes, setRefreshingDetalhes] = useState(false);
    const [arquivosRemessaDetalhe, setArquivosRemessaDetalhe] = useState([]);
    const [arquivoRemessaLoading, setArquivoRemessaLoading] = useState(false);
    const [uploadRemessaLoading, setUploadRemessaLoading] = useState(false);
    const [arquivoRemessaSalvo, setArquivoRemessaSalvo] = useState(false);
    const [atualizandoCadastroBancarioId, setAtualizandoCadastroBancarioId] = useState('');
    const [rateioPorSolicitacao, setRateioPorSolicitacao] = useState({});
    const [rateioCarregandoPorSolicitacao, setRateioCarregandoPorSolicitacao] = useState({});
    const modalContentRef = useRef(null);

    useEffect(() => {
        if (!dataInicial || !dataFinal) {
            setConsultaHistorico([]);
            setHistoricoConsultado(false);
            return;
        }

        const timeout = setTimeout(() => {
            const filtro = searchTerm.trim();

            if (filtro.length > 0 && filtro.length <= 3) {
                setConsultaHistorico([]);
                setHistoricoConsultado(false);
                return;
            }

            carregarHistorico(filtro);
        }, 500);

        return () => clearTimeout(timeout);
    }, [dataInicial, dataFinal, searchTerm]);

    useEffect(() => {
        if (isModalOpen) {
            requestAnimationFrame(() => {
                if (modalContentRef.current) {
                    modalContentRef.current.scrollTop = 0;
                }
                window.scrollTo({ top: 0, behavior: 'auto' });
            });
        }
    }, [isModalOpen, modalTipo]);

    const carregarHistorico = async (filtro = '') => {
        if (!dataInicial || !dataFinal) {
            return [];
        }

        setHistoricoConsultado(true);
        setLoadingHistorico(true);
        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/consultarPreAnaliseAgrupado', {
                dataInicial,
                dataFinal,
                filtro: filtro || ''
            });

            const retorno = response.data;
            const lista = Array.isArray(retorno)
                ? retorno
                : Array.isArray(retorno?.dados)
                    ? retorno.dados
                    : [];

            setConsultaHistorico(lista);
            return lista;
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            setConsultaHistorico([]);
            toast.error(error.response?.data?.message || 'Erro ao carregar histórico de importações.');
            return [];
        } finally {
            setLoadingHistorico(false);
        }
    };

    const formatCurrency = (valor) => {
        const numero = Number(valor || 0);
        return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatPercent = (valor) => {
        return `${Number(valor || 0).toFixed(2)}%`;
    };

    const formatDateTime = (valor) => {
        if (!valor) return '-';
        return new Date(valor).toLocaleString('pt-BR');
    };

    const normalizarRateioSolicitacao = (lista = []) => {
        if (!Array.isArray(lista)) {
            return [];
        }

        return lista
            .map((item) => {
                const idCentro = String(
                    item?.id_centrodecusto
                    ?? item?.ID_CENTRODECUSTO
                    ?? item?.codcentrodecusto
                    ?? item?.CODCENTRODECUSTO
                    ?? ''
                ).trim();

                const descricaoCentro = String(
                    item?.descricao
                    ?? item?.DESCRICAO
                    ?? item?.centrodecusto
                    ?? item?.CENTRODECUSTO
                    ?? ''
                ).trim();

                const percentual = Number(
                    item?.percentual
                    ?? item?.PERCENTUAL
                    ?? item?.perrateio
                    ?? item?.PERRATEIO
                    ?? 0
                );

                if (!idCentro && !descricaoCentro) {
                    return null;
                }

                const centro = idCentro && descricaoCentro
                    ? `${idCentro} - ${descricaoCentro}`
                    : (descricaoCentro || idCentro);

                return percentual > 0
                    ? `${centro} (${formatPercent(percentual)})`
                    : centro;
            })
            .filter(Boolean);
    };

    const getNumSolicitacaoItem = (item) => {
        const valor = Number(item?.NUMSOLICITACAO ?? item?.numsolicitacao ?? 0);
        return Number.isFinite(valor) && valor > 0 ? valor : 0;
    };

    const carregarRateioSolicitacao = async (numsolicitacao) => {
        const numero = Number(numsolicitacao || 0);

        if (!numero) {
            return [];
        }

        const chave = String(numero);

        if (Array.isArray(rateioPorSolicitacao[chave])) {
            return rateioPorSolicitacao[chave];
        }

        setRateioCarregandoPorSolicitacao((prev) => ({
            ...prev,
            [chave]: true
        }));

        try {
            const response = await api.post('/v1/solicitacaoDespesa/consultarRateio', {
                pnumsolicitacao: numero
            });

            const rateioNormalizado = normalizarRateioSolicitacao(response?.data);

            setRateioPorSolicitacao((prev) => ({
                ...prev,
                [chave]: rateioNormalizado
            }));

            return rateioNormalizado;
        } catch (error) {
            setRateioPorSolicitacao((prev) => ({
                ...prev,
                [chave]: []
            }));

            return [];
        } finally {
            setRateioCarregandoPorSolicitacao((prev) => ({
                ...prev,
                [chave]: false
            }));
        }
    };

    const getCentrosDeCustoItem = (item) => {
        const numsolicitacao = getNumSolicitacaoItem(item);

        if (numsolicitacao) {
            const rateio = rateioPorSolicitacao[String(numsolicitacao)];

            if (Array.isArray(rateio) && rateio.length > 0) {
                return rateio;
            }
        }

        const centroDeCusto = String(item?.CENTRODECUSTO || '').trim();

        if (!centroDeCusto) {
            return [];
        }

        return centroDeCusto
            .split(' / ')
            .map((valor) => String(valor || '').trim())
            .filter(Boolean);
    };

    const centroDeCustoRateioCarregando = (item) => {
        const numsolicitacao = getNumSolicitacaoItem(item);

        if (!numsolicitacao) {
            return false;
        }

        const chave = String(numsolicitacao);
        return Boolean(rateioCarregandoPorSolicitacao[chave]) && !Array.isArray(rateioPorSolicitacao[chave]);
    };

    useEffect(() => {
        const listaItens = modalTipo === 'detalhe' ? detalhesLeitura : dados;

        if (!Array.isArray(listaItens) || listaItens.length === 0) {
            return;
        }

        const solicitacoes = [...new Set(listaItens
            .map((item) => getNumSolicitacaoItem(item))
            .filter((numero) => numero > 0))];

        solicitacoes.forEach((numero) => {
            const chave = String(numero);
            const jaTemRateio = Array.isArray(rateioPorSolicitacao[chave]);
            const carregando = Boolean(rateioCarregandoPorSolicitacao[chave]);

            if (!jaTemRateio && !carregando) {
                carregarRateioSolicitacao(numero);
            }
        });
    }, [modalTipo, dados, detalhesLeitura, rateioPorSolicitacao, rateioCarregandoPorSolicitacao]);

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

        if (linha) {
            return `linha ${linha}`;
        }

        return possuiErroCampoRemessa(item, campo) ? 'linha não encontrada' : '-';
    };

    const possuiDivergenciaRemessa = (item) => String(item?.REMESSA_OK || '') === 'N';

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

    const getResumoLinhasRemessa = (item) => {
        const labels = {
            cnpj: 'CNPJ',
            cpf: 'CPF',
            valor: 'Valor'
        };

        return ['cnpj', 'cpf', 'valor']
            .filter((campo) => possuiErroCampoRemessa(item, campo))
            .map((campo) => `${labels[campo]}: ${formatarLinhaCampoRemessa(item, campo)}`)
            .join(' • ');
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

            if (campo === 'ID_FORMADEPAGAMENTO') {
                const remessaStatus = String(item?.REMESSA_STATUS || '').toUpperCase();
                const exigeFormaPagamento = remessaStatus !== '' && remessaStatus !== 'SEM REMESSA';
                return exigeFormaPagamento && Number(valor || 0) <= 0;
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

        if (item?.REMESSA_ID_BANCO) {
            partes.push(`Banco ${item.REMESSA_ID_BANCO}`);
        }

        if (item?.REMESSA_AGENCIA) {
            partes.push(`Ag. ${item.REMESSA_AGENCIA}`);
        }

        if (item?.REMESSA_CONTABANCARIA) {
            partes.push(`Conta ${item.REMESSA_CONTABANCARIA}`);
        }

        if (item?.REMESSA_OPERACAO) {
            partes.push(`Op. ${item.REMESSA_OPERACAO}`);
        }

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

            const idleituraAtual = item?.IDLEITURA || registroSelecionado?.IDLEITURA || dados?.[0]?.IDLEITURA;
            if (idleituraAtual) {
                await atualizarDadosLeituraAtual(idleituraAtual);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar os dados bancários do funcionário.');
        } finally {
            setAtualizandoCadastroBancarioId('');
        }
    };

    const gerarErrosCadastroBancario = (registros = []) => {
        const errosCampos = [];

        registros.forEach((item) => {
            const identificador = [
                item?.IDLEITURA ? `Leitura ${item.IDLEITURA}` : null,
                item?.CPF_FUNCIONARIO ? `CPF ${item.CPF_FUNCIONARIO}` : null,
                item?.NOME || null
            ].filter(Boolean).join(' • ');

            if (possuiCampoObrigatorioInvalido(item, ['ID_BANCO', 'BANCO'])) {
                errosCampos.push(`Cadastro bancário: ${identificador || 'Registro sem identificação'} - Banco não encontrado no cadastro do funcionário.`);
            }

            if (possuiCampoObrigatorioInvalido(item, 'AGENCIA')) {
                errosCampos.push(`Cadastro bancário: ${identificador || 'Registro sem identificação'} - Agência não encontrada no cadastro do funcionário.`);
            }

            if (possuiCampoObrigatorioInvalido(item, ['CONTABANCARIA', 'OPERACAO'])) {
                errosCampos.push(`Cadastro bancário: ${identificador || 'Registro sem identificação'} - Conta bancária/operação não encontrada no cadastro do funcionário.`);
            }

            if (possuiCampoObrigatorioInvalido(item, 'ID_FORMADEPAGAMENTO')) {
                const codigoRemessa = item?.REMESSA_FORMADEPAGAMENTO_BB ? ` (${item.REMESSA_FORMADEPAGAMENTO_BB})` : '';
                errosCampos.push(`Forma de pagamento: ${identificador || 'Registro sem identificação'} - Código da remessa${codigoRemessa} não vinculado em BSTAB_FORMADEPAGAMENTO.ID_BANCODOBRASIL.`);
            }

            if (possuiAtualizacaoBancariaPorRemessa(item)) {
                errosCampos.push(`Atualização bancária disponível: ${identificador || 'Registro sem identificação'} - Remessa informa ${formatarDadosBancariosRemessa(item)}.`);
            }
        });

        return [...new Set(errosCampos)];
    };

    const gerarErrosRemessa = (registros = [], alertasRemessa = []) => {
        const divergenciasPorItem = registros
            .filter((item) => String(item?.REMESSA_OK || '') === 'N')
            .map((item) => {
                const resumoLinhas = getResumoLinhasRemessa(item);
                const valorFormatado = item?.VALOR ? formatCurrency(item.VALOR) : 'Valor não encontrado';
                const empresa = item?.RAZAOSOCIAL || 'Empresa não encontrada';
                const funcionario = item?.NOME || 'Funcionário não encontrado';

                return `Remessa: ${resumoLinhas || 'linha não identificada'} - ${item?.REMESSA_ERRO || 'Dados não conferem com o arquivo de remessa.'} Dados: CNPJ ${item?.CNPJ_FILIAL || '-'} • Empresa ${empresa} • CPF ${item?.CPF_FUNCIONARIO || '-'} • Funcionário ${funcionario} • Valor ${valorFormatado}.`;
            });

        const alertas = Array.isArray(alertasRemessa)
            ? alertasRemessa.filter(Boolean).map((mensagem) => String(mensagem))
            : [];

        return [...new Set([...alertas, ...divergenciasPorItem])];
    };

    const normalizarArquivosRetorno = (lista = []) => {
        if (!Array.isArray(lista)) return [];

        return lista.map((item) => {
            const url = Array.isArray(item) ? item[0] : (item?.url || item?.file_path || '');
            const id_arquivo = Array.isArray(item) ? item[1] : (item?.id_arquivo ?? null);
            const nome = decodeURIComponent(String(url || '').split('/').pop()?.split('?')[0] || '');

            return {
                url,
                id_arquivo,
                nome
            };
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

    const carregarArquivosRemessa = async (idleitura) => {
        if (!idleitura) {
            setArquivosRemessaDetalhe([]);
            return [];
        }

        setArquivoRemessaLoading(true);
        try {
            const { data } = await api.get('/v1/listarArquivos', {
                params: {
                    id_rotina: ID_ROTINA_IMPORTACAO_REMESSA,
                    id_relacional: idleitura,
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

    const carregarDetalhesImportacao = async (idleitura) => {
        if (!idleitura) {
            return null;
        }

        setDetalhesLoading(true);
        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/consultarDespesasVinculadasLeitura', {
                idleitura: Number(idleitura)
            });

            const leituraAtualizada = response?.data || null;

            if (!leituraAtualizada?.IDLEITURA) {
                setRegistroSelecionado(null);
                setDetalhesLeitura([]);
                toast.info(`A importação #${idleitura} não foi encontrada.`);
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
            toast.error(error.response?.data?.message || 'Erro ao carregar os detalhes da importação.');
            return null;
        } finally {
            setDetalhesLoading(false);
        }
    };

    const atualizarDadosLeituraAtual = async (idleitura) => {
        if (!idleitura) {
            return null;
        }

        const lista = await carregarHistorico(searchTerm.trim());
        const leituraAtualizada = lista.find((item) => String(item?.IDLEITURA) === String(idleitura));

        if (!leituraAtualizada) {
            return null;
        }

        const itensAtualizados = Array.isArray(leituraAtualizada?.itens) ? leituraAtualizada.itens : [];
        const errosCadastroBancario = gerarErrosCadastroBancario(itensAtualizados);
        const divergenciasRemessa = gerarErrosRemessa(itensAtualizados, leituraAtualizada?.ALERTAS_REMESSA || leituraAtualizada?.alertasRemessa || []);

        setDados(itensAtualizados);
        setTotalErrosRetorno(Number(leituraAtualizada?.TOTAL_ERROS || 0));
        setErros((prev) => {
            const errosFixos = Array.isArray(prev)
                ? prev.filter((mensagem) => {
                    const texto = String(mensagem || '');
                    return !texto.startsWith('Remessa:')
                        && !texto.startsWith('Cadastro bancário:')
                        && !texto.startsWith('Atualização bancária disponível:');
                })
                : [];

            return [...new Set([...errosFixos, ...errosCadastroBancario, ...divergenciasRemessa])];
        });

        if (String(registroSelecionado?.IDLEITURA || '') === String(idleitura)) {
            const detalhesAtualizados = await carregarDetalhesImportacao(idleitura);

            if (!detalhesAtualizados?.IDLEITURA) {
                setRegistroSelecionado(leituraAtualizada);
                setDetalhesLeitura(itensAtualizados);
            }
        }

        return leituraAtualizada;
    };

    const uploadArquivoRemessa = async (file, idleitura) => {
        if (!file || !idleitura) {
            setArquivoRemessaSalvo(false);
            return [];
        }

        setUploadRemessaLoading(true);
        setArquivoRemessaSalvo(false);

        try {
            const { data: arquivosExistentesResponse } = await api.get('/v1/listarArquivos', {
                params: {
                    id_rotina: ID_ROTINA_IMPORTACAO_REMESSA,
                    id_relacional: idleitura,
                    id_grupo_empresa: localStorage.getItem('id_grupo_empresa')
                }
            });

            const arquivosExistentes = normalizarArquivosRetorno(arquivosExistentesResponse);

            await Promise.allSettled(
                arquivosExistentes
                    .filter((arquivo) => arquivo?.id_arquivo)
                    .map((arquivo) => api.delete(`/v1/excluirArquivo/${arquivo.id_arquivo}`))
            );

            const formData = new FormData();
            formData.append('files', file);
            formData.append('id_rotina', ID_ROTINA_IMPORTACAO_REMESSA);
            formData.append('id_relacional', String(idleitura));
            formData.append('id_grupo_empresa', localStorage.getItem('id_grupo_empresa') || '');

            const response = await api.post('/v1/uploadArquivo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const arquivos = normalizarArquivosRetorno(response.data);
            setArquivoRemessaSalvo(true);

            if (String(registroSelecionado?.IDLEITURA) === String(idleitura)) {
                setArquivosRemessaDetalhe(arquivos);
            }

            await atualizarDadosLeituraAtual(idleitura);

            toast.success('Arquivo de remessa salvo com sucesso.');
            return arquivos;
        } catch (error) {
            setArquivoRemessaSalvo(false);
            toast.error(error.response?.data?.error || 'Erro ao salvar o arquivo de remessa.');
            return [];
        } finally {
            setUploadRemessaLoading(false);
        }
    };

    const nomeUsuarioEnvio = localStorage.getItem('nome') || '-';
    const totalPreAnalise = dados.reduce((total, item) => {
        const valorStr = item.VALOR?.toString() || '0';
        const valor = parseFloat(valorStr.replace(',', '.') || 0);
        return total + (isNaN(valor) ? 0 : valor);
    }, 0);
    const idImportacaoPreAnalise = dados[0]?.IDLEITURA || '-';
    const totalErrosPreAnalise = Number(totalErrosRetorno || erros.length || 0);
    const statusPreAnalise = preAnaliseLoading
        ? 'PRÉ-ANALISANDO'
        : totalErrosPreAnalise > 0
            ? 'ARQUIVO COM ERROS'
            : dados.length > 0
                ? 'PRÉ-ANÁLISE CONCLUÍDA'
                : arquivo
                    ? 'ARQUIVO SELECIONADO'
                    : 'AGUARDANDO ARQUIVO';

    const resumoHistorico = consultaHistorico.reduce((acc, item) => {
        acc.totalRegistros += Number(item?.QTD_REGISTROS || 0);
        acc.totalValor += Number(item?.TOTAL_VALOR || 0);
        acc.totalErros += Number(item?.TOTAL_ERROS || 0);
        return acc;
    }, { totalRegistros: 0, totalValor: 0, totalErros: 0 });

    const historicoOrdenado = [...consultaHistorico].sort((a, b) => {
        const valorA = a?.[sortBy] ?? '';
        const valorB = b?.[sortBy] ?? '';

        if (sortBy === 'DATAENV') {
            const dataA = new Date(valorA).getTime() || 0;
            const dataB = new Date(valorB).getTime() || 0;
            return sortOrder === 'asc' ? dataA - dataB : dataB - dataA;
        }

        const numeroA = Number(valorA);
        const numeroB = Number(valorB);
        const ambosNumericos = !Number.isNaN(numeroA) && !Number.isNaN(numeroB);

        if (ambosNumericos) {
            return sortOrder === 'asc' ? numeroA - numeroB : numeroB - numeroA;
        }

        const textoA = String(valorA).toLowerCase();
        const textoB = String(valorB).toLowerCase();
        return sortOrder === 'asc'
            ? textoA.localeCompare(textoB)
            : textoB.localeCompare(textoA);
    });

    const historicoFiltrado = historicoOrdenado;

    const normalizarStatusSolicitacao = (status) => String(status || '').trim().toUpperCase();

    const getItensImportacao = (registro) => {
        if (Array.isArray(registro?.itens)) {
            return registro.itens;
        }

        return [];
    };

    const importacaoPossuiBloqueioPosFinanceiro = (registro) => (
        String(registro?.POSSUI_BLOQUEIO_EDICAO || '').toUpperCase() === 'S'
        || getItensImportacao(registro).some((item) => ['F', 'I'].includes(normalizarStatusSolicitacao(item?.STATUS_SOLICITACAO ?? item?.status)))
    );

    const importacaoPendenteFinanceiro = (registro) => (
        String(registro?.POSSUI_PENDENCIA_FINANCEIRA || '').toUpperCase() === 'S'
        || getItensImportacao(registro).some((item) => normalizarStatusSolicitacao(item?.STATUS_SOLICITACAO ?? item?.status) === 'L')
    );

    const getMensagemBloqueioImportacao = (registro) => {
        if (!registro) {
            return '';
        }

        if (importacaoPossuiBloqueioPosFinanceiro(registro)) {
            return 'Este lote já foi enviado pelo financeiro para o ERP e não pode mais ser alterado ou excluído.';
        }

        if (importacaoPendenteFinanceiro(registro)) {
            return 'Este lote está pendente do financeiro e só pode ser tratado na tela de conformidade.';
        }

        return '';
    };

    const mensagemBloqueioPreAnaliseAtual = getMensagemBloqueioImportacao({ IDLEITURA: idImportacaoPreAnalise, itens: dados });
    const mensagemBloqueioDetalheAtual = getMensagemBloqueioImportacao(registroSelecionado);
    const possuiArquivoRemessaPreAnalise = arquivoRemessaSalvo;
    const possuiArquivoRemessaDetalhe = arquivosRemessaDetalhe.length > 0;
    const mensagemBloqueioRemessaPreAnalise = !possuiArquivoRemessaPreAnalise
        ? 'O processamento só será liberado após o envio do arquivo de remessa de pagamento.'
        : '';
    const mensagemBloqueioRemessaDetalhe = !registroSelecionado
        ? ''
        : arquivoRemessaLoading
            ? 'Aguardando carregamento do arquivo de remessa de pagamento.'
            : !possuiArquivoRemessaDetalhe
                ? 'O processamento só será liberado quando existir arquivo de remessa de pagamento vinculado a esta leitura.'
                : '';
    const mensagemBloqueioProcessamentoPreAnalise = mensagemBloqueioPreAnaliseAtual || mensagemBloqueioRemessaPreAnalise;
    const mensagemBloqueioProcessamentoDetalhe = mensagemBloqueioDetalheAtual || mensagemBloqueioRemessaDetalhe;

    const podeProcessarImportacao = !!arquivo
        && dados.length > 0
        && totalErrosPreAnalise === 0
        && !preAnaliseLoading
        && !uploadRemessaLoading
        && !mensagemBloqueioProcessamentoPreAnalise;
    const podeExcluirImportacaoPreAnalise = idImportacaoPreAnalise !== '-' && !preAnaliseLoading && !mensagemBloqueioPreAnaliseAtual;
    const statusProcessamentoSelecionado = String(registroSelecionado?.STATUS_PROCESSAMENTO || '').toUpperCase();
    const podeProcessarDetalhamento = !!registroSelecionado
        && Number(registroSelecionado?.QTD_REGISTROS || 0) > 0
        && Number(registroSelecionado?.TOTAL_ERROS || 0) === 0
        && statusProcessamentoSelecionado !== 'PROCESSADO'
        && !mensagemBloqueioProcessamentoDetalhe;
    const podeExcluirImportacaoDetalhe = !!registroSelecionado && !mensagemBloqueioDetalheAtual;
    const totalDetalhesLeitura = detalhesLeitura.reduce((total, item) => {
        const valor = parseFloat((item?.VALOR ?? 0).toString().replace(',', '.'));
        return total + (Number.isNaN(valor) ? 0 : valor);
    }, 0);
    const totalItensProcessadosDetalhe = Number(
        registroSelecionado?.QTD_PROCESSADOS
        ?? detalhesLeitura.filter((item) => !!item?.NUMSOLICITACAO).length
        ?? 0
    );
    const responsaveisImportacao = (() => {
        const nomesOrdenador = [...new Set([
            registroSelecionado?.NOME_ORDENADOR,
            registroSelecionado?.ORDENADOR,
            ...detalhesLeitura.map((item) => item?.NOME_ORDENADOR || item?.ORDENADOR)
        ].map((valor) => String(valor || '').trim()).filter(Boolean))];

        const datasOrdenador = [
            registroSelecionado?.DATAHORAORDENADOR,
            ...detalhesLeitura.map((item) => item?.DATAHORAORDENADOR)
        ].filter(Boolean);

        const nomesFinanceiro = [...new Set([
            registroSelecionado?.NOME_FINANCEIRO,
            ...detalhesLeitura.map((item) => item?.NOME_FINANCEIRO)
        ].map((valor) => String(valor || '').trim()).filter(Boolean))];

        const datasFinanceiro = [
            registroSelecionado?.DATAHORAFINANCEIRO,
            ...detalhesLeitura.map((item) => item?.DATAHORAFINANCEIRO)
        ].filter(Boolean);

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
    })();

    const handleExcluirLeitura = async (idleituraParam) => {
        const idleituraInformada = ['string', 'number'].includes(typeof idleituraParam) ? idleituraParam : null;
        const idleitura = idleituraInformada || registroSelecionado?.IDLEITURA || dados[0]?.IDLEITURA;

        if (!idleitura) {
            toast.info('Nenhuma importação selecionada para exclusão.');
            return;
        }

        const registroBase = registroSelecionado?.IDLEITURA === idleitura
            ? registroSelecionado
            : { IDLEITURA: idleitura, itens: dados };
        const mensagemBloqueio = getMensagemBloqueioImportacao(registroBase);

        if (mensagemBloqueio) {
            toast.warning(mensagemBloqueio);
            return;
        }

        const resultado = await Swal.fire({
            title: 'Excluir importação?',
            text: `Deseja realmente excluir a importação #${idleitura}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        });

        if (!resultado.isConfirmed) {
            return;
        }

        setExcluindo(true);
        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/deletePreAnalise', {
                idleitura
            });

            const retorno = response.data;
            toast.success(`Importação #${retorno?.idleitura || idleitura} excluída com sucesso. Registros excluídos: ${retorno?.registrosExcluidos || 0}. Solicitações excluídas: ${retorno?.solicitacoesExcluidas || 0}.`);
            carregarHistorico(searchTerm.trim());
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao excluir a importação selecionada.');
        } finally {
            setExcluindo(false);
        }
    };

    const handleConsultarHistorico = () => {
        if (!dataInicial || !dataFinal) {
            toast.warning('Informe a data inicial e a data final para consultar.');
            return;
        }

        const filtro = searchTerm.trim();

        if (filtro.length > 0 && filtro.length <= 3) {
            toast.warning('Quando informar filtro, digite mais de 3 caracteres.');
            return;
        }

        carregarHistorico(filtro);
    };

    const handleRefreshDetalhes = async () => {
        const idleitura = registroSelecionado?.IDLEITURA;

        if (!idleitura) {
            toast.info('Nenhuma importação selecionada para atualização.');
            return;
        }

        setRefreshingDetalhes(true);
        try {
            await carregarHistorico(searchTerm.trim());
            await carregarDetalhesImportacao(idleitura);
            await carregarArquivosRemessa(idleitura);
            toast.success(`Importação #${idleitura} atualizada.`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar os dados da importação.');
        } finally {
            setRefreshingDetalhes(false);
        }
    };

    const handleSort = (campo) => {
        if (sortBy === campo) {
            setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(campo);
            setSortOrder('desc');
        }
    };

    const openModal = () => {
        setModalTipo('importacao');
        setRegistroSelecionado(null);
        setDetalhesLeitura([]);
        setDetalhesLoading(false);
        setErros([]);
        setDados([]);
        setArquivo(null);
        setArquivoRemessa(null);
        setDescricao('');
        setTotalErrosRetorno(0);
        setArquivosRemessaDetalhe([]);
        setArquivoRemessaLoading(false);
        setUploadRemessaLoading(false);
        setArquivoRemessaSalvo(false);
        setRateioPorSolicitacao({});
        setRateioCarregandoPorSolicitacao({});
        setIsModalOpen(true);
    };

    const openDetalheModal = (item) => {
        setModalTipo('detalhe');
        setRegistroSelecionado(item);
        setDetalhesLeitura(Array.isArray(item?.itens) ? item.itens : []);
        setDetalhesLoading(true);
        setArquivosRemessaDetalhe([]);
        setRateioPorSolicitacao({});
        setRateioCarregandoPorSolicitacao({});
        setArquivoRemessaSalvo(Array.isArray(item?.arquivosRemessa) && item.arquivosRemessa.length > 0);
        setIsModalOpen(true);
        carregarDetalhesImportacao(item?.IDLEITURA);
        carregarArquivosRemessa(item?.IDLEITURA);
    };
    const closeModal = async () => {
        setIsModalOpen(false);
        setModalTipo('importacao');
        setRegistroSelecionado(null);
        setDetalhesLeitura([]);
        setDetalhesLoading(false);
        setErros([]);
        setDados([]);
        setArquivo(null);
        setArquivoRemessa(null);
        setDescricao('');
        setTotalErrosRetorno(0);
        setArquivosRemessaDetalhe([]);
        setArquivoRemessaLoading(false);
        setUploadRemessaLoading(false);
        setArquivoRemessaSalvo(false);
        setRateioPorSolicitacao({});
        setRateioCarregandoPorSolicitacao({});

        if (dataInicial && dataFinal) {
            await carregarHistorico(searchTerm.trim());
        }
    };

    const excluirPreAnaliseAtual = async (idleitura) => {
        if (!idleitura) {
            return;
        }

        await api.post('/v1/solicitacaoDespesa/importa/deletePreAnalise', {
            idleitura
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];

        if (file && (file.type === "text/plain" || file.name.toLowerCase().endsWith('.txt'))) {
            const idleituraAnterior = dados[0]?.IDLEITURA || null;

            if (idleituraAnterior) {
                try {
                    await excluirPreAnaliseAtual(idleituraAnterior);
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Não foi possível excluir a leitura anterior antes de importar o novo arquivo.');
                    return;
                }
            }

            setArquivo(file);
            setErros([]);
            setDados([]);
            setTotalErrosRetorno(0);
            setArquivoRemessa(null);
            setArquivoRemessaSalvo(false);
            setArquivosRemessaDetalhe([]);
            lerArquivo(file);
        } else {
            setArquivo(null);
            setDados([]);
            setErros(['Selecione um arquivo válido no formato .txt.']);
            setTotalErrosRetorno(1);
            setArquivoRemessaSalvo(false);
            toast.warning('Por favor, selecione um arquivo .txt.');
        }
    };

    const handleArquivoRemessaChange = async (e) => {
        const file = e.target.files[0];

        if (file && /\.(txt|rem|ret)$/i.test(file.name)) {
            setArquivoRemessa(file);
            setArquivoRemessaSalvo(false);

            const idleituraAtual = registroSelecionado?.IDLEITURA || dados[0]?.IDLEITURA;
            if (idleituraAtual) {
                await uploadArquivoRemessa(file, idleituraAtual);
            }
        } else {
            setArquivoRemessa(null);
            setArquivoRemessaSalvo(false);
            toast.warning('Por favor, selecione um arquivo de remessa válido (.txt, .rem ou .ret).');
        }
    };

    const lerArquivo = (file) => {
        const reader = new FileReader();
        reader.onerror = () => {
            setDados([]);
            setErros(['Erro ao ler o arquivo selecionado.']);
            setTotalErrosRetorno(1);
            setPreAnaliseLoading(false);
        };
        reader.onload = async (e) => {
            const texto = e.target.result;
            const linhas = texto.split('\n').filter(linha => linha.trim() !== '');
            const errosValidacao = [];
            const dadosParseados = [];

            linhas.forEach((linha, index) => {
                const valores = linha.split(';');
                const registro = {
                    cnpj_filial: valores[0] ? valores[0].trim() : '',
                    cpf_funcionario: valores[1] ? valores[1].trim() : '',
                    valor: valores[2] ? valores[2].trim() : '',
                    conta: valores[3] ? valores[3].trim() : '',
                    datalancamento: valores[4] ? valores[4].trim() : '',
                    datapagamento: valores[5] ? valores[5].trim() : '',
                    datageracao: valores[6] ? valores[6].trim() : '',
                    historico: valores[7] ? valores[7].trim() : '',
                    id_item: valores[8] ? valores[8].trim() : '',
                    id_usuarioenv: localStorage.getItem('id_usuario'),
                    descricaoenv: descricao.trim()
                };

                // Validações locais
                const campos = ['cnpj_filial', 'cpf_funcionario', 'valor', 'conta', 'datalancamento', 'datapagamento', 'datageracao', 'historico', 'id_item'];
                campos.forEach(campo => {
                    if (!registro[campo]) {
                        errosValidacao.push(`Linha ${index + 1}: Campo '${campo}' é obrigatório.`);
                    }
                });
                if (registro.valor && isNaN(parseFloat(registro.valor.replace(',', '.')))) {
                    errosValidacao.push(`Linha ${index + 1}: Campo 'valor' deve ser numérico.`);
                }
                if (registro.id_item && !/^\d+$/.test(registro.id_item)) {
                    errosValidacao.push(`Linha ${index + 1}: Campo 'id_item' deve ser numérico.`);
                }
                const camposData = ['datalancamento', 'datapagamento', 'datageracao'];
                camposData.forEach(campo => {
                    if (registro[campo] && !/^\d{8}$/.test(registro[campo])) {
                        errosValidacao.push(`Linha ${index + 1}: Campo '${campo}' deve estar no formato DDMMYYYY (8 dígitos sem barras).`);
                    }
                });

                const erroPorLinha = errosValidacao.filter(e => e.startsWith(`Linha ${index + 1}`));
                if (erroPorLinha.length === 0) {
                    dadosParseados.push(registro);
                }
            });

            setErros(errosValidacao);
            setTotalErrosRetorno(errosValidacao.length);
            if (errosValidacao.length > 0) {
                setDados([]);
                return;
            }

            setPreAnaliseLoading(true);
            try {
                const response = await api.post('/v1/solicitacaoDespesa/importa/preanalise', { dados: dadosParseados });
                const retorno = response.data;
                const gruposPreAnalise = Array.isArray(retorno?.dados)
                    ? retorno.dados
                    : Array.isArray(retorno)
                        ? retorno
                        : [];
                const itensPreAnalise = gruposPreAnalise.flatMap((grupo) => Array.isArray(grupo?.itens) ? grupo.itens : []);
                const totalErrosApi = Number(
                    retorno?.totalErros
                    ?? gruposPreAnalise.reduce((total, grupo) => total + Number(grupo?.TOTAL_ERROS || 0), 0)
                    ?? 0
                );

                setTotalErrosRetorno(totalErrosApi);

                const dadosPreAnalise = itensPreAnalise.length > 0
                    ? itensPreAnalise
                    : (Array.isArray(retorno?.dados) ? retorno.dados : Array.isArray(retorno) ? retorno : []);

                const errosCadastroBancario = gerarErrosCadastroBancario(dadosPreAnalise);
                const divergenciasRemessa = gerarErrosRemessa(dadosPreAnalise, retorno?.alertasRemessa || []);

                const errosBackend = Array.isArray(retorno?.erros)
                    ? retorno.erros.map((erro) => `Pré-análise: ${erro}`)
                    : [];

                setErros([...new Set([...errosBackend, ...errosCadastroBancario, ...divergenciasRemessa])]);
                setDados(dadosPreAnalise);

                const idleituraGerada = retorno?.idleitura
                    ?? itensPreAnalise[0]?.IDLEITURA
                    ?? gruposPreAnalise[0]?.IDLEITURA
                    ?? null;

                if (arquivoRemessa && idleituraGerada) {
                    await uploadArquivoRemessa(arquivoRemessa, idleituraGerada);
                }
            } catch (error) {
                setErros([`Erro na pré-análise: ${error.message}`]);
                setTotalErrosRetorno(1);
                setDados([]);
            } finally {
                setPreAnaliseLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const processarDespesas = async (idleituraParam) => {
        const idleitura = idleituraParam || registroSelecionado?.IDLEITURA || dados[0]?.IDLEITURA;
        const mensagemBloqueioProcessamento = modalTipo === 'detalhe'
            ? mensagemBloqueioProcessamentoDetalhe
            : mensagemBloqueioProcessamentoPreAnalise;

        if (!idleitura) {
            toast.warning('Nenhum ID de leitura selecionado para processar.');
            return;
        }

        if (mensagemBloqueioProcessamento) {
            toast.warning(mensagemBloqueioProcessamento);
            return;
        }

        const confirmacao = await Swal.fire({
            title: 'Processar despesas?',
            text: `Deseja processar a leitura #${idleitura} e gerar a solicitação de despesa?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, processar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#198754'
        });

        if (!confirmacao.isConfirmed) {
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/v1/solicitacaoDespesa/importa/processarDespesas', {
                idleitura: Number(idleitura)
            });

            const retorno = response.data || {};
            const numerosGerados = Array.isArray(retorno?.numsolicitacoes) ? retorno.numsolicitacoes : [];
            const totalGerado = Number(retorno?.solicitacoesGeradas || numerosGerados.length || 0);

            if (totalGerado > 1) {
                toast.success(`Leitura #${retorno.idleitura || idleitura} processada com sucesso. ${totalGerado} solicitações foram geradas.`);
            } else {
                toast.success(`Leitura #${retorno.idleitura || idleitura} processada com sucesso. Solicitação gerada: ${retorno.numsolicitacao || '-'}.`);
            }

            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao processar despesas da leitura selecionada.');
        } finally {
            setLoading(false);
        }

    };

    return (<>
        <Menu />
        <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-3">
                <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                    <div>
                        <h1 className="mb-1 titulo-da-pagina">Importação de Despesa</h1>
                        <p className="text-muted mb-0">Pesquise os arquivos enviados e abra a importação em um modal.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>Nova Importação</button>
                </div>
            </div>

            <div className="row mb-4 align-items-end g-3 importacao-filtros">
                <div className="col-md-2 importacao-data-col">
                    <label className="form-label">Data Inicial</label>
                    <input
                        type="date"
                        className="form-control"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                    />
                    <small className="text-muted">Informe a data inicial do envio.</small>
                </div>
                <div className="col-md-2 importacao-data-col">
                    <label className="form-label">Data Final</label>
                    <input
                        type="date"
                        className="form-control"
                        value={dataFinal}
                        onChange={(e) => setDataFinal(e.target.value)}
                    />
                    <small className="text-muted">Informe a data final do envio.</small>
                </div>
                <div className="col-md-5 importacao-data-col">
                    <label className="form-label">Filtro</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Usuário, descrição, ID ou data"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                    />
                    <small className="text-muted">Busca automática. Se informar filtro, use mais de 3 caracteres.</small>
                </div>
                <div className="col-md-2 importacao-data-col">
                    <label className="form-label">Total</label>
                    <input
                        type="text"
                        className="form-control"
                        value={loadingHistorico ? 'Carregando...' : consultaHistorico.length}
                        disabled
                        readOnly
                    />
                    <small className="text-muted">Quantidade de registros encontrados.</small>
                </div>
                <div className="col-md-1 importacao-data-col">
                    <label className="form-label d-block">&nbsp;</label>
                    <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={handleConsultarHistorico}
                        disabled={loadingHistorico || !dataInicial || !dataFinal}
                    >
                        {loadingHistorico ? 'Consultando...' : 'Consultar'}
                    </button>
                    <small className="text-muted d-block">&nbsp;</small>
                </div>
            </div>


            <div className="row">
                <div className="col-12">
                    {!dataInicial || !dataFinal ? (
                        <div className="alert alert-warning">Informe a data inicial e a data final para consultar.</div>
                    ) : !historicoConsultado ? (
                        <div className="alert alert-secondary">Informe os filtros desejados e clique em consultar.</div>
                    ) : loadingHistorico ? (
                        <div className="alert alert-info">Carregando histórico de importações...</div>
                    ) : searchTerm.trim().length > 0 && searchTerm.trim().length <= 3 ? (
                        <div className="alert alert-warning">Quando informar filtro, digite mais de 3 caracteres.</div>
                    ) : consultaHistorico.length === 0 ? (
                        <div className="alert alert-secondary">Nenhuma importação encontrada para o período informado.</div>
                    ) : historicoFiltrado.length === 0 ? (
                        <div className="alert alert-warning">Nenhuma importação corresponde à pesquisa.</div>
                    ) : (
                        <div className="table-responsive mb-4 tabela-importacao-wrapper">
                            <table className="table table-hover table-striped align-middle tabela-importacao-historico">
                                <thead className="Titulos-Table">
                                    <tr>
                                        <th className="col-id" style={{ cursor: 'pointer' }} onClick={() => handleSort('IDLEITURA')}>
                                            ID {sortBy === 'IDLEITURA' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-start col-numero" style={{ cursor: 'pointer' }} onClick={() => handleSort('QTD_REGISTROS')}>
                                            Registros {sortBy === 'QTD_REGISTROS' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="col-usuario" style={{ cursor: 'pointer' }} onClick={() => handleSort('USUARIOENV')}>
                                            Usuário de Envio {sortBy === 'USUARIOENV' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="col-descricao" style={{ cursor: 'pointer' }} onClick={() => handleSort('DESCRICAOENV')}>
                                            Descrição {sortBy === 'DESCRICAOENV' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>                                        
                                        <th className="text-end col-valor" style={{ cursor: 'pointer' }} onClick={() => handleSort('TOTAL_VALOR')}>
                                            Total {sortBy === 'TOTAL_VALOR' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="col-data" style={{ cursor: 'pointer' }} onClick={() => handleSort('DATAENV')}>
                                            Data {sortBy === 'DATAENV' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center" style={{ cursor: 'pointer' }} onClick={() => handleSort('STATUS_PROCESSAMENTO')}>
                                            Status {sortBy === 'STATUS_PROCESSAMENTO' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center col-numero" style={{ cursor: 'pointer' }} onClick={() => handleSort('TOTAL_ERROS')}>
                                            Erros {sortBy === 'TOTAL_ERROS' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center col-percentual" style={{ cursor: 'pointer' }} onClick={() => handleSort('PERCENTUAL_ERRO')}>
                                            % Erro {sortBy === 'PERCENTUAL_ERRO' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historicoFiltrado.map((item, index) => (
                                        <tr
                                            key={item.IDLEITURA || index}
                                            className="linha-detalhe-importacao"
                                            onClick={() => openDetalheModal(item)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    openDetalheModal(item);
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            title={`Abrir detalhes da leitura ${item.IDLEITURA}`}
                                        >
                                            <td className="fw-semibold">{item.IDLEITURA}</td>
                                            <td className="text-start">{Number(item.QTD_REGISTROS || 0)}</td>
                                            <td>{item.USUARIOENV || '-'}</td>
                                            <td className="col-descricao-texto">{item.DESCRICAOENV || '-'}</td>                                            
                                            <td className="text-end fw-semibold">{formatCurrency(item.TOTAL_VALOR)}</td>
                                            <td>{formatDateTime(item.DATAENV)}</td>
                                            <td className="text-center">
                                                <span className={`badge rounded-pill ${String(item.STATUS_PROCESSAMENTO || 'PENDENTE').toUpperCase() === 'PROCESSADO' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                    {String(item.STATUS_PROCESSAMENTO || 'PENDENTE').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={`text-center fw-semibold ${Number(item.TOTAL_ERROS || 0) > 0 ? 'table-danger' : ''}`}>{Number(item.TOTAL_ERROS || 0)}</td>
                                            <td className="text-center percentual-celula">
                                                <div
                                                    className={`percentual-erro-badge ${Number(item.PERCENTUAL_ERRO || 0) === 0 ? 'sem-erro' : Number(item.PERCENTUAL_ERRO || 0) > 10 ? 'erro-alto' : 'erro-medio'}`}
                                                    style={{
                                                        background: Number(item.PERCENTUAL_ERRO || 0) === 0
                                                            ? '#d1e7dd'
                                                            : `linear-gradient(to right, ${Number(item.PERCENTUAL_ERRO || 0) > 10 ? '#f8d7da' : '#fff3cd'} ${Math.min(Number(item.PERCENTUAL_ERRO || 0), 100)}%, rgba(255,255,255,0.9) ${Math.min(Number(item.PERCENTUAL_ERRO || 0), 100)}%)`
                                                    }}
                                                >
                                                    {formatPercent(item.PERCENTUAL_ERRO)}
                                                </div>
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

        {isModalOpen && (
            <div className="modal-overlay-importacao">
                <div className="modal-content-importacao" ref={modalContentRef}>
                    <div className="importacao-modal-header d-flex justify-content-between align-items-center">
                        <div>
                            <h4 className="mb-1">
                                {modalTipo === 'detalhe'
                                    ? `Detalhes da Importação #${registroSelecionado?.IDLEITURA ?? ''}`
                                    : 'Importação de Despesa'}
                            </h4>
                            <p className="mb-0 text-muted">
                                {modalTipo === 'detalhe'
                                    ? 'Visualize o resumo da leitura selecionada e prepare a consulta dos itens por ID.'
                                    : 'Preencha a descrição e selecione o arquivo .txt.'}
                            </p>
                        </div>
                        <button className="btn btn-outline-secondary" onClick={closeModal}>Fechar</button>
                    </div>

                    <div className="importacao-modal-body">

                    {modalTipo === 'detalhe' ? (
                        <>
                            <div className={`alert mb-3 ${Number(registroSelecionado?.TOTAL_ERROS || 0) > 0 ? 'alert-danger' : 'alert-primary'}`}>
                                {detalhesLeitura.length > 0 ? (
                                    <>
                                        Foram encontrados <strong>{detalhesLeitura.length}</strong> item(ns) para a leitura <strong>#{registroSelecionado?.IDLEITURA}</strong>, com <strong>{Number(registroSelecionado?.TOTAL_ERROS || 0)}</strong> erro(s).
                                    </>
                                ) : (
                                    <>
                                        Nenhum item foi retornado para a leitura <strong>#{registroSelecionado?.IDLEITURA}</strong>. Quantidade de erros: <strong>{Number(registroSelecionado?.TOTAL_ERROS || 0)}</strong>.
                                    </>
                                )}
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>ID Leitura</span>
                                        <strong>{registroSelecionado?.IDLEITURA ?? '-'}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Registros</span>
                                        <strong>{Number(registroSelecionado?.QTD_REGISTROS || 0)}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Processados</span>
                                        <strong>{totalItensProcessadosDetalhe}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Status</span>
                                        <strong>{String(registroSelecionado?.STATUS_PROCESSAMENTO || 'PENDENTE').toUpperCase()}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Usuário de Envio</span>
                                        <strong>{registroSelecionado?.USUARIOENV || '-'}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Data do Envio</span>
                                        <strong>{formatDateTime(registroSelecionado?.DATAENV)}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className="detalhe-importacao-card">
                                        <span>Total</span>
                                        <strong>{formatCurrency(registroSelecionado?.TOTAL_VALOR)}</strong>
                                    </div>
                                </div>
                                <div className="col-lg-3 col-md-6">
                                    <div className={`detalhe-importacao-card ${Number(registroSelecionado?.TOTAL_ERROS || 0) > 0 ? 'card-erro' : ''}`}>
                                        <span>Erros</span>
                                        <strong>{Number(registroSelecionado?.TOTAL_ERROS || 0)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-lg-6 col-md-6 col-12">
                                    <div className="detalhe-importacao-card">
                                        <span>Quem ordenou</span>
                                        <strong>{responsaveisImportacao.nomeOrdenador}</strong>
                                        {responsaveisImportacao.dataOrdenador && (
                                            <small className="text-muted d-block mt-1">Data/Hora: {formatDateTime(responsaveisImportacao.dataOrdenador)}</small>
                                        )}
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-6 col-12">
                                    <div className="detalhe-importacao-card">
                                        <span>Quem liberou no financeiro</span>
                                        <strong>{responsaveisImportacao.nomeFinanceiro}</strong>
                                        {responsaveisImportacao.dataFinanceiro && (
                                            <small className="text-muted d-block mt-1">Data/Hora: {formatDateTime(responsaveisImportacao.dataFinanceiro)}</small>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-12">
                                    <div className="detalhe-importacao-card">
                                        <span>Descrição</span>
                                        <strong>{registroSelecionado?.DESCRICAOENV || '-'}</strong>
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
                                                        <div className="d-flex gap-2 flex-wrap">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => baixarArquivoRemessa(arquivoItem)}
                                                            >
                                                                Baixar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <strong>Nenhum arquivo de remessa salvo para esta importação.</strong>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-12">
                                    <h5 className="mb-3">Itens da leitura</h5>
                                    <div className="table-responsive tabela-importacao-wrapper">
                                        <table className="table table-sm table-hover mb-0 tabela-importacao-linha-unica">
                                            <thead className="Titulos-Table">
                                                <tr>
                                                    <th>Filial / CNPJ</th>
                                                    <th>Funcionário / CPF</th>
                                                    <th>Dados Bancários</th>
                                                    <th>Conta</th>
                                                    <th>Item</th>
                                                    <th>Histórico</th>
                                                    <th>Centros de Custo</th>
                                                    <th className="text-center">Remessa</th>
                                                    <th className="text-end">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detalhesLoading ? (
                                                    <tr>
                                                        <td colSpan="8" className="text-center py-4">Carregando detalhes...</td>
                                                    </tr>
                                                ) : detalhesLeitura.length > 0 ? (
                                                    detalhesLeitura.map((detalhe, index) => (
                                                        <tr key={`${detalhe.IDLEITURA || 'item'}-${index}`}>
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
                                                                </div>
                                                            </td>
                                                            <td
                                                                className={getClasseCampoCadastro(detalhe, ['ID_BANCO', 'BANCO', 'AGENCIA', 'CONTABANCARIA', 'OPERACAO', 'ID_FORMADEPAGAMENTO'], possuiAtualizacaoBancariaPorRemessa(detalhe) ? 'remessa-campo-divergente' : '')}
                                                                title={[
                                                                    getTooltipCampoCadastro(detalhe, ['ID_BANCO', 'BANCO'], 'Banco não encontrado no cadastro do funcionário.'),
                                                                    getTooltipCampoCadastro(detalhe, 'AGENCIA', 'Agência não encontrada no cadastro do funcionário.'),
                                                                    getTooltipCampoCadastro(detalhe, ['CONTABANCARIA', 'OPERACAO'], 'Conta bancária ou operação não encontrada no cadastro do funcionário.'),
                                                                    getTooltipCampoCadastro(detalhe, 'ID_FORMADEPAGAMENTO', 'Forma de pagamento da remessa não vinculada em BSTAB_FORMADEPAGAMENTO.'),
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
                                                                    <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                        <strong>Forma Pgto:</strong>
                                                                        <span>
                                                                            {detalhe.ID_FORMADEPAGAMENTO
                                                                                ? `${detalhe.ID_FORMADEPAGAMENTO}${detalhe.FORMADEPAGAMENTO ? ` - ${detalhe.FORMADEPAGAMENTO}` : ''}`
                                                                                : 'Não vinculada'}
                                                                        </span>
                                                                        {renderIndicadorCampoCadastro(detalhe, 'ID_FORMADEPAGAMENTO', 'Forma de pagamento da remessa não vinculada em BSTAB_FORMADEPAGAMENTO.')}
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
                                                            <td className={getCentrosDeCustoItem(detalhe).length === 0 ? 'table-danger' : ''}>
                                                                {centroDeCustoRateioCarregando(detalhe)
                                                                    ? <span className="text-muted">Carregando rateio...</span>
                                                                    : getCentrosDeCustoItem(detalhe).length > 0
                                                                        ? getCentrosDeCustoItem(detalhe).map((centro, i) => (
                                                                            <div key={i} className="item-dado-secundario">{centro}</div>
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
                                                        <td colSpan="8" className="text-center text-muted py-4">
                                                            Nenhum item encontrado para esta leitura.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="table-secondary">
                                                    <td className="fw-bold">{detalhesLeitura.length} itens</td>
                                                    <td colSpan="7" className="text-end fw-bold">Total:</td>
                                                    <td className="fw-bold text-end">{formatCurrency(totalDetalhesLeitura)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                    {arquivo && !preAnaliseLoading && (dados.length > 0 || totalErrosPreAnalise > 0) && (
                        <div className={`alert mb-3 ${totalErrosPreAnalise > 0 ? 'alert-danger' : 'alert-primary'}`}>
                            Foram encontrados <strong>{dados.length}</strong> item(ns) na pré-análise do arquivo <strong>{arquivo.name}</strong>, com <strong>{totalErrosPreAnalise}</strong> erro(s). Status: <strong>{statusPreAnalise}</strong>.
                        </div>
                    )}

                    <div className="row g-3 mb-3">
                        <div className="col-lg-3 col-md-6">
                            <div className="detalhe-importacao-card">
                                <span>Usuário de Envio</span>
                                <strong>{nomeUsuarioEnvio}</strong>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="detalhe-importacao-card">
                                <span>Descrição do Envio</span>
                                <strong>{descricao || '-'}</strong>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="detalhe-importacao-card">
                                <span>Arquivo de Despesa</span>
                                <strong>{arquivo?.name || 'NENHUM ARQUIVO SELECIONADO'}</strong>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="detalhe-importacao-card">
                                <span>Arquivo de Remessa</span>
                                <strong>
                                    {arquivoRemessa?.name
                                        ? `${arquivoRemessa.name}${uploadRemessaLoading ? ' - SALVANDO...' : arquivoRemessaSalvo ? ' - SALVO' : ''}`
                                        : 'NENHUM ARQUIVO SELECIONADO'}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-md-3">
                            <div className="detalhe-importacao-card">
                                <span>ID Leitura</span>
                                <strong>{idImportacaoPreAnalise}</strong>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="detalhe-importacao-card">
                                <span>Registros Válidos</span>
                                <strong>{dados.length}</strong>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="detalhe-importacao-card">
                                <span>Total da Pré-Análise</span>
                                <strong>{formatCurrency(totalPreAnalise)}</strong>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className={`detalhe-importacao-card ${totalErrosPreAnalise > 0 ? 'card-erro' : ''}`}>
                                <span>Quantidade de Erros</span>
                                <strong>{totalErrosPreAnalise}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-12">
                            <label className="form-label">Descrição do Envio:</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Descreva o envio de despesas (motivo, observações, etc.)"
                                value={descricao}
                                onChange={(e) => {
                                    if (e.target.value.length <= 200) {
                                        setDescricao(e.target.value.toUpperCase());
                                    }
                                }}
                                maxLength="200"
                            />
                            <small className="form-text text-muted">{descricao.length}/200 caracteres (mínimo 10)</small>
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-12">
                            <label className="form-label">Arquivo de Despesa:</label>
                            <div className="input-group">
                                <input
                                    disabled
                                    type="text"
                                    className="form-control"
                                    placeholder="Nenhum arquivo selecionado"
                                    value={arquivo ? arquivo.name : ''}
                                    readOnly
                                />
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    onClick={() => document.getElementById('arquivo').click()}
                                    disabled={!descricao.trim() || descricao.trim().length < 10}
                                >
                                    Buscar Despesa
                                </button>
                            </div>
                            <input
                                type="file"
                                className="d-none"
                                id="arquivo"
                                accept=".txt"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-12">
                            <label className="form-label">Arquivo de Remessa de Pagamento:</label>
                            <div className="input-group">
                                <input
                                    disabled
                                    type="text"
                                    className="form-control"
                                    placeholder="Nenhum arquivo de remessa selecionado"
                                    value={arquivoRemessa ? arquivoRemessa.name : ''}
                                    readOnly
                                />
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    onClick={() => document.getElementById('arquivoRemessa').click()}
                                    disabled={!descricao.trim() || descricao.trim().length < 10}
                                >
                                    Buscar Remessa
                                </button>
                            </div>
                            <input
                                type="file"
                                className="d-none"
                                id="arquivoRemessa"
                                accept=".txt,.rem,.ret"
                                onChange={handleArquivoRemessaChange}
                            />
                            <small className="form-text text-muted">Selecione o arquivo de remessa nos formatos .txt, .rem ou .ret.</small>
                        </div>
                    </div>

                    {preAnaliseLoading && (
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="alert alert-info">Pré-analisando o arquivo, aguarde...</div>
                            </div>
                        </div>
                    )}

                    {erros.length > 0 && (
                        <div className="row mb-3">
                            <div className="col-12">
                                <div className="alert alert-danger">
                                    Foram encontrados <strong>{totalErrosPreAnalise}</strong> erro(s) no arquivo.
                                </div>
                                <ul className="text-danger">
                                    {erros.map((erro, index) => (
                                        <li key={index}>{erro}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {dados.length > 0 && (
                        <div className="row mb-3">
                            <div className="col-12">
                                <h5 className="mb-3">Dados pré-analisados</h5>


                                <div className="table-responsive tabela-importacao-wrapper">
                                    <table className="table table-hover table-striped align-middle mb-0 tabela-importacao-linha-unica">
                                        <thead className="Titulos-Table">
                                            <tr>
                                                <th>Importação</th>
                                                <th>Filial / CNPJ</th>
                                                <th>Funcionário / CPF</th>
                                                <th>Dados Bancários</th>
                                                <th>Conta</th>
                                                <th>Item</th>
                                                <th>Histórico</th>
                                                <th>Centros de Custo</th>
                                                <th className="text-center">Remessa</th>
                                                <th className="text-end">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dados.map((item, index) => (
                                                <tr key={index}>
                                                    <td className={item.IDLEITURA && item.ID_USUARIOENV && item.USUARIOENV ? '' : 'table-danger'}>
                                                        <div className="item-dado-bloco">
                                                            <strong>{item.IDLEITURA ? `Leitura #${item.IDLEITURA}` : 'Leitura não encontrada'}</strong>
                                                            <span className="item-dado-secundario">{item.ID_USUARIOENV && item.USUARIOENV ? `${item.ID_USUARIOENV} - ${item.USUARIOENV}` : 'Usuário de envio não encontrado'}</span>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={getClasseCampoRemessa(item, 'cnpj', item.ID_ERP && item.RAZAOSOCIAL && item.CNPJ_FILIAL ? '' : 'table-danger')}
                                                        title={getTooltipCampoRemessa(item, 'cnpj', item.CNPJ_FILIAL ? '' : 'CNPJ não informado no arquivo')}
                                                    >
                                                        <div className="item-dado-bloco">
                                                            <strong>{item.ID_ERP && item.RAZAOSOCIAL ? `${item.ID_ERP} - ${item.RAZAOSOCIAL}` : 'Filial não encontrada no SGS'}</strong>
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <span>{item.CNPJ_FILIAL || 'CNPJ não informado no arquivo'}</span>
                                                                {renderIndicadorCampoRemessa(item, 'cnpj')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={getClasseCampoRemessa(item, 'cpf', item.ID_USUARIO_ERP && item.NOME && item.CPF_FUNCIONARIO ? '' : 'table-danger')}
                                                        title={getTooltipCampoRemessa(item, 'cpf', item.CPF_FUNCIONARIO ? '' : 'CPF não encontrado no SGS')}
                                                    >
                                                        <div className="item-dado-bloco">
                                                            <strong>{item.ID_USUARIO_ERP && item.NOME ? `${item.ID_USUARIO_ERP} - ${item.NOME}` : 'Funcionário não encontrado no SGS'}</strong>
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <span>{item.CPF_FUNCIONARIO || 'CPF não encontrado no SGS'}</span>
                                                                {renderIndicadorCampoRemessa(item, 'cpf')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={getClasseCampoCadastro(item, ['ID_BANCO', 'BANCO', 'AGENCIA', 'CONTABANCARIA', 'OPERACAO', 'ID_FORMADEPAGAMENTO'], possuiAtualizacaoBancariaPorRemessa(item) ? 'remessa-campo-divergente' : '')}
                                                        title={[
                                                            getTooltipCampoCadastro(item, ['ID_BANCO', 'BANCO'], 'Banco não encontrado no cadastro do funcionário.'),
                                                            getTooltipCampoCadastro(item, 'AGENCIA', 'Agência não encontrada no cadastro do funcionário.'),
                                                            getTooltipCampoCadastro(item, ['CONTABANCARIA', 'OPERACAO'], 'Conta bancária ou operação não encontrada no cadastro do funcionário.'),
                                                            getTooltipCampoCadastro(item, 'ID_FORMADEPAGAMENTO', 'Forma de pagamento da remessa não vinculada em BSTAB_FORMADEPAGAMENTO.'),
                                                            possuiAtualizacaoBancariaPorRemessa(item) ? `Remessa: ${formatarDadosBancariosRemessa(item)}` : ''
                                                        ].filter(Boolean).join(' ')}
                                                    >
                                                        <div className="item-dado-bloco">
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <strong>Banco:</strong>
                                                                <span>{item.ID_BANCO && item.BANCO ? `${item.ID_BANCO} - ${item.BANCO}` : 'Não encontrado'}</span>
                                                                {renderIndicadorCampoCadastro(item, ['ID_BANCO', 'BANCO'], 'Banco não encontrado no cadastro do funcionário.')}
                                                            </span>
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <strong>Ag:</strong>
                                                                <span>{item.AGENCIA || 'Não encontrada'}</span>
                                                                {renderIndicadorCampoCadastro(item, 'AGENCIA', 'Agência não encontrada no cadastro do funcionário.')}
                                                            </span>
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <strong>Conta:</strong>
                                                                <span>{item.CONTABANCARIA ? `${item.CONTABANCARIA}${item.OPERACAO ? ` / Op. ${item.OPERACAO}` : ''}` : 'Não encontrada'}</span>
                                                                {renderIndicadorCampoCadastro(item, ['CONTABANCARIA', 'OPERACAO'], 'Conta bancária ou operação não encontrada no cadastro do funcionário.')}
                                                            </span>
                                                            <span className="item-dado-secundario d-inline-flex align-items-center gap-1">
                                                                <strong>Forma Pgto:</strong>
                                                                <span>
                                                                    {item.ID_FORMADEPAGAMENTO
                                                                        ? `${item.ID_FORMADEPAGAMENTO}${item.FORMADEPAGAMENTO ? ` - ${item.FORMADEPAGAMENTO}` : ''}`
                                                                        : 'Não vinculada'}
                                                                </span>
                                                                {renderIndicadorCampoCadastro(item, 'ID_FORMADEPAGAMENTO', 'Forma de pagamento da remessa não vinculada em BSTAB_FORMADEPAGAMENTO.')}
                                                            </span>
                                                            {possuiAtualizacaoBancariaPorRemessa(item) && (
                                                                <>
                                                                    <span className="item-dado-secundario item-dado-remessa text-primary">Remessa: {formatarDadosBancariosRemessa(item)}</span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-primary item-atualizar-cadastro-btn"
                                                                        onClick={() => atualizarCadastroBancarioComRemessa(item)}
                                                                        disabled={atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(item)}
                                                                    >
                                                                        {atualizandoCadastroBancarioId === getChaveAtualizacaoBancaria(item) ? 'Atualizando...' : 'Atualizar cadastro'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={item.CONTA && item.DESCRICAO ? '' : 'table-danger'}>
                                                        <div className="item-dado-bloco">
                                                            <strong>{item.CONTA && item.DESCRICAO ? `${item.CONTA} - ${item.DESCRICAO}` : 'Conta gerencial não encontrada'}</strong>
                                                        </div>
                                                    </td>
                                                    <td className={item.ID_ITEM ? '' : 'table-danger'}>
                                                        <div className="item-dado-bloco">
                                                            <strong>{item.ID_ITEM ? `${item.ID_ITEM}${item.DESCRICAO_ITEM ? ` - ${item.DESCRICAO_ITEM}` : ' - Item não encontrado'}` : 'Item não informado no arquivo'}</strong>
                                                        </div>
                                                    </td>
                                                    <td className={item.HISTORICO ? '' : 'table-danger'}>{item.HISTORICO || 'Dados não encontrado no SGS'}</td>
                                                    <td className={getCentrosDeCustoItem(item).length === 0 ? 'table-danger' : ''}>
                                                        {centroDeCustoRateioCarregando(item)
                                                            ? <span className="text-muted">Carregando rateio...</span>
                                                            : getCentrosDeCustoItem(item).length > 0
                                                                ? getCentrosDeCustoItem(item).map((centro, i) => (
                                                                    <div key={i} className="item-dado-secundario">{centro}</div>
                                                                ))
                                                                : <span className="text-muted">Não configurado</span>}
                                                    </td>
                                                    <td className={String(item.REMESSA_OK || '') === 'N' ? 'table-danger text-center' : 'text-center'} title={item.REMESSA_ERRO || ''}>
                                                        <span className={`badge rounded-pill ${getRemessaBadgeClass(item.REMESSA_STATUS)}`}>
                                                            {item.REMESSA_STATUS || 'SEM REMESSA'}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={getClasseCampoRemessa(item, 'valor', item.VALOR ? 'text-end fw-semibold' : 'table-danger text-end')}
                                                        title={getTooltipCampoRemessa(item, 'valor', item.VALOR ? '' : 'Valor não encontrado')}
                                                    >
                                                        <span className="d-inline-flex align-items-center justify-content-end gap-1 w-100">
                                                            <span>{item.VALOR ? parseFloat(item.VALOR.toString().replace(',', '.')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Dados não encontrado'}</span>
                                                            {renderIndicadorCampoRemessa(item, 'valor')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="table-secondary">
                                                <td className="fw-bold">{dados.length} registros</td>
                                                <td colSpan="8" className="text-end fw-bold">Total:</td>
                                                <td className="fw-bold text-end">
                                                    {dados.reduce((total, item) => {
                                                        const valorStr = item.VALOR?.toString() || '0';
                                                        const valor = parseFloat(valorStr.replace(',', '.') || 0);
                                                        return total + (isNaN(valor) ? 0 : valor);
                                                    }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {dados.length > 10 && (
                                    <div className="text-muted mt-2">Apenas os primeiros 10 registros são exibidos.</div>
                                )}
                            </div>
                        </div>
                    )}
                        </>
                    )}

                    </div>

                    <div className="importacao-modal-footer">
                        <div className="importacao-modal-footer-start">
                            <small className={modalTipo === 'detalhe' && mensagemBloqueioProcessamentoDetalhe ? 'text-warning' : modalTipo !== 'detalhe' && mensagemBloqueioProcessamentoPreAnalise ? 'text-warning' : 'text-muted'}>
                                {modalTipo === 'detalhe'
                                    ? (mensagemBloqueioProcessamentoDetalhe || `Status atual: ${String(registroSelecionado?.STATUS_PROCESSAMENTO || 'PENDENTE').toUpperCase()}. O processamento final desta leitura será liberado somente quando não houver erros e houver remessa vinculada.`)
                                    : (mensagemBloqueioProcessamentoPreAnalise || 'O processamento final será liberado somente quando a pré-análise estiver concluída sem erros e a remessa estiver enviada.')}
                            </small>
                        </div>
                        <div className="importacao-modal-footer-actions">
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleExcluirLeitura(modalTipo === 'detalhe' ? registroSelecionado?.IDLEITURA : idImportacaoPreAnalise)}
                                disabled={modalTipo === 'detalhe' ? (!podeExcluirImportacaoDetalhe || loading || excluindo || refreshingDetalhes) : (!podeExcluirImportacaoPreAnalise || excluindo || loading)}
                            >
                                {excluindo ? 'Excluindo...' : 'Excluir Importação'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => processarDespesas(modalTipo === 'detalhe' ? registroSelecionado?.IDLEITURA : idImportacaoPreAnalise)}
                                disabled={modalTipo === 'detalhe' ? (!podeProcessarDetalhamento || loading || refreshingDetalhes) : (!podeProcessarImportacao || loading)}
                            >
                                {modalTipo === 'detalhe'
                                    ? (loading ? 'Processando...' : statusProcessamentoSelecionado === 'PROCESSADO' ? 'Já Processado' : 'Processar Despesas')
                                    : (uploadRemessaLoading ? 'Salvando Remessa...' : loading ? 'Processando...' : 'Processar Despesas')}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        )}
    </>)
}

export default ImportacaoDespesa;