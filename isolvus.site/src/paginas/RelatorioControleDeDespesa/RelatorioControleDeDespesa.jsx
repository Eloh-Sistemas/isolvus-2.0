import { pdf } from "@react-pdf/renderer";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import Menu from "../../componentes/Menu/Menu";
import ControleDeDespesaPorParceiro from "../../componentes/Reports/SolicitacaoDeDespesa/ControleDeDespesaPorParceiro";
import { useEffect, useState } from "react";
import moment from "moment/moment";
import api from "../../servidor/api";
import "./RelatorioControleDeDespesa.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";


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

          <div className="container-fluid Containe-Tela cadastro-usuario-page relatorio-controle-page">
                <div className="row text-body-secondary mb-3">
                    <div className="col-12">
                        <div>
                            <h1 className="mb-1 titulo-da-pagina">Relatório Controle de Despesa</h1>
                            <p className="text-muted mb-0">Defina os filtros para gerar o relatório em PDF.</p>
                        </div>
                    </div>
                </div>

                <div className="row mb-4 align-items-end g-3 cadastro-filtros relatorio-filtros-row">
                    <div className="col-lg-4 cadastro-filtro-col">
                        <label htmlFor="fo-1" className="form-label">Funcionario</label>
                        <EditComplete
                            placeholder={'Funcionario'} id={'us'}
                            tipoConsulta={'us'}
                            onClickCodigo={Set_id_Fornecedor}
                            onClickDescricao={SetFornecedor}
                            value={Fornecedor}
                        />
                    </div>

                    <div className="col-lg-2 cadastro-filtro-col">
                        <label htmlFor="tipolanc" className="form-label">Tipo Lançamento</label>
                        <select
                            className="form-control"
                            id="tipolanc"
                            onChange={(e) => setTipoLanc(e.target.value)}
                            value={tipoLanc}
                        >
                            <option key={1} value={"TODOS"}>Todos</option>
                            <option key={2} value={"DEBITO"}>Debito</option>
                            <option key={3} value={"CREDITO"}>Crédito</option>
                        </select>
                    </div>

                    <div className="col-lg-2 cadastro-filtro-col">
                        <label htmlFor="data-inicial-relatorio" className="form-label">Data Inicial</label>
                        <input
                            type="date"
                            className="form-control"
                            id="data-inicial-relatorio"
                            placeholder={dataInicial}
                            onChange={(e) => {SetdataInicial(e.target.value)}}
                            value={dataInicial}
                        />
                    </div>

                    <div className="col-lg-2 cadastro-filtro-col">
                        <label htmlFor="data-final-relatorio" className="form-label">Data Final</label>
                        <input
                            type="date"
                            className="form-control"
                            id="data-final-relatorio"
                            placeholder={dataFinal}
                            onChange={(e) => {SetdataFinal(e.target.value)}}
                            value={dataFinal}
                        />
                    </div>

                    <div className="col-lg-2 cadastro-filtro-col d-grid">
                        <button className="btn btn-danger" onClick={gerarPDF}>
                            <i className="bi bi-file-earmark-pdf"></i> Gerar
                        </button>
                    </div>
                </div>
        </div>
        </>
    );
}

export default RelatorioControleDeDespesa;