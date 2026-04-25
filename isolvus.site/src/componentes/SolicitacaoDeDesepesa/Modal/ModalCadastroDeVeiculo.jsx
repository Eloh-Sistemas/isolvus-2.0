import { useEffect, useRef, useState } from "react";
import Modal from "react-modal/lib/components/Modal";
import { toast } from 'react-toastify';
import api from "../../../servidor/api";
import EditComplete from "../../EditComplete/EditComplete";
import UploadArquivos from "../../UploadArquivos/UploadArquivos";
import "./ModalCadastroDeUsuario.css";
import "./ModalCadastroDeVeiculo.css";

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
   const[tipoVeiculo, setTipoVeiculo] = useState("");
   const[categoriaCNH, setCategoriaCNH] = useState("");
   const[codFilial, setCodFilial] = useState(0);
   const[filial, setFilial] = useState("");
   const[codMotorista, setCodMotorista] = useState(0);
   const[motorista, setMotorista] = useState("");
   const[vencIPVA, setVencIPVA] = useState("");
   const[vencLicenciamento, setVencLicenciamento] = useState("");
   const[vencSeguro, setVencSeguro] = useState("");
   const[kmProximaRevisao, setKmProximaRevisao] = useState(0);
   const[numMotor, setNumMotor] = useState("");
   const[capacidade, setCapacidade] = useState(0);
   const[observacoes, setObservacoes] = useState("");

   const uploadRef = useRef(null);
   const [pendingUpload, setPendingUpload] = useState(false);


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
      setTipoVeiculo("");
      setCategoriaCNH("");
      setCodFilial(0);
      setFilial("");
      setCodMotorista(0);
      setMotorista("");
      setVencIPVA("");
      setVencLicenciamento("");
      setVencSeguro("");
      setKmProximaRevisao(0);
      setNumMotor("");
      setCapacidade(0);
      setObservacoes("");
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
           setTipoVeiculo(retorno.data[0].tipo_veiculo || "");
           setCategoriaCNH(retorno.data[0].categoria_cnh || "");
           setCodFilial(retorno.data[0].id_filial || 0);
           setFilial(retorno.data[0].filial || "");
           setCodMotorista(retorno.data[0].id_motorista || 0);
           setMotorista(retorno.data[0].motorista || "");
           setVencIPVA(retorno.data[0].venc_ipva || "");
           setVencLicenciamento(retorno.data[0].venc_licenciamento || "");
           setVencSeguro(retorno.data[0].venc_seguro || "");
           setKmProximaRevisao(retorno.data[0].km_proxima_revisao || 0);
           setNumMotor(retorno.data[0].num_motor || "");
           setCapacidade(retorno.data[0].capacidade || 0);
           setObservacoes(retorno.data[0].observacoes || "");

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
         "descricao": descricao,
         "tipoveiculo": tipoVeiculo,
         "categoriacnh": categoriaCNH,
         "idfilial": codFilial,
         "idmotorista": codMotorista,
         "vencipva": vencIPVA,
         "venclicenciamento": vencLicenciamento,
         "vencseguro": vencSeguro,
         "kmproximarevisao": kmProximaRevisao,
         "nummotor": numMotor,
         "capacidade": capacidade,
         "observacoes": observacoes
      }

       if (codigo == 0) {
           
         api.post('/v1/cadastrarVeiculo',json) 
         .then((resposta) =>{
            setCodigo(resposta.data.id_veiculo);
            setPendingUpload(true);
            toast.success(resposta.data.Mensagem,{onClose: () => {props.onRequestClose()}}) 
         })
         .catch((erro) =>{
               toast.error(erro.response.data);
         })

       }else{

         api.post('/v1/atualizarVeiculo',json) 
         .then((resposta) =>{
            uploadRef.current?.handleUpload();
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

    useEffect(() => {
       if (pendingUpload && codigo > 0) {
          uploadRef.current?.handleUpload();
          setPendingUpload(false);
       }
    }, [pendingUpload, codigo]);
     

    return <>
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="cad-modal-overlay veiculo-modal-overlay"
            ariaHideApp={false}
            className="cad-modal-content veiculo-modal-content"
         >
               <div className="cad-modal-header">
                  <div>
                     <h4 className="cad-modal-title">Cadastro de Veículo</h4>
                     <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Preencha os dados do veículo e clique em Salvar.</p>
                  </div>
                  <button className="btn btn-outline-secondary" onClick={props.onRequestClose}>Fechar</button>
               </div>

               <div className="bsmodal-body">
                  {/* Dados Básicos */}
                  <p className="cad-section-title">Identificação do Veículo</p>
                  <div className="cad-section">
                  <div className="row g-3 align-items-end">
                     <div className="col-md-2">
                        <label htmlFor="codigo" className="form-label">Código<span className="text-danger">*</span></label>
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
                     <div className="col-md-2">
                        <label htmlFor="CodigoERP" className="form-label">Código ERP<span className="text-danger">*</span></label>
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
                     <div className="col-md-6">
                        <label htmlFor="descricao" className="form-label">Descrição do Veiculo<span className="text-danger">*</span></label>
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
                     <div className="col-md-2">
                        <label htmlFor="placa" className="form-label">Placa<span className="text-danger">*</span></label>
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

                  <div className="row g-3 align-items-end mt-1">

                     <div className="col-md-3">
                        <label htmlFor="RENAVAM" className="form-label">RENAVAM<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="RENAVAM"
                           placeholder="RENAVAM"
                           value={renavam}                         
                           onChange={(e) => setRenavam(e.target.value.toUpperCase())}
                        />
                     </div>  

                     <div className="col-md-3">
                        <label htmlFor="CHASSI" className="form-label">CHASSI<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="CHASSI"
                           placeholder="CHASSI"
                           value={chassi}                       
                           onChange={(e) => setChassi(e.target.value.toUpperCase())}
                        />
                     </div>

                     <div className="col-md-3">
                        <label htmlFor="numMotor" className="form-label">Nº Motor</label>
                        <input
                           type="text"
                           className="form-control"
                           id="numMotor"
                           placeholder="Nº Motor"
                           value={numMotor}
                           onChange={(e) => setNumMotor(e.target.value.toUpperCase())}
                        />
                     </div>

                     <div className="col-md-3">
                        <label htmlFor="tipoVeiculo" className="form-label">Tipo de Veículo<span className="text-danger">*</span></label>
                        <select
                           className="form-control"
                           id="tipoVeiculo"
                           value={tipoVeiculo}
                           onChange={(e) => setTipoVeiculo(e.target.value)}
                        >
                           <option value="">Selecione</option>
                           <option value="CARRO">Carro</option>
                           <option value="MOTO">Moto</option>
                           <option value="CAMINHAO">Caminhão</option>
                           <option value="VAN">Van</option>
                           <option value="UTILITARIO">Utilitário</option>
                           <option value="OUTRO">Outro</option>
                        </select>
                     </div>
                  </div>
                  </div>

                  <p className="cad-section-title">Informações Básicas</p>
                  <div className="cad-section">
                  <div className="row g-3 align-items-end">

                        <div className="col-md-3">                                                                                                    
                        
                        <label htmlFor="mv" className="form-label">Marca<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Marca"} id={"mv"}  
                                    tipoConsulta={"mv"} 
                                    onClickCodigo={setCodMarca} 
                                    onClickDescricao={setMarca}
                                    value={marca} 
                                    disabled={false}/>
                           
                           
                        </div> 

                        <div className="col-md-3">                                                                                                    
                        
                        <label htmlFor="md" className="form-label">Modelo<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Modelo"} id={"md"}  
                                    tipoConsulta={"md"} 
                                    onClickCodigo={setCodModelo} 
                                    onClickDescricao={setModelo}
                                    value={modelo} 
                                    disabled={false}/>
                           
                           
                        </div>  

                     <div className="col-md-3">
                        <label htmlFor="Fabricação" className="form-label">Fabricação<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Fabricação"
                           placeholder="Fabricação"
                           value={anofabricacao}                          
                           onChange={(e) => SetAnoFabricacao(e.target.value.toUpperCase())}
                        />
                     </div>  
                     <div className="col-md-3">
                        <label htmlFor="Cor" className="form-label">Cor<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Cor"
                           placeholder="Cor"
                           value={cor}                          
                           onChange={(e) => setCor(e.target.value.toUpperCase())}
                        />
                     </div>

                     <div className="col-md-3">                                                                                                    
                        
                        <label htmlFor="gs" className="form-label">Combustivel<span className="text-danger">*</span></label>                   
                        <EditComplete placeholder={"Combustivel"} id={"gs"}  
                                    tipoConsulta={"gs"} 
                                    onClickCodigo={setCodCombustivel} 
                                    onClickDescricao={setCombustivel}
                                    value={combustivel} 
                                    disabled={false}/>
                           
                           
                        </div>

                     <div className="col-md-3">
                        <label htmlFor="capacidade" className="form-label">Capacidade (Passageiros)</label>
                        <input
                           type="number"
                           className="form-control"
                           id="capacidade"
                           placeholder="Nº passageiros"
                           value={capacidade}
                           onChange={(e) => setCapacidade(e.target.value)}
                        />
                     </div>

                     <div className="col-md-3">
                        <label htmlFor="categoriaCNH" className="form-label">Categoria CNH Exigida</label>
                        <select
                           className="form-control"
                           id="categoriaCNH"
                           value={categoriaCNH}
                           onChange={(e) => setCategoriaCNH(e.target.value)}
                        >
                           <option value="">Selecione</option>
                           <option value="A">A</option>
                           <option value="AB">AB</option>
                           <option value="B">B</option>
                           <option value="C">C</option>
                           <option value="D">D</option>
                           <option value="E">E</option>
                        </select>
                     </div>
                  </div>
                  </div>
                  <p className="cad-section-title">Informações Complementares</p>
                  <div className="cad-section">
                  <div className="row g-3 align-items-end">                     
                     <div className="col-md-3">
                        <label htmlFor="KMAtual" className="form-label">KM Atual<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="KMAtual"
                           placeholder="KM Atual"
                           value={kmatual}                         
                           onChange={(e) => setKmAtual(e.target.value)}
                        />
                     </div>
                     <div className="col-md-3">
                        <label htmlFor="kmProximaRevisao" className="form-label">KM Próxima Revisão</label>
                        <input
                           type="text"
                           className="form-control"
                           id="kmProximaRevisao"
                           placeholder="KM Próxima Revisão"
                           value={kmProximaRevisao}
                           onChange={(e) => setKmProximaRevisao(e.target.value)}
                        />
                     </div>
                     <div className="col-md-3">
                        <label htmlFor="situacao" className="form-label">Situação<span className="text-danger">*</span></label>
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
                     <div className="col-md-6">
                        <label htmlFor="observacoes" className="form-label">Observações</label>
                        <textarea
                           className="form-control"
                           id="observacoes"
                           placeholder="Observações gerais sobre o veículo"
                           rows={2}
                           value={observacoes}
                           onChange={(e) => setObservacoes(e.target.value)}
                        />
                     </div>
                  </div>
                  </div>

                  <p className="cad-section-title">Documentos Anexos</p>
                  <div className="cad-section">
                     <UploadArquivos
                        ref={uploadRef}
                        idRotina={"2001.1"}
                        idRelacional={codigo}
                        disabled={false}
                        capture={false}
                     />
                  </div>

                  <p className="cad-section-title">Alocação</p>
                  <div className="cad-section">
                  <div className="row g-3 align-items-end">
                     <div className="col-md-4">
                        <label htmlFor="filial" className="form-label">Filial / Lotação</label>
                        <EditComplete placeholder={"Filial"} id={"filial"}
                                    tipoConsulta={"fl"}
                                    onClickCodigo={setCodFilial}
                                    onClickDescricao={setFilial}
                                    value={filial}
                                    disabled={false}/>
                     </div>
                     <div className="col-md-4">
                        <label htmlFor="motorista" className="form-label">Motorista Padrão</label>
                        <EditComplete placeholder={"Motorista"} id={"motorista"}
                                    tipoConsulta={"us"}
                                    onClickCodigo={setCodMotorista}
                                    onClickDescricao={setMotorista}
                                    value={motorista}
                                    disabled={false}/>
                     </div>
                  </div>
                  </div>

                  <p className="cad-section-title">Documentação / Vencimentos</p>
                  <div className="cad-section">
                  <div className="row g-3 align-items-end">
                     <div className="col-md-3">
                        <label htmlFor="vencIPVA" className="form-label">Venc. IPVA</label>
                        <input
                           type="date"
                           className="form-control"
                           id="vencIPVA"
                           value={vencIPVA}
                           onChange={(e) => setVencIPVA(e.target.value)}
                        />
                     </div>
                     <div className="col-md-3">
                        <label htmlFor="vencLicenciamento" className="form-label">Venc. Licenciamento</label>
                        <input
                           type="date"
                           className="form-control"
                           id="vencLicenciamento"
                           value={vencLicenciamento}
                           onChange={(e) => setVencLicenciamento(e.target.value)}
                        />
                     </div>
                     <div className="col-md-3">
                        <label htmlFor="vencSeguro" className="form-label">Venc. Seguro Obrigatório</label>
                        <input
                           type="date"
                           className="form-control"
                           id="vencSeguro"
                           value={vencSeguro}
                           onChange={(e) => setVencSeguro(e.target.value)}
                        />
                     </div>
                  </div>
                  </div>
                </div>  

                <div className="cad-modal-footer">
                  <div className="cad-modal-footer-actions ms-auto">
                     <button
                        type="button"
                        className="btn btn-outline-secondary cad-footer-btn"
                        onClick={props.onRequestClose}
                     >
                        Voltar
                     </button>
                     <button
                        type="button"
                        className="btn btn-primary cad-footer-btn"
                        onClick={salvarVeiculo}
                     >
                        Salvar
                     </button>
                  </div>
               </div>  


         </Modal>
                 
    </>
}

export default ModalCadastroDeVeiculo;