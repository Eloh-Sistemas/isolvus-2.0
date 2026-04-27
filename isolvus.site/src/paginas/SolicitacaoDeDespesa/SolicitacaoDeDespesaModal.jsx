import Modal from "react-modal/lib/components/Modal";
import "./SolicitacaoDeDespesa.css";
import ModalSolicitacaoDeDespesaItem from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalSolicitacaoDeDespesaItem"
import { useEffect, useRef, useState } from "react";
import GridMobile from "../../componentes/SolicitacaoDeDesepesa/Grids/GridMobile";
import GridDesktop from "../../componentes/SolicitacaoDeDesepesa/Grids/GridDesktop";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import "./SolicitacaoDeDespesaConsultar.css";
import moment from "moment";
import api from "../../servidor/api";
import { toast } from "react-toastify";
import Swal from 'sweetalert2';
import UploadArquivos from "../../componentes/UploadArquivos/UploadArquivos";
import "./GridDesktopRateio.css";
import "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeUsuario.css";

function SolicitacaoDeDespesaModal(props){
    // STATES
    const [proximoid, setproximoid] = useState(0);
    const [tipoGrid, setTipoGrid] = useState("");
    const [isItemOpen, setisItemOpen] = useState(false); 
    const uploadRef = useRef();  
    const [tipodespesa, settipodespesa] = useState("O");
    const [tipofornecedor, settipofornecedor] = useState("fo");
    const [labeltipoParceiro, setlabeltipoParceiro] = useState("");
    const [formadePagamento, setformadePagamento] = useState();
    const [tipotitularidade, settipotitularidade] = useState();        
    const [chavepix, setchavepix] = useState("");
    const [id_banco, setid_banco] = useState();
    const [banco, setbanco] = useState("");
    const [agencia, setAgencia]  = useState();
    const [contaBancaria, setcontaBancaria] = useState();
    const [operacao, setOperacao] = useState();                 
    const [ValorGastoMaioQueValorDisponivel, SetValorGastoMaioQueValorDisponivel] = useState(false);
    const [id_EmpresaFunc, Set_Id_EmpresaFunc] = useState(0);
    const [filialFunc, SetFilialFunc] = useState("");
    const [id_Filialdespesa, Set_Id_Filialdespesa] = useState(0);
    const [filialDespesa, SetFilialDespesa] = useState("");
    const [id_Fornecedor, Set_id_Fornecedor] = useState(0);
    const [Fornecedor, SetFornecedor] = useState("");  
    const [listaDeStatus, SetListaDeStatus] = useState([]);
    const [listaDeRotinaIntegracao, SetListaDeRotinaIntegracao] = useState([]);
    const [tipoModal, setTipoModal] = useState("");    
    const [codFunc, SetCodFunc] = useState(0);
    const [nomeFunc, SetNomeFunc] = useState("");
    const [dataSolicitacao, SetDataSolicitacao] = useState("");
    const [datalancfinaceiro, setdatalancfinaceiro] = useState("");
    const [dataControladoria, SetdataControladoria] = useState("");
    const [dataEstimada, SetDatastimada] = useState("");
    const [dataOrdenacao, setDataOrdenacao] = useState("");
    const [objetivo, SetObjetivo] = useState("");
    const [listaDeGasto, SetListaDeGasto] = useState([]);
    const [vlSaldoDisponivel, SetvlSaldoDisponivel] = useState(0);
    const [vlGastoTotal, setvlGastoTotal] = useState(0);
    const [ItemSelecionado, SeItemSelecionado] = useState({coditem: 0, descricao: "", quantidade: 0, vlunit:0});
    const [index, setIndex] = useState(0);
    const [id_ordenador,setid_ordenador] = useState(0);
    const [nomeordenador, setnomeordenador] = useState("");
    const [obs_ordenador, SetObs_ordenador] = useState(" ");
    const [obs_financeiro, SetObs_financeiro] = useState(" ");
    const [status, Setstatus] = useState("");
    const [statusCarregadoBanco, setStatusCarregadoBanco] = useState("");
    const [integracao, setIntegracao] = useState(0);
    const [codconta, setCondConta] = useState(0);
    const [descricaoConta, SetDescricaoConta] = useState("");
    const [codCentroDeCusto, setCentroDeCusto] = useState(0);
    const [descricaoCentroDeCusto, SetDescricaoCentroDeCusto] = useState("");  
    const [codCaixaBanco, setcodCaixaBanco] = useState(0);
    const [descricaoCaixaBanco, SetdescricaoCaixaBanco] = useState(""); 
    const [id_controladoria, setid_controladoria] = useState(0);
    const [nomecontroladoria, setnomecontroladoria] = useState("");
    const [id_financeiro, setid_financeiro] = useState(0);
    const [nomefinanceiro, setnomefinanceiro] = useState("");
    const [listaVala1, setListaVala1] = useState([]);
    const [listaFormaDePagamento, setListaFormaDePagamento] = useState([]);
    const [valesSelecionados, setValesSelecionados] = useState([]);
    const [historico1, sethistorico1] = useState("");
    const [historico2, sethistorico2] = useState("");
    const [historicoFluxo, setHistoricoFluxo] = useState([]);
    const [historicoFluxoLoading, setHistoricoFluxoLoading] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState(props.id_solicitacao ? "historico" : "solicitacao");
    const tabsRef = useRef(null);
    const tabsButtonsRef = useRef({});
    const [temAbaOcultaEsquerda, setTemAbaOcultaEsquerda] = useState(false);
    const [temAbaOcultaDireita, setTemAbaOcultaDireita] = useState(false);

    const [percentualRateio, setpercentualRateio] = useState(0);
    const [valorRateio, setvalorRateio] = useState(0);
    const [valorTotalRateio, setvalorTotalRateio] = useState(0);    

    function atualizarIndicadoresDeAbas() {
        const tabs = tabsRef.current;

        if (!tabs) {
            return;
        }

        const maxScroll = tabs.scrollWidth - tabs.clientWidth;
        const tolerancia = 4;

        setTemAbaOcultaEsquerda(tabs.scrollLeft > tolerancia);
        setTemAbaOcultaDireita(maxScroll - tabs.scrollLeft > tolerancia);
    }

    function ajustarScrollDaAba(aba, smooth = true) {
        const tabs = tabsRef.current;
        const botao = tabsButtonsRef.current[aba];

        if (!tabs || !botao || tabs.scrollWidth <= tabs.clientWidth) {
            atualizarIndicadoresDeAbas();
            return;
        }

        const centroBotao = botao.offsetLeft + (botao.offsetWidth / 2);
        const metadeViewport = tabs.clientWidth / 2;
        const alvo = Math.max(
            0,
            Math.min(centroBotao - metadeViewport, tabs.scrollWidth - tabs.clientWidth)
        );

        tabs.scrollTo({
            left: alvo,
            behavior: smooth ? "smooth" : "auto"
        });

        requestAnimationFrame(atualizarIndicadoresDeAbas);
    }

    function onClickAba(aba) {
        setAbaAtiva(aba);
        requestAnimationFrame(() => ajustarScrollDaAba(aba, true));

        if (aba === "historico" && props.id_solicitacao) {
            setHistoricoFluxoLoading(true);
            api.post('/v1/solicitacaoDespesa/consultarHistorico', { pnumsolicitacao: props.id_solicitacao })
                .then(r => setHistoricoFluxo(r.data || []))
                .catch(() => setHistoricoFluxo([]))
                .finally(() => setHistoricoFluxoLoading(false));
        }
    }


    function onChangePercentual(e) {
    const valor = e.target.valueAsNumber;

    if (isNaN(valor)) {
        setpercentualRateio(0);
        setvalorRateio(0);
        return;
    }

    setpercentualRateio(valor);

    const valorCalculado = Number(
        ((valor / 100) * valorTotalRateio).toFixed(2)
    );

    setvalorRateio(valorCalculado);
    }

    function onChangeValor(e) {
    const valor = e.target.valueAsNumber;

    if (isNaN(valor) || !valorTotalRateio) {
        setvalorRateio(0);
        setpercentualRateio(0);
        return;
    }

    setvalorRateio(valor);

    const percentualCalculado = Number(
        ((valor / valorTotalRateio) * 100).toFixed(2)
    );

    setpercentualRateio(percentualCalculado);
    }

    const [rateio, setRateio] = useState([]);

    const qtRegistro = rateio.length;

    const totalPercentual = rateio.reduce(
    (acc, item) => acc + Number(item.percentual || 0),
    0
    );

    const totalValor = rateio.reduce(
    (acc, item) => acc + Number(item.valor || 0),
    0
    );

    const totalGasto = listaDeGasto.reduce(
        (acc, item) => acc + Number((item.quantidade * item.vlunit)|| 0), 0
    );           
    
    useEffect(()=>{
        setvalorTotalRateio(totalGasto);
    },[listaDeGasto]);

    
    function onClickIncluirRateio() {

        const dadosItemRateio = {
            numsolicitacao: props.id_solicitacao,
            codCentroDeCusto,
            perrateio: percentualRateio,
            valor: valorRateio
        }

        {/*post na api*/}

        const id1 = toast.loading("Rateando solicitação de Despesa...", {position : "top-center"});            

        api.post('/v1/solicitacaoDespesa/addRaterio', dadosItemRateio)
        .then((response) =>{           

           setRateio(response.data);

           toast.update(id1, {
                render: "Rateio adicionado com sucesso !", 
                type: "success", 
                isLoading: false,                             
                autoClose: 1700,
                pauseOnHover: false});

           setCentroDeCusto(0);
           SetDescricaoCentroDeCusto("");
           setpercentualRateio(0);
           setvalorRateio(0);

        })
        .catch((erro) =>{
          console.log(erro);

          if (erro.response.data.detalhes){
                toast.update(id1, {
                        render: erro.response.data.detalhes[0].message, 
                        type: "error", 
                        isLoading: false,
                        autoClose: 2000,
                        pauseOnHover: false}); 
          }else {
            toast.update(id1, {
                    render: erro.response.data.error, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false});
          }

          
        })        
    }


    function onClickExcluirRateio(id_rateio) {
     

        api.post('/v1/solicitacaoDespesa/deleteRateio',{id_rateio: id_rateio, numsolicitacao: props.id_solicitacao})
        .then((response) =>{
            setRateio(response.data);
        })
        .catch((erro) =>{
            console.log(erro);
        })


    }


    //Disableds
    const [tabhabilitada, Settabhabilitada] = useState(true);
    const [habilitarbtnSalvar, SethabilitarbtnSalvar] = useState(true);
    const [disabledFoto, setdisabledFoto] = useState(true);
    const [disabledFormadePagamento, setdisabledFormadePagamento] = useState(true);
    const [disableChavePix, setdisableChavePix] = useState(true);
    const [disabledBanco, setdisabledBanco] = useState(true);
    const [disabledAgencia, setdisabledAgencia] = useState(true);
    const [disabledContaBancaria, setdisabledContaBancaria] = useState(true);
    const [disabledOperacao, setdisabledOperacao] = useState(true);
    const [disabledtipotitularidade, setdisabledtipotitularidade] = useState(true);
    const [disabledFornecedor, setdisabledFornecedor] = useState(true);
    const [disabledTipoFornecedor, setdisabledTipoFornecedor] = useState(true);    
    const [disabledTipoDespesa, setdisabledTipoDespesa] = useState(true);
    const [disabledFilialDespesa, setDisabledFilialDespesa] = useState(true);
    const [disabledDataEstimada, setDisabledDataEstimada] = useState(true);
    const [disableContaGerencial, setDisableContaGerencial] = useState(true);
    const [disableCentroDecusto, setDisableCentroDecusto] = useState(true);
    const [disableObjetivoSolicitante, setDisableObjetivoSolicitante] = useState(true);
    const [disableStatus, setDisableStatus] = useState(true);
    const [disableParecerOrdenador, setDisableParecerOrdenador] = useState(true);
    const [disabledIntegrarCom, setdisabledIntegrarCom] = useState(true);
    const [disableParecerFinanceiro, setDisabledParecerFinanceiro] = useState(true);
    const [disableCaixaBanco, setDisableCaixaBanco] = useState(true);
    const [disableAnexo, setDisableAnexo] = useState(true);

    // Visibles
    const [visibleContaGerencial, setVisibleContaGerencial] = useState(true);
    const [visibleCentroDeCusto, setVisibleCentroDeCusto] = useState(true);
    const [visibleStatus, setVisibleStatus] = useState(true);
    const [visibleParecerOrdenador, setVisibleParecerOrdenador] = useState(true);
    const [visibleIntegrarCom, setVisibleIntegrarCom] = useState(true);
    const [visibleParecerFinanceiro, setVisibleParecerFinanceiro] = useState(true);
    const [visibleRespFinanceiro, setVisibleRespFinanceiro] = useState(true);
    const [visibleDataFinanceiro, setVisibleDataFinanceiro] = useState(true);
    const [visibleCaixaBanco, setVisibleCaixaBanco] = useState(true);
    const [visibleRespOrdenador, setvisibleRespOrdenador] = useState(true);
    const [visibleDataOrdenador, setvisibleDataOrdenador] = useState(true);
    const [visibleObjetivoSolicitacao, setvisibleObjetivoSolicitacao] = useState(true);
    const [visibleRespControladoria, setvisibleRespControladoria] = useState(true);
    const [visibleDataControladoria, setvisibleDataControladoria] = useState(true);



    useEffect(()=>{

        if (["A","P"].includes(status) && 
            ["Nova","Editar"].includes(props.tipoTela) && 
            ["F"].includes(tipodespesa)
           ) 
        {
            setdisabledTipoFornecedor(false);
        }else{
            setdisabledTipoFornecedor(true);
        }


    },[tipodespesa, props.tipoTela, status])
    


    const toggleVale = (vale) => {
        setValesSelecionados((prev) => {
            const jaSelecionado = prev.some(v => v.id_vale === vale.id_vale);

            const novosVales = jaSelecionado
            ? prev.filter(v => v.id_vale !== vale.id_vale) // desmarca
            : [...prev, vale];                              // marca

            // calcula o valor com base no NOVO estado
            const novoTotalSelecionado = novosVales.reduce(
            (total, v) => total + v.valor, 0
            );

            const valor = valorTotalRateio - novoTotalSelecionado;

            // chama API ANTES de confirmar visualmente
            api.post('/v1/solicitacaoDespesa/recalcularRaterio', {
            numsolicitacao: props.id_solicitacao,
            valorDespesa: valor
            })
            .then((response) => {
            setRateio(response.data);
            //só aqui o state já está correto
            })
            .catch((err) => {
            let mensagem = "Erro inesperado. Tente novamente.";

            if (err?.response?.data?.detalhes?.[0]?.message) {
                mensagem = err.response.data.detalhes[0].message;
            } else if (err?.response?.data?.error) {
                mensagem = err.response.data.error;
            }

            toast.error(mensagem, { position: "top-center" });

            //Cancela a alteração → retorna estado anterior
            setValesSelecionados(prev);
            });

            return novosVales;
        });
    };
    

    // Total dos vales selecionados (desconto)
    const totalSelecionado = valesSelecionados.reduce(
    (acc, v) => acc + (v.valor || 0),
    0
    );

    

    // INICIAR TELA
    useEffect(()=>{        
        TipoGrid();             
    },[]);

    useEffect(() => {
        if (!props.isOpen) {
            return;
        }

        const onResize = () => {
            atualizarIndicadoresDeAbas();
        };

        requestAnimationFrame(() => {
            ajustarScrollDaAba(abaAtiva, false);
            atualizarIndicadoresDeAbas();
        });

        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
        };
    }, [props.isOpen]);

    useEffect(() => {
        if (!props.isOpen) {
            return;
        }

        requestAnimationFrame(() => {
            ajustarScrollDaAba(abaAtiva, true);
            atualizarIndicadoresDeAbas();
        });
    }, [abaAtiva, props.isOpen]);

    function TipoGrid(){
        if (window.innerWidth > 769) {
            setTipoGrid("D");
        } else {
            setTipoGrid("M");
        }
    } 

    window.addEventListener('resize', function (){
        TipoGrid();
    });
        

    function openModalItem(){
        setisItemOpen(true);
    }


    function closeModalItem(){
        setisItemOpen(false);
    }  


    function consultarFormaDePagamento(){
        api.get('v1/formadepagamneto/listar')
        .then((response) =>{
            setListaFormaDePagamento(response.data);
        })
        .catch((err)=>{
            console.log(err);
        })
    }

    useEffect(()=>{        
        IniciarTela();
        consultarFormaDePagamento();
    },[props.isOpen]);


    // FUNÇÃO PARA LIMPAR E CHAMA A CONSULTA DE DADOS DA SOLICITAÇÃO
    function IniciarTela(){
        
        SetDataSolicitacao(moment().format("DD/MM/YYYY HH:mm:ss"));        
        SetDatastimada(moment().format("YYYY-MM-DD"));   
        Set_Id_EmpresaFunc(localStorage.getItem("id_empresa"));
        SetFilialFunc(localStorage.getItem("razaosocial"));        
        SetNomeFunc(localStorage.getItem("nome"));    
        SetCodFunc(localStorage.getItem("id_usuario"));  
        SetFilialDespesa("");
        Set_Id_Filialdespesa(0);
        settipodespesa("F");
        Setstatus("A");
        setStatusCarregadoBanco("");
        settipofornecedor("fo");
        Set_id_Fornecedor(0);       
        SetFornecedor("");
        setformadePagamento(0);
        settipotitularidade(0);
        setchavepix("");
        setid_banco(0);
        setbanco("");
        setAgencia("");
        setcontaBancaria("");
        setOperacao("");
        setAbaAtiva(props.id_solicitacao ? "historico" : "solicitacao");
        SetObjetivo("");
        SetObs_ordenador("");
        SetObs_financeiro("");
        SetListaDeGasto([]);        
        setproximoid(-1);
        setCondConta(0);
        SetDescricaoConta("");
        setCentroDeCusto(0);
        SetDescricaoCentroDeCusto("");
        setcodCaixaBanco(0);
        SetdescricaoCaixaBanco("");
                        
        CarregarDadosSolicitacao(props.id_solicitacao);

        if (props.id_solicitacao) {
            setHistoricoFluxoLoading(true);
            api.post('/v1/solicitacaoDespesa/consultarHistorico', { pnumsolicitacao: props.id_solicitacao })
                .then(r => setHistoricoFluxo(r.data || []))
                .catch(() => setHistoricoFluxo([]))
                .finally(() => setHistoricoFluxoLoading(false));
        }
    };

    // FUNÇÃO PARA CONSULTAR DADOS DA SOLICITAÇÃO
    function CarregarDadosSolicitacao(id_solic){

        if (id_solic > 0 ){

            api.post('/v1/solicitacaoDespesa/consultarSolicitacaoCab', {pnumsolicitacao: props.id_solicitacao})
            .then((retorno) => {

                Set_Id_EmpresaFunc(retorno.data[0].id_empresasolicitante);
                SetFilialFunc(retorno.data[0].empresasolicitante);
                SetNomeFunc(retorno.data[0].nome);
                Set_Id_Filialdespesa(retorno.data[0].id_filialdespesa);
                SetFilialDespesa(retorno.data[0].empresadespesa);
                settipofornecedor(retorno.data[0].tipofornecedor);

                sethistorico1(retorno.data[0].historico1|| "");
                sethistorico2(retorno.data[0].historico2|| "");

                SetDataSolicitacao(moment(retorno.data[0].datasolicitacao).format('DD/MM/YYYY HH:mm:ss'));

                if (retorno.data[0].datahoracontroladoria){
                    SetdataControladoria(moment(retorno.data[0].datahoracontroladoria).format('DD/MM/YYYY HH:mm:ss'));
                }else{
                    SetdataControladoria("");
                }

                if (retorno.data[0].datahorafinanceiro) {
                    setdatalancfinaceiro(moment(retorno.data[0].datahorafinanceiro).format('DD/MM/YYYY HH:mm:ss'));
                }else{
                    setdatalancfinaceiro("");
                }

                if (retorno.data[0].datahoraordenador) {
                    setDataOrdenacao(moment(retorno.data[0].datahoraordenador).format('DD/MM/YYYY HH:mm:ss'));
                }else{
                    setDataOrdenacao("");
                }

                setid_ordenador(retorno.data[0].id_ordenador);
                setnomeordenador(retorno.data[0].ordenador);

                SetDatastimada(moment( retorno.data[0].dataestimada).format('YYYY-MM-DD'));
                setCondConta(retorno.data[0].codcontagerencial);
                SetDescricaoConta(retorno.data[0].contagerencial);
                setid_banco(retorno.data[0].id_banco);
                setbanco(retorno.data[0].banco);
                setAgencia(retorno.data[0].agencia);
                setcontaBancaria(retorno.data[0].contabancaria);
                setOperacao(retorno.data[0].operacao);
                setchavepix(retorno.data[0].chavepix);
                SetObjetivo(retorno.data[0].objetivo);

                setcodCaixaBanco(retorno.data[0].id_caixabanco);
                SetdescricaoCaixaBanco(retorno.data[0].caixabanco);

                const statusInicial = retorno.data[0].status == "" ? "N" : retorno.data[0].status;
                Setstatus(statusInicial);
                setStatusCarregadoBanco(String(statusInicial).trim().toUpperCase());

                SetObs_ordenador(retorno.data[0].obs_ordenador);
                SetObs_financeiro(retorno.data[0].obs_financeiro);
                setIntegracao(retorno.data[0].id_rotina_integracao || 0);
                settipodespesa(retorno.data[0].tipodedespesa);
                Set_id_Fornecedor(retorno.data[0].id_fornecedor);
                SetFornecedor(retorno.data[0].fornecedor);
                setproximoid(id_solic);
                setformadePagamento(retorno.data[0].id_formadepagamento);
                settipotitularidade(retorno.data[0].tipoconta);

                setid_controladoria(retorno.data[0].id_user_controladoria);
                setnomecontroladoria(retorno.data[0].usercontroladoria);

                setid_financeiro(retorno.data[0].id_user_financeiro);
                setnomefinanceiro(retorno.data[0].userfinanceiro);

            }).catch((err) =>{
                console.log(err)
            });


            //Consultar Item
            api.post('/v1/solicitacaoDespesa/consultarSolicitacaoItem', {pnumsolicitacao: props.id_solicitacao, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_solicitacao: localStorage.getItem("id_usuario_erp")})
            .then((retorno) => {
                SetListaDeGasto(retorno.data);
            }).catch((err) =>{
                console.log(err)
            });


            api.get('/v1/solicitacaoDespesa/ordenarSolicitacao/validarsolicitacaoorcamento/'+props.id_solicitacao)
            .then((retorno)=>{
                setvlGastoTotal(retorno.data[0].vlsolicitacao);
                SetvlSaldoDisponivel(retorno.data[0].saldo);
            })
            .catch((err)=>{
                console.log(err);
            })

            // consulta rateio
            api.post('/v1/solicitacaoDespesa/consultarRateio',{pnumsolicitacao: props.id_solicitacao})
            .then((retorno) =>{
                setRateio(retorno.data);
            })
            .catch((erro)=>{
                console.log(erro);
            })

        }

    }


    // MUDAR CAMPOS AO ALTERAR TIPO DE DESPESA
    useEffect(() =>{

        switch (tipodespesa) {
            case "F": 

            if (["Editar","Nova"].includes(props.tipoTela)) {
                //setdisabledTipoFornecedor(false);
                settipofornecedor("fo");             
                setdisableChavePix(true);
                setdisabledBanco(true);
                setdisabledAgencia(true);
                setdisabledContaBancaria(true);
                setdisabledOperacao(true); 
                setdisabledFornecedor(false);
            }
            
            break;

            case "L": 
            if (["Editar","Nova"].includes(props.tipoTela)) {

                if (props.tipoTela == "Nova"){
                settipofornecedor("us");
                Set_id_Fornecedor(localStorage.getItem("id_usuario"));
                SetFornecedor(localStorage.getItem("nome"));                
                }  

                //setdisabledTipoFornecedor(true);                        
                setdisableChavePix(true);
                setdisabledBanco(true);
                setdisabledAgencia(true);
                setdisabledContaBancaria(true);
                setdisabledOperacao(true);
                setdisabledFornecedor(false);

            }
                                    
            break;            
            case "EB": 
            if (["Editar","Nova"].includes(props.tipoTela)) {
                //setdisabledTipoFornecedor(false);
                settipofornecedor("us");                      
                setdisableChavePix(true);
                setdisabledBanco(true);
                setdisabledAgencia(true);
                setdisabledContaBancaria(true);
                setdisabledOperacao(true);
                setdisabledFornecedor(false);
            }             
            break;
        }
    },[tipodespesa, props.isItemOpen]);


    // ALTERAR QUANDO MUDAR A FORMA DE PAGAMENTO
    useEffect( () =>{

        if (formadePagamento === "0" && ["Nova", "Editar"].includes(props.tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(0);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "1" && ["Nova", "Editar"].includes(props.tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(0);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "2" && ["Nova", "Editar"].includes(props.tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "3" && ["Nova", "Editar"].includes(props.tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "4" && ["Nova", "Editar"].includes(props.tipoTela)) {
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(true);
        }
                                  
    },[formadePagamento]);

    //ALTERAR O LABEL PARCEIRO DE ACORDO COM O TIPO SELECIONADO
    useEffect(()=>{

        switch (tipofornecedor) {
            case "fo" : setlabeltipoParceiro("Fornecedor");
            break;
            case "cl" : setlabeltipoParceiro("Cliente");
            break;
            case "us" : setlabeltipoParceiro("Funcionario");
            break;            
        }

    },[tipofornecedor]);           


    // CONSULTAR DADOS BANCARIO DE ACORDO COM O TIPO E O PARCEIRO SELECIONADO
    useEffect(()=>{


       if (id_Fornecedor > 0 && formadePagamento > 0 && tipotitularidade > 0) {

            switch (tipofornecedor){
                case 'fo': consultarContaFornecedor();
                break;
                case 'us': consultarContaFuncionario();
                break;
            }

       } else {
            consultarContaFornecedor();
       }
        
    },[id_Fornecedor, formadePagamento, tipotitularidade, props.isItemOpen]); 


    //CONSULTAR VALE FUNCIONARIO
    useEffect(()=>{        


       if (id_Fornecedor > 0 ) {

            switch (tipofornecedor){
                case 'us': consultarValeFuncionario();
                break;   
                
            }

       }else{
           setListaVala1([]);
       }
        
    },[id_Fornecedor]); 
    

    function consultarValeFuncionario() {
    api.post('/v1/consultarVale', {
        id_func: id_Fornecedor,
        id_viculosoctdespesa: props.id_solicitacao
    })
    .then((response) => { 
                 

        if (response.data.length > 0) {
            setListaVala1(response.data);

            // 🔥 AUTO-SELECIONAR flegar = S ou B (com garantia)
            const selecionados = response.data.filter(v => 
                (v.flegar || "").toUpperCase() === "S" || 
                (v.flegar || "").toUpperCase() === "B"
            );

            setValesSelecionados(selecionados);
        }

    })
    .catch((erro) => {
        console.log("Erro ao consultar vale");
    });
}


    
    
    // CONSULTAR DADOS BANCARIO DO FUNCIONARIO
    function consultarContaFuncionario(){
        
        if (["Nova","Editar"].includes(props.tipoTela)){

            api.post('/v1/consultarDadosFuncionario',{matricula: id_Fornecedor}) 
            .then( (response) =>{
                
                setid_banco(0);
                setbanco("");
                setAgencia("");
                setcontaBancaria("");
                setOperacao("");
                setchavepix("");

                // TRANSFERENCIA
                if (formadePagamento == 2) {

                    if (tipotitularidade == 1){
                        setid_banco("");
                        setbanco("");
                        setAgencia("");
                        setcontaBancaria("");
                        setOperacao("");
                        setchavepix(response.data[0].chavepix);
                    }else if (tipotitularidade == 2){
                        setid_banco("");
                        setbanco("");
                        setAgencia("");
                        setcontaBancaria("");
                        setOperacao("");
                        setchavepix(response.data[0].chavepixterceiro);
                    }  

                }      

                if (["3","5"].includes(formadePagamento)) {

                    if (tipotitularidade == 1){
                        setid_banco(response.data[0].id_banco);
                        setbanco(response.data[0].banco);
                        setAgencia(response.data[0].agencia);
                        setcontaBancaria(response.data[0].conta);
                        setOperacao(response.data[0].operacao);
                        setchavepix("");
                    }else if (tipotitularidade == 2){
                        setid_banco(response.data[0].id_bancoterceiro);
                        setbanco(response.data[0].bancoterceiro);
                        setAgencia(response.data[0].agenciaterceiro);
                        setcontaBancaria(response.data[0].contaterceiro);
                        setOperacao(response.data[0].operacaoterceiro);
                        setchavepix("");
                    }  

                } 

            })
            .catch( (erro) => {
                console.log(erro)
            })
        }
        
                
    }


    // CONSULTAR DADOS BANCARIO FORNECEDOR INCOMPLETO *********
    function consultarContaFornecedor(){

        if (props.tipoTela === "Nova"){
            setid_banco(0);
            setbanco("");
            setAgencia("");
            setcontaBancaria(""); 
            setOperacao("");      
        }
                
    }                        
    
    
    
    



    function onClikSalvar(){

 
        if (props.tipoTela == "Nova"){
                     

                api.get('/v1/solicitacaoDespesa/proximoidsolicitadespesa')
                .then((retorno) =>{
                    setproximoid(retorno.data.proxnum);

                    console.log(dataEstimada);

                    const dados = {numsolicitacao: retorno.data.proxnum, 
                                   tipodespesa,
                                   id_EmpresaFunc, 
                                   id_Filialdespesa, 
                                   id_solicitante:codFunc, 
                                   id_usuario: Number(localStorage.getItem("id_usuario") || 0),
                                   dataEstimada: dataEstimada, 
                                   objetivo,  
                                   tipofornecedor: tipofornecedor, 
                                   id_Fornecedor,
                                   id_formadepagamento: formadePagamento,
                                   chavepix,
                                   id_banco,
                                   agencia,
                                   contaBancaria,
                                   operacao,
                                   itens: listaDeGasto, 
                                   id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
                                   tipoconta: tipotitularidade};

            

                    const id1 = toast.loading("Gerando solicitação de Despesa...", {position : "top-center"});

                    api.post('/v1/solicitacaoDespesa/solicitaDespesa', dados)
                    .then((retorno) =>{    
                    

                        const resposta = retorno.data;                

                        toast.update(id1, {
                            render: "Solicitação Nº:"+ resposta.numsolicitacao +" cadastrada com sucesso !", 
                            type: "success", 
                            isLoading: false,                             
                            autoClose: 1700,
                            pauseOnHover: false,
                            onclose : FechaModal(1000),
                            onClose: props.onRequestClose2} );                    
                            
                            uploadRef.current?.handleUpload();
                    
                    })
                    .catch((err) =>{       
                        console.error("[Nova] erro ao salvar:", err);
                        const mensagem = err?.response?.data?.detalhes?.[0]?.message
                            || err?.response?.data?.error
                            || "Erro inesperado. Tente novamente.";

                        toast.update(id1, {
                            render: mensagem, 
                            type: "error", 
                            isLoading: false,
                            autoClose: 2000,
                            pauseOnHover: false});
                            
                    }); 
                    

                })
                .catch((err)=>{
                    console.log(err);
                });            

                  
        }else if (props.tipoTela == "Direcionar"){

            const id1 = toast.loading("Direcionado solicitação de Despesa...", {position : "top-center"});

            api.post('/v1/solicitacaoDespesa/direcionarSolicitacao', {
                numsolicitacao: props.id_solicitacao,
                codconta,
                codCentroDeCusto,
                id_user_controladoria: Number(localStorage.getItem("id_usuario") || 0),
                id_usuario: Number(localStorage.getItem("id_usuario") || 0)
            })
            .then((retorno) =>{    
            

                const resposta = retorno.data;

                toast.update(id1, {
                    render: "Solicitação Nº:"+ resposta.numsolicitacao +" Direcionada com sucesso !", 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : FechaModal(1000),
                    onClose: props.onRequestClose2});
            
            })
            .catch((err) => {
                console.error("[Direcionar] erro:", err);
                let mensagem = "Erro inesperado. Tente novamente.";

                if (err?.response?.data?.detalhes?.[0]?.message) {
                    mensagem = err.response.data.detalhes[0].message;
                } 
                else if (err?.response?.data?.error) {
                    mensagem = err.response.data.error;
                }

                toast.update(id1, {
                    render: mensagem,
                    type: "error",
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false,
                });
            });


        }else if (props.tipoTela == "Editar"){

            // update                                                                        

            const dados = { 
                            tipodespesa,
                            numsolicitacao: props.id_solicitacao,
                            id_EmpresaFunc, 
                            id_Filialdespesa, 
                            id_solicitante:codFunc, 
                            dataEstimada: dataEstimada, 
                            objetivo,  
                            tipofornecedor: tipofornecedor, 
                            id_Fornecedor,
                            id_formadepagamento: formadePagamento,
                            chavepix,
                            id_banco,
                            agencia,
                            contaBancaria,
                            operacao,
                            tipoconta: tipotitularidade,
                            id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
                            itens: listaDeGasto                                                        
                        };

            const id1 = toast.loading("alterando solicitação de Despesa...", {position : "top-center"});

            api.post('/v1/solicitacaoDespesa/alteraSolicitaDespesa/', dados)
            .then((retorno) =>{    
            

                const resposta = retorno.data;

                toast.update(id1, {
                    render: "Solicitação Nº:"+ resposta.numsolicitacao +" alterado com sucesso !", 
                    type: "success", 
                    isLoading: false, 
                    closeOnClick: true,                            
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : FechaModal(1000),
                    onClose: props.onRequestClose2
                });
            
                uploadRef.current?.handleUpload();

            })
            .catch((err) =>{       
                console.error("[Editar] erro ao salvar:", err);
                const mensagem = err?.response?.data?.detalhes?.[0]?.message
                    || err?.response?.data?.error
                    || "Erro inesperado. Tente novamente.";

                toast.update(id1, {
                    render: mensagem, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false});
                    
            });


        }else if (props.tipoTela == "Ordenar"){
           
            if (status == 'L' && ValorGastoMaioQueValorDisponivel == true){

                Swal.fire(
                {
                    title: "Conta não tem mais orçamento disponível, deseja solicita análise da controladoria?",
                    showDenyButton: true,
                    icon: "question",
                    confirmButtonText: "Sim",
                    denyButtonText: "Não"
                }).then((result) => {
                    /* Read more about isConfirmed, isDenied below */
                    if (result.isConfirmed) {
                        
                        const dados = {
                            numsolicitacao: props.id_solicitacao,
                            id_ordenador: codFunc,
                            id_usuario: Number(localStorage.getItem("id_usuario") || 0),
                            status: "AJ",
                            obs_ordenador: "Solicitado ajuste do orcamento"
                        };

                        api.post('/v1/solicitacaoDespesa/ordenarSolicitacao', dados)
                        .then((retorno) =>{                                                             
            
                            const resposta = retorno.data;    
                            
                            Swal.fire("Solicitação encaminhada para controladoria!", "", "success");           
                            props.onRequestClose2();
                            FechaModal(1000);
                            
                           
                        
                        })
                        .catch((err) =>{       
                            console.error("[Ordenar/AJ] erro:", err);
                            const mensagem = err?.response?.data?.detalhes?.[0]?.message
                                || err?.response?.data?.error
                                || "Erro inesperado. Tente novamente.";

                            Swal.fire(mensagem, "", "warning");
                                
                        });
                    
                    
                        

                    } else if (result.isDenied) {
                        
                        
                    
                    }
                });
                    
            }else{
                       
                        const id1 = toast.loading("alterando solicitação de Despesa...", {position : "top-center"});
                        const dados = {
                            numsolicitacao: props.id_solicitacao,
                            id_ordenador: codFunc,
                            id_usuario: Number(localStorage.getItem("id_usuario") || 0),
                            status,
                            obs_ordenador,
                            valesSelecionados
                        };
                                                       
                        console.log(dados);
                        api.post('/v1/solicitacaoDespesa/ordenarSolicitacao', dados)
                        .then((retorno) =>{                                                             
            
                            const resposta = retorno.data; 
                                                        
                            toast.update(id1, {
                                render: "Solicitação Nº:"+ resposta.numsolicitacao +" alterado com sucesso !", 
                                type: "success", 
                                isLoading: false, 
                                closeOnClick: true,                            
                                autoClose: 1700,
                                pauseOnHover: false,
                                onclose : FechaModal(1000),
                                onClose: props.onRequestClose2
                            });                                        
                        
                        })
                        .catch((err) =>{       
                            console.error("[Ordenar] erro:", err);
                            const mensagem = err?.response?.data?.detalhes?.[0]?.message
                                || err?.response?.data?.error
                                || "Erro inesperado. Tente novamente.";
            
                            toast.update(id1, {
                                render: mensagem, 
                                type: "error", 
                                isLoading: false,
                                autoClose: 2000,
                                pauseOnHover: false});
                         
                        }); 
            }
            

        }else if (props.tipoTela == "Conformidade"){
            
            const id1 = toast.loading("autorizando solicitação de Despesa...", {position : "top-center"});

            const dados = {numsolicitacao: props.id_solicitacao,  
                           id_rotina_integracao: integracao, 
                           obs_financeiro,
                           id_usuario: Number(localStorage.getItem("id_usuario")),
                           id_user_financeiro: Number(localStorage.getItem("id_usuario")),
                           id_caixabanco: codCaixaBanco,
                           valesSelecionados,
                           historico1,
                           historico2,
                           id_grupo_empresa: localStorage.getItem("id_grupo_empresa")
                            };   
                                            
            api.post('/v1/solicitacaoDespesa/conformidadeSolicitacao', dados)
            .then((retorno) =>{                                                             

                const resposta = retorno.data; 
                                            
                toast.update(id1, {
                    render: "Solicitação Nº:"+ resposta.numsolicitacao +" autorizada com sucesso !", 
                    type: "success", 
                    isLoading: false, 
                    closeOnClick: true,                            
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : FechaModal(1000),
                    onClose: props.onRequestClose2
                });                                        
            
            })
            .catch((err) =>{  
                console.error("[Conformidade] erro:", err);
                const mensagem = err?.response?.data?.detalhes?.[0]?.message
                    || err?.response?.data?.error
                    || "Erro inesperado. Tente novamente.";

                toast.update(id1, {
                    render: mensagem, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false});
                
            }); 
            
        }
        
    }    

    function FechaModal(tempo){        
        setTimeout(function(){
            props.onRequestClose();
        }, tempo);        
    }

    function AdcionarItemListaDeGasto(dados){
        
        SetListaDeGasto([...listaDeGasto,dados]);
 
    }

    function AlterarItemListaDeGasto(dados){

        const list = [...listaDeGasto]; 

        list[index].descricao = dados.descricao;
        list[index].quantidade = dados.quantidade;
        list[index].vlunit = dados.vlunit;

        SetListaDeGasto(list);
    }

    function ExluirItemListaDeGasto(){
        const list = [...listaDeGasto];                
        list.splice(index, 1);
        SetListaDeGasto(list);
    }         
        
    // PROCESSAR CAMPOS (ATIVAR OU DESABILITAR)
    useEffect( () =>{
        
        SetListaDeStatus([
            {id: 1, status: "", descricao: "Selecione uma opção"},
            {id: 2, status: "N", descricao: "NEGADO. ORDENADOR"},
            {id: 3, status: "P", descricao: "PEND. SOLICITANTE"},
            {id: 4, status: "L", descricao: "PEND. FINANCEIRO"},
            {id: 5, status: "EA", descricao: "PEND. ORDENADOR"},
            {id: 6, status: "AJ", descricao: "AJUSTAR ORÇAMENTO"},
            {id: 7, status: "I", descricao: "LANÇADO NO WINTHOR"}
        ]);


        SetListaDeRotinaIntegracao(
            [    
            {id: 2, rotina: 631, descricao: "LANÇAR DESPESAS (631)"},
            {id: 3, rotina: 746, descricao: "ADIANTAMENTO AO FORNECEDOR (746)"},
            {id: 4, rotina: 749, descricao: "INCLUIR TITULO A PAGAR (749)"},                                  
            {id: 5, rotina: 99999, descricao: "REJEIÇÃO FINANCEIRA"}
            ]
        );           
        
        // INICIAR CAMPOS
        Settabhabilitada(false);
        SethabilitarbtnSalvar(false);
        setdisabledFoto(true);
        setdisabledFormadePagamento(true);
        setdisableChavePix(true);
        setdisabledBanco(true);
        setdisabledAgencia(true);
        setdisabledContaBancaria(true);
        setdisabledOperacao(true);
        setdisabledtipotitularidade(true);

        setdisabledTipoDespesa(true);
        
        setDisabledFilialDespesa(true);
        setDisabledDataEstimada(true);
        setDisableContaGerencial(true);
        setDisableCentroDecusto(true);
        setDisableObjetivoSolicitante(true);
        setDisableStatus(true);
        setDisableParecerOrdenador(true);
        setdisabledIntegrarCom(true);
        setDisabledParecerFinanceiro(true);
        setDisableCaixaBanco(true);
        setDisableAnexo(true);
        setdisabledFornecedor(true);

        // Visibles
        setVisibleContaGerencial(true);
        setVisibleCentroDeCusto(true);
        setVisibleStatus(true);
        setVisibleParecerOrdenador(true);
        setVisibleIntegrarCom(true);
        setVisibleParecerFinanceiro(true);
        setVisibleRespFinanceiro(true);
        setVisibleDataFinanceiro(true);
        setVisibleCaixaBanco(true);
        setvisibleRespOrdenador(true);
        setvisibleDataOrdenador(true);
        setvisibleObjetivoSolicitacao(true);
        setvisibleRespControladoria(true);
        setvisibleDataControladoria(true);   

        const statusAtual = String(status || '').trim().toUpperCase();
        const statusReferencia = props.tipoTela == 'Nova'
            ? statusAtual
            : String(statusCarregadoBanco || statusAtual).trim().toUpperCase();

        if (props.somenteLeitura === true || ["F", "I"].includes(statusReferencia)) {
            return;
        }
                     

        // campos na tela editar
        if (props.tipoTela == 'Nova') {

            // dados geral
            setdisabledTipoDespesa(false);
            setDisabledFilialDespesa(false);
            setDisabledDataEstimada(false);
            setdisabledFormadePagamento(false);
            setdisabledtipotitularidade(false);                        
            setDisableObjetivoSolicitante(false);                   
            setDisableAnexo(false);
            SethabilitarbtnSalvar(true);
            Settabhabilitada(true);                

            //controladoria
            setVisibleContaGerencial(false);
            setVisibleCentroDeCusto(false);
            setvisibleRespControladoria(false);
            setvisibleDataControladoria(false);            
            
            //ordenador
            setVisibleParecerOrdenador(false); 
            setvisibleRespOrdenador(false);
            setvisibleDataOrdenador(false); 
            setVisibleStatus(false);    
            
            //finaiceiro
            setVisibleIntegrarCom(false);
            setVisibleCaixaBanco(false);
            setVisibleParecerFinanceiro(false); 
            setVisibleRespFinanceiro(false);
            setVisibleDataFinanceiro(false);  
            setdisabledFornecedor(false);
            
            
                    
                        
        }else if (props.tipoTela == 'Editar'){
            
            if (["P", "A"].includes(statusReferencia)){

            // dados geral
            setdisabledTipoDespesa(false);
            setDisabledFilialDespesa(false);
            setDisabledDataEstimada(false);
            setdisabledFormadePagamento(false);
            setdisabledtipotitularidade(false);                        
            setDisableObjetivoSolicitante(false);                   
            setDisableAnexo(false);
            SethabilitarbtnSalvar(true);
            Settabhabilitada(true);   
            setdisabledFornecedor(false);           

            //controladoria
            setVisibleContaGerencial(true);
            setVisibleCentroDeCusto(true);
            setvisibleRespControladoria(true);
            setvisibleDataControladoria(true);            
            
            //ordenador
            setVisibleParecerOrdenador(false); 
            setvisibleRespOrdenador(false);
            setvisibleDataOrdenador(false); 
            setVisibleStatus(false);    
            
            //finaiceiro
            setVisibleIntegrarCom(false);
            setVisibleCaixaBanco(false);
            setVisibleParecerFinanceiro(false); 
            setVisibleRespFinanceiro(false);
            setVisibleDataFinanceiro(false); 
            
                
                
            }
            
        }else if (props.tipoTela == 'Direcionar'){

                      
            if (["EA", "A", "AJ"].includes(statusReferencia)){
                setdisabledTipoDespesa(true);
                setDisableContaGerencial(false);
                setDisableCentroDecusto(false);
                SethabilitarbtnSalvar(true);                        
            }            
            
        }else if (props.tipoTela == 'Ordenar'){

             
            
            if (["EA", "P" , "N"].includes(statusReferencia)){

                SetListaDeStatus([
                    {status: "", descricao: "Selecione uma opção"},
                    {status: "N", descricao: "NEGAR"},
                    {status: "P", descricao: "PEND. SOLICITANTE"},
                    {status: "L", descricao: "LIBERAR"}
                ]);

                setDisableStatus(false);  
                setDisableParecerOrdenador(false);
                SethabilitarbtnSalvar(true);

            }
            
        }else if (props.tipoTela == "Conformidade"){

             

            if (["L"].includes(statusReferencia)) {

                setdisabledIntegrarCom(false);
                setDisabledParecerFinanceiro(false);        
                SethabilitarbtnSalvar(true);
                
            }

        }
        
                        
    },[props.tipoTela, status, statusCarregadoBanco, props.somenteLeitura]);


    useEffect(()=>{

        const statusAtual = String(status || '').trim().toUpperCase();
        const statusReferencia = props.tipoTela == 'Nova'
            ? statusAtual
            : String(statusCarregadoBanco || statusAtual).trim().toUpperCase();

        if (integracao == 631 && ["L"].includes(statusReferencia) && props.tipoTela == "Conformidade"){        
            setDisableCaixaBanco(false);
        }else{            
            setDisableCaixaBanco(true);            
        }

        if (integracao != 631){
            setcodCaixaBanco(0);
            SetdescricaoCaixaBanco("");
        }
    
    },[integracao, status, statusCarregadoBanco, props.tipoTela]);


    // Verificar se o valor esta maior que o saldo
    useEffect( () => {

        if (vlGastoTotal > vlSaldoDisponivel){
            SetValorGastoMaioQueValorDisponivel(true)
        }else{
            SetValorGastoMaioQueValorDisponivel(false)
        };

    },[vlGastoTotal, vlSaldoDisponivel]);


    const statusAtualCodigo = String(status || statusCarregadoBanco || "").trim().toUpperCase();
    const statusAtualDescricao = listaDeStatus.find(
        (item) => String(item.status || "").trim().toUpperCase() === statusAtualCodigo
    )?.descricao || "Não informado";



    return(

        <Modal
                    isOpen={props.isOpen}
                    onRequestClose={props.onRequestClose}
                    overlayClassName="cad-modal-overlay solicitacao-modal-overlay"
                    ariaHideApp={false}
                    className="cad-modal-content solicitacao-modal-content"
        >

            <div className="cad-modal-header">
                <div>
                    <h4 className="cad-modal-title">
                        {props.id_solicitacao > 0 ? "Solicitação: " + props.id_solicitacao : "Nova Solicitação"}
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                        Preencha os dados da solicitação e clique em Salvar.
                    </p>
                </div>
                <button className="btn btn-outline-secondary" onClick={props.onRequestClose}>Fechar</button>
            </div>


            <div className="bsmodal-body">


                <ModalSolicitacaoDeDespesaItem isOpen={isItemOpen}
                                                       onRequestClose={closeModalItem} 
                                                       tipoModal={tipoModal}
                                                       GetItemSelecionado={ItemSelecionado}
                                                       AdcionarItemListaDeGasto={AdcionarItemListaDeGasto}
                                                       AlterarItemListaDeGasto={AlterarItemListaDeGasto}
                                                       ExluirItemListaDeGasto={ExluirItemListaDeGasto}
                                                       index = {index}/>   
                
                                
                        
                        
                
                        <div>
                
                        { (ValorGastoMaioQueValorDisponivel == true && props.tipoTela == "Ordenar") ?
                        <div className="alert alert-danger" role="alert">
                          {"Atenção: O valor desta despesa de "+new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format((vlGastoTotal))+" ultrapassa o valor orçado desta filial para o mês corrente, saldo disponivel de "+new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format((vlSaldoDisponivel))}
                        </div> : null
                        }

                        <div className={`solicitacao-tabs-wrap ${temAbaOcultaEsquerda ? "tem-aba-esquerda" : ""} ${temAbaOcultaDireita ? "tem-aba-direita" : ""}`}>
                            {temAbaOcultaEsquerda ? <span className="solicitacao-tabs-arrow esquerda" aria-hidden="true">&#x2039;</span> : null}
                            {temAbaOcultaDireita ? <span className="solicitacao-tabs-arrow direita" aria-hidden="true">&#x203A;</span> : null}
                        <div className="solicitacao-tabs" role="tablist" aria-label="Abas da solicitação de despesa" ref={tabsRef} onScroll={atualizarIndicadoresDeAbas}>
                            {props.id_solicitacao ? (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "historico"}
                                className={`solicitacao-tab-btn ${abaAtiva === "historico" ? "active" : ""}`}
                                onClick={() => onClickAba("historico")}
                                ref={(elemento) => { tabsButtonsRef.current.historico = elemento; }}
                            >
                                HISTÓRICO
                            </button>
                            ) : null}
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "solicitacao"}
                                className={`solicitacao-tab-btn ${abaAtiva === "solicitacao" ? "active" : ""}`}
                                onClick={() => onClickAba("solicitacao")}
                                ref={(elemento) => { tabsButtonsRef.current.solicitacao = elemento; }}
                            >
                                DADOS GERAIS
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "anexo"}
                                className={`solicitacao-tab-btn ${abaAtiva === "anexo" ? "active" : ""}`}
                                onClick={() => onClickAba("anexo")}
                                ref={(elemento) => { tabsButtonsRef.current.anexo = elemento; }}
                            >
                                ANEXO
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "itens"}
                                className={`solicitacao-tab-btn ${abaAtiva === "itens" ? "active" : ""}`}
                                onClick={() => onClickAba("itens")}
                                ref={(elemento) => { tabsButtonsRef.current.itens = elemento; }}
                            >
                                ITENS
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "controladoria"}
                                className={`solicitacao-tab-btn ${abaAtiva === "controladoria" ? "active" : ""}`}
                                onClick={() => onClickAba("controladoria")}
                                ref={(elemento) => { tabsButtonsRef.current.controladoria = elemento; }}
                            >
                                CONTROLADORIA
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "ordenador"}
                                className={`solicitacao-tab-btn ${abaAtiva === "ordenador" ? "active" : ""}`}
                                onClick={() => onClickAba("ordenador")}
                                ref={(elemento) => { tabsButtonsRef.current.ordenador = elemento; }}
                            >
                                ORDENADOR
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={abaAtiva === "financeiro"}
                                className={`solicitacao-tab-btn ${abaAtiva === "financeiro" ? "active" : ""}`}
                                onClick={() => onClickAba("financeiro")}
                                ref={(elemento) => { tabsButtonsRef.current.financeiro = elemento; }}
                            >
                                FINANCEIRO
                            </button>
                        </div>
                        </div>

                        <div className="solicitacao-status-alert" role="alert" aria-live="polite">
                            <span className="solicitacao-status-alert-label">Status da solicitação:</span>
                            <span className="solicitacao-status-alert-value">{statusAtualDescricao}</span>
                            <span className="solicitacao-status-alert-code">({statusAtualCodigo || "-"})</span>
                        </div>
                        
                        {abaAtiva === "solicitacao" ? <>
                            <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                <div className="col-12">
                    <div className="solicitacao-subsection-block">
                        <div className="row g-3">

                                        <div className="col-lg-2 mb-3">
                                            <label htmlFor="tipodespesa" className="mb-2">Tipo de Despesa</label>                                    
                                                <select autoFocus className="form-control" id="tipodespesa" 
                                                    onChange={(e) => settipodespesa(e.target.value)} 
                                                    value={tipodespesa}
                                                    disabled={disabledTipoDespesa}
                                                    >
                                                <option key={1} value={"F"}>Outras</option>
                                                <option key={2} value={"L"}>Viagem</option> 
                                                <option key={3} value={"EB"}>Encargos e Beneficios</option> 
                                                </select>
                                        </div>
                
                                        <div className="col-lg-4 mb-3">   
                                            <label htmlFor="fl-1" className="mb-2">Filial</label>                   
                                            <input className="form-control" placeholder={"Buscando ..."} value={id_EmpresaFunc+" - "+filialFunc} id={"fl-1"} disabled />  
                                        </div> 
                
                                        <div className="col-lg-6 mb-3">   
                                            <label htmlFor="Nome" className="mb-2">Solicitante</label>                   
                                            <input className="form-control" placeholder={"Buscando ..."} id={"Nome"} value={codFunc+" - "+nomeFunc} disabled /> 
                                        </div> 
                
                                        <div className="col-lg-6 mb-3">   
                                            <label htmlFor="fl-2" className="mb-2">Filial da Despesa</label>                   
                                            <EditComplete placeholder={"Informe a filial da Despesa"} id={"fl-2"}  
                                                          tipoConsulta={"filial2"} 
                                                          onClickCodigo={Set_Id_Filialdespesa}  
                                                          onClickDescricao={SetFilialDespesa}
                                                          value={filialDespesa} 
                                                          disabled={disabledFilialDespesa}/>
                                        </div> 
                                        
                                        <div className="col-lg-6 mb-3">   
                                            
                                            
                                            <div className="row">
                                                
                
                                                <div className="col-6 mb-1">   
                                                    <label htmlFor="DataEstimada" className="mb-2">Data Estimada</label>                   
                                                    <input type="date" className="form-control" id="DataEstimada" placeholder={dataEstimada}
                                                                        value={dataEstimada}
                                                                        onChange={(e) => {SetDatastimada(e.target.value)}}
                                                                        disabled={disabledDataEstimada} /> 
                                                </div>

                                                <div className="col-6">
                                                    <label htmlFor="DataDaSolicitação" className="mb-2">Data da Solicitação</label>                   
                                                    <input type="text" className="form-control" id="DataDaSolicitação" placeholder={dataSolicitacao}
                                                                        value={dataSolicitacao} 
                                                                        disabled/> 
                                                </div>
                
                                            </div>
                
                                        </div>                         
                
                                        <div className="col-lg-2 mb-3">
                                    
                                            <label htmlFor="tipoparceiro" className="mb-2">Tipo de Parceiro</label>                                    
                                                <select className="form-control" id="tipoparceiro" 
                                                    onChange={(e) => settipofornecedor(e.target.value)} 
                                                    value={tipofornecedor}
                                                    disabled={disabledTipoFornecedor}
                                                    >                                
                                                <option key={1} value={"fo"}>Fornecedor</option> 
                                                <option key={2} value={"us"}>Funcionario</option>
                                                </select>
                
                                        </div>                                        
                
                
                
                                        <div className="col-lg-4 mb-3">   
                                            {/*parceiro*/}
                                            <label htmlFor="fo-1" className="mb-2">{labeltipoParceiro}</label>                   
                                            <EditComplete placeholder={labeltipoParceiro} id={tipofornecedor}  
                                                          tipoConsulta={tipofornecedor} 
                                                          onClickCodigo={Set_id_Fornecedor} 
                                                          onClickDescricao={SetFornecedor}
                                                          value={Fornecedor} 
                                                          disabled={disabledFornecedor}/>
                                        </div>
                
                                        <div className="col-lg-3 mb-3">
                                    
                                            <label htmlFor="formadepagamento" className="mb-2">Forma de Pagamento</label>                                    
                                                <select className="form-control" id="formadepagamento" 
                                                    onChange={(e) => setformadePagamento(e.target.value)} 
                                                    value={formadePagamento}
                                                    disabled={disabledFormadePagamento}
                                                >                                
                                                <option key={0} value={0}>{`Selecione...`}</option> 
                                                
                                                {
                                                    listaFormaDePagamento.map((item) =>{
                                                        return(
                                                            <option key={item.id_formadepagamento} value={item.id_formadepagamento}>{item.formadepagamento}</option> 
                                                        );
                                                    })
                                                }
                                                                                                
                                                </select>
                
                                        </div>  
                
                
                                        <div className="col-lg-3 mb-3">
                                    
                                            <label htmlFor="tipotitularidade" className="mb-2">Tipo de Titularidade</label>                                    
                                                <select className="form-control" id="tipotitularidade" 
                                                    onChange={(e) => settipotitularidade(e.target.value)} 
                                                    value={tipotitularidade}
                                                    disabled={disabledtipotitularidade}
                                                    >                                
                                                <option key={0} value={0}>{`Selecione...`}</option> 
                                                <option key={1} value={1}>{`Conta Propria`}</option> 
                                                <option key={2} value={2}>{`Conta de Terceiro`}</option>
                                                </select>
                
                                        </div> 

                                       
                                        
                                        <div className="col-lg-3 mb-3">
                                            <label htmlFor="chavepix" className="mb-2">Chave PIX</label>                   
                                            <input disabled={disableChavePix} type="text" className="form-control" id="chavepix" 
                                                                                placeholder={"Chave PIX"}                                                                
                                                                                value={chavepix}
                                                                                onChange={(e) => setchavepix(e.target.value)}
                                                                                 /> 
                                        </div>
                
                                         <div className="col-lg-3 mb-3">   
                                            <label htmlFor="ib" className="mb-2">Banco</label>                                               
                                            <EditComplete placeholder={"Banco"} id={"ib"}  
                                                    tipoConsulta={"Banco"} 
                                                    onClickCodigo={setid_banco} 
                                                    onClickDescricao={setbanco}
                                                    value={banco} 
                                                    disabled={disabledBanco}/>
                                        </div>
                                         
                                        <div className="col-lg-2 mb-3">
                                            <label htmlFor="agencia" className="mb-2">Agencia</label>                   
                                            <input disabled={disabledAgencia} type="text" className="form-control" id="agencia" 
                                                                                placeholder={"Agencia"}                                                                
                                                                                value={agencia}
                                                                                 /> 
                                        </div>
                
                                        <div className="col-lg-2 mb-3">
                                            <label htmlFor="contabancaria" className="mb-2">Conta Bancaria</label>                   
                                            <input disabled={disabledContaBancaria} type="text" className="form-control" id="contabancaria" 
                                                                                placeholder={"Conta Bancaria"}                                                                
                                                                                value={contaBancaria}
                                                                                 /> 
                                        </div> 
                
                                        <div className="col-lg-2 mb-3">
                                            <label htmlFor="operacao" className="mb-2">Operação</label>                   
                                            <input disabled={disabledOperacao} type="text" className="form-control" id="operacao" 
                                                                                placeholder={"Operação"}                                                                
                                                                                value={operacao}
                                                                                 /> 
                                        </div>                                                                                                                                                               
                                                                                            

                                        { visibleObjetivoSolicitacao == true ?
                                            <div className="col-12 mb-3">   
                                            <label htmlFor="Objetivo" className="mb-2">Objetivo da Solicitação</label>                   
                                            <textarea className="form-control" 
                                                      id="Objetivo" rows="5" 
                                                      value={objetivo} 
                                                      onChange={(e) => {SetObjetivo(e.target.value)}} 
                                                      placeholder="Informe para qual objetivo e a solicitação " 
                                                      disabled={disableObjetivoSolicitante}></textarea>
                                            </div> : null
                                        }

                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </> : null}

                        {abaAtiva === "anexo" ? <>
                            <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                                <div className="col-12">
                                    <div className="solicitacao-subsection-block">
                                        <div className="row g-3">
                                            <div className="col-12 mb-1">
                                                <UploadArquivos
                                                    ref={uploadRef}
                                                    idRotina={"1030.1"}
                                                    idRelacional={proximoid}
                                                    disabled={disableAnexo}
                                                    //acceptTypes="image/*,application/pdf"
                                                    capture={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </> : null}

                        {abaAtiva === "itens" ? <>
                            <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                                <div className="col-12">
                                    <div className="solicitacao-subsection-block">
                                        <div className="row g-3">
                                            <div className="col-12">
                                            { tipoGrid == "M" ? <GridMobile openModalItem={openModalItem}
                                                                        dados={listaDeGasto}
                                                                        tipoModal={setTipoModal}
                                                                        SeItemSelecionado={SeItemSelecionado}
                                                                        onClikSalvar={onClikSalvar}
                                                                        setIndex = {setIndex}
                                                                        tabhabilitada={tabhabilitada}
                                                                        totalvale={totalSelecionado}
                                                                        habilitarbtnSalvar={habilitarbtnSalvar}/>

                                                            : <GridDesktop openModalItem={openModalItem}
                                                                        dados={listaDeGasto}
                                                                        tipoModal={setTipoModal}
                                                                        SeItemSelecionado={SeItemSelecionado}
                                                                        onClikSalvar={onClikSalvar}
                                                                        setIndex = {setIndex}
                                                                        tabhabilitada={tabhabilitada}
                                                                        totalvale={totalSelecionado}
                                                                        habilitarbtnSalvar={habilitarbtnSalvar}
                                                                        />
                                                                                        }
                                                                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </> : null}

                        {abaAtiva === "controladoria" ? <>
                            <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                <div className="col-12">
                    <div className="solicitacao-subsection-block">
                        <div className="row g-3">

                                        {
                                            visibleContaGerencial == true ? 
                                            
                                                <div className="col-lg-12 mb-3">   
                                                    <label htmlFor="cg" className="mb-2">Conta Gerencial</label>                   
                                                    <EditComplete autoFocus placeholder={"Informe a Conta Gerencial"} id={"cg"}  
                                                                tipoConsulta={"cg"} 
                                                                onClickCodigo={setCondConta} 
                                                                onClickDescricao={SetDescricaoConta}
                                                                value={descricaoConta} 
                                                                disabled={disableContaGerencial}/>
                                                </div> : null
                                        }
                                
                                        {
                                            visibleCentroDeCusto == true ? 
                                                <div className="col-lg-8 mb-2">   
                                                    <label htmlFor="cc" className="mb-2">Centro de Custo</label>                   
                                                    <EditComplete placeholder={"Informe o Centro de Custo"} id={"cc"}  
                                                                tipoConsulta={"cc"} 
                                                                onClickCodigo={setCentroDeCusto} 
                                                                onClickDescricao={SetDescricaoCentroDeCusto}
                                                                value={descricaoCentroDeCusto} 
                                                                disabled={disableCentroDecusto}/>
                                                </div> : null
                                        } 

                                        { visibleRespControladoria == true ?
                                        <div className="col-lg-1 mb-3">   
                                            <label htmlFor="rescontro" className="mb-2">% Rateio</label>                   
                                            <input type="number" step={"0.01"}  className="form-control" placeholder={"% Rateio ..."} id={"rescontro"} value={percentualRateio} 
                                                onChange={onChangePercentual}
                                                disabled={disableCentroDecusto}
                                            /> 
                                        </div> : null
                                        }  

                                        { visibleRespControladoria == true ?
                                        <div className="col-lg-1 mb-3">   
                                            <label htmlFor="rescontro" className="mb-2">Valor</label>                   
                                            <input type="number" step={"0.01"} className="form-control" placeholder={"% Rateio ..."} id={"rescontro"} value={valorRateio} 
                                                onChange={onChangeValor}
                                                disabled={disableCentroDecusto}
                                            /> 
                                        </div> : null
                                        }   

                                        { visibleRespControladoria == true ?
                                        <div className="col-lg-1 mb-3">   
                                            <label htmlFor="rescontro" className="mb-2">Despesa</label>                   
                                            <input type="number" step={"0.01"} className="form-control" placeholder={"% Rateio ..."} id={"rescontro"} value={valorTotalRateio - totalSelecionado} disabled/> 
                                        </div> : null
                                        }  
                                        
                                        {visibleCentroDeCusto == true ?<>
                                        <div className="col-lg-1 mb-3">
                                            <button
                                            type="button"
                                            className="btn btn-secondary marg-botao-incluir-rateio w-100"
                                            onClick={onClickIncluirRateio}
                                            disabled={disableCentroDecusto}
                                            >
                                            Incluir
                                            
                                            </button>                                                                                                                                                                                                                                                     
                                        </div></>: null
                                        }
                                        
                                        { visibleCentroDeCusto == true ? <>

                                        <div className="grid-desktop-rateio grid-desktop-rateio-compact">
                                        <div className="cadastro-table-card">

                                            {/* GRID */}
                                            <div className="tableFixHead">
                                            <table className="table table-hover mb-0 cadastro-table">
                                                <thead>
                                                <tr>
                                                    <th>Centro de Custo</th>
                                                    <th className="text-center" style={{ width: "90px" }}>%</th>
                                                    <th className="text-end" style={{ width: "140px" }}>Valor</th>
                                                    <th className="text-end" style={{ width: "60px" }}></th>
                                                </tr>
                                                </thead>

                                                <tbody>
                                                {rateio.length > 0 ? (
                                                    rateio.map((item, index) => (
                                                    <tr key={index} className="cadastro-row-clickable">
                                                        <td>
                                                        <strong>{item.id_centrodecusto}</strong> - {item.descricao}
                                                        </td>

                                                        <td className="text-center">
                                                        {item.percentual}%
                                                        </td>

                                                        <td className="text-end">
                                                        {new Intl.NumberFormat("pt-BR", {
                                                            style: "currency",
                                                            currency: "BRL",
                                                        }).format(item.valor)}
                                                        </td>

                                                        <td className="text-end">
                                                            {!disableCentroDecusto ? <>
                                                                <button
                                                                    className="btn-remove"
                                                                    title="Remover rateio"
                                                                    onClick={() => onClickExcluirRateio(item.id_rateio)}                                                                    
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                                </>: null
                                                            }                                                        
                                                        </td>
                                                    </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                    <td colSpan="4" className="text-center text-muted py-3">
                                                        Nenhum rateio informado
                                                    </td>
                                                    </tr>
                                                )}
                                                </tbody>
                                            </table>
                                            </div>

                                            {/* TOTALIZADOR */}
                                        </div>
                                        <div className="grid-rateio-totals">
                                            <span><strong>Registros:</strong> {qtRegistro}</span>
                                            <span><strong>% Total:</strong> {totalPercentual.toFixed(2)}%</span>
                                            <span><strong>Valor Total:</strong> {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor)}</span>
                                        </div>
                                        </div> </>: null
                                        }

                                    
                                      
                                    
                                                                                

                                        { visibleRespControladoria == true ?
                                        <div className="col-lg-9 mb-3">   
                                            <label htmlFor="rescontro" className="mb-2">Res. Lanc. Controladoria</label>                   
                                            <input className="form-control" placeholder={"Buscando ..."} id={"rescontro"} value={id_controladoria ? `${id_controladoria} - ${nomecontroladoria}` : ""} disabled /> 
                                        </div> : null
                                        }
                                        
                                        { visibleDataControladoria == true ?
                                        <div className="col-lg-3 mb-3">   
                                                        <label htmlFor="datadire" className="mb-2">Data do Direcinado</label>                   
                                                        <input type="text" className="form-control" placeholder={"Buscando ..."} id={"datadire"} value={dataControladoria} disabled /> 
                                        </div> : null
                                        }

                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </> : null}

                        {abaAtiva === "ordenador" ? <>
                            <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                <div className="col-12">
                    <div className="solicitacao-subsection-block">
                        <div className="row g-3">

                                        {visibleStatus == true ?
                                            <div className="col-lg-12 mb-3">
                                        
                                            <label htmlFor="status" className="mb-2">Status</label>                                    
                                            <select className="form-control" id="status" onChange={(e) => Setstatus(e.target.value)} value={status} disabled={disableStatus}>
                                            { listaDeStatus.map((i) => {
                                                  return  <option key={i.id} value={i.status}>{i.descricao}</option>
                                                })
                                            }                                    
                                            </select>
                
                                        </div> : null}                        
                                                                                                
                                        { visibleParecerOrdenador == true ?
                                            <div className="col-12 mb-3">   
                                            <label htmlFor="parecerordenador" className="mb-2">Parecer do Ordenador</label>                   
                                            <textarea className="form-control" 
                                                      id="parecerordenador" rows="5"                                                                             
                                                      placeholder="Observação do ordenador" onChange={(e) => SetObs_ordenador(e.target.value)} value={obs_ordenador} disabled={disableParecerOrdenador}></textarea>
                                            </div>  : null 
                                        }   


                                        { visibleRespOrdenador == true ? 
                                        <div className="col-lg-9 mb-3">   
                                            <label htmlFor="resordenador" className="mb-2">Res. Lanc. Ordenador</label>                   
                                            <input className="form-control" placeholder={"Buscando ..."} id={"resordenador"} value={id_ordenador ? `${id_ordenador} - ${nomeordenador}` : ""} disabled /> 
                                        </div> : null
                                        }
                                        
                                        { visibleDataOrdenador == true ?
                                        <div className="col-lg-3 mb-3">   
                                                        <label htmlFor="dataordenador" className="mb-2">Data da Ordenação</label>                   
                                                        <input type="text" className="form-control" placeholder={"Buscando ..."} id={"dataordenador"} value={dataOrdenacao} disabled /> 
                                        </div> : null
                                        }

                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </> : null}
                                
                        </div>


                        
                        {abaAtiva === "financeiro" ? <>
                        <div className="solicitacao-tab-panel">
                        <div className="row conteiner-campos g-3">
                            <div className="col-12">
                                <div className="solicitacao-subsection-block">
                                    <div className="row g-3">

                                        {visibleIntegrarCom == true ?

                                            <div className="col-lg-12 mb-2">

                                                <label htmlFor="integrar" className="mb-2">Integrar com</label>
                                                <select className="form-control" id="integrar" onChange={(e) => setIntegracao(e.target.value)} value={integracao} disabled={disabledIntegrarCom}>
                                                <option value={0}>{"Selecione a integração"}</option>
                                                { listaDeRotinaIntegracao.map((i) => {
                                                        return  <option key={i.id} value={i.rotina}>{i.descricao}</option>
                                                    })
                                                }
                                                </select>

                                            </div> : null
                                        }


                                        {
                                            visibleCaixaBanco == true ?
                                                <div className="col-lg-12 mb-3">
                                                    <label htmlFor="cb" className="mb-2">Caixa/Banco</label>
                                                    <EditComplete placeholder={"Caixa/Banco"} id={"cb"}
                                                                tipoConsulta={"cb"}
                                                                onClickCodigo={setcodCaixaBanco}
                                                                onClickDescricao={SetdescricaoCaixaBanco}
                                                                value={descricaoCaixaBanco}
                                                                disabled={disableCaixaBanco}
                                                                />
                                                </div> : null
                                        }

                                        {/* PAINEL DE VALES */}
                                        {(listaVala1 && listaVala1.length > 0 && ["Conformidade", "Ordenar"].includes(props.tipoTela)) && (
                                        <div className="col-12">
                                            <div className="vale-panel">

                                                {/* Cabeçalho */}
                                                <div className="vale-panel-header">
                                                    <i className="bi bi-cash-coin vale-panel-header-icon"></i>
                                                    <span className="vale-panel-header-title">Vales em Aberto</span>
                                                    <span className="vale-panel-header-badge">{listaVala1.length}</span>
                                                </div>

                                                {/* Tabela */}
                                                <div className="vale-panel-table-wrap">
                                                    <table className="vale-panel-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="vale-col-check"></th>
                                                                <th className="vale-col-id">Nº Vale</th>
                                                                <th className="vale-col-venc">Vencimento</th>
                                                                <th className="vale-col-valor">Valor</th>
                                                                <th className="vale-col-status">Situação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {listaVala1.map((vale) => {
                                                                const selecionado = valesSelecionados.some((v) => v.id_vale === vale.id_vale);
                                                                const jaBaixado = vale.flegar === "B";
                                                                const disabled = props.somenteLeitura === true || jaBaixado || ["I"].includes(status);
                                                                return (
                                                                    <tr key={vale.id_vale} className={`vale-row${selecionado ? " vale-row-selected" : ""}${jaBaixado ? " vale-row-baixado" : ""}`}>
                                                                        <td className="vale-col-check">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="vale-checkbox"
                                                                                checked={selecionado}
                                                                                disabled={disabled}
                                                                                onChange={() => toggleVale(vale)}
                                                                            />
                                                                        </td>
                                                                        <td className="vale-col-id">
                                                                            <span className="vale-id-pill">#{vale.id_vale}</span>
                                                                        </td>
                                                                        <td className="vale-col-venc">
                                                                            {moment(vale.data_vencimento).format("DD/MM/YYYY")}
                                                                        </td>
                                                                        <td className="vale-col-valor">
                                                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(vale.valor)}
                                                                        </td>
                                                                        <td className="vale-col-status">
                                                                            {jaBaixado
                                                                                ? <span className="vale-badge vale-badge-baixado">Baixado</span>
                                                                                : <span className="vale-badge vale-badge-aberto">Em Aberto</span>
                                                                            }
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Rodapé com totais */}
                                                <div className="vale-panel-totals">
                                                    <div className="vale-total-item">
                                                        <span className="vale-total-label">Total Geral</span>
                                                        <span className="vale-total-value">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                .format(listaVala1.reduce((acc, v) => acc + (v.valor || 0), 0))}
                                                        </span>
                                                    </div>
                                                    <div className="vale-total-divider"></div>
                                                    <div className="vale-total-item">
                                                        <span className="vale-total-label">Selecionado para Baixa</span>
                                                        <span className="vale-total-value vale-total-value-baixa">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                .format(totalSelecionado)}
                                                        </span>
                                                    </div>
                                                    <div className="vale-total-divider"></div>
                                                    <div className="vale-total-item">
                                                        <span className="vale-total-label">Saldo Restante</span>
                                                        <span className="vale-total-value vale-total-value-saldo">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                .format(listaVala1.reduce((acc, v) => acc + (v.valor || 0), 0) - totalSelecionado)}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                        )}

                                        { visibleParecerFinanceiro == true ?
                                                        <div className="col-12 mb-3">
                                                        <label htmlFor="parefin" className="mb-2">Parecer Financeiro</label>
                                                        <textarea className="form-control"
                                                                  id="parefin" rows="5"
                                                                  placeholder="Observação do Financeiro" onChange={(e) => SetObs_financeiro(e.target.value)} value={obs_financeiro} disabled={disableParecerFinanceiro}></textarea>
                                                        </div>  : null
                                        }

                                        { visibleParecerFinanceiro == true ?
                                                        <div className="col-12 mb-3">
                                                        <label htmlFor="parefin" className="mb-2">Historico 1</label>
                                                        <input type="text" className="form-control" id="datafin" placeholder={"Historico 1"}
                                                                            maxLength={200}
                                                                            value={historico1}
                                                                            onChange={(e) => sethistorico1(e.target.value.toUpperCase())}
                                                                            disabled={disabledIntegrarCom}/>
                                                        </div>  : null
                                        }

                                        { visibleParecerFinanceiro == true ?
                                                        <div className="col-12 mb-3">
                                                        <label htmlFor="parefin" className="mb-2">Historico 2</label>
                                                        <input type="text" className="form-control" id="datafin" placeholder={"Historico 2"}
                                                                            maxLength={200}
                                                                            value={historico2}
                                                                            onChange={(e) => sethistorico2(e.target.value.toUpperCase())}
                                                                            disabled={disabledIntegrarCom}/>
                                                        </div>  : null
                                        }

                                        { visibleRespFinanceiro == true ?
                                            <div className="col-lg-9 mb-3">
                                                        <label htmlFor="resfina" className="mb-2">Res. Lanc. Finaiceiro</label>
                                                        <input className="form-control" placeholder={"Buscando ..."} id={"resfina"} value={id_financeiro ? `${id_financeiro} - ${nomefinanceiro}` : ""} disabled />
                                            </div> : null
                                        }


                                        { visibleDataFinanceiro == true ?
                                            <div className="col-lg-3 mb-3">
                                                        <label htmlFor="datafin" className="mb-2">Data Financeiro</label>
                                                        <input type="text" className="form-control" id="datafin" placeholder={"Buscando ..."}
                                                                            value={datalancfinaceiro}
                                                                            disabled/>
                                            </div> : null
                                        }

                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                        </> : null}

                        {abaAtiva === "historico" ? <>
                        <div className="solicitacao-tab-panel">
                            <div className="row conteiner-campos g-3">
                                <div className="col-12">
                                    <div className="solicitacao-subsection-block">

                                        {historicoFluxoLoading ? (
                                            <div className="text-center py-4 text-muted">
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Carregando histórico...
                                            </div>
                                        ) : (
                                        <div className="historico-timeline">

                                            {historicoFluxo.length === 0 && (
                                                <div className="text-muted text-center py-3">Nenhum registro de histórico encontrado.</div>
                                            )}

                                            {historicoFluxo.map((item, idx) => {
                                                const etapaMap = {
                                                    SOLICITACAO:   { label: 'Solicitação Criada',          icon: 'bi-person-fill',    dotClass: 'historico-dot-solicitante' },
                                                    CONTROLADORIA: { label: 'Controladoria',               icon: 'bi-journal-check',  dotClass: 'historico-dot-controladoria' },
                                                    ORDENADOR:     { label: 'Ordenador',                   icon: 'bi-check2-circle',  dotClass: 'historico-dot-ordenador' },
                                                    FINANCEIRO:    { label: 'Financeiro',                  icon: 'bi-bank2',          dotClass: 'historico-dot-financeiro' },
                                                };
                                                const statusMap = {
                                                    A:  { label: 'Aguardando',           bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
                                                    EA: { label: 'Em Análise',           bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
                                                    P:  { label: 'Pendente',             bg: '#fce4ec', color: '#c62828', border: '#ef9a9a' },
                                                    L:  { label: 'Liberado',             bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
                                                    F:  { label: 'Finalizado',           bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
                                                    N:  { label: 'Não Autorizado',       bg: '#fbe9e7', color: '#bf360c', border: '#ffab91' },
                                                    AJ: { label: 'Ajuste Solicitado',    bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
                                                    I:  { label: 'Inativo',              bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' },
                                                };
                                                const etapa = (item.etapa || '').toUpperCase();
                                                const meta = etapaMap[etapa] || { label: item.etapa, icon: 'bi-clock-history', dotClass: 'historico-dot-pendente' };
                                                const statusInfo = statusMap[(item.status_depois || '').toUpperCase()] || { label: item.status_depois, bg: '#e8f5e9', color: '#388e3c', border: '#a5d6a7' };
                                                const data = item.datahora ? moment(item.datahora).format('DD/MM/YYYY HH:mm') : '';
                                                return (
                                                <div key={idx} className="historico-item">
                                                    <div className={`historico-dot ${meta.dotClass}`}>
                                                        <i className={`bi ${meta.icon}`}></i>
                                                    </div>
                                                    <div className="historico-content">
                                                        <div className="historico-header">
                                                            <span className="historico-etapa">{meta.label}</span>
                                                            {item.status_depois && (
                                                                <span className="historico-badge-pend" style={{background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border}}>
                                                                    {statusInfo.label}
                                                                </span>
                                                            )}
                                                            {data && <span className="historico-data">{data}</span>}
                                                        </div>
                                                        {item.nome_usuario && (
                                                            <div className="historico-usuario"><i className="bi bi-person me-1"></i>{item.nome_usuario}</div>
                                                        )}
                                                        {item.observacao && item.observacao.trim() && (
                                                            <div className="historico-obs"><i className="bi bi-chat-left-text me-1"></i>{item.observacao}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })}

                                        </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        </div>
                        </> : null}

            </div>



            <div className="cad-modal-footer">
                <div className="cad-modal-footer-actions">
                {  habilitarbtnSalvar ?
                    <button
                    type="button"
                    className="btn btn-primary cad-footer-btn"
                    onClick={onClikSalvar}
                    >
                    Salvar
                    </button>
                    : null
                }
                </div>
            </div>

        </Modal>
    )
}

export default SolicitacaoDeDespesaModal;