import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import api from "../../servidor/api";
import { pdf } from "@react-pdf/renderer";
import AutorizacaoDePagamento from "../../componentes/Reports/AutorizacaoDePagamento/AutorizacaoDePagamento";
import moment from "moment";
import "./RelatorioAutorizacaoDePagamento.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";

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
        <div className="container-fluid Containe-Tela cadastro-usuario-page relatorio-autorizacao-page">
            <div className="row text-body-secondary mb-3">
                <div className="col-12">
                    <h1 className="mb-1 titulo-da-pagina">Relatório Autorização de Pagamento</h1>
                    <p className="text-muted mb-0">Defina os filtros para gerar o relatório em PDF.</p>
                </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros relatorio-autorizacao-filtros-row">
                <div className="col-lg-4 cadastro-filtro-col">
                    <label htmlFor="fl-2" className="form-label">Filial</label>
                    <EditComplete autoFocus={true} placeholder={"Filial"} id={"fl-2"}
                        tipoConsulta={"filial2"}
                        onClickCodigo={Set_Id_Filialdespesa}
                        onClickDescricao={SetFilialDespesa}
                        value={filialDespesa} />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="data-inicial-autorizacao" className="form-label">Data Inicial</label>
                    <input type="date" className="form-control" id="data-inicial-autorizacao"
                        placeholder={dataInicial}
                        onChange={(e) => { SetdataInicial(e.target.value); }}
                        value={dataInicial}
                    />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="data-final-autorizacao" className="form-label">Data Final</label>
                    <input type="date" className="form-control" id="data-final-autorizacao"
                        placeholder={dataFinal}
                        onChange={(e) => { SetdataFinal(e.target.value); }}
                        value={dataFinal}
                    />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="tipoparceiro" className="form-label">Tipo Parceiro</label>
                    <select className="form-control" id="tipoparceiro"
                        onChange={(e) => settipofornecedor(e.target.value)}
                        value={tipofornecedor}
                    >
                        <option key={1} value={"fo"}>Fornecedor</option>
                        <option key={2} value={"us"}>Funcionario</option>
                    </select>
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="fo-1" className="form-label">{labeltipoParceiro || "Parceiro"}</label>
                    <EditComplete placeholder={labeltipoParceiro || "Parceiro"} id={tipofornecedor}
                        tipoConsulta={tipofornecedor}
                        onClickCodigo={Set_id_Fornecedor}
                        onClickDescricao={SetFornecedor}
                        value={Fornecedor} />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="cg" className="form-label">Conta Gerencial</label>
                    <EditComplete placeholder={"Conta Gerencial"} id={"cg"}
                        tipoConsulta={"cg"}
                        onClickCodigo={setCondConta}
                        onClickDescricao={SetDescricaoConta}
                        value={descricaoConta} />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="cc" className="form-label">Centro de Custo</label>
                    <EditComplete placeholder={"Centro de Custo"} id={"cc"}
                        tipoConsulta={"cc"}
                        onClickCodigo={setCentroDeCusto}
                        onClickDescricao={SetDescricaoCentroDeCusto}
                        value={descricaoCentroDeCusto} />
                </div>

                <div className="col-lg-2 cadastro-filtro-col">
                    <label htmlFor="selecao-status-autorizacao" className="form-label">Status</label>
                    <select className="form-control" id="selecao-status-autorizacao" onChange={(e) => setpstatus(e.target.value)} value={pstatus}>
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

                <div className="col-lg-2 cadastro-filtro-col d-grid">
                    <button className="btn btn-danger w-100" onClick={gerarPDF}>
                        <i className="bi bi-file-earmark-pdf"></i> Gerar Relatório
                    </button>
                </div>
            </div>
        </div>
    </>
    );
}

export default RelatorioAutorizacaoDePagamento;