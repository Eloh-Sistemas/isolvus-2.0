import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import api from "../../servidor/api";
import { pdf } from "@react-pdf/renderer";
import AutorizacaoDePagamento from "../../componentes/Reports/AutorizacaoDePagamento/AutorizacaoDePagamento";
import moment from "moment";

function RelatorioAutorizacaoDePagamento(){

    const [id_Filialdespesa, Set_Id_Filialdespesa] = useState(0);
    const [filialDespesa, SetFilialDespesa] = useState("");

    const [dataInicial, SetdataInicial] = useState();
    const [dataFinal, SetdataFinal] = useState();

    const [codconta, setCondConta] = useState(0);
    const [descricaoConta, SetDescricaoConta] = useState("");

    const [codCentroDeCusto, setCentroDeCusto] = useState(0);
    const [descricaoCentroDeCusto, SetDescricaoCentroDeCusto] = useState("");

    const [tipodespesa, settipodespesa] = useState("O");
    const [tipofornecedor, settipofornecedor] = useState("us");
    const [labeltipoParceiro, setlabeltipoParceiro] = useState("");
    
    const [id_Fornecedor, Set_id_Fornecedor] = useState(0);
    const [Fornecedor, SetFornecedor] = useState("");  

    const [pstatus, setpstatus] = useState("T");

    const [loading, setLoading] = useState(false);

    function iniciaTela(){
        SetdataInicial(moment().startOf('month').format("YYYY-MM-DD"));
        SetdataFinal(moment().format("YYYY-MM-DD"));        
    }

    useEffect(()=>{
        iniciaTela();
    },[]);

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


    const gerarPDF = async () => {

    const filtros = {                 
        idFilialDespesa: id_Filialdespesa,
        filialDespesa,
        codContaGerencial: codconta,
        descricaoConta,
        codCentroDeCusto: codCentroDeCusto,
        descricaoCentroDeCusto,
        tipoFornecedor: tipofornecedor,
        labeltipoParceiro: labeltipoParceiro.toUpperCase(),
        idParceiro: id_Fornecedor,
        Fornecedor,
        status: pstatus,
        dataInicial: dataInicial,
        dataFinal: dataFinal
    };

    try {
        // 🔥 INICIA LOADING
        setLoading(true);

        const response = await api.post('/v1/solicitacaoDespesa/relatorio/AutorizacaoDePagamento', filtros);
        const dados = response.data;
        console.log(dados);

        const blob = await pdf(
            <AutorizacaoDePagamento 
                filtros={filtros} 
                dados={dados}
            />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'AutorizacaoDePagamento.pdf';
        link.click();

        URL.revokeObjectURL(url);

    } catch (error) {

        if (error.response) {
            alert(error.response.data?.message || error.response.data?.erro || "Erro na API.");
        } 
        else if (error.request) {
            alert("Servidor não respondeu. Verifique sua conexão.");
        } 
        else {
            alert("Erro inesperado: " + error.message);
        }

    } finally {
        // 🔥 FINALIZA LOADING (SEMPRE)
        setLoading(false);
    }
    };


    return(<>
        {loading && (
            <div className="loading-overlay">
                <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-3">Gerando relatório, aguarde...</p>
            </div>
        )}
        <Menu />
        <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
                            <h1 className="mb-4 titulo-da-pagina">{
                              "Relatório Autorização de Pagamento"  
                            }</h1>
            </div>


                        
            <div className="row conteiner-campos">

                  <div className="col-lg-8 mb-3">   
                    <label htmlFor="fl-2" className="mb-2">Filial</label>                   
                    <EditComplete autoFocus={true} placeholder={"Filial"} id={"fl-2"}  
                                tipoConsulta={"filial2"} 
                                onClickCodigo={Set_Id_Filialdespesa}  
                                onClickDescricao={SetFilialDespesa}
                                value={filialDespesa} />
                  </div>

                  <div className="col-lg-2 mb-3">
                    <label htmlFor="DataDaSolicitação" className="mb-2">Data Inicial</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitação" 
                                                        placeholder={dataInicial}
                                                        onChange={(e) => {SetdataInicial(e.target.value)}}
                                                        value={dataInicial}
                                                        /> 
                </div>

                <div className="col-lg-2 mb-3">
                    <label htmlFor="DataDaSolicitação" className="mb-2">Data Final</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitação" 
                                                        placeholder={dataFinal}
                                                        onChange={(e) => {SetdataFinal(e.target.value)}}
                                                        value={dataFinal}
                                                        />
                </div>


                <div className="col-lg-1 mb-3">
                                    
                    <label htmlFor="tipoparceiro" className="mb-2">Tipo de Parceiro</label>                                    
                        <select className="form-control" id="tipoparceiro" 
                            onChange={(e) => settipofornecedor(e.target.value)} 
                            value={tipofornecedor}
               
                            >                                
                        <option key={1} value={"fo"}>Fornecedor</option> 
                        <option key={2} value={"us"}>Funcionario</option>
                        </select>

                </div>  

                <div className="col-lg-3 mb-3">   
                    {/*parceiro*/}
                    <label htmlFor="fo-1" className="mb-2">{labeltipoParceiro}</label>                   
                    <EditComplete placeholder={labeltipoParceiro} id={tipofornecedor}  
                                    tipoConsulta={tipofornecedor} 
                                    onClickCodigo={Set_id_Fornecedor} 
                                    onClickDescricao={SetFornecedor}
                                    value={Fornecedor} />
                </div>

                <div className="col-lg-2 mb-3">   
                    <label htmlFor="cg" className="mb-2">Conta Gerencial</label>                   
                    <EditComplete  placeholder={"Conta Gerencial"} id={"cg"}  
                                tipoConsulta={"cg"} 
                                onClickCodigo={setCondConta} 
                                onClickDescricao={SetDescricaoConta}
                                value={descricaoConta} />
                </div>

                <div className="col-lg-2 mb-3">   
                    <label htmlFor="cc" className="mb-2">Centro de Custo</label>                   
                    <EditComplete placeholder={"Centro de Custo"} id={"cc"}  
                                tipoConsulta={"cc"} 
                                onClickCodigo={setCentroDeCusto} 
                                onClickDescricao={SetDescricaoCentroDeCusto}
                                value={descricaoCentroDeCusto} />
                </div>

                <div className="col-lg-2 mb-3">
                    
                    <label htmlFor="SelecaoStatus" className="mb-2">Status</label>                                    
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

                </div>

                <div className="col-lg-2 mb-3">
                    <button className="btn btn-danger btn-analisedespesa w-100" 
                    onClick={gerarPDF}
                    ><i className="bi bi-file-earmark-pdf"></i> Gerar Relatório</button>
                </div>
            
            </div>

        </div>
    </>
    );
}

export default RelatorioAutorizacaoDePagamento;