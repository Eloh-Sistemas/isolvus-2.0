import React, { useEffect, useState  } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
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

   const disableCentroDecusto = false;
   const [qtRegistro, setQtRegistro] = useState(0);
   const [totalPercentual, setTotalPercentual] = useState(0);
   const [salvandoCadastro, setSalvandoCadastro] = useState(false);
   const [fotoPerfil, setFotoPerfil] = useState('');
   const [fotoZoomAtivo, setFotoZoomAtivo] = useState(false);

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

      const totalAtual = rateio.reduce((soma, item) => {
         const percentual = Number(item.percentual || item.percentual_rateio || 0);
         return soma + (isNaN(percentual) ? 0 : percentual);
      }, 0);

      const novoPercentual = Number(percentualRateio);
      if (!isNaN(novoPercentual) && (totalAtual + novoPercentual) > 100) {
         toast.warn('O rateio não pode ultrapassar 100%.', { position: "top-center" });
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
   setFotoPerfil('');
   setFotoZoomAtivo(false);

   if (props.idUsuario != null && props.idUsuario !== 0) {

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

      const idUsuarioAtual = Number(retorno.data[0].id_usuario || 0);
      if (idUsuarioAtual > 0) {
         api.post('/v1/usuario/consultarFoto', { id_usuario: idUsuarioAtual })
         .then((res) => {
            const foto = res?.data?.foto;
            if (!foto) {
               setFotoPerfil('');
               return;
            }

            const urlFoto = foto.startsWith('/midias/')
               ? `${api.defaults.baseURL}${foto}`
               : foto;

            setFotoPerfil(urlFoto);
         })
         .catch(() => {
            setFotoPerfil('');
         });
      }
      
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

   // Função de validação de telefone
   const validarTelefone = (telefone) => {
      const apenasNumeros = String(telefone || '').replace(/\D/g, '');
      return apenasNumeros.length === 10 || apenasNumeros.length === 11;
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

   // Função para salvar os dados
   async function salvarDados() {

      if (!nome.trim()) {
         toast.warn('Informe o nome do funcionário.', { position: "top-center" });
         return;
      }

      if (!cpfInput) {
         toast.warn('Informe o CPF.', { position: "top-center" });
         return;
      }

      if (!validarCPF(cpfInput)) {
         return;
      }

      if (!rg || !String(rg).trim()) {
         toast.warn('RG não informado.', { position: "top-center" });
         return;
      }

      if (!sexo) {
         toast.warn('Sexo não informado.', { position: "top-center" });
         return;
      }

      if (!dataNascimento) {
         toast.warn('Data de nascimento não informada.', { position: "top-center" });
         return;
      }

      if (!email || !String(email).trim()) {
         toast.warn('Email não informado.', { position: "top-center" });
         return;
      }

      if (!telefone) {
         toast.warn('Telefone não informado.', { position: "top-center" });
         return;
      }

      if (telefone && !validarTelefone(telefone)) {
         toast.warn('Informe um telefone válido.', { position: "top-center" });
         return;
      }

      if (!id_EmpresaFunc) {
         toast.warn('Filial não informada.', { position: "top-center" });
         return;
      }

      if (!id_setor) {
         toast.warn('Setor não informado.', { position: "top-center" });
         return;
      }

      if (rateio.length === 0) {
         toast.warn('Informe o rateio de Centro de Custo.', { position: "top-center" });
         return;
      }

      if (Math.abs(Number(totalPercentual || 0) - 100) > 0.0001) {
         toast.warn('O rateio de Centro de Custo deve ser exatamente 100%.', { position: "top-center" });
         return;
      }

      if (!admissao) {
         toast.warn('Data de admissão não informada.', { position: "top-center" });
         return;
      }

      const idGrupoEmpresa = localStorage.getItem("id_grupo_empresa");
      if (!idGrupoEmpresa) {
         toast.error('Grupo de empresa não identificado. Faça login novamente.', { position: "top-center" });
         return;
      }

      const json = {
         "id_usuario": codigo,
         "id_usuario_erp": codusuarioErp,
         "id_empresa_erp": id_EmpresaFunc,
         "id_setor_erp": id_setor,
         "id_grupo_empresa": idGrupoEmpresa,
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
         "datanascimento": dataNascimento,
         "sexo": sexo,
         "nacionalidade": nacionalidade,
         "naturalidade": naturalidade,
         "cargo": cargo,
         "dataadmissao": admissao,
         "tipodecontrato": tipoContrato,
         "cnh": numeroCNH,
         "dataexpiracaocnh": dataExpiracaoCNH,
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
       
      
      setSalvandoCadastro(true);
      Swal.fire({
         title: 'Salvando cadastro',
         text: 'Aguarde a finalizacao do processamento.',
         allowEscapeKey: false,
         allowOutsideClick: false,
         showConfirmButton: false,
         didOpen: () => {
            Swal.showLoading();
         }
      });

      try {
         const retorno = await api.post("/v1/cadastrarFuncionario", json, {
            headers: {
               "Content-Type": "application/json"
            }
         });

         if (retorno?.data?.sucesso === false) {
            Swal.close();
            await Swal.fire({
               icon: 'error',
               title: 'Erro ao salvar',
               text: retorno?.data?.mensagem || 'Erro ao salvar cadastro.'
            });
            setSalvandoCadastro(false);
            return;
         }

         Swal.close();
         await Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: retorno?.data?.mensagem || 'Cadastro salvo com sucesso!'
         });

         setSalvandoCadastro(false);
         props.onRequestClose();
      } catch (err) {
         console.log(err?.response?.data?.error);
         Swal.close();
         await Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            text: err?.response?.data?.error || 'Erro ao salvar cadastro.'
         });
         setSalvandoCadastro(false);
      }
      
      
   };

   function UsarCredenciaisERP(lid_usuario){

         if (!lid_usuario || Number(lid_usuario) === 0) {
            toast.warn('Salve ou carregue o funcionário antes de usar as credenciais do ERP.', { position: "top-center" });
            return;
         }

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
            toast.error(err?.response?.data?.error || 'Erro ao usar credenciais do ERP.', { position: "top-center" });
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
            overlayClassName="cad-modal-overlay"
            ariaHideApp={false}
            className="cad-modal-content"
         >
            {fotoZoomAtivo && fotoPerfil && (
               <div className="cad-foto-zoom-overlay" onClick={() => setFotoZoomAtivo(false)}>
                  <div className="cad-foto-zoom-centro" onClick={(event) => event.stopPropagation()}>
                     <img src={fotoPerfil} alt="Foto ampliada do funcionário" className="cad-foto-zoom-img" />
                  </div>
               </div>
            )}

            <div className="cad-modal-header">
               <div>
                  <h4 className="cad-modal-title">Cadastro de Funcionário</h4>
                  <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Preencha os dados do funcionário e clique em Salvar.</p>
               </div>
               <button className="btn btn-outline-secondary" onClick={props.onRequestClose} disabled={salvandoCadastro}>Fechar</button>
            </div>

               <div className="bsmodal-body">
                  <p className="cad-section-title">Foto do Perfil</p>
                  <div className="cad-section cad-foto-identificacao">
                     <div className="cad-foto-identificacao-avatar">
                        {fotoPerfil ? (
                           <button
                              type="button"
                              className="cad-foto-zoom-btn"
                              onClick={() => setFotoZoomAtivo(true)}
                              title="Ampliar foto"
                           >
                              <img src={fotoPerfil} alt="Foto do funcionário" className="cad-foto-identificacao-img" />
                           </button>
                        ) : (
                           <div className="cad-foto-identificacao-placeholder">
                              <i className="bi bi-person-fill"></i>
                           </div>
                        )}
                     </div>
                     <div className="cad-foto-identificacao-info">
                        <strong>{nome || 'Funcionário'}</strong>
                        <small className="text-muted d-block">{codusuarioErp ? `Matrícula ${codusuarioErp}` : (codigo ? `Código ${codigo}` : 'Salve o cadastro para vincular foto')}</small>
                     </div>
                  </div>

                  {/* Dados Básicos */}
                  <p className="cad-section-title">Dados Básicos</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-md-2">
                           <label htmlFor="codigo" className="form-label">Código</label>
                           <input type="text" className="form-control" id="codigo"
                              placeholder="Código" value={codigo} disabled
                              onChange={(e) => setCodigo(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="codigo-erp" className="form-label">Código ERP</label>
                           <input type="text" className="form-control" id="codigo-erp"
                              placeholder="Código ERP" value={codusuarioErp} disabled
                              onChange={(e) => setcodusuarioErp(e.target.value)}
                           />
                        </div>
                        <div className="col-md-8">
                           <label htmlFor="nome" className="form-label">Nome Completo<span className="text-danger">*</span></label>
                           <input autoFocus type="text" className="form-control" id="nome"
                              placeholder="Nome Completo" value={nome}
                              onChange={(e) => setNome(e.target.value.toUpperCase())}
                           />
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-4">
                           <label htmlFor="cpf" className="form-label">CPF<span className="text-danger">*</span></label>
                           <input value={cpfInput} onChange={(e) => setCpf(e.target.value)}
                              className="form-control" id="cpf" placeholder="CPF"
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="rg" className="form-label">RG<span className="text-danger">*</span></label>
                           <input type="text" className="form-control" id="rg"
                              placeholder="RG" value={rg} onChange={(e) => setRg(e.target.value)}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="sexo" className="form-label">Sexo<span className="text-danger">*</span></label>
                           <select className="form-control" id="sexo" value={sexo}
                              onChange={(e) => setSexo(e.target.value)}>
                              <option value="">Selecione</option>
                              <option value="M">MASCULINO</option>
                              <option value="F">FEMININO</option>
                              <option value="O">OUTRO</option>
                           </select>
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-4">
                           <label htmlFor="dataNascimento" className="form-label">Data de Nascimento<span className="text-danger">*</span></label>
                           <input type="date" className="form-control" id="dataNascimento"
                              value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="nacionalidade" className="form-label">Nacionalidade</label>
                           <input type="text" className="form-control" id="nacionalidade"
                              placeholder="Nacionalidade" value={nacionalidade}
                              onChange={(e) => setNacionalidade(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="naturalidade" className="form-label">Naturalidade</label>
                           <input type="text" className="form-control" id="naturalidade"
                              placeholder="Naturalidade" value={naturalidade}
                              onChange={(e) => setNaturalidade(e.target.value.toUpperCase())}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Contato */}
                  <p className="cad-section-title">Contato</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                           <label htmlFor="email" className="form-label">Email<span className="text-danger">*</span></label>
                           <input type="email" className="form-control" id="email"
                              placeholder="Email" value={email}
                              onChange={(e) => setEmail(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-6">
                           <label htmlFor="telefone" className="form-label">Telefone<span className="text-danger">*</span></label>
                           <input value={telefone} onChange={(e) => setTelefone(e.target.value)}
                              className="form-control" id="telefone" placeholder="Telefone"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Endereço */}
                  <p className="cad-section-title">Endereço</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-md-2">
                           <label htmlFor="cep" className="form-label">CEP</label>
                           <input value={cep} onChange={(e) => setCep(e.target.value.toUpperCase())}
                              className="form-control" id="cep" placeholder="CEP" onBlur={buscarEndereco}
                           />
                        </div>
                        <div className="col-md-7">
                           <label htmlFor="Rua" className="form-label">Rua</label>
                           <input type="text" className="form-control" id="Rua"
                              placeholder="Rua" value={endereco}
                              onChange={(e) => setEndereco(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-3">
                           <label htmlFor="numero" className="form-label">Número</label>
                           <input type="text" className="form-control" id="numero"
                              value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número"
                           />
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-2">
                           <label htmlFor="uf" className="form-label">UF</label>
                           <input type="text" className="form-control" id="uf"
                              placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="cidade" className="form-label">Cidade</label>
                           <input type="text" className="form-control" id="cidade"
                              placeholder="Cidade" value={cidade}
                              onChange={(e) => setCidade(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-3">
                           <label htmlFor="bairro" className="form-label">Bairro</label>
                           <input type="text" className="form-control" id="bairro"
                              placeholder="Bairro" value={bairro}
                              onChange={(e) => setBairro(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-3">
                           <label htmlFor="complemento" className="form-label">Complemento</label>
                           <input type="text" className="form-control" id="complemento"
                              placeholder="Complemento" value={complemento}
                              onChange={(e) => setComplemento(e.target.value.toUpperCase())}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Dados Bancários */}
                  <p className="cad-section-title">Dados Bancários</p>
                  <div className="cad-section">
                     <p className="cad-subsection-title">Conta Própria</p>
                     <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                           <label htmlFor="ib" className="form-label">Instituição Bancária</label>
                           <EditComplete placeholder={"Banco"} id={"ib"} tipoConsulta={"Banco"}
                                    onClickCodigo={setid_banco} onClickDescricao={setbanco}
                                    value={banco} disabled={false}/>
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="agencia-propria" className="form-label">Agência</label>
                           <input type="text" className="form-control" id="agencia-propria"
                              value={agencia} onChange={(e) => setagencia(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="conta-propria" className="form-label">Conta</label>
                           <input type="text" className="form-control" id="conta-propria"
                              value={numconta} onChange={(e) => setnumconta(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="operacao-propria" className="form-label">Operação</label>
                           <input type="text" className="form-control" id="operacao-propria"
                              value={operacao} onChange={(e) => setoperacao(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="chavepix-propria" className="form-label">Chave Pix</label>
                           <input type="text" className="form-control" id="chavepix-propria"
                              value={chavepix} onChange={(e) => setchavepix(e.target.value)}
                           />
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-12">
                           <label htmlFor="beneficiado-proprio" className="form-label">Beneficiado</label>
                           <input disabled type="text" className="form-control" id="beneficiado-proprio" value={nome} />
                        </div>
                     </div>

                     <hr className="cad-hr" />
                     <p className="cad-subsection-title">Conta Terceiro</p>
                     <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                           <label htmlFor="ib-terceiro" className="form-label">Instituição Bancária</label>
                           <EditComplete placeholder={"Banco"} id={"ib-terceiro"} tipoConsulta={"Banco"}
                                    onClickCodigo={setid_bancoterceiro} onClickDescricao={setbancoterceiro}
                                    value={bancoterceiro} disabled={false}/>
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="agencia-terceiro" className="form-label">Agência</label>
                           <input type="text" className="form-control" id="agencia-terceiro"
                              value={agenciaterceiro} onChange={(e) => setagenciaterceiro(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="conta-terceiro" className="form-label">Conta</label>
                           <input type="text" className="form-control" id="conta-terceiro"
                              value={numcontaterceiro} onChange={(e) => setnumcontaterceiro(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="operacao-terceiro" className="form-label">Operação</label>
                           <input type="text" className="form-control" id="operacao-terceiro"
                              value={operacaoterceiro} onChange={(e) => setoperacaoterceiro(e.target.value)}
                           />
                        </div>
                        <div className="col-md-2">
                           <label htmlFor="chavepix-terceiro" className="form-label">Chave Pix</label>
                           <input type="text" className="form-control" id="chavepix-terceiro"
                              value={chavepixterceiro} onChange={(e) => setchavepixterceiro(e.target.value)}
                           />
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-12">
                           <label htmlFor="beneficiado-terceiro" className="form-label">Beneficiado Terceiro</label>
                           <input type="text" className="form-control" id="beneficiado-terceiro"
                              value={beneficiadoterceiro}
                              onChange={(e) => setbeneficiadoterceiro(e.target.value.toUpperCase())}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Informações Profissionais */}
                  <p className="cad-section-title">Informações Profissionais</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                           <label htmlFor="fl-1" className="form-label">Filial<span className="text-danger">*</span></label>
                           <EditComplete placeholder={"Filial"} id={"fl-1"} tipoConsulta={"filial1"}
                                    onClickCodigo={Set_Id_EmpresaFunc} onClickDescricao={SetFilialFunc}
                                    value={filialFunc} disabled={false}/>
                        </div>
                        <div className="col-md-6">
                           <label htmlFor="setor" className="form-label">Setor<span className="text-danger">*</span></label>
                           <EditComplete placeholder={"Setor"} id={"setor"} tipoConsulta={"se"}
                                    onClickCodigo={Set_Id_setor} onClickDescricao={setSetor}
                                    value={setor} disabled={false}/>
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-4">
                           <label htmlFor="cargo" className="form-label">Cargo</label>
                           <input type="text" className="form-control" id="cargo"
                              placeholder="Cargo" value={cargo}
                              onChange={(e) => setCargo(e.target.value.toUpperCase())}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="admissao" className="form-label">Data de Admissão<span className="text-danger">*</span></label>
                           <input type="date" className="form-control" id="admissao"
                              value={admissao} onChange={(e) => setAdmissao(e.target.value)}
                           />
                        </div>
                        <div className="col-md-4">
                           <label htmlFor="tipoContrato" className="form-label">Tipo de Contrato</label>
                           <select className="form-control" id="tipoContrato" value={tipoContrato}
                              onChange={(e) => setTipoContrato(e.target.value)}>
                              <option value="">Selecione</option>
                              <option value="CLT">CLT</option>
                              <option value="PJ">PJ</option>
                           </select>
                        </div>
                     </div>
                     <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-8">
                           <small className="text-muted d-block">Use esta ação para sincronizar as credenciais já cadastradas no ERP.</small>
                        </div>
                        <div className="col-md-4">
                           <button
                              type="button"
                              className="btn btn-outline-primary cad-erp-btn w-100"
                              onClick={() => UsarCredenciaisERP(codigo)}
                              disabled={!codigo || Number(codigo) === 0}
                              title={!codigo || Number(codigo) === 0 ? 'Carregue ou salve o funcionário para habilitar' : 'Importar credenciais do ERP'}
                           >
                              <i className="bi bi-person-badge me-2"></i>
                              Importar Credenciais ERP
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Rateio */}
                  <p className="cad-section-title">Rateio Centro de Custo</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-lg-9">
                           <label htmlFor="cc" className="form-label">Centro de Custo<span className="text-danger">*</span></label>
                           <EditComplete placeholder={"Informe o Centro de Custo"} id={"cc"}
                                       tipoConsulta={"cc"}
                                       onClickCodigo={setid_centroDeCusto}
                                       onClickDescricao={setDescricaoCentroDeCusto}
                                       value={descricaoCentroDeCusto}
                                       disabled={false}
                           />
                        </div>
                        <div className="col-lg-2">
                           <label htmlFor="rescontro" className="form-label">% Rateio</label>
                           <input type="number" step={"0.01"} className="form-control"
                              placeholder={"% Rateio ..."} id={"rescontro"}
                              value={percentualRateio}
                              onChange={(e) => setPercentualRateio(e.target.value)}
                           />
                        </div>
                        <div className="col-lg-1">
                           <button type="button" className="btn btn-primary w-100"
                              onClick={onClickIncluirRateio}>
                              <i className="bi bi-plus-lg"></i>
                           </button>
                        </div>
                     </div>

                     <table className="cad-rateio-table">
                        <thead>
                           <tr>
                              <th>Centro de Custo</th>
                              <th style={{ width: '90px', textAlign: 'center' }}>%</th>
                              <th style={{ width: '50px' }}></th>
                           </tr>
                        </thead>
                        <tbody>
                           {rateio.length > 0 ? (
                              rateio.map((item, index) => (
                                 <tr key={index}>
                                    <td><strong>{item.id_centrodecusto}</strong> — {item.descricao}</td>
                                    <td style={{ textAlign: 'center' }}>{item.percentual}%</td>
                                    <td style={{ textAlign: 'right' }}>
                                       {!disableCentroDecusto && (
                                          <button className="btn-remove" title="Remover rateio"
                                             onClick={() => onClickExcluirRateio(item.id_rateio)}>
                                             <i className="bi bi-trash"></i>
                                          </button>
                                       )}
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr><td colSpan="3" className="cad-rateio-empty">Nenhum rateio informado</td></tr>
                           )}
                        </tbody>
                     </table>
                     <div className="cad-rateio-totais">
                        <div>Registros: <span>{qtRegistro}</span></div>
                        <div>% Total: <span>{totalPercentual.toFixed(2)}%</span></div>
                     </div>
                  </div>

                  {/* Carteira de Motorista */}
                  <p className="cad-section-title">Carteira de Motorista</p>
                  <div className="cad-section">
                     <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                           <label htmlFor="numeroCNH" className="form-label">Número da CNH</label>
                           <input type="text" className="form-control" id="numeroCNH"
                              placeholder="Número da CNH" value={numeroCNH}
                              onChange={(e) => setNumeroCNH(e.target.value)}
                           />
                        </div>
                        <div className="col-md-6">
                           <label htmlFor="dataExpiracaoCNH" className="form-label">Data de Expiração</label>
                           <input type="date" className="form-control" id="dataExpiracaoCNH"
                              value={dataExpiracaoCNH} onChange={(e) => setDataExpiracaoCNH(e.target.value)}
                           />
                        </div>
                     </div>
                  </div>
                                    
               </div>
            <div className="cad-modal-footer">
               <div className="cad-modal-footer-actions">
                  <button type="button" className="btn btn-primary cad-footer-btn" onClick={salvarDados} disabled={salvandoCadastro}>Salvar dados do Funcionario</button>
               </div>
            </div>
         </Modal>

         <ToastContainer />
      </>
   );
}

export default ModalCadastroDeUsuario;
