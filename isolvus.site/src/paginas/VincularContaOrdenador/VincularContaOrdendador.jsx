import { useEffect, useState } from "react";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import Menu from "../../componentes/Menu/Menu";
import "./VincularContaOrdendador.css";
import "../CadastroDeUsuario/CadastroDeUsuario.css";
import api from "../../servidor/api";
import { ToastContainer, toast } from 'react-toastify';

function VincularContaOrdenador(){

   const ITENS_POR_PAGINA = 10;

   const [codFilial, setCodFilial] = useState(0);
   const [descricaoFilial, setDescricaoFilial] = useState("");

   const [codOrdenador, setCodOrdenador] = useState(0);
   const [descricaoOrdenador, setDescricaoOrdenador] = useState("");

   const [codContaGerencial, setCodContaGerencial] = useState(0);
   const [descricaoContaGerencial, setDescricaoContaGerencial] = useState("");

   const [dadosVinculo, SetDadosVinculo] = useState([]);
   const [paginaAtual, setPaginaAtual] = useState(1);

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

   const temFiltroAplicado = codFilial > 0 || codOrdenador > 0 || codContaGerencial > 0;
   const totalPaginas = Math.max(1, Math.ceil(dadosVinculo.length / ITENS_POR_PAGINA));
   const paginaSegura = Math.min(paginaAtual, totalPaginas);
   const dadosPaginados = dadosVinculo.slice(
      (paginaSegura - 1) * ITENS_POR_PAGINA,
      paginaSegura * ITENS_POR_PAGINA
   );

   useEffect(()=>{
      ConsultarDadosVinculo();    
   },[codFilial,codOrdenador,codContaGerencial]);

   useEffect(() => {
      setPaginaAtual(1);
   }, [codFilial, codOrdenador, codContaGerencial, dadosVinculo.length]);

  return<>
     <Menu />
     <div className="container-fluid Containe-Tela cadastro-usuario-page">
            <div className="row text-body-secondary mb-3">
               <div className="col-12 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                  <div>
                     <h1 className="mb-1 titulo-da-pagina">Vincular Conta a Ordenador</h1>
                     <p className="text-muted mb-0">Selecione os filtros e vincule contas gerenciais aos ordenadores.</p>
                  </div>
                  <button className="btn btn-primary" onClick={Vincular}>
                     Vincular
                  </button>
               </div>
            </div>

            <div className="row mb-4 align-items-end g-3 cadastro-filtros">
                <div className="col-lg-3 cadastro-filtro-col">
                <label htmlFor="fl" className="form-label">Filial</label>
                <EditComplete   placeholder={"Filial"} id={"fl"}
                                tipoConsulta={"fl"}
                                onClickCodigo={setCodFilial}
                                onClickDescricao={setDescricaoFilial}
                                value={descricaoFilial}
                                disabled={false}/>
                </div>
                <div className="col-lg-4 cadastro-filtro-col">
                <label htmlFor="us" className="form-label">Ordenador</label>
                <EditComplete   placeholder={"Ordenador"} id={"us"}
                                tipoConsulta={"us"}
                                onClickCodigo={setCodOrdenador}
                                onClickDescricao={setDescricaoOrdenador}
                                value={descricaoOrdenador}
                                disabled={false}/>
                </div>
                <div className="col-lg-5 cadastro-filtro-col">
                <label htmlFor="cg" className="form-label">Conta Gerencial</label>
                <EditComplete   placeholder={"Conta Gerencial"} id={"cg"}
                                tipoConsulta={"cg"}
                                onClickCodigo={setCodContaGerencial}
                                onClickDescricao={setDescricaoContaGerencial}
                                value={descricaoContaGerencial}
                                disabled={false}/>
                </div>
            </div>

            <p className="cadastro-section-title">Resultados</p>
            <div className="cadastro-card cadastro-table-card">
               <div className="table-responsive">
                  <table className="table table-hover mb-0 cadastro-table table-font">
                     <thead>
                        <tr>
                           <th className="col-1" scope="col">Filial</th>
                           <th className="col" scope="col">Ordenador</th>
                           <th className="col" scope="col">Conta Gerencial</th>
                           <th className="col-1 text-end" scope="col">Ações</th>
                        </tr>
                     </thead>
                     <tbody>
                        {!temFiltroAplicado ? (
                           <tr>
                              <td colSpan="4" className="text-center text-muted">
                                 Informe ao menos um filtro para consultar vínculos.
                              </td>
                           </tr>
                        ) : dadosVinculo.length > 0 ? (
                           dadosPaginados.map((vinculo) => (
                              <tr className="linha-grid-desktop-analisedespesa" key={vinculo.id_empresa_erp+'-'+vinculo.id_usuario_erp+'-'+vinculo.id_conta_erp}>
                                 <td>{vinculo.id_empresa_erp}</td>
                                 <td>{vinculo.id_usuario_erp+' - '+vinculo.nome}</td>
                                 <td>{vinculo.id_conta_erp+' - '+vinculo.conta}</td>
                                 <td className="text-end">
                                    <button className="btn btn-danger btn-sm" id="button-grid-desktop-despesas"
                                       onClick={() => excluirVinculo(vinculo.id_usuario_erp, vinculo.id_conta_erp, vinculo.id_empresa_erp )}
                                       >
                                       <i className="bi bi-trash"></i>
                                    </button>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="4" className="text-center text-muted">
                                 Nenhum vínculo encontrado.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               {temFiltroAplicado && dadosVinculo.length > 0 && (
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 pt-3">
                     <small className="text-muted">
                        Exibindo {((paginaSegura - 1) * ITENS_POR_PAGINA) + 1}-{Math.min(paginaSegura * ITENS_POR_PAGINA, dadosVinculo.length)} de {dadosVinculo.length} vínculos
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
            <ToastContainer position="top-center"/>
    </div>
  </>
}

export default VincularContaOrdenador;