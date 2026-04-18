import React, { useEffect, useState  } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { cpf } from 'cpf-cnpj-validator'; // Corrigindo a importação para 'cpf'
//import InputMask from 'react-input-mask'; // Importando o InputMask
import './ModalCadastroDeUsuario.css';
import axios from 'axios';
import EditComplete from "../../EditComplete/EditComplete.jsx";
import api from '../../../servidor/api.jsx';
import moment from 'moment';

function ModalCadastroDeUsuario(props) {
   // Definindo os estados dos campos
   const [codigo, setCodigo] = useState(0);
   const [codusuarioErp , setcodusuarioErp] = useState(0);
   const [nome, setNome] = useState('');
   const [cpfInput, setCpf] = useState('');
   const [rg, setRg] = useState('');
   const [email, setEmail] = useState('');
   const [telefone, setTelefone] = useState('');
   const [cep, setCep] = useState('');  
   const [dataNascimento, setDataNascimento] = useState('');
   const [sexo, setSexo] = useState('');
   const [nacionalidade, setNacionalidade] = useState('');
   const [naturalidade, setNaturalidade] = useState('');
   const [cargo, setCargo] = useState('');
   const [admissao, setAdmissao] = useState('');
   const [tipoContrato, setTipoContrato] = useState('');
   const [numeroCNH, setNumeroCNH] = useState('');
   const [dataExpiracaoCNH, setDataExpiracaoCNH] = useState('');      
   const [endereco, setEndereco] = useState(null);
   const [erro, setErro] = useState('');
   const [uf, setUf] =useState('');
   const [cidade, setCidade] =useState('');
   const [bairro, setBairro] =useState('');
   const [id_EmpresaFunc, Set_Id_EmpresaFunc] = useState(0);
   const [filialFunc, SetFilialFunc] = useState("");   
   const [id_setor, Set_Id_setor] = useState(0);
   const [setor, setSetor] = useState('');
   const [numero, setNumero] = useState('');
   const [complemento, setComplemento] = useState('');
   const [id_banco, setid_banco] = useState();
   const [banco, setbanco] = useState("");
   const [agencia, setagencia] = useState("");
   const [numconta, setnumconta] = useState("");
   const [operacao, setoperacao] = useState("");   
   const [chavepix, setchavepix] = useState("");
   const [id_bancoterceiro, setid_bancoterceiro] = useState();
   const [bancoterceiro, setbancoterceiro] = useState("");
   const [agenciaterceiro, setagenciaterceiro] = useState("");
   const [numcontaterceiro, setnumcontaterceiro] = useState("");
   const [operacaoterceiro, setoperacaoterceiro] = useState("");   
   const [beneficiadoterceiro, setbeneficiadoterceiro] = useState(""); 
   const [chavepixterceiro, setchavepixterceiro] = useState("");

   const [rateio, setRateio] = useState([]);
   const [id_centroDeCusto, setid_centroDeCusto] = useState(0);
   const [descricaoCentroDeCusto, setDescricaoCentroDeCusto] = useState("");
   const [percentualRateio, setPercentualRateio] = useState("");

   const [disableCentroDecusto, setDisableCentroDeCusto] = useState(false);
   const [qtRegistro, setQtRegistro] = useState(0);
   const [totalPercentual, setTotalPercentual] = useState(0);

   function onClickExcluirRateio(id_rateio) {

      console.log(id_rateio);
     
      api.post('/v1/deletarRateioFuncionario',{id: id_rateio})
      .then((resposta) =>{
         toast.success(resposta.data.mensagem ,{ position: "top-center" });
         consultarRateio();
      })
      .catch((err) =>{
         toast.error('Erro ao excluir rateio' ,{ position: "top-center" });
      })

   }

   function onClickIncluirRateio() {
      
      if (!id_centroDeCusto || id_centroDeCusto === 0) {
         toast.warn('Informe o Centro de Custo', { position: "top-center" });
         return;
      }

      if (!percentualRateio || percentualRateio === "" || percentualRateio === 0) {
         toast.warn('Informe o percentual do rateio', { position: "top-center" });
         return;
      }

      const json = {
         id_usuario: codigo,
         id_centrodecusto: id_centroDeCusto,
         percentual: percentualRateio
      };

      api.post('/v1/inserirRateioFuncionario', json)
      .then((resposta) => {
         toast.success(resposta.data.mensagem, { position: "top-center" });
         setid_centroDeCusto(0);
         setDescricaoCentroDeCusto("");
         setPercentualRateio("");
         consultarRateio();
      })
      .catch((err) => {
         toast.error(err.response?.data?.error || 'Erro ao inserir rateio', { position: "top-center" });
      });

   }
     

function consultarDadosFuncionario() {
  
   
   setCodigo(0);
   setcodusuarioErp(0);
   setNome('');
   setCpf('');
   setRg('');
   //contato
   setEmail('');
   setTelefone('');
   //endereço
   setCep('');
   setEndereco('');
   setNumero('');
   setUf('');
   setCidade('');
   setBairro('');
   setComplemento('');
   //informações profissionais
   Set_Id_EmpresaFunc('');
   SetFilialFunc('');
   Set_Id_setor('');
   setSetor('');      
   setDataNascimento(moment().utc().format('YYYY-MM-DD'));
   setSexo('');
   setTipoContrato('');
   setNacionalidade('');
   setNaturalidade('');
   setCargo('');
   setAdmissao(moment().utc().format('YYYY-MM-DD'));
   setNumeroCNH('');
   setDataExpiracaoCNH(moment().utc().format('YYYY-MM-DD')); 
   //banco
   setid_banco(0);
   setbanco("");
   setagencia("");
   setnumconta("");
   setoperacao("");
   setchavepix("");
   

   setid_bancoterceiro(0);
   setbancoterceiro("");
   setagenciaterceiro("");
   setnumcontaterceiro("");
   setoperacaoterceiro("");  
   setchavepixterceiro("");
   setbeneficiadoterceiro("");

   if (props.idUsuario != null & props.idUsuario !=0) {

   api.post('/v1/consultarDadosFuncionario',{matricula: props.idUsuario})
   .then((retorno) =>{
      
      //console.log(retorno.data[0]);

      //dados basicos
      setCodigo(retorno.data[0].id_usuario);
      setcodusuarioErp(retorno.data[0].id_usuario_erp);
      setNome(retorno.data[0].nome);
      setCpf(retorno.data[0].cpf);
      setRg(retorno.data[0].rg);
      //contato
      setEmail(retorno.data[0].email);
      setTelefone(retorno.data[0].telefone);
      //endereço
      setCep(retorno.data[0].cep);
      setEndereco(retorno.data[0].rua);
      setNumero(retorno.data[0].numero);
      setUf(retorno.data[0].uf);
      setCidade(retorno.data[0].cidade);
      setBairro(retorno.data[0].bairro);
      setComplemento(retorno.data[0].complemento);
      //informações profissionais
      Set_Id_EmpresaFunc(retorno.data[0].id_empresa_erp);
      SetFilialFunc(retorno.data[0].razaosocial);
      Set_Id_setor(retorno.data[0].id_setor_erp);
      setSetor(retorno.data[0].setor);      
      setDataNascimento(moment(retorno.data[0].datanascimento).utc().format('YYYY-MM-DD'));
      setSexo(retorno.data[0].sexo);
      setTipoContrato(retorno.data[0].tipodecontrato);
      setNacionalidade(retorno.data[0].nacionalidade);
      setNaturalidade(retorno.data[0].naturalidade);
      setCargo(retorno.data[0].cargo);
      setAdmissao(moment(retorno.data[0].dataadmissao).utc().format('YYYY-MM-DD'));
      setNumeroCNH(retorno.data[0].cnh);
      setDataExpiracaoCNH(moment(retorno.data[0].dataexpiracaocnh).utc().format('YYYY-MM-DD'));  
      //banco
      setid_banco(retorno.data[0].id_banco);
      setbanco(retorno.data[0].banco);
      setagencia(retorno.data[0].agencia);
      setnumconta(retorno.data[0].conta);
      setoperacao(retorno.data[0].operacao);     
      setchavepix(retorno.data[0].chavepix);
      //banco terceiro
      setid_bancoterceiro(retorno.data[0].id_bancoterceiro);
      setbancoterceiro(retorno.data[0].bancoterceiro);
      setagenciaterceiro(retorno.data[0].agenciaterceiro);
      setnumcontaterceiro(retorno.data[0].contaterceiro);
      setoperacaoterceiro(retorno.data[0].operacaoterceiro); 
      setchavepixterceiro(retorno.data[0].chavepixterceiro); 
      setbeneficiadoterceiro(retorno.data[0].beneficiadoterceiro);   
      
      consultarRateio();

   })
   .catch((err) => {
      console.error('erro ao consulta dados do funcioario')
   });   

   
   
}

}

function consultarRateio() {

   //consultar rateio
   api.post('/v1/consultarRateioFuncionario',{matricula: props.idUsuario})
   .then((resposta) =>{
      setRateio(resposta.data);
   })
   .catch((erro) =>{
      console.error('erro ao consultar rateio do funcionario');
   });

}

useEffect(() => {
   const registros = rateio.length;
   const total = rateio.reduce((soma, item) => {
      const percentual = Number(item.percentual || item.percentual_rateio || 0);
      return soma + (isNaN(percentual) ? 0 : percentual);
   }, 0);

   setQtRegistro(registros);
   setTotalPercentual(total);
}, [rateio]);

const buscarEndereco = async () => {
  // Validando o formato do CEP (somente números e 8 dígitos)
  const cepValido = /^[0-9]{5}-?[0-9]{3}$/.test(cep);
  
  if (!cepValido) {
    toast.error('CEP inválido. Por favor, insira um CEP válido.',{ position: "top-center" });
    setUf(null);
    setCidade(null);
    setBairro(null);
    setEndereco(null);
    return; // Retorna sem fazer a requisição
  }

  try {
    // Fazendo a requisição ao serviço ViaCEP
    const resposta = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    
    // Verificando se a resposta contém um erro (CEP não encontrado)
    if (resposta.data.erro) {
      toast.warn('CEP não encontrado !',{ position: "top-center" });
      setUf(null);
      setCidade(null);
      setBairro(null);
      setEndereco(null);
      return;
    }

    // Atualizando os estados com os dados do endereço
    setUf(resposta.data.uf);
    setCidade(resposta.data.localidade);
    setBairro(resposta.data.bairro);
    setEndereco(resposta.data.logradouro);
    toast.success('Endereço encontrado com sucesso!',{ position: "top-center" });
  } catch (error) {
    // Tratando erros de requisição
    console.error('Erro ao buscar o endereço:', error);
    toast.error('Ocorreu um erro ao buscar o endereço. Tente novamente.',{ position: "top-center" });
    setUf(null);
    setCidade(null);
    setBairro(null);
    setEndereco(null);
  }
};

   // Função de validação de email
   const validarEmail = (email) => {
      const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      return regex.test(email);
   };

   // Função de validação de telefone
   const validarTelefone = (telefone) => {
      const regex = /^\(?\d{2}\)?\s?\d{4,5}-\d{4}$/;
      return regex.test(telefone);
   };

   // Função para validar o CPF usando a biblioteca cpf-cnpj-validator
   const validarCPF = (cpfInput) => {
      const cpfLimpo = cpfInput.replace(/[^\d]/g, '');
      if (cpf.isValid(cpfLimpo)) {
         return true;
      } else {
         toast.error("CPF inválido.", { position: "top-center" });
         return false;
      }
   };

  const formatDate = (date) => {
   if (!date) return ""; // Retorna vazio se a data for nula ou indefinida
   const jsDate = new Date(date); // Converte para um objeto Date
   return jsDate.toLocaleDateString("pt-BR"); // Formata no padrão dd/mm/yyyy
 };


   // Função para salvar os dados
   function salvarDados() {

      const json = {
         "id_usuario": codigo,
         "id_usuario_erp": codusuarioErp,
         "id_empresa_erp": id_EmpresaFunc,
         "id_setor_erp": id_setor,
         "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
         "Nome": nome,
         "email": email,
         "cpf": cpfInput,
         "rg": rg,
         "telefone": telefone,
         "cep": cep,
         "rua": endereco,
         "numero": numero,
         "uf": uf,
         "cidade": cidade,
         "bairro": bairro,
         "complemento": complemento,
         "datanascimento": formatDate(dataNascimento),
         "sexo": sexo,
         "nacionalidade": nacionalidade,
         "naturalidade": naturalidade,
         "cargo": cargo,
         "dataadmissao": formatDate(admissao),
         "tipodecontrato": tipoContrato,
         "cnh": numeroCNH,
         "dataexpiracaocnh": formatDate(dataExpiracaoCNH),
         "id_banco": id_banco,
         "agencia": agencia,
         "conta": numconta,
         "operacao": operacao,
         "chavepix": chavepix,         
         "id_bancoterceiro": id_bancoterceiro,
         "agenciaterceiro": agenciaterceiro,
         "contaterceiro": numcontaterceiro,
         "operacaoterceiro": operacaoterceiro,
         "chavepixterceiro": chavepixterceiro,
         "beneficiadoterceiro": beneficiadoterceiro
       };
       
      
       api.post("/v1/cadastrarFuncionario", json, {
         headers: {
            "Content-Type": "application/json"
         }
      })
      .then((retorno) => {
         toast.success(retorno.data.mensagem ,
            { position: "top-center" , 
               autoClose: 2000, 
              onClose: () => {props.onRequestClose()}}
         );         
         
      })
      .catch((err) => {
         console.log(err.response.data.error)
         toast.error(err.response.data.error, { position: "top-center" });         
      });
      
      
   };

   function UsarCredenciaisERP(lid_usuario){

         const jsonReq = {
            id_grupo_empresa: localStorage.getItem('id_grupo_empresa'),
            id_usuario: lid_usuario
         };
         
         api.post('/v1/Usuario/Credencias', jsonReq)
         .then((resposta) =>{
            toast.success(resposta.data.mensagem ,
               { position: "top-center" , 
                  autoClose: 2000, 
                 onClose: () => {props.onRequestClose()}}
            );   
         })
         .catch((err)=>{
            toast.success(err.response.error);
         })

   }

   useEffect( () => {
      consultarDadosFuncionario();
   },[props.idUsuario])

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
                  <h3 className="modal-title">Cadastro de Funcionário</h3>
               </div>

               <div className="bsmodal-body">
                  {/* Dados Básicos */}
                  <h4 className="section-title">Dados Básicos</h4>
                  <div className="row">
                     <div className="col-md-2 mb-3">
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
                     <div className="col-md-2 mb-3">
                        <label htmlFor="codigo" className="mb-2">Código ERP<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="codigo"
                           placeholder="Código"
                           value={codusuarioErp}
                           disabled                           
                           onChange={(e) => setcodusuarioErp(e.target.value)}
                        />
                     </div>
                     <div className="col-md-8 mb-3">
                        <label htmlFor="nome" className="mb-2">Nome Completo<span className="text-danger">*</span></label>
                        <input  
                           autoFocus                         
                           type="text"
                           className="form-control"
                           id="nome"
                           placeholder="Nome Completo"
                           value={nome}
                           onChange={(e) => setNome(e.target.value.toUpperCase())}                
                        />
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="cpf" className="mb-2">CPF<span className="text-danger">*</span></label>
                        <input
                           value={cpfInput}
                           onChange={(e) => setCpf(e.target.value)}
                           className="form-control"
                           id="cpf"
                           placeholder="CPF"
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="rg" className="mb-2">RG</label>
                        <input
                           type="text"
                           className="form-control"
                           id="rg"
                           placeholder="RG"
                           value={rg}
                           onChange={(e) => setRg(e.target.value)}
                        />
                     </div>
                  </div>

                  {/* Contato */}
                  <h4 className="section-title">Contato</h4>
                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="mb-2">Email</label>
                        <input
                           type="email"
                           className="form-control"
                           id="email"
                           placeholder="Email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="telefone" className="mb-2">Telefone<span className="text-danger">*</span></label>
                        <input
                           value={telefone}
                           onChange={(e) => setTelefone(e.target.value)}
                           className="form-control"
                           id="telefone"
                           placeholder="Telefone"
                        />
                     </div>
                  </div>

                  {/* Endereço */}
                  <h4 className="section-title">Endereço</h4>
                  <div className="row">
                     <div className="col-md-2 mb-3">
                        <label htmlFor="cep" className="mb-2">CEP</label>
                        <input
                           value={cep}
                           onChange={(e) => setCep(e.target.value.toUpperCase())}
                           className="form-control"
                           id="cep"
                           placeholder="CEP"
                           onBlur={buscarEndereco}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="Rua" className="mb-2">Rua</label>
                        <input
                           type="text"
                           className="form-control"
                           id="Rua"
                           placeholder="Rua"
                           value={endereco}
                           onChange={(e) => setEndereco(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-4 mb-3">
                        <label htmlFor="numero" className="mb-2">Número</label>
                        <input
                           type="text"
                           className="form-control"
                           id="numero"
                           value={numero}
                           onChange={(e) => setNumero(e.target.value)}
                           placeholder="Número"
                        />
                     </div>
                  </div>
                  <div className="row">
                     <div className="col-md-4 mb-3">
                        <label htmlFor="UF" className="mb-2" >UF</label>
                        <input
                           type="text"
                           className="form-control"
                           id="cidade"
                           placeholder="UF"
                           value={uf}
                           onChange={(e) => setUf(e.target.value.toUpperCase())} 
                        />
                     </div>

                     <div className="col-md-4 mb-3">
                        <label htmlFor="cidade" className="mb-2">Cidade</label>
                        <input
                           type="text"
                           className="form-control"
                           id="cidade"
                           placeholder="Cidade"
                           value={cidade}
                           onChange={(e) => setCidade(e.target.value.toUpperCase())} 
                        />
                     </div>
                     <div className="col-md-4 mb-3">
                        <label htmlFor="bairro" className="mb-2">Bairro</label>
                        <input
                           type="text"
                           className="form-control"
                           id="bairro"
                           placeholder="Bairro"
                           value={bairro}
                           onChange={(e) => setBairro(e.target.value.toUpperCase())} 
                        />
                     </div>
                     
                     <div className="col-md-12 mb-3">
                        <label htmlFor="complemento" className="mb-2">Complemento</label>
                        <input
                           type="text"
                           className="form-control"
                           id="complemento"
                           placeholder="Complemento"
                           value={complemento}
                           onChange={(e) => setComplemento(e.target.value.toUpperCase())}
                        />
                     </div>
                  </div>

                  {/* Informações de conta bancaria */}
                  <h4 className="section-title">Dados Bancaria</h4>
                  <div className='row'>
                  <div className="col-md-3 mb-3">
                        <label htmlFor="setor" className="mb-2">Instituição Bancaria Propria</label>
                        <EditComplete placeholder={"Banco"} id={"ib"}  
                                 tipoConsulta={"Banco"} 
                                 onClickCodigo={setid_banco} 
                                 onClickDescricao={setbanco}
                                 value={banco} 
                                 disabled={false}/>
            
                     </div>
                     <div className="col-md-1 mb-3">
                        <label htmlFor="dataExpiracaoCNH" className="mb-2">Agencia Propria</label>
                        <input
                           type="text"
                           className="form-control"
                           id="dataExpiracaoCNH"
                           value={agencia}
                           onChange={(e) => setagencia(e.target.value)}
                        />
                     </div>
                     <div className="col-md-2 mb-3">
                        <label htmlFor="dataExpiracaoCNH" className="mb-2">Conta Propria</label>
                        <input
                           type="text"
                           className="form-control"
                           id="dataExpiracaoCNH"
                           value={numconta}
                           onChange={(e) => setnumconta(e.target.value)}
                        />
                     </div>

                     <div className="col-md-1 mb-3">
                        <label htmlFor="operacao" className="mb-2">Operação Propria</label>
                        <input
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={operacao}
                           onChange={(e) => setoperacao(e.target.value)}
                        />
                     </div>

                     <div className="col-md-2 mb-3">
                        <label htmlFor="operacao" className="mb-2">Chave Pix</label>
                        <input
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={chavepix}
                           onChange={(e) => setchavepix(e.target.value)}
                        />
                     </div>

                     <div className="col-md-3 mb-3">
                        <label htmlFor="operacao" className="mb-2">Beneficiado:</label>
                        <input
                           disabled
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={nome}                           
                        />
                     </div>
                    


                  </div>

                  <div className='row'>
                  <div className="col-md-3 mb-3">
                        <label htmlFor="setor" className="mb-2">Instituição Bancaria Terceiro</label>
                        <EditComplete placeholder={"Banco"} id={"ib"}  
                                 tipoConsulta={"Banco"} 
                                 onClickCodigo={setid_bancoterceiro} 
                                 onClickDescricao={setbancoterceiro}
                                 value={bancoterceiro} 
                                 disabled={false}/>
            
                     </div>
                     <div className="col-md-1 mb-3">
                        <label htmlFor="dataExpiracaoCNH" className="mb-2">Agencia Terceiro</label>
                        <input
                           type="text"
                           className="form-control"
                           id="dataExpiracaoCNH"
                           value={agenciaterceiro}
                           onChange={(e) => setagenciaterceiro(e.target.value)}
                        />
                     </div>
                     <div className="col-md-2 mb-3">
                        <label htmlFor="dataExpiracaoCNH" className="mb-2">Conta Terceiro</label>
                        <input
                           type="text"
                           className="form-control"
                           id="dataExpiracaoCNH"
                           value={numcontaterceiro}
                           onChange={(e) => setnumcontaterceiro(e.target.value)}
                        />
                     </div>

                     <div className="col-md-1 mb-3">
                        <label htmlFor="operacao" className="mb-2">Operação Terceiro</label>
                        <input
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={operacaoterceiro}
                           onChange={(e) => setoperacaoterceiro(e.target.value)}
                        />
                     </div>   

                     <div className="col-md-2 mb-3">
                        <label htmlFor="operacao" className="mb-2">Chave Pix</label>
                        <input
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={chavepixterceiro}
                           onChange={(e) => setchavepixterceiro(e.target.value)}
                        />
                     </div> 

                     <div className="col-md-3 mb-3">
                        <label htmlFor="operacao" className="mb-2">Beneficiado Terceiro:</label>
                        <input
                           
                           type="text"
                           className="form-control"
                           id="operacao"
                           value={beneficiadoterceiro}
                           onChange={(e) => setbeneficiadoterceiro(e.target.value.toUpperCase())}
                        />
                     </div>                                     


                  </div>

                  {/* Informações Profissionais */}
                  <h4 className="section-title">Informações Profissionais</h4>
                  <div className="row">
                     <div className="col-md-6 mb-3">                                                                                                    
                        
                     <label htmlFor="fl-1" className="mb-2">Filial<span className="text-danger">*</span></label>                   
                     <EditComplete placeholder={"Filial"} id={"fl-1"}  
                                 tipoConsulta={"filial1"} 
                                 onClickCodigo={Set_Id_EmpresaFunc} 
                                 onClickDescricao={SetFilialFunc}
                                 value={filialFunc} 
                                 disabled={false}/>
                        
                        
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="setor" className="mb-2">Setor<span className="text-danger">*</span></label>
                        <EditComplete placeholder={"Setor"} id={"setor"}  
                                 tipoConsulta={"se"} 
                                 onClickCodigo={Set_Id_setor} 
                                 onClickDescricao={setSetor}
                                 value={setor} 
                                 disabled={false}/>
            
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="dataNascimento" className="mb-2">Data de Nascimento<span className="text-danger">*</span></label>
                        <input
                           type="date"
                           className="form-control"
                           id="dataNascimento"
                           value={dataNascimento}
                           onChange={(e) => setDataNascimento(e.target.value)}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="sexo" className="mb-2">Sexo<span className="text-danger">*</span></label>
                        <select
                           className="form-control"
                           id="sexo"
                           value={sexo}
                           onChange={(e) => setSexo(e.target.value)}
                        >
                           <option value="">Selecione</option>
                           <option value="M">MASCULINO</option>
                           <option value="F">FEMININO</option>
                           <option value="O">OUTRO</option>
                        </select>
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="nacionalidade" className="mb-2">Nacionalidade</label>
                        <input
                           type="text"
                           className="form-control"
                           id="nacionalidade"
                           placeholder="Nacionalidade"
                           value={nacionalidade}
                           onChange={(e) => setNacionalidade(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="naturalidade" className="mb-2">Naturalidade</label>
                        <input
                           type="text"
                           className="form-control"
                           id="naturalidade"
                           placeholder="Naturalidade"
                           value={naturalidade}
                           onChange={(e) => setNaturalidade(e.target.value.toUpperCase())}
                        />
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="cargo" className="mb-2">Cargo<span className="text-danger">*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           id="cargo"
                           placeholder="Cargo"
                           value={cargo}
                           onChange={(e) => setCargo(e.target.value.toUpperCase())}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="admissao" className="mb-2">Data de Admissão<span className="text-danger">*</span></label>
                        <input
                           type="date"
                           className="form-control"
                           id="admissao"
                           value={admissao}
                           onChange={(e) => setAdmissao(e.target.value)}
                        />
                     </div>
                  </div>

                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="tipoContrato" className="mb-2">Tipo de Contrato<span className="text-danger">*</span></label>
                        <select
                           className="form-control"
                           id="tipoContrato"
                           value={tipoContrato}
                           onChange={(e) => setTipoContrato(e.target.value)}
                        >
                           <option value="">Selecione</option>
                           <option value="CLT">CLT</option>
                           <option value="PJ">PJ</option>
                        </select>
                     </div>
                     <div className='col-md-2 margem-botao mb-3'>
                     <button
                        type="button"
                        className="btn btn-secondary px-4 w-100"
                        onClick={() => UsarCredenciaisERP(codigo)}
                     >
                        Usar Credenciais do ERP
                     </button>
                     </div>
                  </div>

                  {/* Rateio */}
                  <h4 className="section-title">Rateio Centro de Custo</h4>
                  <div className='row'>
                  <div className="col-lg-9 mb-2">   
                        <label htmlFor="cc" className="mb-2">Centro de Custo</label>                   
                        <EditComplete placeholder={"Informe o Centro de Custo"} id={"cc"}  
                                    tipoConsulta={"cc"} 
                                    onClickCodigo={setid_centroDeCusto} 
                                    onClickDescricao={setDescricaoCentroDeCusto}
                                    value={descricaoCentroDeCusto} 
                                    disabled={false}
                        />
                  </div>

                  <div className="col-lg-2 mb-3">   
                     <label htmlFor="rescontro" className="mb-2">% Rateio</label>                   
                     <input type="number" step={"0.01"}  className="form-control" placeholder={"% Rateio ..."} id={"rescontro"} 
                        value={percentualRateio} 
                        onChange={(e) => setPercentualRateio(e.target.value)}
                        disabled={false}
                     /> 
                  </div>


                  <div className="col-lg-1 mb-3">
                     <button
                     type="button"
                     className="btn btn-secondary marg-botao-incluir-rateio w-100"
                     onClick={onClickIncluirRateio}
                     disabled={false}
                     >
                     Incluir
                     
                     </button>                                                                                                                                                                                                                                                     
                  </div>
                  </div>


                  <div className="grid-desktop-rateio">
                  <div className="bg-grid">

                     {/* GRID */}
                     <div className="row tableFixHead">
                     <table className="table table-hover">
                        <thead className="Titulos-Table">
                        <tr>
                              <th>Centro de Custo</th>
                              <th className="text-center" style={{ width: "90px" }}>%</th>

                              <th className="text-end" style={{ width: "60px" }}></th>
                        </tr>
                        </thead>

                        <tbody>
                        {rateio.length > 0 ? (
                              rateio.map((item, index) => (
                              <tr key={index} className="item-Table">
                                 <td>
                                 <strong>{item.id_centrodecusto}</strong> - {item.descricao}
                                 </td>

                                 <td className="text-center">
                                  {item.percentual}%
                                 </td>

                                 <td className="text-end">
                                    {!disableCentroDecusto ? <>
                                          <button
                                             className="btn-remove"
                                             title="Remover rateio"
                                             onClick={() => onClickExcluirRateio(item.id_rateio)}                                                                    
                                          >
                                             <i className="bi bi-trash"></i>
                                          </button>
                                          </>: null
                                    }                                                        
                                 </td>
                              </tr>
                              ))
                        ) : (
                              <tr>
                              <td colSpan="4" className="text-center text-muted py-3">
                                 Nenhum rateio informado
                              </td>
                              </tr>
                        )}
                        </tbody>
                     </table>
                     </div>

                     {/* TOTALIZADOR */}
                     <div className="row">
                     <div className="Total d-flex w-100 justify-content-between">
                        <div>
                        <label>Registros:</label>
                        <span>{qtRegistro}</span>
                        </div>

                        <div>
                        <label>% Total:</label>
                        <span>{totalPercentual.toFixed(2)}%</span>
                        </div>
                     </div>
                     </div>

                  </div>
                  </div> 


                  {/* Adicionando os campos de Carteira de Motorista */}
                  <h4 className="section-title">Carteira de Motorista</h4>
                  <div className="row">
                     <div className="col-md-6 mb-3">
                        <label htmlFor="numeroCNH" className="mb-2">Número da CNH</label>
                        <input
                           type="text"
                           className="form-control"
                           id="numeroCNH"
                           placeholder="Número da CNH"
                           value={numeroCNH}
                           onChange={(e) => setNumeroCNH(e.target.value)}
                        />
                     </div>
                     <div className="col-md-6 mb-3">
                        <label htmlFor="dataExpiracaoCNH" className="mb-2">Data de Expiração</label>
                        <input
                           type="date"
                           className="form-control"
                           id="dataExpiracaoCNH"
                           value={dataExpiracaoCNH}
                           onChange={(e) => setDataExpiracaoCNH(e.target.value)}
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

export default ModalCadastroDeUsuario;
