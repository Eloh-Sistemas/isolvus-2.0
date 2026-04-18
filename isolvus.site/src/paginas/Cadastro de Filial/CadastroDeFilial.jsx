import Menu from "../../componentes/Menu/Menu";
import { ToastContainer, toast } from "react-toastify"; // Importar toast
import { useEffect, useState } from "react";
import api from "../../servidor/api";
import ModalCadastroDeFilial from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeFilial";

function CadastroDeFilial(){

   const [isItemOpen, setIsItemOpen] = useState(false);
   const [filial, setFilial] = useState([]); // Estado para armazenar os usuários
   const [filtroFilial, setFiltroFilial] = useState(""); // Estado para armazenar o valor do campo de filtro
   const [idFilialSelecionado, setIdFilialSelecionado] = useState(null); // Estado para armazenar o ID do usuário selecionado

    function openModalItem(idFilial) {
      setIdFilialSelecionado(idFilial); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

   function closeModalItem() {
      setIsItemOpen(false);
   }

    function consultaFilial(filtro) {
        api.post("/v1/consultarFilialCompleto", { descricao: filtro , id_grupo_empresa: 1 })
           .then((retorno) => {
              setFilial(retorno.data); // Atualiza o estado com os dados da API
           })
           .catch((err) => {
              console.error("Erro ao consultar usuários:", err);
           });
     }

    const handleFiltroChange = (e) => {
        const valor = e.target.value.toUpperCase();
            setFiltroFilial(valor); // Atualiza o filtro conforme o usuário digita
        if (valor.length < 3) {
            setFilial([]); // Limpa os resultados se o filtro for menor que 3 caracteres
        }
     };


     useEffect(() => {
        if (filtroFilial.length >= 3) {
           consultaFilial(filtroFilial); // Chama a consulta com o filtro
        } else {
           setFilial([]); // Limpa os resultados se o filtro tiver menos de 3 caracteres
        }
     }, [filtroFilial]); // Chama sempre que o filtro mudar

     

    return<>
       <Menu/>

       <ModalCadastroDeFilial
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idFilial={idFilialSelecionado} // Passa o idUsuario selecionado para o Modal
         />

       <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Cadastro de Filial</h1>
            </div>


            {/* Linha com input e botão */}
            <div className="row align-items-center mb-4">
               <div className="col-lg-12 d-flex">
                  {/* Input no lado esquerdo */}
                  <div className="flex-grow-1 me-3">
                     <label htmlFor="filial" className="mb-2">Filial</label>
                     <input
                        autoFocus
                        type="text"
                        className="form-control"
                        id="Usuário"
                        placeholder="Informe a descrição da filial"
                        value={filtroFilial} // Associa o valor ao estado filtroUsuario
                        onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                     />
                  </div>

                  {/* Botão no lado direito */}
                  <button
                     className="btn btn-success align-self-end"
                     onClick={() => openModalItem(0)}
                  >
                     <i className="bi bi-plus-circle"></i> Novo
                  </button>
               </div>
            </div>


            {/* Tabela de usuários */}
            <div className="row">
               <div className="col-lg-12">
                  <table className="table mt-3">
                     <thead className="Titulos-Table">
                        <tr>
                           <th scope="col">Código</th>
                           <th scope="col">Nome</th>
                           <th scope="col">CNPJ</th>
                           <th scope="col"></th>
                        </tr>
                     </thead>
                     <tbody>
                        {filial.length > 0 ? (
                           filial.map((filial) => (
                              <tr key={filial.id_erp} className="linha-grid-desktop-analisedespesa">
                                 <td>{filial.id_erp}</td>
                                 <td>{filial.razaosocial}</td>
                                 <td>{filial.cnpj_cpf}</td>
                                 <td className="text-end">
                                    <button
                                       className="btn btn-secondary me-5"
                                       id="button-grid-desktop-despesas"
                                       onClick={() => openModalItem(filial.id_empresa)} // Passa o idUsuario ao clicar
                                    >
                                       <i className="bi bi-pencil-square"></i>
                                    </button>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="3" className="text-center">
                                 Nenhuma filial encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
            
        </div>
        <ToastContainer />


    </>
}

export default CadastroDeFilial;