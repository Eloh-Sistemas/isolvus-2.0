import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import IntegracaoFornecedorCadastroModal from "./Modal/IntegracaoFornecedorCadastroModal";
import api from "../../servidor/api";
import { toast, ToastContainer } from "react-toastify";
import moment from "moment";

function IntegracaoFornecedorCadastro(){

    const [isItemOpen, setIsItemOpen] = useState(false);

    const [CodFilial, setCodFilial] = useState(0);
    const [descricaoFilial, setDescricaoFilial] = useState("");
    const [codFornecedor, setCodFornecedor] = useState(0);
    const [descricaoFornecedor, setDescricaoFornecedor] = useState("");
    const [filtroArquivo, setFiltroArquivo] = useState("");
    const [IdItemSelecionado, setIdItemSelecionado] = useState(0);
    const [dataInicial, setDataInicial] = useState(moment().format("YYYY-MM-DD"));
    const [dataFinal, setDataFinal] = useState(moment().format("YYYY-MM-DD"));


    const [dataIntegracao, setdataIntegracao] = useState([]);



    

    function gerarArquivo(){

    const id1 = toast.loading("Processando arquivos...", {position : "top-center"});

      const idsarquivogerar =  dataIntegracao.map(item => ({id_intfornec: item.id_intfornec}));

      const jsonReq =
      {
        id_grupo_empresa: Number(localStorage.getItem("id_grupo_empresa")),
        idsarquivogerar: idsarquivogerar,
        parametros: {
        data1: moment(dataInicial).format("DD/MM/YYYY"),
        data2: moment(dataFinal).format("DD/MM/YYYY")}      
      }
      
      
      api.post('/v1/IntegracaoFornecedor/gerararquivo', jsonReq)
      .then((resposta) =>{
        toast.update(id1, {
            render: resposta.data.mensagem, 
            type: "success", 
            isLoading: false,                             
            autoClose: 1700,
            pauseOnHover: false
        });  
      })
      .catch((err) =>{
        console.log(err);
            toast.update(id1, {
            render: err.response.data.message	, 
            type: "error", 
            isLoading: false,
            autoClose: 5000,
            pauseOnHover: false});
      })

    }
    
    function consultar(){

        const jsonReq = {
            id_grupo_empresa: localStorage.getItem('id_grupo_empresa'),
            id_filialerp: CodFilial,
            id_fornecerp: codFornecedor,
            nomedoarquivo: filtroArquivo
        };

        api.post('/v1/IntegracaoFornecedor/consultar', jsonReq)
        .then((retorno) => {
            setdataIntegracao(retorno.data);
        })
        .catch((err)=>{
            console.log(err);
        })

    }

    useEffect(()=>{       
        consultar();
    },[CodFilial, codFornecedor, filtroArquivo]);
    
    const handleFiltroChange = (e) => {
      const valor = e.target.value.toUpperCase();
      setFiltroArquivo(valor); // Atualiza o filtro conforme o usuário digita
      if (valor.length < 3) {
          // Limpa os resultados se o filtro for menor que 3 caracteres
      }
   };    

    function closeModalItem() {
        setIsItemOpen(false);   
    }

    function openModalItem(idItem) {
        setIdItemSelecionado(idItem); // Atualiza o ID do usuário selecionado
        setIsItemOpen(true); // Abre o modal
    }
        
    return(
        <>            

            <Menu />

            <IntegracaoFornecedorCadastroModal
                isOpen={isItemOpen}
                onRequestClose={closeModalItem}
                ariaHideApp={false}  
                IdItemSelecionado={IdItemSelecionado} 
                consultar={consultar}              
            />

            <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Integrações</h1>
            </div>

            <div className="row align-items-center mb-4">
                <div className="col-lg-2 mb-3">
                <label htmlFor="fl" className="mb-2">Filial</label>
                <EditComplete   placeholder={"Filial"} id={"fl"}  
                                tipoConsulta={"fl"} 
                                onClickCodigo={setCodFilial} 
                                onClickDescricao={setDescricaoFilial}
                                value={descricaoFilial} 
                                disabled={false}/>
                </div>
                <div className="col-lg-2 mb-3">
                <label htmlFor="fo" className="mb-2">Fornecedor</label>
                <EditComplete   placeholder={"Fornecedor"} id={"fo"}  
                                tipoConsulta={"fo"} 
                                onClickCodigo={setCodFornecedor} 
                                onClickDescricao={setDescricaoFornecedor}
                                value={descricaoFornecedor} 
                                disabled={false}/>
                </div>
                <div className="col-lg-2 mb-3">
                <label htmlFor="Veiculo" className="mb-2">Nome do Arquivo</label>
                     <input
                        autoFocus
                        type="text"
                        className="form-control"
                        id="Veiculo"
                        placeholder="Arquivo"
                        value={filtroArquivo} // Associa o valor ao estado filtroUsuario
                        onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                     />
                </div>

                <div className="col-lg-2 mb-3">
                    <label htmlFor="DataDaSolicitação" className="mb-2">Data Inicial</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitação" 
                                                        placeholder={dataInicial}
                                                        onChange={(e) => {setDataInicial(e.target.value)}}
                                                        value={dataInicial}
                                                        /> 
                </div>

                <div className="col-lg-2 mb-3">
                    <label htmlFor="DataDaSolicitação" className="mb-2">Data Final</label>                   
                    <input type="date" className="form-control" id="DataDaSolicitação" 
                                                        placeholder={dataFinal}
                                                        onChange={(e) => {setDataFinal(e.target.value)}}
                                                        value={dataFinal}
                                                        /> 
                </div>
                
                <div className="col-lg-1 mb-2">
                <button
                     className="btn btn-success align-self-end marg-botal-add w-100"
                     onClick={() => openModalItem({})} // Chama o modal sem ID para criação
                  >Novo</button>
                </div>

                <div className="col-lg-1 mb-2">
                <button
                     className="btn btn-primary align-self-end marg-botal-add w-100"
                     onClick={() => gerarArquivo()} 
                  >Gerar Arquivos</button>
                </div>                

            </div>

            <div className="mb-4">
            <div className="d-flex align-items-center ChartFundo">
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>
                    <i className="bi bi-exclamation-circle-fill text-warning"> </i>
                    <strong>Campo Base:</strong> 
                </span>
                </h6>
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>Base de Dados Cliente (C)</span>
                </h6>
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>Base de Dados Intranet (L)</span>
                </h6>
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>
                    <i className="bi bi-exclamation-circle-fill text-warning"> </i>
                    <strong>Campo Status:</strong> 
                </span>
                </h6>
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>Ativo (A)</span>
                </h6>
                <h6 className="m-2">
                <span style={{ fontSize: '13px' }}>Inativo (I)</span>
                </h6>
            </div>

            </div>


                {/* Tabela */}
                <div className="row">
                <div className="col-lg-12">
                    <table className="table tablefont table-hover table-font">
                        <thead>
                            <tr>
                        
                            <th className="col-1" scope="col">Filial</th>
                            <th className="col" scope="col">Fornecedor</th>
                            <th className="col" scope="col">Nome do Arquivo</th>
                            <th className="col" scope="col">Extensão</th>
                            <th className="col-1 text-center" scope="col">Base</th>
                            <th className="col-1 text-center" scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataIntegracao.length > 0 ? (
                            dataIntegracao.map((Integracao) => (
                                <tr onClick={() => openModalItem(Integracao)} className="linha-grid-desktop-analisedespesa" key={Integracao.id_intfornec}>
                        
                                    <td>{Integracao.id_filialerp}</td>                                 
                                    <td>{Integracao.id_fornecerp+' - '+Integracao.fornecedor}</td>
                                    <td>{Integracao.nomedoarquivo}</td>
                                    <td>{"."+Integracao.tipodoarquivo.toUpperCase()}</td>
                                    <td className="text-center">{Integracao.basededados}</td>
                                    <td className="text-center" >{Integracao.status}</td>
                                </tr>
                            ))
                            ) : (
                            <tr>
                                <td colSpan="6" className="text-center">
                                    Nenhuma Integracao encontrado.
                                </td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                </div>
              <ToastContainer />
            </div>
        </>
    )
}

export default IntegracaoFornecedorCadastro;