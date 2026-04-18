import { useEffect, useState } from "react";
import GridDesktopConsultaAPI from "../../../componentes/API/GridDesktoConsultaAPI";
import Menu from "../../../componentes/Menu/Menu";
import api from "../../../servidor/api";

function EndPointConsulta(){
    
    const [integracao, setIntegracao] = useState("");
    const [dados, setDados] = useState([]);

    function iniciarTela(){

        consultarIntegracoes();  
        
    }

    function consultarIntegracoes(){
        api.get('/v1/EndPoints/'+integracao)
        .then((retorno) => {                    
            setDados(retorno.data);    
        }).catch((err) =>{
            console.log(err)
        });
    }

    useEffect(()=>{
        iniciarTela();
    },[]);


    return <>
        <Menu />
        <div className="container-fluid Containe-Tela">
             
            <div className="row text-body-secondary mb-2">
                <h1 className="mb-4 titulo-da-pagina">API - EndPoint</h1>
            </div>

          <div className="row">

            <div className="col-lg-4">
                    <label htmlFor="EdtIntegracao" className="mb-2">Integração</label>                   
                    <input type="text" className="form-control" id="EdtIntegracao" onChange={(e) => setIntegracao(e.target.value) } value={integracao} placeholder="Consulte a integração"/> 
            </div>  

            <div className="col-lg-2">
                <button className="btn btn-primary me-2 btn-analisedespesa" onClick={consultarIntegracoes}>Consultar</button>    
            </div>           

          </div>
            
            <div>
                <GridDesktopConsultaAPI 
                    dados={dados}/>
            </div>
        
        </div>
    </>
}

export default EndPointConsulta;