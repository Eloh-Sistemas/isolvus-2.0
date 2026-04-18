import { useEffect, useState } from "react";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import Menu from "../../componentes/Menu/Menu";
import "./VincularContaOrdendador.css";
import api from "../../servidor/api";
import { ToastContainer, toast } from 'react-toastify';

function VincularContaOrdenador(){

   const [codFilial, setCodFilial] = useState(0);
   const [descricaoFilial, setDescricaoFilial] = useState("");

   const [codOrdenador, setCodOrdenador] = useState(0);
   const [descricaoOrdenador, setDescricaoOrdenador] = useState("");

   const [codContaGerencial, setCodContaGerencial] = useState(0);
   const [descricaoContaGerencial, setDescricaoContaGerencial] = useState("");

   const [dadosVinculo, SetDadosVinculo] = useState([]);

   function excluirVinculo(lid_usuario_erp, lid_conta_erp, lid_filial_erp ){
      const id = toast.loading("Excluindo vinculo ...")

      var dadosJson = {
         "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
         "id_usuario_erp": lid_usuario_erp,
         "id_conta_erp": lid_conta_erp,
         "id_filial_erp": lid_filial_erp
      }

      api.post('/v1/excluirVinculoOrdenador',dadosJson)
      .then((retorno) =>{
         SetDadosVinculo(retorno.data)

         toast.update(id, {
            render: retorno.data.menssagem, 
            type: "success", 
            isLoading: false,                             
           autoClose: 2000}); 
         
           ConsultarDadosVinculo();
           
      })
      .catch((err)=>{

         toast.update(id, {
            render: err.response.data.erro,
            type: "error",
            isLoading: false,
            autoClose: 2000,
          });

         console.log(err)
      })  
   }

   function Vincular(){
      
      const id = toast.loading("Vinculando ordenador ...")

      var dadosJson = {
         "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
         "id_usuario_erp": codOrdenador,
         "id_conta_erp": codContaGerencial,
         "id_filial_erp": codFilial
      }

      api.post('/v1/cadastrarVinculoOrdenador',dadosJson)
      .then((retorno) =>{
         SetDadosVinculo(retorno.data)

         toast.update(id, {
            render: retorno.data.menssagem, 
            type: "success", 
            isLoading: false,                             
           autoClose: 2000}); 
         
           ConsultarDadosVinculo();
           
      })
      .catch((err)=>{

         toast.update(id, {
            render: err.response.data.error,
            type: "error",
            isLoading: false,
            autoClose: 2000,
          });

      })  
   }

   function ConsultarDadosVinculo(){

      if (codFilial > 0 || codOrdenador > 0 || codContaGerencial > 0){      
      
         var dadosJson = {
            "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
            "id_usuario_erp": codOrdenador,
            "id_conta_erp": codContaGerencial,
            "id_filial_erp": codFilial
         }

         api.post('/v1/consultarVinculoOrdenador',dadosJson)
         .then((retorno) =>{
            SetDadosVinculo(retorno.data)
         })
         .catch((err)=>{
            console.log(err)
         })   

      }else{
         SetDadosVinculo([]);
      }    
   }

   useEffect(()=>{
      ConsultarDadosVinculo();    
   },[codFilial,codOrdenador,codContaGerencial]);

  return<>
     <Menu />
     <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
               <h1 className="mb-4 titulo-da-pagina">Vincular Conta a Ordenador</h1>
            </div>

            <div className="row align-items-center mb-4">
                <div className="col-lg-3 mb-3">
                <label htmlFor="fl" className="mb-2">Filial</label>
                <EditComplete   placeholder={"Filial"} id={"fl"}  
                                tipoConsulta={"fl"} 
                                onClickCodigo={setCodFilial} 
                                onClickDescricao={setDescricaoFilial}
                                value={descricaoFilial} 
                                disabled={false}/>
                </div>
                <div className="col-lg-4 mb-3">
                <label htmlFor="us" className="mb-2">Ordendador</label>
                <EditComplete   placeholder={"Ordenador"} id={"us"}  
                                tipoConsulta={"us"} 
                                onClickCodigo={setCodOrdenador} 
                                onClickDescricao={setDescricaoOrdenador}
                                value={descricaoOrdenador} 
                                disabled={false}/>
                </div>
                <div className="col-lg-4 mb-3">
                <label htmlFor="cg" className="mb-2">Conta Gerencial</label>
                <EditComplete   placeholder={"Conta Gerencial"} id={"cg"}  
                                tipoConsulta={"cg"} 
                                onClickCodigo={setCodContaGerencial} 
                                onClickDescricao={setDescricaoContaGerencial}
                                value={descricaoContaGerencial} 
                                disabled={false}/>
                </div>
                
                <div className="col-lg-1 mb-2">
                <button
                     className="btn btn-success align-self-end marg-botao-add w-100"
                     onClick={() => Vincular()} // Chama o modal sem ID para criação
                  >
                     <i className="bi bi-plus-circle"></i> Vincular
                  </button>
                </div>

            </div>

            {/* Tabela de usuários */}
            <div className="row">
               <div className="col-lg-12">
                  <table className="table tablefont table-hover table-font">
                     <thead>
                        <tr>
                           <th className="col-1" scope="col">Filial</th>
                           <th className="col" scope="col">Ordenador</th>
                           <th className="col" scope="col">Conta Gerencial</th>
                           <th className="col-1" scope="col"></th>
                        </tr>
                     </thead>
                     <tbody>
                        {dadosVinculo.length > 0 ? (
                           dadosVinculo.map((vinculo) => (
                              <tr className="linha-grid-desktop-analisedespesa" key={vinculo.id_empresa_erp+'-'+vinculo.id_usuario_erp+'-'+vinculo.id_conta_erp}>
                                 <td>{vinculo.id_empresa_erp}</td>
                                 <td>{vinculo.id_usuario_erp+' - '+vinculo.nome}</td>                                 
                                 <td>{vinculo.id_conta_erp+' - '+vinculo.conta}</td>
                                 <td>{
                                    <button className="btn btn-danger me-2" id="button-grid-desktop-despesas" 
                                       onClick={() => excluirVinculo(vinculo.id_usuario_erp, vinculo.id_conta_erp, vinculo.id_empresa_erp )}
                                       >
                                       <i className="bi bi-trash"></i>
                                    </button>                             
                                    }</td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="4" className="text-center">
                                 Nenhum vinculo encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
            <ToastContainer position="top-center"/>
    </div>
  </>
}

export default VincularContaOrdenador;