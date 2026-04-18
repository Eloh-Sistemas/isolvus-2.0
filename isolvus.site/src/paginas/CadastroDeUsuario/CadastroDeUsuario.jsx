import Menu from "../../componentes/Menu/Menu";
import api from "../../servidor/api";
import ModalCadastroDeUsuario from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeUsuario";
import { ToastContainer, toast } from "react-toastify"; // Importar toast
import { useEffect, useState } from "react";
import "./CadastroDeUsuario.css";

function CadastroDeUsuario() {

   const [isItemOpen, setIsItemOpen] = useState(false);
   const [usuarios, setUsuarios] = useState([]); // Estado para armazenar os usuários
   const [filtroUsuario, setFiltroUsuario] = useState(""); // Estado para armazenar o valor do campo de filtro
   const [idFilialSelecionado, setIdFilialSelecionado] = useState(null); // Estado para armazenar o ID do usuário selecionado

   function closeModalItem() {
      setIsItemOpen(false);
   }

   function openModalItem(idFilial) {
      setIdFilialSelecionado(idFilial); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

   function consultaUsuario(filtro) {
      api.post("/v1/consultarusuario", { filtro })
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

         <ModalCadastroDeUsuario
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idUsuario={idFilialSelecionado} // Passa o idUsuario selecionado para o Modal
         />

         <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Cadastro de Funcionário</h1>
            </div>

            {/* Linha com input e botão */}
            <div className="row align-items-center mb-4">
               <div className="col-lg-12 d-flex">
                  {/* Input no lado esquerdo */}
                  <div className="flex-grow-1 me-3">
                     <label htmlFor="Usuário" className="mb-2">Usuário</label>
                     <input
                        autoFocus
                        type="text"
                        className="form-control"
                        id="Usuário"
                        placeholder="Informe a matrícula ou usuário"
                        value={filtroUsuario} // Associa o valor ao estado filtroUsuario
                        onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                     />
                  </div>

                  {/* Botão no lado direito */}
                  <button
                     className="btn btn-success align-self-end"
                     onClick={() => openModalItem(null)} // Chama o modal sem ID para criação
                  >
                     <i className="bi bi-plus-circle"></i> Novo
                  </button>
               </div>
            </div>

            <div className="mt-3">
            <div className="d-flex align-items-center ChartFundo">
              <h6 className="m-2"><span  style={{ fontSize: '13px'}}><i className="bi bi-exclamation-circle-fill text-warning"> </i>{"Click na linha do registro para editar ou consultar mais detalhes"}</span></h6>              
            </div>
          </div>

            {/* Tabela de usuários */}
            <div className="row">
               <div className="col-lg-12 mt-4">
                  <table className="table tablefont table-hover">
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

export default CadastroDeUsuario;
