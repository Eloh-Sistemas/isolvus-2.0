import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import ModalCadastroDeVeiculo from "../../componentes/SolicitacaoDeDesepesa/Modal/ModalCadastroDeVeiculo";
import api from "../../servidor/api";
import "./CadastroDeVeiculo.css"
import StatusVeiculo from "../../componentes/StatusListaPedido/StatusVeiculo";

function CadastroDeVeiculo(){

   const [isItemOpen, setIsItemOpen] = useState(false);
   const [idVeiculoSelecionado, setIdVeiculoSelecionado] = useState(0); // Estado para armazenar o ID do usuário selecionado
   const [filtroVeiculo, setFiltroVeiculo] = useState("");
   const [dadosVeiculo, SetDadosVeiculo] = useState([]);


   const handleFiltroChange = (e) => {
      const valor = e.target.value.toUpperCase();
      setFiltroVeiculo(valor); // Atualiza o filtro conforme o usuário digita
      if (valor.length < 3) {
         SetDadosVeiculo([]); // Limpa os resultados se o filtro for menor que 3 caracteres
      }
   };


   function consultarVeiculos(filtro) {
      api.post("/v1/consultarveiculo", { filtro, id_grupo_empresa : localStorage.getItem("id_grupo_empresa") })
         .then((retorno) => {
            SetDadosVeiculo(retorno.data); // Atualiza o estado com os dados da API
         })
         .catch((err) => {
            console.error("Erro ao consultar veiculo:", err);
         });         
   }

   // Dispara a consulta apenas quando o filtro tiver pelo menos 3 caracteres
   useEffect(() => {
      if (filtroVeiculo.length >= 3) {
         consultarVeiculos(filtroVeiculo); // Chama a consulta com o filtro
      } else {
         SetDadosVeiculo([]); // Limpa os resultados se o filtro tiver menos de 3 caracteres
      }
   }, [filtroVeiculo]); // Chama sempre que o filtro mudar   


   function closeModalItem() {
      setIsItemOpen(false);         
   }

   function openModalItem(idVeiculo) {
      setIdVeiculoSelecionado(idVeiculo); // Atualiza o ID do usuário selecionado
      setIsItemOpen(true); // Abre o modal
   }

    return <>
        <Menu/>

        <ModalCadastroDeVeiculo
            isOpen={isItemOpen}
            onRequestClose={closeModalItem}
            ariaHideApp={false}
            consultarVeiculos={consultarVeiculos}
            idVeiculoSelecionado={idVeiculoSelecionado} // Passa o idUsuario selecionado para o Modal            
         />

        <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Cadastro de Veiculo</h1>
            </div>

            {/* Linha com input e botão */}
            <div className="row align-items-center mb-4">
               <div className="col-lg-12 d-flex">
                  {/* Input no lado esquerdo */}
                  <div className="flex-grow-1 me-3">
                     <label htmlFor="Veiculo" className="mb-2">Veiculo</label>
                     <input
                        autoFocus
                        type="text"
                        className="form-control"
                        id="Veiculo"
                        placeholder="Informe a placa ou a Descrição"
                        value={filtroVeiculo} // Associa o valor ao estado filtroUsuario
                        onChange={handleFiltroChange} // Atualiza o filtro conforme digita
                     />
                  </div>

                  {/* Botão no lado direito */}
                  <button
                     className="btn btn-success align-self-end"
                     onClick={() => openModalItem(0)} // Chama o modal sem ID para criação
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
                           <th scope="col">Veiculo</th>
                           <th scope="col">Placa</th>                                 
                           <th scope="col" className="text-center">Situação</th> 
                        </tr>
                     </thead>
                     <tbody>
                        {dadosVeiculo.length > 0 ? (
                           dadosVeiculo.map((veiculo) => (
                              <tr onClick={() => openModalItem(veiculo.id_veiculo)} key={veiculo.id_veiculo_erp} className="linha-grid-desktop-analisedespesa">   
                                 <td>{veiculo.descricao}</td>
                                 <td>{veiculo.placa}</td>                                                                            
                                 <td className="text-center"><StatusVeiculo psituacao={veiculo.situacao}/></td>  
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="3" className="text-center">
                                 Nenhum veículo encontrado.
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

export default CadastroDeVeiculo;