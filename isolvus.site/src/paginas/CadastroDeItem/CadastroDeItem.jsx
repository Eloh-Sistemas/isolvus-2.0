import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import api from "../../servidor/api";
import ModalCadastroDeItem from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeItem";

function CadastroDeItem(){


    const [isItemOpen, setIsItemOpen] = useState(false);
    const [idItemSelecionado, setIdItemSelecionado] = useState(0); 

    const [filtroItem, SetFiltroItem] = useState("");
    const [dadosItem, SetDadosItem] = useState([]);


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
           SetFiltroItem(valor); // Atualiza o filtro conforme o usuário digita
        if (valor.length < 3) {
           SetDadosItem([]); // Limpa os resultados se o filtro for menor que 3 caracteres
        }
     };

    function consultarItem(){
      
        var dadosJson = {
           "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
           "descricao": filtroItem  
        }

        api.post('/v1/consultarItemGeral',dadosJson)
        .then((retorno) =>{
            SetDadosItem(retorno.data);
        })
        .catch((err) =>{
            console.log(err.response)
        })

    }

    useEffect(()=>{
        consultarItem();
    },[filtroItem])

    return<>
        <Menu />

        <ModalCadastroDeItem
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            idItemSelecionado={idItemSelecionado} // Passa o idUsuario selecionado para o Modal            
         />

        <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Cadastro de Item para Despesas</h1>
            </div>

            <div className="row align-items-center mb-4">
                <div className="col-lg-11 mb-3">
                <label htmlFor="item" className="mb-2">Item</label>
                <input
                        autoFocus
                        type="text"
                        className="form-control"
                        id="item"
                        placeholder="Informe a descrição do item"
                        value={filtroItem} // Associa o valor ao estado filtroUsuario
                        onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                     />              
                </div>
                <div className="col-lg-1 mb-2">
                <button
                     className="btn btn-success align-self-end marg-botal-add w-100"
                     onClick={() => openModalItem(0)} // Chama o modal sem ID para criação
                  >
                     <i className="bi bi-plus-circle"></i> Cadastrar
                  </button>
                </div>

            </div>

            {/* Tabela de usuários */}
            <div className="row">
               <div className="col-lg-12">
                  <table className="table tablefont table-hover table-font">
                     <thead>
                        <tr>
                           <th className="col-1" scope="col">Código</th>
                           <th className="col" scope="col">Descrição</th>
                           <th className="col" scope="col">Categoria</th>
                        </tr>
                     </thead>
                     <tbody>
                        {dadosItem.length > 0 ? (
                           dadosItem.map((item) => (
                              <tr onClick={() => openModalItem(item.codigo) } className="linha-grid-desktop-analisedespesa" key={item.codigo}>
                                 <td>{item.codigo}</td>
                                 <td>{item.descricao}</td>                                 
                                 <td>{item.descricao2}</td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="3" className="text-center">
                                 Nenhum vinculo encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
        </div>
    </>
}

export default CadastroDeItem;