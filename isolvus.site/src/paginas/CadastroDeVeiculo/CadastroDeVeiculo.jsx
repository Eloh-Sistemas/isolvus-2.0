import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import ModalCadastroDeVeiculo from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeVeiculo";
import api from "../../servidor/api";
import "./CadastroDeVeiculo.css"
import "../CadastroDeUsuario/CadastroDeUsuario.css";
import StatusVeiculo from "../../componentes/StatusListaPedido/StatusVeiculo";

function CadastroDeVeiculo(){

   const ITENS_POR_PAGINA = 10;

   const [isItemOpen, setIsItemOpen] = useState(false);
   const [idVeiculoSelecionado, setIdVeiculoSelecionado] = useState(0); // Estado para armazenar o ID do usuário selecionado
   const [filtroVeiculo, setFiltroVeiculo] = useState("");
   const [dadosVeiculo, SetDadosVeiculo] = useState([]);
   const [loadingVeiculos, setLoadingVeiculos] = useState(false);
   const [erroConsulta, setErroConsulta] = useState("");
   const [paginaAtual, setPaginaAtual] = useState(1);


   const handleFiltroChange = (e) => {
      const valor = e.target.value.toUpperCase();
      setFiltroVeiculo(valor); // Atualiza o filtro conforme o usuário digita
      setPaginaAtual(1);
      if (valor.length < 3) {
         SetDadosVeiculo([]); // Limpa os resultados se o filtro for menor que 3 caracteres
      }
   };


   function consultarVeiculos(filtro) {
      setLoadingVeiculos(true);
      setErroConsulta("");
      api.post("/v1/consultarveiculo", { filtro, id_grupo_empresa : localStorage.getItem("id_grupo_empresa") })
         .then((retorno) => {
            SetDadosVeiculo(retorno.data); // Atualiza o estado com os dados da API
         })
         .catch((err) => {
            SetDadosVeiculo([]);
            setErroConsulta(err.response?.data?.error || "Erro ao consultar veículo.");
         })
         .finally(() => {
            setLoadingVeiculos(false);
         });
   }

   // Dispara a consulta apenas quando o filtro tiver pelo menos 3 caracteres
   useEffect(() => {
      if (filtroVeiculo.length >= 3) {
         consultarVeiculos(filtroVeiculo); // Chama a consulta com o filtro
      } else {
         setErroConsulta("");
         SetDadosVeiculo([]); // Limpa os resultados se o filtro tiver menos de 3 caracteres
         setLoadingVeiculos(false);
      }
   }, [filtroVeiculo]); // Chama sempre que o filtro mudar   

   useEffect(() => {
      setPaginaAtual(1);
   }, [dadosVeiculo.length]);


   function closeModalItem() {
      setIsItemOpen(false);         
      if (filtroVeiculo.length >= 3) {
         consultarVeiculos(filtroVeiculo);
      }
   }

   function openModalItem(idVeiculo) {
      setIdVeiculoSelecionado(idVeiculo); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

   const totalPaginas = Math.max(1, Math.ceil(dadosVeiculo.length / ITENS_POR_PAGINA));
   const paginaSegura = Math.min(paginaAtual, totalPaginas);
   const dadosPaginados = dadosVeiculo.slice(
      (paginaSegura - 1) * ITENS_POR_PAGINA,
      paginaSegura * ITENS_POR_PAGINA
   );

    return <>
        <Menu/>

        <ModalCadastroDeVeiculo
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            consultarVeiculos={consultarVeiculos}
            idVeiculoSelecionado={idVeiculoSelecionado} // Passa o idUsuario selecionado para o Modal            
         />

        <div className="container-fluid Containe-Tela cadastro-usuario-page">
            <div className="row text-body-secondary mb-3">
               <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                  <div>
                     <h1 className="mb-1 titulo-da-pagina">Cadastro de Veiculo</h1>
                     <p className="text-muted mb-0">Consulte veículos existentes ou abra um novo cadastro.</p>
                  </div>
                  <button
                     className="btn btn-primary"
                     onClick={() => openModalItem(0)}
                  >
                     Novo
                  </button>
               </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros">
               <div className="col-md-12 cadastro-filtro-col">
                  <label htmlFor="veiculo-filtro" className="form-label">Veiculo</label>
                  <input
                     autoFocus
                     type="text"
                     className="form-control"
                     id="veiculo-filtro"
                     placeholder="Informe a placa ou a descrição"
                     value={filtroVeiculo}
                     onChange={handleFiltroChange}
                  />
                  <small className="text-muted">Digite ao menos 3 caracteres para consultar.</small>
               </div>
            </div>

            <p className="cadastro-section-title">Aviso</p>
            <div className="cadastro-card cadastro-info-banner d-flex align-items-center">
               <h6 className="m-0">
                  <span>
                     <i className="bi bi-exclamation-circle-fill text-warning"> </i>
                     Clique na linha do registro para editar ou consultar mais detalhes.
                  </span>
               </h6>
            </div>

            <p className="cadastro-section-title">Resultados</p>
            <div className="cadastro-card cadastro-table-card">
               <div className="table-responsive">
                  <table className="table table-hover mb-0 cadastro-table">
                     <thead>
                        <tr>
                           <th scope="col">Veiculo</th>
                           <th scope="col">Placa</th>
                           <th scope="col" className="text-center">Situação</th>
                        </tr>
                     </thead>
                     <tbody>
                        {loadingVeiculos ? (
                           <tr>
                              <td colSpan="3" className="text-center">Buscando veículos...</td>
                           </tr>
                        ) : erroConsulta ? (
                           <tr>
                              <td colSpan="3" className="text-center text-danger">{erroConsulta}</td>
                           </tr>
                        ) : filtroVeiculo.trim().length < 3 ? (
                           <tr>
                              <td colSpan="3" className="text-center text-muted">
                                 Digite pelo menos 3 caracteres para pesquisar.
                              </td>
                           </tr>
                        ) : dadosVeiculo.length > 0 ? (
                           dadosPaginados.map((veiculo) => (
                              <tr
                                 onClick={() => openModalItem(veiculo.id_veiculo)}
                                 key={veiculo.id_veiculo_erp}
                                 className="linha-grid-desktop-analisedespesa cadastro-row-clickable"
                                 role="button"
                                 tabIndex={0}
                              >
                                 <td>{veiculo.descricao}</td>
                                 <td>{veiculo.placa}</td>
                                 <td className="text-center"><StatusVeiculo psituacao={veiculo.situacao}/></td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="3" className="text-center text-muted">
                                 Nenhum veículo encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               {!loadingVeiculos && !erroConsulta && dadosVeiculo.length > 0 && (
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 pt-3">
                     <small className="text-muted">
                        Exibindo {((paginaSegura - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaSegura * ITENS_POR_PAGINA, dadosVeiculo.length)} de {dadosVeiculo.length} veículos
                     </small>
                     {totalPaginas > 1 && (
                        <ul className="pagination pagination-sm mb-0">
                           <li className={`page-item ${paginaSegura === 1 ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => setPaginaAtual(1)}>«</button>
                           </li>
                           <li className={`page-item ${paginaSegura === 1 ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}>‹</button>
                           </li>
                           <li className={`page-item ${paginaSegura === totalPaginas ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}>›</button>
                           </li>
                           <li className={`page-item ${paginaSegura === totalPaginas ? 'disabled' : ''}`}>
                              <button className="page-link" onClick={() => setPaginaAtual(totalPaginas)}>»</button>
                           </li>
                        </ul>
                     )}
                  </div>
               )}
            </div>

        </div>
    </>
}

export default CadastroDeVeiculo;