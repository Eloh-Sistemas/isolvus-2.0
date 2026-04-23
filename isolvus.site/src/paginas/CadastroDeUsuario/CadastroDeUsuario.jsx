import Menu from "../../componentes/Menu/Menu";
import api from "../../servidor/api";
import ModalCadastroDeUsuario from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeUsuario";
import { ToastContainer } from "react-toastify";
import { useEffect, useState } from "react";
import "./CadastroDeUsuario.css";

function CadastroDeUsuario() {

   const [isItemOpen, setIsItemOpen] = useState(false);
   const [usuarios, setUsuarios] = useState([]); // Estado para armazenar os usuários
   const [filtroUsuario, setFiltroUsuario] = useState(""); // Estado para armazenar o valor do campo de filtro
   const [idFilialSelecionado, setIdFilialSelecionado] = useState(null); // Estado para armazenar o ID do usuário selecionado
   const [loadingUsuarios, setLoadingUsuarios] = useState(false);
   const [erroConsulta, setErroConsulta] = useState("");
   const [hasSearched, setHasSearched] = useState(false);

   function closeModalItem() {
      setIsItemOpen(false);
   }

   function openModalItem(idFilial) {
      setIdFilialSelecionado(idFilial); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

   async function consultaUsuario(filtro, signal) {
      setLoadingUsuarios(true);
      setErroConsulta("");

      try {
         const retorno = await api.post("/v1/consultarusuario", { filtro }, { signal });
         setUsuarios(Array.isArray(retorno.data) ? retorno.data : []);
      } catch (err) {
         if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
            return;
         }

         console.error("Erro ao consultar usuários:", err);
         setUsuarios([]);
         setErroConsulta("Erro ao consultar usuários. Tente novamente.");
      } finally {
         setLoadingUsuarios(false);
      }
   }

   useEffect(() => {
      const filtroNormalizado = filtroUsuario.trim();

      if (filtroNormalizado.length < 3) {
         setUsuarios([]);
         setLoadingUsuarios(false);
         setErroConsulta("");
         setHasSearched(false);
         return;
      }

      const controller = new AbortController();
      const debounce = setTimeout(() => {
         setHasSearched(true);
         consultaUsuario(filtroNormalizado, controller.signal);
      }, 400);

      return () => {
         clearTimeout(debounce);
         controller.abort();
      };
   }, [filtroUsuario]);

   const handleFiltroChange = (e) => {
      const valor = e.target.value.toUpperCase();
      setFiltroUsuario(valor);

      if (valor.length < 3) {
         setUsuarios([]);
         setHasSearched(false);
         setErroConsulta("");
      }
   };

   const handleRowKeyDown = (event, idUsuario) => {
      if (event.key === "Enter" || event.key === " ") {
         event.preventDefault();
         openModalItem(idUsuario);
      }
   };

   return (
      <>
         <Menu />

         <ModalCadastroDeUsuario
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idUsuario={idFilialSelecionado} // Passa o idUsuario selecionado para o Modal
         />

         <div className="container-fluid Containe-Tela cadastro-usuario-page">
            <div className="row text-body-secondary mb-3">
               <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                  <div>
                     <h1 className="mb-1 titulo-da-pagina">Cadastro de Funcionário</h1>
                     <p className="text-muted mb-0">Consulte usuários existentes ou abra um novo cadastro.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => openModalItem(null)}>Cadastrar Funcionário</button>
               </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros">
               <div className="col-md-12 cadastro-filtro-col">
                  <label htmlFor="usuario-filtro" className="form-label">Usuário</label>
                  <input
                     autoFocus
                     type="text"
                     className="form-control"
                     id="usuario-filtro"
                     placeholder="Informe a matrícula ou usuário"
                     value={filtroUsuario}
                     onChange={handleFiltroChange}
                  />
                  <small className="text-muted">Digite matrícula ou nome. A pesquisa inicia com 3 caracteres.</small>
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
                  <table className="table tablefont table-hover mb-0 cadastro-table">
                     <thead>
                        <tr>
                           <th className="col-1" scope="col">Código</th>
                           <th className="col-11" scope="col">Nome</th>
                        </tr>
                     </thead>
                     <tbody>
                        {loadingUsuarios ? (
                           <tr>
                              <td colSpan="2" className="text-center">Buscando usuários...</td>
                           </tr>
                        ) : erroConsulta ? (
                           <tr>
                              <td colSpan="2" className="text-center text-danger">{erroConsulta}</td>
                           </tr>
                        ) : filtroUsuario.trim().length < 3 ? (
                           <tr>
                              <td colSpan="2" className="text-center text-muted">
                                 Digite pelo menos 3 caracteres para pesquisar.
                              </td>
                           </tr>
                        ) : usuarios.length > 0 ? (
                           usuarios.map((usuario) => (
                              <tr
                                 onClick={() => openModalItem(usuario.id_usuario)}
                                 onKeyDown={(event) => handleRowKeyDown(event, usuario.id_usuario)}
                                 key={usuario.id_usuario}
                                 className="linha-grid-desktop-analisedespesa cadastro-row-clickable"
                                 role="button"
                                 tabIndex={0}
                              >
                                 <td>{usuario.id_usuario}</td>
                                 <td>{usuario.nome}</td>                                 
                              </tr>
                           ))
                        ) : hasSearched ? (
                           <tr>
                              <td colSpan="2" className="text-center">
                                 Nenhum usuário encontrado.
                              </td>
                           </tr>
                        ) : (
                           <tr>
                              <td colSpan="2" className="text-center text-muted">
                                 Informe um filtro para pesquisar usuários.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
            </div>
         </div>

         {/* ToastContainer para exibir as mensagens */}
         <ToastContainer />
      </>
   );
}

export default CadastroDeUsuario;
