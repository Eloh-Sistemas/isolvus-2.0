import { useState, useEffect } from "react";
import Menu from "../../../componentes/Menu/Menu";
import Etapa1VisitaClienteDadosDoCliente from "./VisitaClienteEtapas/Etapa1VisitaClienteDadosDoCliente.jsx";
import Etapa2HistoricoDeVisita from "./VisitaClienteEtapas/Etapa2HistoricoDeVisita.jsx";
import Etapa3VisitaClienteCheckIn from "./VisitaClienteEtapas/Etapa3VisitaClienteCheckIn.jsx";
import Etapa4VisitaClienteAtividade from "./VisitaClienteEtapas/Etapa4VisitaClienteAtividade.jsx";
import Etapa5VisitaClienteCheckOut from "./VisitaClienteEtapas/Etapa5VisitaClienteCheckOut.jsx";
import { toast, ToastContainer } from "react-toastify";
import "./VisitaCliente.css"
import api from "../../../servidor/api.jsx";



function VisitaCliente() {

  const [step, setStep] = useState(1);      
  const [clienteSelecionado, SetClienteSelecionado] = useState({});
  const [dataCheckin, setDataCheckin] = useState();
  const [responsavel, setresponsavel] = useState("");
  const [localizacaopromotor, setLocalizacaopromotor] = useState();
  const [distancia, setDistancia] = useState();
  const [historicodeVisita, sethistoricodeVisita] = useState([]);
  const [idvisita, setIdVisita] = useState(0);
  const [qtatividade, setqtatividade] = useState(0);
  const [qtrealizada, setqtrealizada] = useState(0); 
  const [percentualAtividade, setpercentualAtividade] = useState(0);    
  const [dataCheckOut, setDataCheckOut] = useState();     
  const [localizacaoCheckout, setlocalizacaoCheckout] = useState();
  const [idjustificativa, setidjustificativa] = useState(0);
  

    

  function consultarHistorico(){


      const jsonDados = {
        id_grupo_empresa: localStorage.getItem('id_grupo_empresa'),
        id_cliente: clienteSelecionado.idclientevenda,
        idpromotor: localStorage.getItem('id_usuario_erp')
      }
      
      api.post('v1/promotor/listarHistoricoDeVisita', jsonDados)
      .then((response) =>{
          sethistoricodeVisita(response.data);
      })
      .catch((err)=>{
          console.log(err)
      })

  }

  function telaInicial(){

    SetClienteSelecionado({});
    setresponsavel("");    
    setStep(1);
    setidjustificativa(0);

  }
  

  function Checkin(){

    const jsonDadoCheckin = {
      idcliente: clienteSelecionado.idclientevenda,
      idpromotor: localStorage.getItem('id_usuario_erp'),
      idgrupo_empresa: localStorage.getItem('id_grupo_empresa'),
      dataCheckin,
      latitudepromotor: localizacaopromotor.lat,
      longitudepromotor: localizacaopromotor.lng,
      latitudecliente: clienteSelecionado.latitude,
      longitudecliente: clienteSelecionado.longitude,
      distancia,
      responsavel,
      id_justificativadistancia: idjustificativa
    };


    api.post('v1/promotor/checkin',jsonDadoCheckin)
    .then((response)=>{
      
        setIdVisita(response.data.idvisita);

        toast.success('Checkin realizado com sucesso !');  
        
        setStep(step + 1);

    })
    .catch((err)=>{

          toast.error('Erro ao realizar Checkin !'); 

          console.log(err);
        });
    }

  function checkOut(){   
      
    const id1 = toast.loading("Realizando Checkout");

      const jsonDados = {
        idvisita,      
        dataCheckOut,
        latidudeCheckOut: localizacaoCheckout.lat,
        longitudeCheckOut:localizacaoCheckout.lon        
      }

      api.post('v1/promotor/checkout',jsonDados)
      .then((resposta)=>{

        toast.update(id1, {
                    render: resposta.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onClose: () => telaInicial()} );

      })
      .catch((err)=>{
        toast.update(id1, {
          render: err.response.data.error, 
          type: "error", 
          isLoading: false,
          autoClose: 2000,
          pauseOnHover: false});
      })

  }


  function voltar(){    
    
    if (step == 3){
      setStep(step -1);
      setidjustificativa(0);
    }else if (step == 4){
      setStep(2);
    }else if(step == 2){
      telaInicial();
    }else{
      setStep(step - 1);      
    }

  }

 function proximo(){

  // Tela consultar cliente
  if (step == 1){
    
    if (!clienteSelecionado.idclientevenda){
      toast.warn('Usuario não informado');
    }else if (!responsavel){
      toast.warn('Responsavel pelo atendimento não informado');
    }else{      
      setStep(step + 1)      
    } 

  };

  // Tela checkin
  if (step == 2){    
    setStep(step + 1)  
  };

  //Tela Grava fotos
  if (step == 3){    
    Checkin();    
  };

  //Tela checkout
  if (step == 4){
    setStep(step + 1)      
  };
  
 }

  
  return (
    <> 
      <Menu />

      

      <div className="container-fluid Containe-Tela ">
          <div className="row text-body-secondary mb-2">
            <h1 className="mb-2 titulo-da-pagina">Visita ao Cliente</h1>
          </div>

          {/* Step Indicator */}
          <div className="progress mb-2" style={{ height: "60px" }}>
            <div 
              className="progress-bar d-flex align-items-center justify-content-center" 
              role="progressbar" 
              style={{ width: step === 1 ? "28%" : step === 2 ? "45%" : step === 3 ? "60%" : step === 4 ? "80%" : "100%" , backgroundColor: "#007bff" }}
            >
              {step === 1 && <><i className="bi bi-building me-2" style={{ fontSize: "24px" }}></i> Passo 1: Cliente</>}
              {step === 2 && <><i className="bi bi-check-circle me-2" style={{ fontSize: "25px" }}></i> Passo 2: Histórico de visita</>}
              {step === 3 && <><i className="bi bi-check-circle me-2" style={{ fontSize: "25px" }}></i> Passo 3: Check-In</>}
              {step === 4 && <><i className="bi bi-activity me-2" style={{ fontSize: "25px" }}></i> Passo 4: Atividades</>}
              {step === 5 && <><i className="bi bi-cart-check me-2" style={{ fontSize: "25px" }}></i> Passo 5: Check-Out</>}
            </div>
          </div>


          <div className="container-campos">


            {/* Etapa 1: Cliente */}
          {step === 1 && ( <div>
            <Etapa1VisitaClienteDadosDoCliente            
              OnSelecionaCliente={SetClienteSelecionado}
              setResponsavel={setresponsavel}
              responsavel={responsavel}             
            />         
            <ToastContainer position="top-center"/>   
          </div>)}
        

        
          {/* Etapa 2: CheckIn */}
          {step === 2 && (<div>
            <Etapa2HistoricoDeVisita 
              historicodeVisita={historicodeVisita}
              consultarHistorico={consultarHistorico}  
              setStep={setStep}    
              setIdVisita={setIdVisita}  
              setDataCheckin={setDataCheckin}                              
            />
          </div>)}



          {/* Etapa 2: CheckIn */}
          {step === 3 && (<div>
            <Etapa3VisitaClienteCheckIn 
              setidjustificativa={setidjustificativa}
              idjustificativa={idjustificativa}
              clienteSelecionado={clienteSelecionado}
              setDataCheckin={setDataCheckin}
              setLocalizacaopromotor={setLocalizacaopromotor}
              setDistancia={setDistancia}
            />
          </div>)}

          {/* Etapa 3: Atividades */}
          {step === 4 && (<div>
            <Etapa4VisitaClienteAtividade
            clienteSelecionado={clienteSelecionado}
            idvisita={idvisita}
            />

          </div>)}

          {/* Etapa 4: Checkout (Finalização) */}
          {step === 5 && (<div>
            <Etapa5VisitaClienteCheckOut
              dataCheckin={dataCheckin}
              idvisita={idvisita}
              setqtatividade={setqtatividade}
              setqtrealizada={setqtrealizada}
              setpercentualAtividade={setpercentualAtividade}       
              setDataCheckOut={setDataCheckOut}
              setlocalizacaoCheckout={setlocalizacaoCheckout}                        
            />          
              <ToastContainer position="top-center"/>    
          </div>)}   

          </div>
                        
        </div>
       
                
                
        <div className="d-flex justify-content-between p-2 conteiner-botoes ">
          {step > 1 && <button className="btn btn-secondary" onClick={() => voltar()}>Voltar</button>}          
          {step == 1 && <button className="btn btn-primary ms-auto" onClick={() => proximo()}>Consultar</button>}  
          {step == 2 && <button className="btn btn-primary ms-auto" onClick={() => proximo()}>Nova Visita</button>}          
          {(distancia > 3 && idjustificativa > 0 && step == 3) && <button className="btn btn-primary ms-auto" onClick={() => proximo()}>Fazer CheckIn</button>}     
          {(distancia <= 3 && step == 3) && <button className="btn btn-primary ms-auto" onClick={() => proximo()}>Fazer CheckIn</button>}     
          {step == 4 && <button className="btn btn-primary ms-auto" onClick={() => proximo()}>Finalizar</button>} 
          {step == 5 && <button className="btn btn-success" onClick={() => checkOut()}>Fazer CheckOut</button>}
        </div>        
      
    </>
    
    
  );
}

export default VisitaCliente;
