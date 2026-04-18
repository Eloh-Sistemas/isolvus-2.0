import { useEffect, useState } from "react";
import Modal from "react-modal/lib/components/Modal";
import { toast } from 'react-toastify';
import api from "../../../servidor/api";
import EditComplete from "../../EditComplete/EditComplete";

function ModalCadastroDeVeiculo(props){

   const[codigo, setCodigo] =useState(0);
   const[codigoERP, setCodigoERP] =useState(0);
   const[descricao, setDescricao] =useState("");
   const[placa, setPlaca] =useState("");
   const[renavam, setRenavam] =useState("");
   const[chassi, setChassi] =useState("");
   const[codMarca, setCodMarca] =useState(0);
   const[marca, setMarca] =useState("");
   const[codModelo, setCodModelo] =useState(0);
   const[modelo, setModelo] =useState("");
   const[anofabricacao, SetAnoFabricacao] = useState(0);
   const[cor, setCor] = useState("");
   const[codCombustivel, setCodCombustivel] = useState(0);
   const[combustivel, setCombustivel] = useState("");
   const[kmatual, setKmAtual] = useState(0);
   const[situacao, SetSituacao] = useState("");


   function limparTela(){
      setCodigo(0);
      setCodigoERP(0);
      setDescricao("");
      setPlaca("");
      setRenavam("");
      setChassi("");
      setCodMarca(0);
      setMarca("");
      setCodModelo(0);
      setModelo("");
      SetAnoFabricacao(0);
      setCor("");
      setCodCombustivel(0);
      setCombustivel("");
      setKmAtual(0);
      SetSituacao("");
   }

   function consultarDadosVeiculo(){

      if (props.idVeiculoSelecionado == 0) {
           // limpa tela
         limparTela();
      }else{
      

         

      //consultaDetales do veiculo
         limparTela();
         
      api.post('/v1/consultaDetalhes',{id_veiculo: props.idVeiculoSelecionado, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
        .then((retorno) =>{

           //preencher dados tela
           setCodigo(retorno.data[0].id_veiculo);
           setCodigoERP(retorno.data[0].id_veiculo_erp);
           setDescricao(retorno.data[0].descricao);
           setPlaca(retorno.data[0].placa);
           setRenavam(retorno.data[0].renavam);
           setChassi(retorno.data[0].chassi);
           setCodMarca(retorno.data[0].id_marca);
           setMarca(retorno.data[0].marca);
           setCodModelo(retorno.data[0].id_modelo);
           setModelo(retorno.data[0].modelo);
           SetAnoFabricacao(retorno.data[0].ano_fabricacao);
           setCor(retorno.data[0].cor);
           setCodCombustivel(retorno.data[0].id_combustivel);
           setCombustivel(retorno.data[0].combustivel);
           setKmAtual(retorno.data[0].kmatual);
           SetSituacao(retorno.data[0].situacao);          

        })
        .catch((err)=>{
           toast.error("Erro ao consultar veiculo !",{onClose: () => {props.onRequestClose()}}) 
        })

      }

   }


   function consultarDados(){
      props.consultarVeiculos(descricao);
   }

    function salvarVeiculo(){
            

      const json = {
         "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
         "idveiculo": codigo,
         "placa": placa,         "renavam": renavam,
         "chassi": chassi,
         "idmarca": codMarca,
         "idmodelo":codModelo,
         "anofabricacao": anofabricacao,
         "cor": cor,
         "idcombustivel": codCombustivel,
         "situacao": situacao,
         "kmatual": kmatual,
         "idveiculoerp": codigoERP,
         "descricao": descricao
      }

       if (codigo == 0) {
           
         api.post('/v1/cadastrarVeiculo',json) 
         .then((resposta) =>{
            toast.success(resposta.data.Mensagem,{onClose: () => {props.onRequestClose()}}) 
         })
         .catch((erro) =>{
               toast.error(erro.response.data);
         })

       }else{

         api.post('/v1/atualizarVeiculo',json) 
         .then((resposta) =>{
            toast.success(resposta.data.Mensagem,{onClose: () => {props.onRequestClose()}}) 
         })
         .catch((erro) =>{
               toast.error(erro.response.data);
               
         })

       }
       
       consultarDados();
    }
   
    useEffect( () => {
          consultarDadosVeiculo();
    },[props.idVeiculoSelecionado])
     

    return <>
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="react-modal-overlay"
            ariaHideApp={false}
            className="react-modal-content"
         >
            <div className="bsmodal-content">
               <div className="bsmodal-header">
                  <h3 className="modal-title">Cadastro de Veículo</h3>
               </div>

               <div className="bsmodal-body">
                  {/* Dados Básicos */}
                  <h4 className="section-title">Identificação do Veículo</h4>
                  <div className="row">
                     <div className="col-md-1 mb-3">
                        <label htmlFor="codigo" className="mb-2">Código<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="codigo"
                           placeholder="Código"
                           value={codigo}
                           disabled                           
                           onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-1 mb-3">
                        <label htmlFor="CodigoERP" className="mb-2">Código ERP<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="CodigoERP"
                           placeholder="Código ERP"
                           value={codigoERP}
                           disabled                           
                           onChange={(e) => setCodigoERP(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-8 mb-3">
                        <label htmlFor="descricao" className="mb-2">Descrição do Veiculo<span className="text-danger">*</span></label>
                        <input
                           autoFocus
                           type="text"
                           className="form-control"
                           id="descricao"
                           placeholder="Descrição do Veiculo"
                           value={descricao}                           
                           onChange={(e) => setDescricao(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-2 mb-3">
                        <label htmlFor="placa" className="mb-2">Placa<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="placa"
                           placeholder="Placa"
                           value={placa}                       
                           onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                        />
                     </div>                   
                  </div>

                  
                  <div className="row">

                     <div className="col-md-3 mb-3">
                        <label htmlFor="RENAVAM" className="mb-2">RENAVAM<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="RENAVAM"
                           placeholder="RENAVAM"
                           value={renavam}                         
                           onChange={(e) => setRenavam(e.target.value.toUpperCase())}
                        />
                     </div>  

                     <div className="col-md-3 mb-3">
                        <label htmlFor="CHASSI" className="mb-2">CHASSI<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="CHASSI"
                           placeholder="CHASSI"
                           value={chassi}                       
                           onChange={(e) => setChassi(e.target.value.toUpperCase())}
                        />
                     </div>  
                                                       
                  </div>

                  <h4 className="section-title">Informações Básicas</h4>
                  <div className="row">

                        <div className="col-md-3 mb-3">                                                                                                    
                        
                        <label htmlFor="mv" className="mb-2">Marca<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Marca"} id={"mv"}  
                                    tipoConsulta={"mv"} 
                                    onClickCodigo={setCodMarca} 
                                    onClickDescricao={setMarca}
                                    value={marca} 
                                    disabled={false}/>
                           
                           
                        </div> 

                        <div className="col-md-3 mb-3">                                                                                                    
                        
                        <label htmlFor="md" className="mb-2">Modelo<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Modelo"} id={"md"}  
                                    tipoConsulta={"md"} 
                                    onClickCodigo={setCodModelo} 
                                    onClickDescricao={setModelo}
                                    value={modelo} 
                                    disabled={false}/>
                           
                           
                        </div>  

                     <div className="col-md-3 mb-3">
                        <label htmlFor="Fabricação" className="mb-2">Fabricação<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Fabricação"
                           placeholder="Fabricação"
                           value={anofabricacao}                          
                           onChange={(e) => SetAnoFabricacao(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-3 mb-3">
                        <label htmlFor="Cor" className="mb-2">Cor<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Cor"
                           placeholder="Cor"
                           value={cor}                          
                           onChange={(e) => setCor(e.target.value.toUpperCase())}
                        />
                     </div>

                     <div className="col-md-3 mb-3">                                                                                                    
                        
                        <label htmlFor="gs" className="mb-2">Combustivel<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Combustivel"} id={"gs"}  
                                    tipoConsulta={"gs"} 
                                    onClickCodigo={setCodCombustivel} 
                                    onClickDescricao={setCombustivel}
                                    value={combustivel} 
                                    disabled={false}/>
                           
                           
                        </div>                            
                  </div>
                  <h4 className="section-title">Informações Complementares</h4>                  
                  <div className="row">                     
                     <div className="col-md-3 mb-3">
                        <label htmlFor="KMAtual" className="mb-2">KM Atual<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="KMAtual"
                           placeholder="KM Atual"
                           value={kmatual}                         
                           onChange={(e) => setKmAtual(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-3 mb-3">
                        <label htmlFor="situacao" className="mb-2">Situação<span className="text-danger">*</span></label>
                        <select
                           className="form-control"
                           id="situacao"
                           value={situacao}
                           onChange={(e) => SetSituacao(e.target.value.toUpperCase())}
                        >
                           <option value="">Selecione</option>
                           <option value="L">Livre</option>
                           <option value="V">Viajando</option>
                           <option value="I">Inativo</option>
                        </select>
                     </div>
                  </div>                  
                </div>  

                <div className="bsmodal-footer">
                  <div className="d-flex justify-content-between w-100">
                     <button
                        type="button"
                        className="btn btn-secondary px-4"
                        onClick={props.onRequestClose}
                     >
                        Voltar
                     </button>
                     <button
                        type="button"
                        className="btn btn-primary px-4"
                        onClick={salvarVeiculo}
                     >
                        Salvar
                     </button>
                  </div>
               </div>  

            </div>
   
         </Modal>
                 
    </>
}

export default ModalCadastroDeVeiculo;