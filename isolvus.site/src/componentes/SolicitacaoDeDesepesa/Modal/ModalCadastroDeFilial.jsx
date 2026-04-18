import React, { useEffect, useState  } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { cpf } from 'cpf-cnpj-validator'; // Corrigindo a importação para 'cpf'
//import InputMask from 'react-input-mask'; // Importando o InputMask
import './ModalCadastroDeFilial.css';
import api from '../../../servidor/api.jsx';
import moment from 'moment';

function ModalCadastroDeFilial(props) {

   // Dados Basicos
   const [codigo, setCodigo] = useState(0);
   const [codFilialERP, setCodFilialERP] = useState(0);
   const [razaosocial, setRazaosocial] = useState("");
   const [cnpj, setCNPJ] = useState("");
   const [fantasia, setFantasia] = useState("");
   const [email, setEmail] = useState("");
   const [telefone, setTelefone] = useState("");
   const [celular, setCelular] = useState("");
   // Endereço
   const [cep, setCEP] = useState("");
   const [rua, setRua] = useState("");
   const [numero, setNumero] = useState("");
   const [uf, setUF] = useState("");
   const [cidade, setCidade] = useState("");
   const [bairro, setBairro] = useState("");
   // Banco do Brasil - Credenciais da API
   const [developer_application_key, setDeveloper_applicaion_key] = useState("");
   const [chaveBasic, setChaveBasic] = useState("");


   
     

function consultarDadosFuncionario() {
  
   // Dados Basicos
   setCodigo(0);
   setCodFilialERP(0); 
   setRazaosocial("");
   setCNPJ("");
   setFantasia("");
   setEmail(""); 
   setTelefone("");
   setCelular("")   
   // Endereço
   setCEP("");
   setRua("");
   setNumero("");
   setUF("");
   setCidade("");
   setBairro("");
   // Banco do Brasil - Credenciais da API
   setDeveloper_applicaion_key(""); 
   setChaveBasic("");      

   if (props.idFilial != null & props.idFilial !=0) {

   api.post('/v1/consultarFilialCompleto',{id_empresa: props.idFilial})
   .then((retorno) =>{
      
        console.log(retorno.data)

    
    // Dados Basicos
    setCodigo(retorno.data[0].id_empresa);
    setCodFilialERP(retorno.data[0].id_erp);    
    setRazaosocial(retorno.data[0].razaosocial);
    setCNPJ(retorno.data[0].cnpj_cpf);
    setFantasia(retorno.data[0].fantaria);
    setEmail(retorno.data[0].email); 
    setTelefone(retorno.data[0].contato);   
    setCelular(retorno.data[0].celular);  
    // Endereço
    setCEP(retorno.data[0].cep);
    setRua(retorno.data[0].rua);
    setNumero(retorno.data[0].numero);
    setUF(retorno.data[0].uf);
    setCidade(retorno.data[0].cidade);
    setBairro(retorno.data[0].bairro);
    // Banco do Brasil - Credenciais da API
    setDeveloper_applicaion_key(retorno.data[0].developer_application_key); 
    setChaveBasic(retorno.data[0].chavebasic);              

   })
   .catch((err) => {
      console.error('erro ao consulta dados do funcioario')
   });
   
} 


}

{/*
const formatDate = (date) => {
   if (!date) return ""; // Retorna vazio se a data for nula ou indefinida
   const jsDate = new Date(date); // Converte para um objeto Date
   return jsDate.toLocaleDateString("pt-BR"); // Formata no padrão dd/mm/yyyy
 };
*/}


   // Função para salvar os dados
   function salvarDados() {


      

      const json = {
         "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
         "id_erp":codFilialERP,
         "razaosocial":razaosocial,
         "cnpj_cpf":cnpj,
         "fantasia":fantasia,
         "email":email,
         "contato":telefone,
         "celular":celular,
         // Endereço
         "cep":cep,
         "rua":rua,
         "numero":numero,
         "uf":uf,
         "cidade":cidade,
         "bairro":bairro,
         // Banco do Brasil - Credenciais da API
         "developer_application_key":developer_application_key,
         "chavebasic":chaveBasic
       };
       
       if (codigo == 0) {
         
         api.post("/v1/cadastrarFilial", json, {
            headers: {
               "Content-Type": "application/json"
            }
         })
         .then((retorno) => {
            toast.success('Cadastrado com sucesso !' ,{ position: "top-center" });
            props.onRequestClose();    
         })
         .catch((err) => {         
            toast.error(err.response.data.error, { position: "top-center" });
         }); 

       }else{

         api.put("/v1/cadastrarFilial/"+codigo, json, {
            headers: {
               "Content-Type": "application/json"
            }
         })
         .then((retorno) => {
            toast.success('Cadastrado alterado com sucesso !' ,{ position: "top-center" });
            props.onRequestClose();    
         })
         .catch((err) => {         
            toast.error(err.response.data.error, { position: "top-center" });
         }); 

       }
 
       


   };

   useEffect( () => {
      consultarDadosFuncionario();
   },[props.idFilial])

   return (
      <>
         <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="react-modal-overlay"
            ariaHideApp={false}
            className="react-modal-content"
         >
            <div className="bsmodal-content">
               <div className="bsmodal-header">
                  <h3 className="modal-title">Cadastro de Filial</h3>
               </div>

               <div className="bsmodal-body">
                  {/* Dados Básicos */}
                  <h4 className="section-title">Dados da Basico</h4>
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
                           onChange={(e) => setCodigo(e.target.value)}
                        />
                     </div>
                     <div className="col-md-1 mb-3">
                        <label htmlFor="ERP" className="mb-2">ID ERP</label>
                        <input
                           autoFocus 
                           type="text"
                           className="form-control"
                           id="ERP"
                           placeholder="Código ERP"
                           value={codFilialERP}                                                   
                           onChange={(e) => setCodFilialERP(e.target.value)}
                        />
                     </div>
                     <div className="col-md-10 mb-3">
                        <label htmlFor="Razao" className="mb-2">Razão Social<span className="text-danger">*</span></label>
                        <input                                                     
                           type="text"
                           className="form-control"
                           id="Razao"
                           placeholder="Razão Social"
                           value={razaosocial}
                           onChange={(e) => setRazaosocial(e.target.value.toUpperCase())}                
                        />
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-3 mb-3">
                        <label htmlFor="CNPJ" className="mb-2">CNPJ<span className="text-danger">*</span></label>                    
                        <input
                           value={cnpj}
                           onChange={(e) => setCNPJ(e.target.value)}
                           className="form-control"
                           id="CNPJ"
                           placeholder="CNPJ"
                        />
                     </div>
                     <div className="col-md-9 mb-3">
                        <label htmlFor="Fantasia" className="mb-2">Fantasia<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Fantasia"
                           placeholder="Fantasia"
                           value={fantasia}
                           onChange={(e) => setFantasia(e.target.value)}
                        />
                     </div>
                  </div>
                  <div className="row">
                     <div className="col-md-3 mb-3">
                        <label htmlFor="Email" className="mb-2">Email<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Email"
                           placeholder="Email"
                           value={email}
                           //disabled                           
                           onChange={(e) => setEmail(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-3 mb-3">
                        <label htmlFor="Fixo" className="mb-2">Telefone Fixo<span className="text-danger">*</span></label>
                        <input
                        className="form-control"
                        placeholder="Digite o telefone fixo"
                        onChange={(e) => setTelefone(e.target.value)}
                        value={telefone}
                        id={"Fixo"}
                       />   
                     </div>
                     <div className="col-md-3 mb-3">
                        <label htmlFor="Celular" className="mb-2">Celular<span className="text-danger">*</span></label>
                        <input
                        className="form-control"
                        placeholder="Digite o Celular"
                        onChange={(e) => setCelular(e.target.value)}
                        value={celular}
                        id={"Celular"}
                       />   
                     </div>
                  </div>

                  <h4 className="section-title">Endereço</h4>
                  <div className="row">
                     <div className="col-md-2 mb-3">
                        <label htmlFor="CEP" className="mb-2">CEP<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="CEP"
                           placeholder="CEP"
                           value={cep}
                           //disabled                           
                           onChange={(e) => setCEP(e.target.value)}
                        />
                     </div>
                     <div className="col-md-8 mb-3">
                        <label htmlFor="Rua" className="mb-2">Rua<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Rua"
                           placeholder="Telefone"
                           value={rua}
                           onChange={(e) => setRua(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-2 mb-3">
                        <label htmlFor="Numero" className="mb-2">Numero<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Numero"
                           placeholder="Numero"
                           value={numero}
                           onChange={(e) => setNumero(e.target.value)}
                        />
                     </div>
                  </div>
                  <div className="row">
                     <div className="col-md-4 mb-3">
                        <label htmlFor="UF" className="mb-2">UF<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="UF"
                           placeholder="UF"
                           value={uf}
                           //disabled                           
                           onChange={(e) => setUF(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-4 mb-3">
                        <label htmlFor="Cidade" className="mb-2">Cidade<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Cidade"
                           placeholder="Cidade"
                           value={cidade}
                           onChange={(e) => setCidade(e.target.value)}
                        />
                     </div>
                     <div className="col-md-4 mb-3">
                        <label htmlFor="Bairro" className="mb-2">Bairro<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="Bairro"
                           placeholder="Bairro"
                           value={bairro}
                           onChange={(e) => setBairro(e.target.value.toUpperCase())}
                        />
                     </div>
                  </div>

                  <h4 className="section-title">Banco do Brasil - Credenciais da API</h4>
                  <div className="row">  
                     <div className="col-md-6 mb-3">
                        <label htmlFor="ChaveBasic" className="mb-2">Banco / Conta<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="ChaveBasic"
                           placeholder="Banco / Conta"
                        />
                     </div>                  
                     <div className="col-md-3 mb-3">
                        <label htmlFor="Developer_application_key" className="mb-2">Developer_application_key<span className="text-danger">*</span></label>
                        <input
                           disabled
                           type="text"
                           className="form-control"
                           id="Developer_application_key"
                           placeholder="Developer_application_key"
                           value={developer_application_key}
                           onChange={(e) => setDeveloper_applicaion_key(e.target.value)}
                        />
                     </div>
                     <div className="col-md-3 mb-3">
                        <label htmlFor="ChaveBasic" className="mb-2">Chave Basic<span className="text-danger">*</span></label>
                        <input
                           disabled
                           type="text"
                           className="form-control"
                           id="ChaveBasic"
                           placeholder="Chave Basic"
                           value={chaveBasic}
                           onChange={(e) => setChaveBasic(e.target.value)}
                        />
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
                        onClick={salvarDados}
                     >
                        Salvar
                     </button>
                  </div>
               </div>
            </div>
         </Modal>

         <ToastContainer />
      </>
   );
}

export default ModalCadastroDeFilial;
