
import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import GridDesktopSolicitacao from "../../componentes/SolicitacaoDeDesepesa/Grids/GridDesktopSolicitacoes";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../servidor/api";
import { ToastContainer, toast } from "react-toastify";
import moment from "moment";
import GridMobileSolicitacoes from "../../componentes/SolicitacaoDeDesepesa/Grids/GridMobileSolicitacoes";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import SolicitacaoDeDespesaModal from "./SolicitacaoDeDespesaModal";
import ModalSolicitacaoImportacaoLote from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalSolicitacaoImportacaoLote";
import "../CadastroDeUsuario/CadastroDeUsuario.css";


function SolicitacaoDeDespesaConsultar(){

    const navigate = useNavigate();
    const [dados, setDados] = useState([]);
    const [pnumsolicitacao, setpnumsolicitacao] = useState("");    
    const [pstatus, setpstatus] = useState("T");
    const {tipoConsulta} = useParams();
    const [dataSolicitacaoInicial, SetdataSolicitacaoInicial] = useState(moment().format("YYYY-MM")+"-01");
    const [dataSolicitacaoFinal, SetdataSolicitacaoFinal] = useState(moment().format("YYYY-MM-DD"));
    const [tipoGrid, setTipoGrid] = useState("");
    const [id_conta, setid_conta] = useState(0);
    const [conta, setconta] = useState("");   
    //
    const [isOpen, setIsOpen] = useState(false);
    const [id_solicitacao, setid_solicitacao] = useState("");
    const [tipoTela, setTipoTela] = useState("");
    const [somenteLeituraSolicitacao, setSomenteLeituraSolicitacao] = useState(false);
    const [isImportacaoModalOpen, setIsImportacaoModalOpen] = useState(false);
    const [idleituraImportacaoSelecionada, setIdleituraImportacaoSelecionada] = useState(null);
    const [fotoUsuario, setFotoUsuario] = useState(() => localStorage.getItem('foto_usuario') || '');
    

    window.addEventListener('resize', function (){
        TipoGrid();
    });

    function openModalSolicitacao(somenteLeitura = false){
        setSomenteLeituraSolicitacao(somenteLeitura);
        setIsOpen(true); 
    }

    function openModalImportacao(idleitura){
        setIdleituraImportacaoSelecionada(idleitura);
        setIsImportacaoModalOpen(true);
    }

    function onRequestClose(){
        setIsOpen(false); 
        setSomenteLeituraSolicitacao(false);
    }

    function onRequestCloseImportacao(){
        setIsImportacaoModalOpen(false);
        setIdleituraImportacaoSelecionada(null);
    }

    function onRequestClose2(){
        ConsultarSolicitacao();
        setIsOpen(false);
        setSomenteLeituraSolicitacao(false);         
    }
    
    function TipoGrid(){
        if (window.innerWidth > 1028) {
            setTipoGrid("D");
        } else {
            setTipoGrid("M");
        }
    } 
    
    function NovaSolicitacao(){
        
        setTipoTela("Nova");
        setid_solicitacao(0);
        openModalSolicitacao(false);
        
        //navigate('/SolicitacaoDeDespesa/Solcitacao/Nova');
    }

    function getStatusSolicitacao(registro = {}) {
        const status = registro?.status ?? registro?.STATUS_SOLICITACAO ?? '';
        return String(status || '').trim().toUpperCase();
    }

    function isRegistroBloqueadoPosFinanceiro(registro = {}) {
        const flagBloqueio = registro?.bloqueadoPosFinanceiroImportacao ?? registro?.BLOQUEADO_POS_FINANCEIRO_IMPORTACAO ?? 'N';
        if (flagBloqueio === true || String(flagBloqueio).toUpperCase() === 'S') {
            return true;
        }

        if (['F', 'I'].includes(getStatusSolicitacao(registro))) {
            return true;
        }

        const statusesAgrupados = Array.isArray(registro?.statusesAgrupados) ? registro.statusesAgrupados : [];
        return statusesAgrupados.some((statusItem) => ['F', 'I'].includes(String(statusItem || '').trim().toUpperCase()));
    }

    function isRegistroPendenteFinanceiro(registro = {}) {
        const flagPendenteFinanceiro = registro?.pendenteFinanceiroImportacao ?? registro?.PENDENTE_FINANCEIRO_IMPORTACAO ?? 'N';
        if (flagPendenteFinanceiro === true || String(flagPendenteFinanceiro).toUpperCase() === 'S') {
            return true;
        }

        if (getStatusSolicitacao(registro) === 'L') {
            return true;
        }

        const statusesAgrupados = Array.isArray(registro?.statusesAgrupados) ? registro.statusesAgrupados : [];
        return statusesAgrupados.some((statusItem) => String(statusItem || '').trim().toUpperCase() === 'L');
    }

    function isRegistroIntegrado(registro = {}) {
        if (getStatusSolicitacao(registro) === 'I') {
            return true;
        }

        const statusesAgrupados = Array.isArray(registro?.statusesAgrupados) ? registro.statusesAgrupados : [];
        return statusesAgrupados.some((statusItem) => String(statusItem || '').trim().toUpperCase() === 'I');
    }

    function getMensagemBloqueioRegistro(registro = {}, tela = '') {
        if (isRegistroBloqueadoPosFinanceiro(registro)) {
            return 'Este registro já foi enviado pelo financeiro/integrado com o cliente e não pode mais ser alterado ou excluído.';
        }

        if (tela !== 'Conformidade' && isRegistroPendenteFinanceiro(registro)) {
            return 'Esta solicitação está pendente do financeiro e só pode ser alterada na tela de conformidade.';
        }

        return '';
    }

    function isRegistroImportacaoLote(registro){
        const valorImportacao = registro?.isImportacaoLote
            ?? registro?.is_importacao_lote
            ?? registro?.IS_IMPORTACAO_LOTE
            ?? 'N';

        return valorImportacao === true || String(valorImportacao).toUpperCase() === 'S';
    }

    function agruparSolicitacoesImportacao(lista = []) {
        const agrupados = [];
        const indicePorLote = new Map();

        lista.forEach((registro) => {
            const idleitura = Number(registro?.idleitura_importacao ?? registro?.IDLEITURA_IMPORTACAO ?? 0);
            const statusSolicitacao = getStatusSolicitacao(registro);

            if (!idleitura || !isRegistroImportacaoLote(registro)) {
                agrupados.push({
                    ...registro,
                    isImportacaoLote: false
                });
                return;
            }

            const chave = String(idleitura);
            const numeroSolicitacao = registro?.numsolicitacao ?? registro?.NUMSOLICITACAO;
            const descricaoImportacao = registro?.descricao_importacao ?? registro?.DESCRICAO_IMPORTACAO ?? '';
            const contaAgrupada = [registro?.codcontagerencial ?? registro?.CODCONTAGERENCIAL ?? '', registro?.conta_gernecial ?? registro?.CONTA_GERNECIAL ?? '']
                .filter(Boolean)
                .join(' - ')
                .trim();
            const parceiroAgrupado = String(registro?.fornecedor ?? registro?.FORNECEDOR ?? '').trim();
            const formaPagamentoAgrupada = String(registro?.formadepagamento ?? registro?.FORMADEPAGAMENTO ?? '').trim();
            const dadosBancariosAgrupados = [
                registro?.banco ?? registro?.BANCO ?? '',
                registro?.agencia ?? registro?.AGENCIA ? `AG: ${registro?.agencia ?? registro?.AGENCIA}` : '',
                registro?.contabancaria ?? registro?.CONTABANCARIA ? `CC: ${registro?.contabancaria ?? registro?.CONTABANCARIA}` : '',
                registro?.operacao ?? registro?.OPERACAO ? `OP: ${registro?.operacao ?? registro?.OPERACAO}` : '',
                registro?.chavepix ?? registro?.CHAVEPIX ? `PIX: ${registro?.chavepix ?? registro?.CHAVEPIX}` : ''
            ]
                .filter(Boolean)
                .join(' / ')
                .trim();

            if (!indicePorLote.has(chave)) {
                agrupados.push({
                    ...registro,
                    isImportacaoLote: true,
                    is_importacao_lote: 'S',
                    idleitura_importacao: idleitura,
                    numsolicitacao: `LOTE #${idleitura}`,
                    numsolicitacao_original: numeroSolicitacao,
                    tipodedespesa: 'IMPORTAÇÃO EM LOTE',
                    descricao_lote: descricaoImportacao || 'Solicitações geradas por arquivo em lote',
                    fornecedor: null,
                    formadepagamento: null,
                    banco: null,
                    agencia: null,
                    contabancaria: null,
                    operacao: null,
                    chavepix: null,
                    qtd_solicitacoes_importacao: Number(registro?.qtd_solicitacoes_importacao ?? registro?.QTD_SOLICITACOES_IMPORTACAO ?? 1),
                    qtd_registros_importacao: Number(registro?.qtd_registros_importacao ?? registro?.QTD_REGISTROS_IMPORTACAO ?? 1),
                    qtd_contas_importacao: Math.max(Number(registro?.qtd_contas_importacao ?? registro?.QTD_CONTAS_IMPORTACAO ?? 0), contaAgrupada ? 1 : 0),
                    qtd_parceiros_importacao: Math.max(Number(registro?.qtd_parceiros_importacao ?? registro?.QTD_PARCEIROS_IMPORTACAO ?? 0), parceiroAgrupado ? 1 : 0),
                    qtd_formas_pagamento_importacao: formaPagamentoAgrupada ? 1 : 0,
                    qtd_dados_bancarios_importacao: dadosBancariosAgrupados ? 1 : 0,
                    total_valor_importacao: Number(registro?.total_valor_importacao ?? registro?.TOTAL_VALOR_IMPORTACAO ?? registro?.vltotal ?? 0),
                    vltotal: Number(registro?.total_valor_importacao ?? registro?.TOTAL_VALOR_IMPORTACAO ?? registro?.vltotal ?? 0),
                    solicitacoesAgrupadas: numeroSolicitacao ? [numeroSolicitacao] : [],
                    statusesAgrupados: statusSolicitacao ? [statusSolicitacao] : [],
                    contasAgrupadas: contaAgrupada ? [contaAgrupada] : [],
                    parceirosAgrupados: parceiroAgrupado ? [parceiroAgrupado] : [],
                    formasPagamentoAgrupadas: formaPagamentoAgrupada ? [formaPagamentoAgrupada] : [],
                    dadosBancariosAgrupados: dadosBancariosAgrupados ? [dadosBancariosAgrupados] : [],
                    bloqueadoPosFinanceiroImportacao: ['F', 'I'].includes(statusSolicitacao),
                    pendenteFinanceiroImportacao: statusSolicitacao === 'L'
                });

                indicePorLote.set(chave, agrupados.length - 1);
                return;
            }

            const indice = indicePorLote.get(chave);
            const atual = agrupados[indice];
            const solicitacoesAgrupadas = Array.isArray(atual?.solicitacoesAgrupadas)
                ? [...atual.solicitacoesAgrupadas]
                : [];
            const statusesAgrupados = Array.isArray(atual?.statusesAgrupados)
                ? [...atual.statusesAgrupados]
                : [];
            const contasAgrupadas = Array.isArray(atual?.contasAgrupadas)
                ? [...atual.contasAgrupadas]
                : [];
            const parceirosAgrupados = Array.isArray(atual?.parceirosAgrupados)
                ? [...atual.parceirosAgrupados]
                : [];
            const formasPagamentoAgrupadas = Array.isArray(atual?.formasPagamentoAgrupadas)
                ? [...atual.formasPagamentoAgrupadas]
                : [];
            const dadosBancariosAgrupadosLista = Array.isArray(atual?.dadosBancariosAgrupados)
                ? [...atual.dadosBancariosAgrupados]
                : [];

            if (numeroSolicitacao && !solicitacoesAgrupadas.includes(numeroSolicitacao)) {
                solicitacoesAgrupadas.push(numeroSolicitacao);
            }

            if (statusSolicitacao && !statusesAgrupados.includes(statusSolicitacao)) {
                statusesAgrupados.push(statusSolicitacao);
            }

            if (contaAgrupada && !contasAgrupadas.includes(contaAgrupada)) {
                contasAgrupadas.push(contaAgrupada);
            }

            if (parceiroAgrupado && !parceirosAgrupados.includes(parceiroAgrupado)) {
                parceirosAgrupados.push(parceiroAgrupado);
            }

            if (formaPagamentoAgrupada && !formasPagamentoAgrupadas.includes(formaPagamentoAgrupada)) {
                formasPagamentoAgrupadas.push(formaPagamentoAgrupada);
            }

            if (dadosBancariosAgrupados && !dadosBancariosAgrupadosLista.includes(dadosBancariosAgrupados)) {
                dadosBancariosAgrupadosLista.push(dadosBancariosAgrupados);
            }

            agrupados[indice] = {
                ...atual,
                solicitacoesAgrupadas,
                statusesAgrupados,
                bloqueadoPosFinanceiroImportacao: Boolean(atual?.bloqueadoPosFinanceiroImportacao) || ['F', 'I'].includes(statusSolicitacao),
                pendenteFinanceiroImportacao: Boolean(atual?.pendenteFinanceiroImportacao) || statusSolicitacao === 'L',
                qtd_solicitacoes_importacao: Math.max(
                    Number(atual?.qtd_solicitacoes_importacao || 0),
                    Number(registro?.qtd_solicitacoes_importacao ?? registro?.QTD_SOLICITACOES_IMPORTACAO ?? 0),
                    solicitacoesAgrupadas.length
                ),
                qtd_registros_importacao: Math.max(
                    Number(atual?.qtd_registros_importacao || 0),
                    Number(registro?.qtd_registros_importacao ?? registro?.QTD_REGISTROS_IMPORTACAO ?? 0)
                ),
                qtd_contas_importacao: Math.max(
                    Number(atual?.qtd_contas_importacao || 0),
                    Number(registro?.qtd_contas_importacao ?? registro?.QTD_CONTAS_IMPORTACAO ?? 0),
                    contasAgrupadas.length
                ),
                qtd_parceiros_importacao: Math.max(
                    Number(atual?.qtd_parceiros_importacao || 0),
                    Number(registro?.qtd_parceiros_importacao ?? registro?.QTD_PARCEIROS_IMPORTACAO ?? 0),
                    parceirosAgrupados.length
                ),
                qtd_formas_pagamento_importacao: Math.max(
                    Number(atual?.qtd_formas_pagamento_importacao || 0),
                    formasPagamentoAgrupadas.length
                ),
                qtd_dados_bancarios_importacao: Math.max(
                    Number(atual?.qtd_dados_bancarios_importacao || 0),
                    dadosBancariosAgrupadosLista.length
                ),
                contasAgrupadas,
                parceirosAgrupados,
                formasPagamentoAgrupadas,
                dadosBancariosAgrupados: dadosBancariosAgrupadosLista,
                total_valor_importacao: Math.max(
                    Number(atual?.total_valor_importacao || 0),
                    Number(registro?.total_valor_importacao ?? registro?.TOTAL_VALOR_IMPORTACAO ?? 0)
                ),
                vltotal: Math.max(
                    Number(atual?.total_valor_importacao || 0),
                    Number(registro?.total_valor_importacao ?? registro?.TOTAL_VALOR_IMPORTACAO ?? 0),
                    Number(atual?.vltotal || 0)
                )
            };
        });

        return agrupados;
    }

    function abrirSolicitacaoPorTipo(registroOuNumero, tela){
        const registro = typeof registroOuNumero === 'object' && registroOuNumero !== null
            ? registroOuNumero
            : dados.find((item) => String(item?.numsolicitacao) === String(registroOuNumero));

        const numeroSolicitacao = typeof registroOuNumero === 'object' && registroOuNumero !== null
            ? (registroOuNumero?.numsolicitacao_original ?? registroOuNumero?.numsolicitacao)
            : registroOuNumero;

        const mensagemBloqueio = getMensagemBloqueioRegistro(registro, tela);
        const registroIntegrado = isRegistroIntegrado(registro);
        const abrirSomenteLeitura = (tela === 'Conformidade' && !['L', 'F'].includes(getStatusSolicitacao(registro)))
            || (tela !== 'Conformidade' && !!mensagemBloqueio);

        if (mensagemBloqueio && tela !== 'Conformidade' && !registroIntegrado) {
            toast.info(`${mensagemBloqueio} Abrindo em modo de visualização.`);
        }

        setTipoTela(tela);

        if (registro && isRegistroImportacaoLote(registro)) {
            const idleitura = Number(registro?.idleitura_importacao ?? registro?.IDLEITURA_IMPORTACAO ?? 0);

            if (idleitura > 0) {
                openModalImportacao(idleitura);
                return;
            }
        }

        setid_solicitacao(numeroSolicitacao);
        openModalSolicitacao(abrirSomenteLeitura);
    }

    function EditarSolcitacao(pnumero){        
        abrirSolicitacaoPorTipo(pnumero, "Editar");
    }

    function DirecionarSolicitacao(pnumero){
        abrirSolicitacaoPorTipo(pnumero, "Direcionar");
    }

    function OrdenarSolicitacao(pnumero){
        abrirSolicitacaoPorTipo(pnumero, "Ordenar");
    }

    function ConformidadeSolicitacao(pnumero){
        abrirSolicitacaoPorTipo(pnumero, "Conformidade");
    }


    function ConsultarSolicitacao(){        
    
        api.post('/v1/solicitacaoDespesa/listar', {pnumsolicitacao: Number(pnumsolicitacao), pstatus, dataSolicitacaoInicial: moment(dataSolicitacaoInicial).format("DD/MM/YYYY"), dataSolicitacaoFinal: moment(dataSolicitacaoFinal).format("DD/MM/YYYY"),
        tipoConsulta, id_usuario: Number(localStorage.getItem("id_usuario")), id_grupo_empresa: Number(localStorage.getItem("id_grupo_empresa")), id_contagerencial: id_conta})
        .then((retorno) => {        
                    
            setDados(agruparSolicitacoesImportacao(retorno.data || []));


        }).catch((err) =>{
                       
            console.log(err);
        });        

    }
    
    function DeleteSolcitacao(registroOuNumero){
        const registro = typeof registroOuNumero === 'object' && registroOuNumero !== null
            ? registroOuNumero
            : dados.find((item) => String(item?.numsolicitacao) === String(registroOuNumero));
        const numsolicitacao = typeof registroOuNumero === 'object' && registroOuNumero !== null
            ? (registroOuNumero?.numsolicitacao_original ?? registroOuNumero?.numsolicitacao)
            : registroOuNumero;

        const mensagemBloqueio = getMensagemBloqueioRegistro(registro, 'Excluir');
        if (mensagemBloqueio) {
            toast.warning(mensagemBloqueio);
            return;
        }

        const id1 = toast.loading("Buscando Transferencia...", {position : toast.POSITION.TOP_CENTER});

        api.post('/v1/deleteSolicitaCab', {numsolicitacao})
        .then( (retorno) =>{

            toast.update(id1, {
                render: "Solcitação: "+retorno.data.numsolicitacao+" excluido com sucesso !", 
                type: "success", 
                isLoading: false,                             
               autoClose: 2000});

        })
        .catch( (err) =>{

            toast.update(id1, {
                render: err.response.data, 
                type: "error", 
                isLoading: false,
                autoClose: 2000});

        });

        ConsultarSolicitacao();
    }

    useEffect( () =>{
        TipoGrid();
        // Carrega foto do servidor (prevalece sobre localStorage)
        api.post('/v1/usuario/consultarFoto', { id_usuario: Number(localStorage.getItem('id_usuario')) })
            .then(res => {
                if (res.data?.foto) {
                    const urlFoto = res.data.foto.startsWith('/midias/')
                        ? `${api.defaults.baseURL}${res.data.foto}`
                        : res.data.foto;
                    setFotoUsuario(urlFoto);
                    localStorage.setItem('foto_usuario', urlFoto);
                }
            })
            .catch(err => console.log('Erro ao carregar foto:', err));
    },[])

    return <>
        <Menu />    

        <SolicitacaoDeDespesaModal 
            isOpen={isOpen}
            id_solicitacao={id_solicitacao}
            tipoTela={tipoTela}
            somenteLeitura={somenteLeituraSolicitacao}
            onRequestClose={onRequestClose}
            onRequestClose2={onRequestClose2}
        />

        <ModalSolicitacaoImportacaoLote
            isOpen={isImportacaoModalOpen}
            idleitura={idleituraImportacaoSelecionada}
            tipoTela={tipoTela}
            onRequestClose={onRequestCloseImportacao}
            onAtualizarSolicitacoes={ConsultarSolicitacao}
            onAbrirSolicitacao={(numeroSolicitacao) => {
                setid_solicitacao(numeroSolicitacao);
                openModalSolicitacao(true);
            }}
        />


        <div className="container-fluid Containe-Tela cadastro-usuario-page">
            <div className="row text-body-secondary mb-3">
                <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                    <div>
                        <h1 className="mb-1 titulo-da-pagina">{tipoConsulta+" Despesa"}</h1>
                        <p className="text-muted mb-0">Consulte despesas existentes ou abra uma nova solicitação.</p>
                    </div>
                    { tipoConsulta == "Solicitar" ?                        
                        <button className="btn btn-success" onClick={NovaSolicitacao}>Nova Solicitação</button> : null                     
                    }
                </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros">
                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label htmlFor="SelecaoStatus" className="form-label">Status</label>                                    
                    <select className="form-control" id="SelecaoStatus" onChange={(e) => setpstatus(e.target.value)} value={pstatus}>
                        <option value={"T"}>TODOS</option>
                        <option value={"A"}>PEND. CONTROLADORIA</option>                        
                        <option value={"EA"}>PEND. ORDENADOR</option>
                        <option value={"AJ"}>AJUSTAR ORÇAMENTO</option>
                        <option value={"L"}>PEND. FINANCEIRO</option>
                        <option value={"P"}>PEND. SOLICITANTE</option>
                        <option value={"N"}>NEGADO. ORDENADOR</option>
                        <option value={"F"}>PEND. INTEGRAÇÃO</option>
                        <option value={"I"}>LANÇADO WINTHOR</option>
                    </select>
                    <small className="text-muted">Filtra as solicitações pelo estágio atual.</small>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label htmlFor="DataDaSolicitacaoInicial" className="form-label">Data Inicial</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitacaoInicial" 
                        onChange={(e) => {SetdataSolicitacaoInicial(e.target.value)}}
                        value={dataSolicitacaoInicial}/> 
                    <small className="text-muted">Define o inicio do periodo consultado.</small>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label htmlFor="DataDaSolicitacaoFinal" className="form-label">Data Final</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitacaoFinal" 
                        onChange={(e) => {SetdataSolicitacaoFinal(e.target.value)}}
                        value={dataSolicitacaoFinal}/> 
                    <small className="text-muted">Define o fim do periodo consultado.</small>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label htmlFor="NumeroSolicitacao" className="form-label">Nº Solicitação</label>                   
                    <input type="text" className="form-control" id="NumeroSolicitacao" onChange={(e) => setpnumsolicitacao(e.target.value)} placeholder="Informe o número"/> 
                    <small className="text-muted">Informe um número específico para busca direta.</small>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label htmlFor="ContaGerencial" className="form-label">Conta Gerencial</label>                   
                    <EditComplete                         
                        placeholder={"Conta Gerencial"}
                        id={"ContaGerencial"}                        
                        tipoConsulta={"conta1"} 
                        onClickCodigo={setid_conta} 
                        onClickDescricao={setconta}
                        value={conta} 
                    />
                    <small className="text-muted">Selecione a conta para refinar o resultado.</small>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6 cadastro-filtro-col">
                    <label className="form-label invisible">Ação</label>
                    <button className="btn btn-primary w-100" onClick={ConsultarSolicitacao}><i className="bi bi-search"></i> Consultar</button>
                    <small className="text-muted invisible">Executa a consulta com os filtros informados.</small>
                </div>
            </div>

            <p className="cadastro-section-title">Resultados</p>

            {tipoGrid == "M" ? (
                <>
                    <GridMobileSolicitacoes
                        tipoConsulta={tipoConsulta}
                        EditarSolcitacao={EditarSolcitacao}
                        DirecionarSolicitacao={DirecionarSolicitacao}
                        OrdenarSolicitacao={OrdenarSolicitacao}
                        ConformidadeSolicitacao={ConformidadeSolicitacao}
                        dados={dados}
                        DeleteSolcitacao={DeleteSolcitacao}
                    />
                    <hr/>
                </>
            ) : (
                <div className="cadastro-card cadastro-table-card">
                    <GridDesktopSolicitacao
                        tipoConsulta={tipoConsulta}
                        EditarSolcitacao={EditarSolcitacao}
                        DirecionarSolicitacao={DirecionarSolicitacao}
                        OrdenarSolicitacao={OrdenarSolicitacao}
                        ConformidadeSolicitacao={ConformidadeSolicitacao}
                        dados={dados}
                        DeleteSolcitacao={DeleteSolcitacao}
                    />
                </div>
            )}

            <ToastContainer />
        </div>
    </>
}

export default SolicitacaoDeDespesaConsultar;