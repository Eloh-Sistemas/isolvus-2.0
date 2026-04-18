import "./ModalVisitaClienteAtividades.css";
import React, { useEffect, useRef, useState } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import api from "../../../../servidor/api";
import UploadArquivos from "../../../../componentes/UploadArquivos/UploadArquivos";
import TabItem from "../../../../componentes/tabItem/tabitem";
import EditComplete from "../../../../componentes/EditComplete/EditComplete";

function ModalVisitaClienteAtividades(props) {

  const [codAtividade, setcodAtividade] = useState(0);
  const [atividade, setAtividade] = useState("");
  const [codEquipe, setcodEquipe] = useState(0);
  const [equipe, setEquipe] = useState("");
  const [qtdePessoa, setqtdePessoa] = useState(0);
  const [fezquiz, setfezquiz] = useState("N");
  const [realizado, setRealizado] = useState("S");
  const [comentario, setComentario] = useState("");
  const [codVeterinario, setCodVeterinario] = useState(0);
  const [NomeVeterinario, setNomeVeterinario] = useState("");
  const [contatoVeterinario, setContatoVeterinario] = useState("");
  const [houveVenda, sethouveVenda] = useState("N");
  const uploadRef = useRef();   
  const [proximoIdEvidencia, setproximoIdEvidencia] = useState(0);
  const [camposFormulario, setcamposFormulario] = useState([]);
  const [atividades, setatividades] = useState([]);
  const [equipes, setequipes] = useState([]);

  
  // campos
  const [cpveterinario, setcpveterinario] = useState("N");
  const [cpitem, setcpitem] = useState("N");
  const [cpobservacao, setcpobservacao] = useState("N");
  const [cpvenda, setcpvenda] = useState("N");
  const [cpfoto, setcpfoto] = useState("N");
  const [cpequipe, setcpequipe] = useState("N");
  


  const QuantidadePessoa = (e) => {
    const valor = e.target.value.replace(",", ".");
    setqtdePessoa(valor);
  };

  function excluirEvidencia(){

    const id1 = toast.loading("Exluindo evidencia...", {position : "top-center"});

        api.post('v1/promotor/exluiratividadeevidencia',{
          id_visita: props.idvisita,
          id_atividade: props.atividade.id_atividade,
          id_evidencia: props.atividade.id_evidencia
        })
        .then((resposta) =>{

          toast.update(id1, {
              render: resposta.data.mensagem, 
              type: "success", 
              isLoading: false, 
              closeOnClick: true,                            
              autoClose: 1700,
              pauseOnHover: false,
              onclose : props.onRequestClose()
          }); 
          
           props.consultarAtividades();
        })
        .catch((err)=>{
          console.log(err);
          toast.update(id1, {
            render: err.response.data.error, 
            type:"error", 
            isLoading: false, 
            closeOnClick: true,                            
            autoClose: 1700,
            pauseOnHover: false,
            onclose : props.onRequestClose()
        }); 
      })
  }
  
  function proximoRegistroAtividade(){

    api.post('v1/proximoIdEvidencia',{
     id_visita: props.idvisita
    })
    .then((resposta) =>{
      setproximoIdEvidencia(resposta.data.proximoid);
    })
    .catch((err)=>{
       console.log(err);
    })
 }

  function limpaCampos(){
    
    setcodAtividade(0);
    setAtividade("");
    setRealizado("S");
    setComentario("");
    setCodVeterinario(0);
    setNomeVeterinario("");
    setContatoVeterinario("");

    sethouveVenda("N"); 
    setcpveterinario("N");
    setcpitem("N");
    setcpobservacao("N");
    setcpvenda("N");
    setcpfoto("N");
    setcpequipe("N");
  }

  function consultarDadosAtividade(){
    setproximoIdEvidencia(props.atividade.id_evidencia);
    setcodAtividade(props.atividade.id_atividade);
    setAtividade(props.atividade.descricao);
    setRealizado("S");
    setCodVeterinario(props.atividade.id_veterinario);
    setNomeVeterinario(props.atividade.nomeveterinario);
    setComentario(props.atividade.comentario);
    sethouveVenda(props.atividade.houvevenda);
    setcodEquipe(props.atividade.id_equipe);
    setEquipe(props.atividade.equipe);
    setqtdePessoa(props.atividade.qtpessoas);
    setfezquiz(props.atividade.fezquiz);
    setContatoVeterinario(props.atividade.telefone);
  }
  
   function processarCampos(){
    
    setcpveterinario("N");
    setcpitem("N");
    setcpobservacao("N");
    setcpvenda("N");
    setcpfoto("N");
    setcpequipe("N");

    camposFormulario.map((campo)=>{

      if (campo.id_campo == 3){
        setcpveterinario(campo.ativo);
      };  
      
      if (campo.id_campo == 5){
        setcpitem(campo.ativo);
      };
      
      if (campo.id_campo == 6){
        setcpobservacao(campo.ativo);
      }; 

      if (campo.id_campo == 7){
        setcpvenda(campo.ativo);
      }; 

      if (campo.id_campo == 8){
        setcpfoto(campo.ativo);
      };

      if (campo.id_campo == 9){
        setcpequipe(campo.ativo);
      };
      
    })
  }

  useEffect(()=>{

    processarCampos();
   

  },[camposFormulario]);

  useEffect(() =>{        
    consultarDadosAtividade();
  },[props.atividade]);

  useEffect(()=>{
    

    if (codAtividade > 0){
     consultaCampos();     
    }

  },[codAtividade]);

  function consultaCampos(){
    api.post('v1/camposformulario',{
      id_rotina: 3001,
      id_tela: codAtividade 
    })
    .then((resposta) =>{
      
      setcamposFormulario(resposta.data);           

    })
    .catch((err) =>{
      console.log(err);
    })
  }

  useEffect(()=>{

    if (props.atividade == 0){
      limpaCampos();   
      proximoRegistroAtividade();      
    }   

  },[props.atividade])

   


 useEffect(()=>{
   consultarAtividade();
   consultarEquipe();
 },[])


 function consultarAtividade(){
       api.post('/v1/getconsultarAtividadePromotorGeral', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
        .then((retorno) =>{                                    

            setatividades(retorno.data);              

        })
        .catch((err) =>{          
            setatividades([]);  
        });
 }


 function consultarEquipe(){
       api.post('/v1/consultarEquipeTreinamentoGeral', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
        .then((retorno) =>{                                    

            setequipes(retorno.data);  
        
        })
        .catch((err) =>{          
            setequipes([]);  
        });
 }

  function SalvarEvidencia(){

    if(!codAtividade){
      toast.error("Informe a atividade !", { position: "top-center" });
      return;
    }

    

    if (cpveterinario === "S") {
      if (!NomeVeterinario.trim()) {
        toast.error("Informe o nome do veterinário!", { position: "top-center" });
        return;
      }

      /* alterado solicitado pela equipe de promotores pois não querem pedi todas as vezes que visitar 
      o veterinario, isso e porque para trazer automatico deve ter um cadastro de veterinario
      
        if (!contatoVeterinario.trim()) {
        toast.error("Informe o telefone do veterinário!", { position: "top-center" });
        return;
      }*/
    }

    if (cpequipe === "S") {
      if (!codEquipe) {
        toast.error("Informe a equipe !", { position: "top-center" });
        return;
      }
      if (!qtdePessoa) {
        toast.error("Informe a quantidade de pessoas !", { position: "top-center" });
        return;
      }
    }



    if (uploadRef.current && !uploadRef.current.validarObrigatorio()) {
    toast.error("É obrigatório o envio da foto !");
    return;
    }

    if(!comentario){
      toast.error("Informe a observação !", { position: "top-center" });
      return;
    }
     
    const id1 = toast.loading("Enviando evidencia...", {position : "top-center"});

    const jsonDados = {
      id_visita: props.idvisita,
      id_atividade: codAtividade,
      veterinario: NomeVeterinario,
      telefone: contatoVeterinario,
      houvevenda: houveVenda,      
      realizado: realizado,
      comentario: comentario,
      id_equipe: codEquipe, 
      qtpessoas: qtdePessoa, 
      fezquiz: fezquiz,
      id_evidencia: props.atividade.id_evidencia
    }

    try {

      if (!props.atividade.id_evidencia) {
          api.post('v1/promotor/atividadeevidencia',jsonDados)
          .then((response)=>{
              toast.update(id1, {
                  render: response.data.mensagem, 
                  type: "success", 
                  isLoading: false, 
                  closeOnClick: true,                            
                  autoClose: 1700,
                  pauseOnHover: false,
                  onclose : props.onRequestClose()
              }); 

              // enviar arquivos
              uploadRef.current.handleUpload();

              props.consultarAtividades();
              
          })
          .catch((err)=>{
              console.log(err);
              toast.update(id1, {
                render: err.response.data.error, 
                type:"error", 
                isLoading: false, 
                closeOnClick: true,                            
                autoClose: 1700,
                pauseOnHover: false,
                onclose : props.onRequestClose()
            }); 
          }) 
      }else{
        api.post('v1/promotor/updateatividadeevidencia',jsonDados)
          .then((response)=>{
              toast.update(id1, {
                  render: response.data.mensagem, 
                  type: "success", 
                  isLoading: false, 
                  closeOnClick: true,                            
                  autoClose: 1700,
                  pauseOnHover: false,
                  onclose : props.onRequestClose()
              }); 

              // enviar arquivos
              uploadRef.current.handleUpload();

              props.consultarAtividades();
              
          })
          .catch((err)=>{
              console.log(err);
              toast.update(id1, {
                render: err.response.data.error, 
                type:"error", 
                isLoading: false, 
                closeOnClick: true,                            
                autoClose: 1700,
                pauseOnHover: false,
                onclose : props.onRequestClose()
            }); 
          }) 
      }                  

    } catch (error) {
       console.log(error)
    }


  };

  return (<>
    <Modal
      isOpen={props.isOpen}
      onRequestClose={props.onRequestClose}
      overlayClassName="react-modal-overlay"
      ariaHideApp={false}
      className="react-modal-content">

      <div className="bsmodal-content">

        <div className="bsmodal-header">
          <h3 className="modal-title">Evidências da Atividade</h3>
        </div>

        
        <div className="bsmodal-body">
          <div className="row">


          <h4 className="section-title mt-3">Atividade</h4>
          <div className="col-lg-12 mb-2 ">
            <label htmlFor="atividade" className="mb-2">
              Atividade <span className="text-danger">*</span>
            </label>
            <select value={codAtividade} id="atividade" className="form-control" onChange={(e) => setcodAtividade(e.target.value)}>
              <option key={0} value={0}>
                  Selecione uma atividade
              </option>
              {atividades.map((i) => (
                <option key={i.codigo} value={i.codigo}>
                  {i.descricao}
                </option>
              ))}
            </select>
          </div>
          

          {(cpveterinario == "S") ? (
          <>
          <h4 className="section-title mt-3">Veterinário</h4>
          <div className="col-md-10 mb-3">
            <label htmlFor="veterinario" className="mb-2">Nome do Veterinário <span className="text-danger">*</span></label>
            <input
              id="veterinario"
              type="text"
              className="form-control" 
              placeholder="Nome do Veterinario"             
              value={NomeVeterinario}
              onChange={(e) => setNomeVeterinario(e.target.value.toUpperCase())}
            />                                              
          </div>

          <div className="col-md-2 mb-3">
          <label htmlFor="contatoveterinario" className="mb-2">Telefone</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            className="form-control"
            id="contatoveterinario"
            placeholder="(00) 00000-0000"
            value={contatoVeterinario}
            onChange={(e) => {
              // remove tudo que não for número
              let numeros = e.target.value.replace(/\D/g, "");

              // limita a 11 dígitos (DDD + celular)
              if (numeros.length > 11) numeros = numeros.slice(0, 11);

              // aplica a formatação (XX) XXXXX-XXXX
              if (numeros.length > 2) {
                numeros = `(${numeros.slice(0,2)}) ${numeros.slice(2)}`;
              }
              if (numeros.length > 9) {
                numeros = `${numeros.slice(0,9)}-${numeros.slice(9)}`;
              }

              setContatoVeterinario(numeros);
            }}
          />
        </div>


          </>) : null
          }      

          {(cpequipe == "S") ? (
            <>
              <h4 className="section-title mt-3">Equipe Treinada</h4>
                <div className="col-lg-8">
                <label htmlFor="equipe" className="mb-2">
                  Equipe <span className="text-danger">*</span>
                </label>
                <select value={codEquipe} id="equipe" className="form-control" onChange={(e) => setcodEquipe(e.target.value)}>
                  <option key={0} value={0}>
                  Selecione uma equipe
                  </option>
                  {equipes.map((i) => (
                    <option key={i.codigo} value={i.codigo}>
                      {i.descricao}
                    </option>
                  ))}
                </select>
              </div>

                <div className="col-md-2 mb-3">
                <label htmlFor="Quantidade" className="mb-2">
                  Qt.Pessoas?<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-control"
                  id="Quantidade"
                  placeholder="Qtd"
                  value={qtdePessoa}
                  onChange={QuantidadePessoa}
                />
              </div>
              
              <div className="col-lg-2 mb-3">
                <label htmlFor="realizado" className="mb-2">Fez quiz? <span className="text-danger">*</span></label>
                <select value={fezquiz} id="realizado" className="form-control" onChange={(e) =>setfezquiz(e.target.value)}>
                  <option value={'N'}>Não</option>
                  <option value={'S'}>Sim</option>
                </select>
              </div>
            </>
          ): null}          
             

          {(cpitem == "S") ? (
            <>
            <TabItem 
            idvisita={props.idvisita}  
            idatividade={codAtividade}
            idevidencia={proximoIdEvidencia}        
            />
            </>
          ): null}


          {(cpvenda == "S") ? (
            <>
            <h4 className="section-title mt-3">Venda</h4>
            <div className="col-lg-2 mb-3">
              <label htmlFor="realizado" className="mb-2">Houve venda ? <span className="text-danger">*</span></label>
              <select value={houveVenda} id="realizado" className="form-control" onChange={(e) =>sethouveVenda(e.target.value)}>
                <option value={'N'}>Não</option>
                <option value={'S'}>Sim</option>
              </select>
            </div>
            </>
          ): null}
          

          {(cpfoto == "S") ? (
            <>
            <h4 className="section-title">Fotos</h4>
            
            <div className="col-md-12 mb-3">
              <label htmlFor="Quantidade" className="mb-3 ">
                Foto<span className="text-danger">*</span>
              </label>
              <UploadArquivos 
                ref={uploadRef} 
                idRotina={"3001.1"}
                idRelacional={props.idvisita+""+codAtividade+""+proximoIdEvidencia}
                acceptTypes="image/*"
                capture={true}  // ou nem passa a prop     
                required={true} 
              />    
            </div>
            </>
          ): null}

          
          {(cpobservacao == "S") ? (
            <>
              <h4 className="section-title mt-3">Observação</h4>
              <div className="col-md-12 mb-3">
                <label htmlFor="realizado" className="mb-2">Observação <span className="text-danger">*</span></label>
                <textarea
                  type="text"
                  className="form-control"
                  id="comentario"
                  rows="8"
                  placeholder="..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </div>
            </>
          ): null}                    
          
          
         </div>
        </div>

        <div className="bsmodal-footer">
          <div className="d-flex justify-content-between w-100">
            <button onClick={props.onRequestClose} type="button" className="btn btn-secondary px-4">
              Voltar
            </button>

            {props.atividade.id_evidencia > 0? (
            <>
             <button onClick={excluirEvidencia} type="button" className="btn btn-danger px-4">
              Exluir
            </button>   
            </> 
            ): null
            }          

            <button onClick={SalvarEvidencia} type="button" className="btn btn-primary px-4">
              Salvar
            </button>            

          </div>
        </div>
        
      </div>
      
    </Modal>
    <ToastContainer position="top-center" />
    </>
  );
}

export default ModalVisitaClienteAtividades;
