import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import api from "../../servidor/api";
import ModalCadastroDeItem from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeItem";
import "./CadastroDeItem.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";

function CadastroDeItem(){

   const ITENS_POR_PAGINA = 10;

    const [isItemOpen, setIsItemOpen] = useState(false);
    const [idItemSelecionado, setIdItemSelecionado] = useState(0); 

    const [filtroItem, SetFiltroItem] = useState("");
    const [dadosItem, SetDadosItem] = useState([]);
   const [loadingItens, setLoadingItens] = useState(false);
   const [erroConsulta, setErroConsulta] = useState("");
   const [paginaAtual, setPaginaAtual] = useState(1);


    function closeModalItem() {
        setIsItemOpen(false);  
        consultarItem();      
    }

    function openModalItem(idItem) {
        setIdItemSelecionado(idItem); // Atualiza o ID do usuário selecionado
        setIsItemOpen(true); // Abre o modal
    }


    const handleFiltroChange = (e) => {
        const valor = e.target.value.toUpperCase();
        SetFiltroItem(valor);
      setPaginaAtual(1);
    };

    function consultarItem(){

      setLoadingItens(true);
      setErroConsulta("");
      
        var dadosJson = {
           "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
           "descricao": filtroItem  
        }

        api.post('/v1/consultarItemGeral',dadosJson)
        .then((retorno) =>{
            SetDadosItem(retorno.data);
        })
        .catch((err) =>{
         SetDadosItem([]);
         setErroConsulta(err.response?.data?.error || "Erro ao consultar itens.");
        })
      .finally(() => {
         setLoadingItens(false);
      });

    }

    useEffect(()=>{
        consultarItem();
    },[filtroItem])

      useEffect(() => {
         setPaginaAtual(1);
      }, [dadosItem.length]);

    const totalPaginas = Math.max(1, Math.ceil(dadosItem.length / ITENS_POR_PAGINA));
    const paginaSegura = Math.min(paginaAtual, totalPaginas);
    const dadosPaginados = dadosItem.slice(
         (paginaSegura - 1) * ITENS_POR_PAGINA,
         paginaSegura * ITENS_POR_PAGINA
    );

   return<>
        <Menu />

        <ModalCadastroDeItem
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idItemSelecionado={idItemSelecionado} // Passa o idUsuario selecionado para o Modal            
         />

        <div className="container-fluid Containe-Tela cadastro-usuario-page">
            <div className="row text-body-secondary mb-3">
               <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                  <div>
                     <h1 className="mb-1 titulo-da-pagina">Cadastro de Item para Despesas</h1>
                     <p className="text-muted mb-0">Consulte itens existentes ou abra um novo cadastro.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => openModalItem(0)}>
                     Cadastrar
                  </button>
               </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros">
               <div className="col-md-12 cadastro-filtro-col">
                  <label htmlFor="item-filtro" className="form-label">Item</label>
                  <input
                     autoFocus
                     type="text"
                     className="form-control"
                     id="item-filtro"
                     placeholder="Informe a descrição do item"
                     value={filtroItem}
                     onChange={handleFiltroChange}
                  />
                  <small className="text-muted">Filtre por descrição do item.</small>
               </div>
            </div>

            <p className="cadastro-section-title">Resultados</p>
            <div className="cadastro-card cadastro-table-card">
               <div className="table-responsive">
                  <table className="table table-hover mb-0 cadastro-table">
                     <thead>
                        <tr>
                           <th className="col-2" scope="col">Código</th>
                           <th className="col-6" scope="col">Descrição</th>
                           <th className="col-4" scope="col">Categoria</th>
                        </tr>
                     </thead>
                     <tbody>
                        {loadingItens ? (
                           <tr>
                              <td colSpan="3" className="text-center">Buscando itens...</td>
                           </tr>
                        ) : erroConsulta ? (
                           <tr>
                              <td colSpan="3" className="text-center text-danger">{erroConsulta}</td>
                           </tr>
                        ) : dadosItem.length > 0 ? (
                           dadosPaginados.map((item) => (
                              <tr
                                 onClick={() => openModalItem(item.codigo)}
                                 className="linha-grid-desktop-analisedespesa cadastro-row-clickable"
                                 key={item.codigo}
                                 role="button"
                                 tabIndex={0}
                              >
                                 <td>{item.codigo}</td>
                                 <td>{item.descricao}</td>
                                 <td>{item.descricao2}</td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="3" className="text-center text-muted">
                                 Nenhum item encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               {!loadingItens && !erroConsulta && dadosItem.length > 0 && (
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 pt-3">
                     <small className="text-muted">
                        Exibindo {((paginaSegura - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaSegura * ITENS_POR_PAGINA, dadosItem.length)} de {dadosItem.length} itens
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

export default CadastroDeItem;