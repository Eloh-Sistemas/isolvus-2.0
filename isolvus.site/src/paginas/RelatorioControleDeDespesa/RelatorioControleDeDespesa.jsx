import { pdf } from "@react-pdf/renderer";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import Menu from "../../componentes/Menu/Menu";
import ControleDeDespesaPorParceiro from "../../componentes/Reports/SolicitacaoDeDespesa/ControleDeDespesaPorParceiro";
import { useEffect, useState } from "react";
import moment from "moment/moment";
import api from "../../servidor/api";
import "./RelatorioControleDeDespesa.css";


function RelatorioControleDeDespesa(){

    const [dataInicial, SetdataInicial] = useState();
    const [dataFinal, SetdataFinal] = useState();

    const [tipofornecedor, settipofornecedor] = useState("fo");
    const [labeltipoParceiro, setlabeltipoParceiro] = useState();
    
    const [id_Fornecedor, Set_id_Fornecedor] = useState(0);
    const [Fornecedor, SetFornecedor] = useState(""); 

    const [tipoLanc, setTipoLanc] = useState("TODOS");

    const [dadosRelatorio, setDadosRelatorio] = useState();

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
        dataInicial,
        dataFinal,     
        idUsu: localStorage.getItem("id_usuario"),
        nomeUsu: localStorage.getItem("nome"),
        tipoLanc: tipoLanc,
        id_Fornecedor 
    };

    try {
        // 🔥 INICIA LOADING
        setLoading(true);

        const response = await api.post('/v1/solicitacaoDespesa/relatorio/controlededespesa', filtros);
        const dados = response.data;

        const blob = await pdf(
            <ControleDeDespesaPorParceiro 
                filtros={filtros} 
                dados={dados}
            />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'relatorio.pdf';
        link.click();

        URL.revokeObjectURL(url);

    } catch (error) {

        if (error.response) {
            alert(error.response.data.detalhes[0].message || error.response.data?.erro || "Erro na API.");
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
                              "Relatório Controle de Despesa"  
                            }</h1>
            </div> 
            
            
            
            <div className="row conteiner-campos">                                        

                <div className="col-lg-4 mb-3">   
                    {/*parceiro*/}
                    <label htmlFor="fo-1" className="mb-2">
                        Funcionario
                        </label>                   
                    <EditComplete 
                        placeholder={'Funcionario'} id={'us'}  
                        tipoConsulta={'us'} 
                        onClickCodigo={Set_id_Fornecedor} 
                        onClickDescricao={SetFornecedor}
                        value={Fornecedor}                         
                    />
                </div>

                <div className="col-lg-1 mb-3">
                                    
                    <label htmlFor="tipolanc" className="mb-2">Tipo.Lanc</label>                                    
                        <select className="form-control" id="tipolanc" 
                            onChange={(e) => setTipoLanc(e.target.value)} 
                            value={tipoLanc}
                            >   
                        <option key={1} value={"TODOS"}>Todos</option>                              
                        <option key={2} value={"DEBITO"}>Debito</option>
                        <option key={1} value={"CREDITO"}>Crédito</option>                         
                        </select>

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

                <div className="col-lg-2 mb-3">
                <button className="btn btn-danger btn-analisedespesa w-100" onClick={gerarPDF}><i class="bi bi-file-earmark-pdf"></i> Gerar Relatório</button>
                </div>

            </div>


        </div>
        </>
    );
}

export default RelatorioControleDeDespesa;