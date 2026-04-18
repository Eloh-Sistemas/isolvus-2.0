import Menu from "../../componentes/Menu/Menu";
import ModalPermissaoUsuario from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalPermissaoUsuario";
import api from "../../servidor/api";
import { ToastContainer, toast } from 'react-toastify'; // Importar toast
import "./PermissaoDeRotina.css";
import { useEffect, useState } from "react";

function PermissaoDeRotina() {
   const [isItemOpen, setIsItemOpen] = useState(false);
   const [usuarios, setUsuarios] = useState([]); // Estado para armazenar os usuários
   const [filtroUsuario, setFiltroUsuario] = useState(""); // Estado para armazenar o valor do campo de filtro
   const [idUsuarioSelecionado, setIdUsuarioSelecionado] = useState(null); // Estado para armazenar o ID do usuário selecionado

   function closeModalItem() {
      setIsItemOpen(false);
   }

   function openModalItem(idUsuario) {
      setIdUsuarioSelecionado(idUsuario); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

   function consultaUsuario(filtro) {
      api.post('/v1/consultarusuario', { filtro })
         .then((retorno) => {
            setUsuarios(retorno.data); // Atualiza o estado com os dados da API
         })
         .catch((err) => {
            console.error("Erro ao consultar usuários:", err);
         });
   }

   // Dispara a consulta apenas quando o filtro tiver pelo menos 3 caracteres
   useEffect(() => {
      if (filtroUsuario.length >= 3) {
         consultaUsuario(filtroUsuario); // Chama a consulta com o filtro
      } else {
         setUsuarios([]); // Limpa os resultados se o filtro tiver menos de 3 caracteres
      }
   }, [filtroUsuario]); // Chama sempre que o filtro mudar

   const handleFiltroChange = (e) => {
      const valor = e.target.value.toUpperCase();
      setFiltroUsuario(valor); // Atualiza o filtro conforme o usuário digita
      if (valor.length < 3) {
         setUsuarios([]); // Limpa os resultados se o filtro for menor que 3 caracteres
      }
   };

   return (
      <>
         <Menu />

         <ModalPermissaoUsuario
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idUsuario={idUsuarioSelecionado} // Passa o idUsuario selecionado para o Modal
         />

         <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Permissão de Rotina / Consultar usuário</h1>
            </div>

            <div className="row">
               <div className="col-lg-5 mb-3">
                  <label htmlFor="Usuário" className="mb-2">Usuário</label>
                  <input
                     autoFocus
                     type="text"
                     className="form-control"
                     id="Usuário"
                     placeholder={"Informe a matrícula ou usuário"}
                     value={filtroUsuario} // Associa o valor ao estado filtroUsuario
                     onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                  />
               </div>

               <div>
                  <div className="d-flex align-items-center ChartFundo">
                  <h6 className="m-2"><span  style={{ fontSize: '13px'}}><i class="bi bi-exclamation-circle-fill text-warning"> </i>{"Click na linha do registro para editar ou consultar mais detalhes"}</span></h6>              
                  </div>
               </div>

               <div className="col-lg-12">
                  <table className="table tablefont table-hover mt-3">
                     <thead>
                        <tr>
                           <th className="col-1" scope="col">Código</th>
                           <th className="col-11" scope="col">Nome</th>
                        </tr>
                     </thead>
                     <tbody>
                        {usuarios.length > 0 ? (
                           usuarios.map((usuario) => (
                              <tr onClick={() => openModalItem(usuario.id_usuario)} key={usuario.id_usuario} className="linha-grid-desktop-analisedespesa">
                                 <td>{usuario.id_usuario}</td>
                                 <td>{usuario.nome}</td>                              
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="2" className="text-center">
                                 Nenhum usuário encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* ToastContainer para exibir as mensagens */}
         <ToastContainer />
      </>
   );
}

export default PermissaoDeRotina;
