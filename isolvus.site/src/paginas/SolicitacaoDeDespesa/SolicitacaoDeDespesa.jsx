import Menu from "../../componentes/Menu/Menu";
import "./SolicitacaoDeDespesa.css";
import ModalSolicitacaoDeDespesaItem from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalSolicitacaoDeDespesaItem"
import { useEffect, useRef, useState } from "react";
import GridMobile from "../../componentes/SolicitacaoDeDesepesa/Grids/GridMobile";
import GridDesktop from "../../componentes/SolicitacaoDeDesepesa/Grids/GridDesktop";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import "./SolicitacaoDeDespesaConsultar.css";
import moment from "moment";
import api from "../../servidor/api";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Swal from 'sweetalert2';
import UploadArquivos from "../../componentes/UploadArquivos/UploadArquivos";


function SolicitacaoDeDespesa() {

    /*Variaves de Layout */
    const [proximoid, setproximoid] = useState(0);
    const [tipoGrid, setTipoGrid] = useState("");
    const [isItemOpen, setisItemOpen] = useState(false); 
    const uploadRef = useRef();;   
    
    /*dasboard*/    

    const [tipodespesa, settipodespesa] = useState("F");

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
    const [disabledFormadePagamento, setdisabledFormadePagamento] = useState(false);
    const [disableChavePix, setdisableChavePix] = useState(true);
    const [disabledBanco, setdisabledBanco] = useState(true);
    const [disabledAgencia, setdisabledAgencia] = useState(true);
    const [disabledContaBancaria, setdisabledContaBancaria] = useState(true);
    const [disabledOperacao, setdisabledOperacao] = useState(true);
    const [disabledtipotitularidade, setdisabledtipotitularidade] = useState(false);


    useEffect( () =>{

        if (formadePagamento === "0" && ["Nova", "Editar"].includes(tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(0);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "1" && ["Nova", "Editar"].includes(tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(0);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "2" && ["Nova", "Editar"].includes(tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "3" && ["Nova", "Editar"].includes(tipoTela)){
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(false);
        }else if (formadePagamento === "4" && ["Nova", "Editar"].includes(tipoTela)) {
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            settipotitularidade(1);
            setdisabledtipotitularidade(true);
        }

                         
 
        
    },[formadePagamento])


    useEffect(()=>{

        switch (tipofornecedor) {
            case "fo" : setlabeltipoParceiro("Fornecedor");
            break;
            case "cl" : setlabeltipoParceiro("Cliente");
            break;
            case "us" : setlabeltipoParceiro("Funcionario");
            break;            
        }

    },[tipofornecedor])

    const [dadosDashPercRealizado, SetdadosDashPercRealizado] = useState([]);
    const [dadosDashOrcadoRealizadoCategories, SetdadosDashOrcadoRealizadoCategories] = useState([]);
    const [dadosDashOrcadoRealizadoOrcado, SetdadosDashOrcadoRealizadoOrcado] = useState([]);
    const [dadosDashOrcadoRealizadoRealizado, SetdadosDashOrcadoRealizadoRealizado] = useState([]);        

    const [vlorcadototal , setvlorcadototal] = useState(0);
    const [vlrealizadototal , setvlrealizadototal] = useState(0);
    

    const [listaDeStatus, SetListaDeStatus] = useState([]);
     
    const [tipoModal, setTipoModal] = useState("");
    const navigate = useNavigate();

    const {tipoTela} = useParams();
    const {id_solicitacao} = useParams(); // para busta paramentro na rota
    
    const [disabledFornecedor, setdisabledFornecedor] = useState(false);
    const [disabledTipoFornecedor, setdisabledTipoFornecedor] = useState(false);
    const [disabledEmiteNota, setdisabledEmiteNota] = useState(false);
    
    const [disabledTipoDespesa, setdisabledTipoDespesa] = useState(false);

    useEffect(() =>{

        switch (tipodespesa) {
            case "F": 
            setdisabledTipoFornecedor(false);
            settipofornecedor("fo");             
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);       
            break;

            case "L": 

            if (tipoTela == "Nova"){
                settipofornecedor("us");
                Set_id_Fornecedor(localStorage.getItem("id_usuario"));
                SetFornecedor(localStorage.getItem("nome"));
            }  

            setdisabledTipoFornecedor(true);                        
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            break;

            case "EB": 
            setdisabledTipoFornecedor(true);
            settipofornecedor("us");                      
            setdisableChavePix(true);
            setdisabledBanco(true);
            setdisabledAgencia(true);
            setdisabledAgencia(true);
            setdisabledContaBancaria(true);
            setdisabledOperacao(true);
            break;
        }
    },[tipodespesa]);



    const [disabledFoto, setdisabledFoto] = useState(false);

    const [camposSolicitanteNaoEditavel, SetcamposSolicitanteNaoEditavel] = useState(false);
    const [camposDirecionarVisivel, SetcamposDirecionarVisivel] = useState(false);
    const [camposDirecionarNaoEditavel, SetcamposDirecionarNaoEditavel] = useState(false);
    const [camposAprovarVisivel, SetcamposAprovarVisivel] = useState(false);
    const [camposAprovarNaoEditavel, SetcamposAprovarNaoEditavel] = useState(false);
    const [tabhabilitada, Settabhabilitada] = useState(false);
    const [habilitarbtnSalvar, SethabilitarbtnSalvar] = useState(false);
    const [ValorGastoMaioQueValorDisponivel, SetValorGastoMaioQueValorDisponivel] = useState(false);
    const [id_EmpresaFunc, Set_Id_EmpresaFunc] = useState(0);
    const [filialFunc, SetFilialFunc] = useState("");

    const [id_Filialdespesa, Set_Id_Filialdespesa] = useState(0);
    const [filialDespesa, SetFilialDespesa] = useState("");

    const [id_Fornecedor, Set_id_Fornecedor] = useState(0);
    const [Fornecedor, SetFornecedor] = useState("");


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
        
    },[id_Fornecedor, formadePagamento, tipotitularidade]); 
    
    
    function consultarContaFuncionario(){


        if (tipoTela === "Nova"){
            setid_banco(0);
            setbanco("");
            setAgencia("");
            setcontaBancaria("");
            setOperacao("");

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
                
                //
                if (formadePagamento == 3) {

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


    function consultarContaFornecedor(){

        if (tipoTela === "Nova"){
            setid_banco(0);
            setbanco("");
            setAgencia("");
            setcontaBancaria(""); 
            setOperacao("");      
        }
                
    }

    const [codFunc, SetCodFunc] = useState(0);
    const [nomeFunc, SetNomeFunc] = useState("");

    const [dataSolicitacao, SetDataSolicitacao] = useState("");
    const [dataEstimada, SetDatastimada] = useState("");

    const [objetivo, SetObjetivo] = useState("");

    const [listaDeGasto, SetListaDeGasto] = useState([]);
    const [vlSaldoDisponivel, SetvlSaldoDisponivel] = useState(0);
    const [vlGastoTotal, setvlGastoTotal] = useState(0);

    const [ItemSelecionado, SeItemSelecionado] = useState({coditem: 0, descricao: "", quantidade: 0, vlunit:0});
    const [index, setIndex] = useState(0);

    const [obs_ordenador, SetObs_ordenador] = useState(" ");
    const [status, Setstatus] = useState("");

    const [codconta, setCondConta] = useState(0);
    const [descricaoConta, SetDescricaoConta] = useState("");
    const [codCentroDeCusto, setCentroDeCusto] = useState(0);
    const [descricaoCentroDeCusto, SetDescricaoCentroDeCusto] = useState(""); 
    
    /*Fim dados da tela */     
    function processacampofornecedor(){


        if (status == "EA" || status == "N" || status == "F") { 
            setdisabledFornecedor(true);
            setdisabledTipoDespesa(true);
            setdisabledFoto(true);
        }

        if (tipodespesa === 'L' && (tipoTela == "Editar" || tipoTela == "Nova")){   
            
            //Set_id_Fornecedor(codFunc);
            //SetFornecedor(nomeFunc);            
            setdisabledFornecedor(true);
            setdisabledEmiteNota(true);                           

        }else if (tipoTela == "Direcionar"){   
            
            //SetCodFunc(codFunc);
            //SetFornecedor(nomeFunc);
            setdisabledFoto(true);
            setdisabledTipoDespesa(true);
            setdisabledFornecedor(true);
            setdisabledEmiteNota(true);
            setdisabledtipotitularidade(true);

        }else if (tipoTela == "Ordenar"){ 

            setdisabledTipoDespesa(true);
            setdisabledFornecedor(true)
            setdisabledEmiteNota(true);
            setdisabledFoto(true);   
            setdisabledtipotitularidade(true);         

        }else{
                          
            setdisabledFornecedor(false);
            setdisabledEmiteNota(false);

        }
        

    }
        

    function IniciarTela(){
        
        SetDataSolicitacao(moment().format("YYYY-MM-DD"));
        SetDatastimada(moment().format("YYYY-MM-DD"));   
        Set_Id_EmpresaFunc(localStorage.getItem("id_empresa"));
        SetFilialFunc(localStorage.getItem("razaosocial"));        
        SetNomeFunc(localStorage.getItem("nome"));    
        SetCodFunc(localStorage.getItem("id_usuario"));         
        
        CarregarDadosSolicitacao(id_solicitacao);
    }



    function CarregarDadosSolicitacao(id_solic){

        
        
        if (id_solic > 0 ){
                        
            api.post('/v1/consultarSolicitacaoCab', {pnumsolicitacao: id_solicitacao})
            .then((retorno) => {    
                
                console.log(retorno.data[0])

                Set_Id_EmpresaFunc(retorno.data[0].id_empresasolicitante);
                SetFilialFunc(retorno.data[0].empresasolicitante);
                SetNomeFunc(retorno.data[0].nome);

                Set_Id_Filialdespesa(retorno.data[0].id_filialdespesa);
                SetFilialDespesa(retorno.data[0].empresadespesa);  
                
                settipofornecedor(retorno.data[0].tipofornecedor);
                
                SetDataSolicitacao(moment(retorno.data[0].datasolicitacao).utc().format('YYYY-MM-DD'));
                SetDatastimada(moment( retorno.data[0].dataestimada).utc().format('YYYY-MM-DD'));

                setCondConta(retorno.data[0].codcontagerencial);
                SetDescricaoConta(retorno.data[0].contagerencial);

                setCentroDeCusto(retorno.data[0].codcentrodecusto);
                SetDescricaoCentroDeCusto(retorno.data[0].centrodecusto);

                setid_banco(retorno.data[0].id_banco);
                setbanco(retorno.data[0].banco);
                setAgencia(retorno.data[0].agencia);
                setcontaBancaria(retorno.data[0].contabancaria);
                setOperacao(retorno.data[0].operacao);
                setchavepix(retorno.data[0].chavepix);

                SetObjetivo(retorno.data[0].objetivo);

                if  (retorno.data[0].status == "") {
                    Setstatus("N");
                }else{
                    Setstatus(retorno.data[0].status);
                }
                
                SetObs_ordenador(retorno.data[0].obs_ordenador);                                  
                
                settipodespesa(retorno.data[0].tipodedespesa);    
                Set_id_Fornecedor(retorno.data[0].id_fornecedor);
                SetFornecedor(retorno.data[0].fornecedor);                             

                

                setproximoid(id_solic);             
                
                setformadePagamento(retorno.data[0].id_formadepagamento);
                settipotitularidade(retorno.data[0].tipoconta);

        
            }).catch((err) =>{
                console.log(err)
            });


            //Consultar Item

            api.post('/v1/consultarSolicitacaoItem', {pnumsolicitacao: id_solicitacao, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_solicitacao: localStorage.getItem("id_usuario_erp")})
            .then((retorno) => {                     
                SetListaDeGasto(retorno.data); 
            }).catch((err) =>{
                console.log(err)
            }); 
            
            
            api.get('/v1/ordenarSolicitacao/validarsolicitacaoorcamento/'+id_solicitacao)
            .then( (retorno)=>{                
                setvlGastoTotal(retorno.data[0].vlsolicitacao);
                SetvlSaldoDisponivel(retorno.data[0].saldo);                
                
            })
            .catch((err)=>{
                console.log(err)
            })

        }        
                
    }


    useEffect(()=>{

        processacampofornecedor();
        
    },[tipodespesa, tipoTela]); 
    


    function onClikSalvar(){

 
        if (tipoTela == "Nova"){
                     

                api.get('/v1/proximoidsolicitadespesa')
                .then((retorno) =>{
                    setproximoid(retorno.data.proxnum);

                    const dados = {numsolicitacao: retorno.data.proxnum, 
                                   tipodespesa,
                                   id_EmpresaFunc, 
                                   id_Filialdespesa, 
                                   id_solicitante:codFunc, 
                                   dataEstimada:moment(dataEstimada).format("DD/MM/YYYY"), 
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

                    console.log(dados);

                    const id1 = toast.loading("Gerando solicitação de Despesa...", {position : "top-center"});

                    api.post('/v1/cadastrarSolicitaDespesa', dados)
                    .then((retorno) =>{    
                    

                        const resposta = JSON.parse(retorno.request.response);                

                        toast.update(id1, {
                            render: "Solicitação Nº:"+ resposta.numsolicitacao +" cadastrada com sucesso !", 
                            type: "success", 
                            isLoading: false,                             
                            autoClose: 1700,
                            pauseOnHover: false,
                            onclose : TelaConsultaSolicitacoes(2550)} );                    
                            
                            uploadRef.current.handleUpload();
                    
                    })
                    .catch((err) =>{       

                        toast.update(id1, {
                            render: err.response.data.error, 
                            type: "error", 
                            isLoading: false,
                            autoClose: 2000,
                            pauseOnHover: false});
                            
                    }); 
                    

                })
                .catch((err)=>{
                    console.log(err);
                });

                  


        }else if (tipoTela == "Direcionar"){

            const id1 = toast.loading("Direcionado solicitação de Despesa...", {position : "top-center"});

            api.post('/v1/direcionarSolicitacao', {id_solicitacao, codconta, codCentroDeCusto, id_user_controladoria : localStorage.getItem("id_usuario_erp")})
            .then((retorno) =>{    
            

                const resposta = JSON.parse(retorno.request.response);

                toast.update(id1, {
                    render: "Solicitação Nº:"+ resposta.numsolicitacao +" Direcionada com sucesso !", 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : TelaConsultaDirecionameto(2550)});
            
            })
            .catch((err) =>{       

                toast.update(id1, {
                    render: err.response.data, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false});
                    
            }); 

        }else if (tipoTela == "Editar"){

            // update                                                                        

            const dados = { id_solicitacao,
                            tipodespesa,
                            id_EmpresaFunc, 
                            id_Filialdespesa, 
                            id_solicitante:codFunc, 
                            dataEstimada:moment(dataEstimada).format("DD/MM/YYYY"), 
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
                            tipoconta: tipotitularidade
                        };

            const id1 = toast.loading("alterando solicitação de Despesa...", {position : "top-center"});

            api.post('/v1/alterarSolicitaDespesa', dados)
            .then((retorno) =>{    
            

                const resposta = JSON.parse(retorno.request.response);

                toast.update(id1, {
                    render: "Solicitação Nº:"+ resposta.numsolicitacao +" alterado com sucesso !", 
                    type: "success", 
                    isLoading: false, 
                    closeOnClick: true,                            
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : TelaConsultaSolicitacoes(2550)
                });
            
                uploadRef.current.handleUpload();

            })
            .catch((err) =>{       

                toast.update(id1, {
                    render: err.response.data.error, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 2000,
                    pauseOnHover: false});
                    
            });


        }else if (tipoTela == "Ordenar"){
           
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
                        
                        const dados = {id_solicitacao,  id_ordenador:codFunc, status: "AJ", obs_ordenador: "Solicitado ajuste do orcamento"};            

                        api.post('/v1/ordenarSolicitacao', dados)
                        .then((retorno) =>{                                                             
            
                            const resposta = JSON.parse(retorno.request.response);               
                            
                            TelaConsultaAprovar(2550)
                        
                        })
                        .catch((err) =>{       
            
                            toast({
                                render: err.response.data.error, 
                                type: "error", 
                                isLoading: false,
                                autoClose: 2000,
                                pauseOnHover: false});
                                
                        });
                    
                    
                    Swal.fire("Solicitação encaminhada para controladoria!", "", "success");

                    } else if (result.isDenied) {
                        
                        
                    
                    }
                });
                    
            }else{
                       
                        const id1 = toast.loading("alterando solicitação de Despesa...", {position : "top-center"});

                        const dados = {id_solicitacao,  id_ordenador:codFunc, status, obs_ordenador};   

        
                        
                       

                        api.post('/v1/ordenarSolicitacao', dados)
                        .then((retorno) =>{                                                             
            
                            const resposta = JSON.parse(retorno.request.response); 
                                                        
                            toast.update(id1, {
                                render: "Solicitação Nº:"+ resposta.numsolicitacao +" alterado com sucesso !", 
                                type: "success", 
                                isLoading: false, 
                                closeOnClick: true,                            
                                autoClose: 1700,
                                pauseOnHover: false,
                                onclose : TelaConsultaAprovar(2550)
                            });                                        
                        
                        })
                        .catch((err) =>{       
            
                            toast.update(id1, {
                                render: err.response.data.error, 
                                type: "error", 
                                isLoading: false,
                                autoClose: 2000,
                                pauseOnHover: false});
                         
                        }); 
            }
            

        }
        
    }

    function TelaConsultaSolicitacoes(tempo){
        
        setTimeout(function(){
            navigate('/SolicitacaoDeDespesa/Solicitar');
        }, tempo);
        
    }

    function TelaConsultaDirecionameto(tempo){
        setTimeout(function(){
            navigate('/SolicitacaoDeDespesa/Direcionar');
        }, tempo);
    }

    function TelaConsultaAprovar(tempo){
        setTimeout(function(){
            navigate('/SolicitacaoDeDespesa/Aprovar');
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

    window.addEventListener('resize', function (){
        TipoGrid();
    });
    
    function TipoGrid(){
        if (window.innerWidth > 769) {
            setTipoGrid("D");
        } else {
            setTipoGrid("M");
        }
    } 

    function openModalItem(){
        setisItemOpen(true);
    }


    function closeModalItem(){
        setisItemOpen(false);
    }   

    
    useEffect(()=>{        
        TipoGrid();        
        IniciarTela();
    },[]);



    useEffect( () =>{
        
        SetListaDeStatus([
            {status: "", descricao: "Selecione uma opção"},
            {status: "N", descricao: "Negado"},
            {status: "P", descricao: "Pendente"},
            {status: "L", descricao: "Liberado"}
        ]);
        

        

        //EDITAR
        
        if (tipoTela == "Editar" & status == "EA"){   
            processacampofornecedor();                   
            SetcamposSolicitanteNaoEditavel(true);
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true); 
            SetListaDeStatus([
                {status: "A", descricao: "Aberto"},
                {status: "EA", descricao: "Em Analise"},
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"},
                {status: "F", descricao: "Finalizado"}
            ]); 
        }else if (tipoTela == "Editar" & status == "A"){   
            
            processacampofornecedor();

            SetcamposSolicitanteNaoEditavel(false);           
            Settabhabilitada(true);
            SethabilitarbtnSalvar(true); 
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true);  
            SetListaDeStatus([
                {status: "A", descricao: "Aberto"},
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"},
                {status: "F", descricao: "Finalizado"}
            ]);       
        }else if (tipoTela == "Editar" & status == "N"){ 
            processacampofornecedor();              
            SetcamposSolicitanteNaoEditavel(true); 
            SetcamposDirecionarVisivel(false); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true);  
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);                            
        }else if (tipoTela == "Editar" & status == "AJ"){   
            processacampofornecedor();           
            SetcamposSolicitanteNaoEditavel(true); 
            SetcamposDirecionarVisivel(false); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true);  
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);
            
            SetListaDeStatus([
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"}
            ]);
            
        }else if (tipoTela == "Editar" & status == "L"){    
            processacampofornecedor();          
            SetcamposSolicitanteNaoEditavel(true); 
            SetcamposDirecionarVisivel(false); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true);
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);              
        }else if (tipoTela == "Editar" & status == "P"){   
            processacampofornecedor();          
            SetcamposSolicitanteNaoEditavel(false); 
            SetcamposDirecionarVisivel(false); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true); 
            Settabhabilitada(true);
            SethabilitarbtnSalvar(true);                       
        }else if (tipoTela == "Editar" & status == "F"){  
            processacampofornecedor();            
            SetcamposSolicitanteNaoEditavel(true); 
            SetcamposDirecionarVisivel(false); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true); 
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);  

            SetListaDeStatus([
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"},
                {status: "F", descricao: "Finalizado"}
            ]);          
         
        //DIRECIONAR
        }else if (tipoTela == "Direcionar" & status == "AJ"){
            processacampofornecedor();        
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true);  
            setdisableChavePix(true);
            SetcamposSolicitanteNaoEditavel(true); 
            SetcamposDirecionarVisivel(true); 
            SetcamposDirecionarNaoEditavel(false);
            SetcamposAprovarNaoEditavel(true);            
            SetcamposAprovarVisivel(true);  
            Settabhabilitada(false);
            SethabilitarbtnSalvar(true);
            
            SetListaDeStatus([
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"}
            ]);           
        }else if (tipoTela == "Direcionar" & status == "A"){   
            processacampofornecedor(); 
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true);   
            setdisableChavePix(true);       
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true);               
            Settabhabilitada(false);
            SetcamposAprovarVisivel(false); 
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true);    
            SetListaDeStatus([
                {status: "A", descricao: "Aberto"},
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"},
                {status: "F", descricao: "Finalizado"}
            ]);         
        }else if (tipoTela == "Direcionar" & status == "EA"){ 
            processacampofornecedor();    
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);      
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true);               
            Settabhabilitada(false);
            SetcamposAprovarVisivel(false); 
            SetcamposAprovarNaoEditavel(true);
            SetcamposAprovarVisivel(true); 
            SetListaDeStatus([
                {status: "A", descricao: "Aberto"},
                {status: "EA", descricao: "Em Analise"},
                {status: "N", descricao: "Negado"},
                {status: "P", descricao: "Pendente"},
                {status: "L", descricao: "Liberado"},
                {status: "AJ", descricao: "Ajustar Orçamento"},
                {status: "F", descricao: "Finalizado"}
            ]);                           
        }else if (tipoTela == "Direcionar" & status == "N"){
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true);  
            setdisableChavePix(true);      
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true);
            SetcamposDirecionarNaoEditavel(true);
            SetcamposAprovarVisivel(false);
            SetcamposAprovarNaoEditavel(true); 
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);                      
        }else if (tipoTela == "Direcionar" & status == "L"){  
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);       
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(true);
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);      
        }else if (tipoTela == "Direcionar" & status == "P"){ 
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true);  
            setdisableChavePix(true);         
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(true);   
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);                    
        }else if (tipoTela == "Direcionar" & status == "F"){  
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true);  
            setdisableChavePix(true);        
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(true); 
            Settabhabilitada(false);
            SethabilitarbtnSalvar(false);    
            
            SetListaDeStatus([
                {status: "F", descricao: "Finalizado"}                
            ]);   
        }else if (tipoTela == "Direcionar" & status == "AJ"){  
            processacampofornecedor(); 
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);         
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(false)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(true);   
            Settabhabilitada(false);
            SethabilitarbtnSalvar(true);                    
        }
        
        //ORDENAR
        else if (tipoTela == "Ordenar" & status == "EA"){   
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);         
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(false); 
            SethabilitarbtnSalvar(true);   
            Settabhabilitada(false);  
            Setstatus("P");
                                            
        }else if (tipoTela == "Ordenar" & status == "N"){  
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);          
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(false);   
            SethabilitarbtnSalvar(true);    
            Settabhabilitada(false);                    

        }else if (tipoTela == "Ordenar" & status == "P"){  
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);   
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(false); 
            SethabilitarbtnSalvar(true);  
            Settabhabilitada(false);      
        }else if (tipoTela == "Ordenar" & status == "L"){ 
            processacampofornecedor();  
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);       
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(false);   
            Settabhabilitada(true);
            SethabilitarbtnSalvar(true);
            Settabhabilitada(false);   
        }else if (tipoTela == "Ordenar" & status == "F"){      
            processacampofornecedor();
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);     
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true) 
            SetcamposDirecionarNaoEditavel(true)
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(true);   
            Settabhabilitada(true);
            SethabilitarbtnSalvar(false);
            Settabhabilitada(false); 

            SetListaDeStatus([
                {status: "F", descricao: "Finalizado"}
            ]);   
        }else if (tipoTela == "Ordenar" & status == "AJ"){  
            processacampofornecedor();   
            setdisabledTipoFornecedor(true);
            setdisabledFormadePagamento(true); 
            setdisableChavePix(true);      
            SetcamposSolicitanteNaoEditavel(true);
            SetcamposDirecionarVisivel(true);
            SetcamposDirecionarNaoEditavel(true);
            SetcamposAprovarVisivel(true);
            SetcamposAprovarNaoEditavel(false); 
            SethabilitarbtnSalvar(true);  
            Settabhabilitada(false);   
        }else {
            processacampofornecedor();
            SetcamposSolicitanteNaoEditavel(false);           
            Settabhabilitada(true);
            SethabilitarbtnSalvar(true);              
        }

    },[status])


    useEffect( () => {
        // consultar dasboard % realizado
        api.get('/v1/ordenarSolicitacao/dashPercentualAtingidoConta/'+codconta+'/'+localStorage.getItem("id_grupo_empresa"))
        .then((retorno) => {                     
            SetdadosDashPercRealizado([retorno.data.percentual]); 
        }).catch((err) =>{
            SetdadosDashPercRealizado([100]);
        });

        // consultar dasboard Orçado X Realizado por Filial
        api.get('/v1/ordenarSolicitacao/dashOrcadoRealizadoContaFilial/'+codconta+'/'+localStorage.getItem("id_grupo_empresa"))
        .then((retorno) => {                     
            
            // processa categoria com as filiais   
            var lOrcado = [];             
            var lCategoria = [];   
            var lRealizado = []; 
            var vlOrcado = 0;
            var vlRealizado = 0;                         

            retorno.data.map( (i) =>{
                lCategoria.push(i.filial);
                lOrcado.push(i.orcado);
                lRealizado.push(i.realizado);

                vlOrcado = vlOrcado + i.orcado;
                vlRealizado = vlRealizado + i.realizado;                                              

            } );
            SetdadosDashOrcadoRealizadoCategories(lCategoria);                
            SetdadosDashOrcadoRealizadoOrcado(lOrcado);
            SetdadosDashOrcadoRealizadoRealizado(lRealizado);
            setvlorcadototal(vlOrcado);
            setvlrealizadototal(vlRealizado);                        



        }).catch((err) =>{
            SetdadosDashPercRealizado([100]);
        });
    },[codconta])

    useEffect( () => {

        if (vlGastoTotal > vlSaldoDisponivel){
            SetValorGastoMaioQueValorDisponivel(true)
        }else{
            SetValorGastoMaioQueValorDisponivel(false)
        };

    },[vlGastoTotal, vlSaldoDisponivel])

    return <>
        
        <Menu />

        <ModalSolicitacaoDeDespesaItem isOpen={isItemOpen}
                                       onRequestClose={closeModalItem} 
                                       tipoModal={tipoModal}
                                       GetItemSelecionado={ItemSelecionado}
                                       AdcionarItemListaDeGasto={AdcionarItemListaDeGasto}
                                       AlterarItemListaDeGasto={AlterarItemListaDeGasto}
                                       ExluirItemListaDeGasto={ExluirItemListaDeGasto}
                                       index = {index}/>   

                
        
        

        <div className="container Containe-Tela">

        { (ValorGastoMaioQueValorDisponivel == true && tipoTela == "Ordenar") ?
        <div className="alert alert-danger" role="alert">
          {"Atenção: O valor desta despesa de "+new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format((vlGastoTotal))+" ultrapassa o valor orçado desta filial para o mês corrente, saldo disponivel de "+new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format((vlSaldoDisponivel))}
        </div> : null
        }

        <div className="row text-body-secondary mb-2">

               

        </div>      
                                                        
            <div className="row text-body-secondary mb-2">

                    <div className="col-lg-10">
                        <h1 className="mb-4 titulo-da-pagina">
                        {
                            id_solicitacao > 0 ? tipoTela+" Solicitação "+ id_solicitacao : "Nova Solicitação"
                        }
                        </h1>  
                    </div>  
                                            
                    
            </div>  
            

            <div className="row conteiner-campos">
                
                        {/* Lado direito*/}
                        <div className="col-lg-2 mb-3">
                    
                            <label htmlFor="SelecaoStatus" className="mb-2">Tipo de Despesa</label>                                    
                                <select className="form-control" id="SelecaoStatus" 
                                    onChange={(e) => settipodespesa(e.target.value)} 
                                    value={tipodespesa}
                                    disabled={disabledTipoDespesa}
                                    >
                                <option value={"F"}>Outras</option>
                                <option value={"L"}>Viagem</option> 
                                <option value={"EB"}>Encargos e Beneficios</option> 
                                </select>

                        </div>

                        <div className="col-lg-4 mb-3">   
                            <label htmlFor="fl-1" className="mb-2">Filial</label>                   
                            <input className="form-control" placeholder={"Buscando ..."} value={id_EmpresaFunc+" - "+filialFunc} id={"fl-1"} disabled />  
                        </div> 

                        <div className="col-lg-6 mb-3">   
                            <label htmlFor="Nome" className="mb-2">Nome</label>                   
                            <input className="form-control" placeholder={"Buscando ..."} id={"Nome"} value={codFunc+" - "+nomeFunc} disabled /> 
                        </div> 

                        <div className="col-lg-6 mb-3">   
                            <label htmlFor="fl-2" className="mb-2">Filial da Despesa</label>                   
                            <EditComplete autoFocus placeholder={"Informe a filial da Despesa"} id={"fl-2"}  
                                          tipoConsulta={"filial2"} 
                                          onClickCodigo={Set_Id_Filialdespesa} 
                                          onClickDescricao={SetFilialDespesa}
                                          value={filialDespesa} 
                                          disabled={camposSolicitanteNaoEditavel}/>
                        </div> 
                        
                        <div className="col-lg-6 mb-3">   
                            
                            
                            <div className="row">
                                <div className="col-6">
                                    <label htmlFor="DataDaSolicitação" className="mb-2">Data da Solicitação</label>                   
                                    <input type="date" className="form-control" id="DataDaSolicitação" placeholder={dataSolicitacao}
                                                        value={dataSolicitacao} 
                                                        disabled/> 
                                </div>

                                <div className="col-6 mb-1">   
                                    <label htmlFor="DataEstimada" className="mb-2">Data Estimada</label>                   
                                    <input type="date" className="form-control" id="DataEstimada" placeholder={dataEstimada}
                                                        defaultValue={dataEstimada}
                                                        onChange={(e) => {SetDatastimada(e.target.value)}}
                                                        disabled={camposSolicitanteNaoEditavel} /> 
                                </div>

                            </div>

                        </div>                         

                        <div className="col-lg-2 mb-3">
                    
                            <label htmlFor="SelecaoStatus" className="mb-2">Tipo de Parceiro</label>                                    
                                <select className="form-control" id="SelecaoStatus" 
                                    onChange={(e) => settipofornecedor(e.target.value)} 
                                    value={tipofornecedor}
                                    disabled={disabledTipoFornecedor}
                                    >                                
                                <option value={"fo"}>Fornecedor</option> 
                                <option value={"us"}>Funcionario</option>
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
                    
                            <label htmlFor="SelecaoStatus" className="mb-2">Forma de Pagamento</label>                                    
                                <select className="form-control" id="SelecaoStatus" 
                                    onChange={(e) => setformadePagamento(e.target.value)} 
                                    value={formadePagamento}
                                    disabled={disabledFormadePagamento}
                                    >                                
                                <option value={0}>{`Selecione...`}</option> 
                                <option value={1}>{`Dinheiro`}</option> 
                                <option value={2}>{`Pix`}</option>
                                <option value={3}>{`Transferência bancária (TED/DOC)`}</option>
                                <option value={4}>{`Boleto bancário`}</option>
                                </select>

                        </div>  


                        <div className="col-lg-3 mb-3">
                    
                            <label htmlFor="SelecaoStatus" className="mb-2">Tipo de Titularidade</label>                                    
                                <select className="form-control" id="SelecaoStatus" 
                                    onChange={(e) => settipotitularidade(e.target.value)} 
                                    value={tipotitularidade}
                                    disabled={disabledtipotitularidade}
                                    >                                
                                <option value={0}>{`Selecione...`}</option> 
                                <option value={1}>{`Conta Propria`}</option> 
                                <option value={2}>{`Conta de Terceiro`}</option>
                                </select>

                        </div> 
                        
                        <div className="col-lg-3 mb-3">
                            <label htmlFor="Banco" className="mb-2">Chave PIX</label>                   
                            <input disabled={disableChavePix} type="text" className="form-control" id="Banco" 
                                                                placeholder={"Chave PIX"}                                                                
                                                                value={chavepix}
                                                                onChange={(e) => setchavepix(e.target.value)}
                                                                 /> 
                        </div>

                         <div className="col-lg-3 mb-3">   
                            <label htmlFor="Banco" className="mb-2">Banco</label>                                               
                            <EditComplete placeholder={"Banco"} id={"ib"}  
                                    tipoConsulta={"Banco"} 
                                    onClickCodigo={setid_banco} 
                                    onClickDescricao={setbanco}
                                    value={banco} 
                                    disabled={disabledBanco}/>
                        </div>
                         
                        <div className="col-lg-2 mb-3">
                            <label htmlFor="DataDaSolicitação" className="mb-2">Agencia</label>                   
                            <input disabled={disabledAgencia} type="text" className="form-control" id="DataDaSolicitação" 
                                                                placeholder={"Agencia"}                                                                
                                                                value={agencia}
                                                                 /> 
                        </div>

                        <div className="col-lg-2 mb-3">
                            <label htmlFor="Conta_Bancaria" className="mb-2">Conta Bancaria</label>                   
                            <input disabled={disabledContaBancaria} type="text" className="form-control" id="Conta_Bancaria" 
                                                                placeholder={"Conta Bancaria"}                                                                
                                                                value={contaBancaria}
                                                                 /> 
                        </div> 

                        <div className="col-lg-2 mb-3">
                            <label htmlFor="Conta_Bancaria" className="mb-2">Operação</label>                   
                            <input disabled={disabledOperacao} type="text" className="form-control" id="Conta_Bancaria" 
                                                                placeholder={"Operação"}                                                                
                                                                value={operacao}
                                                                 /> 
                        </div>                       
                                                       
                        {
                            camposDirecionarVisivel == true ? 
                            
                                <div className="col-lg-6 mb-3">   
                                    <label htmlFor="fl-2" className="mb-2">Conta Gerencial</label>                   
                                    <EditComplete autoFocus placeholder={"Informe a filial da Despesa"} id={"cg"}  
                                                tipoConsulta={"cg"} 
                                                onClickCodigo={setCondConta} 
                                                onClickDescricao={SetDescricaoConta}
                                                value={descricaoConta} 
                                                disabled={camposDirecionarNaoEditavel}/>
                                </div> : null
                        }


                        {
                            camposDirecionarVisivel == true ? 
                                <div className="col-lg-6 mb-3">   
                                    <label htmlFor="fl-2" className="mb-2">Centro de Custo</label>                   
                                    <EditComplete placeholder={"Informe a filial da Despesa"} id={"cc"}  
                                                tipoConsulta={"cc"} 
                                                onClickCodigo={setCentroDeCusto} 
                                                onClickDescricao={SetDescricaoCentroDeCusto}
                                                value={descricaoCentroDeCusto} 
                                                disabled={camposDirecionarNaoEditavel}/>
                                </div> : null
                        }  

                        <div className="col-lg-12 mb-3 mt-3"> 
                        <h4 className="section-title text-center">Anexos</h4>
                        <div className="col-md-12 mb-3">
                        <UploadArquivos 
                            ref={uploadRef} 
                            idRotina={"1030.1"}
                            idRelacional={proximoid}
                            disabled={disabledFoto}  
                            //acceptTypes="image/*,application/pdf"
                            capture={false}                           
                        />    
                        </div>   
                        </div>                                                                                                                                                                                               
                        

                        <div className="col-12 mb-3">   
                            <label htmlFor="Objetivo" className="mb-2">Objetivo da Solicitação</label>                   
                            <textarea className="form-control" 
                                      id="Objetivo" rows="5" 
                                      value={objetivo} 
                                      onChange={(e) => {SetObjetivo(e.target.value)}} 
                                      placeholder="Informe para qual objetivo e a solicitação " 
                                      disabled={camposSolicitanteNaoEditavel}></textarea>
                        </div>                                                    

                        {camposAprovarVisivel == true ?
                            <div className="col-lg-12 mb-3">
                        
                            <label htmlFor="SelecaoStatus" className="mb-2">Status</label>                                    
                            <select className="form-control" id="SelecaoStatus" onChange={(e) => Setstatus(e.target.value)} value={status} disabled={camposAprovarNaoEditavel}>
                            { listaDeStatus.map((i) => {
                                  return  <option value={i.status}>{i.descricao}</option>
                                })
                            }                                    
                            </select>

                        </div> : null

                        }                        
                        
                        

                        { camposAprovarVisivel == true ?
                            <div className="col-12 mb-3">   
                            <label htmlFor="Objetivo" className="mb-2">Parecer do Ordenador</label>                   
                            <textarea className="form-control" 
                                      id="Objetivo" rows="5"                                                                             
                                      placeholder="Observação do ordenador" onChange={(e) => SetObs_ordenador(e.target.value)} value={obs_ordenador} disabled={camposAprovarNaoEditavel}></textarea>
                            </div>  : null 
                        }

                        
                
                </div>                                             
                
        </div>

        <div className="container-fluid">

            <div className="col-12 mb-5">
                            
                { tipoGrid == "M" ? <GridMobile openModalItem={openModalItem} 
                                               dados={listaDeGasto} 
                                               tipoModal={setTipoModal}
                                               SeItemSelecionado={SeItemSelecionado}
                                               onClikSalvar={onClikSalvar}
                                               setIndex = {setIndex}
                                               tabhabilitada={tabhabilitada}
                                               habilitarbtnSalvar={habilitarbtnSalvar}/>

                                : <GridDesktop openModalItem={openModalItem} 
                                               dados={listaDeGasto} 
                                               tipoModal={setTipoModal}
                                               SeItemSelecionado={SeItemSelecionado}
                                               onClikSalvar={onClikSalvar}
                                               setIndex = {setIndex}
                                               tabhabilitada={tabhabilitada}
                                               habilitarbtnSalvar={habilitarbtnSalvar}/>
                }                                                
                                                                    
            </div>                     
               
        </div>
        <ToastContainer />
    </>
    
    
}

export default SolicitacaoDeDespesa;