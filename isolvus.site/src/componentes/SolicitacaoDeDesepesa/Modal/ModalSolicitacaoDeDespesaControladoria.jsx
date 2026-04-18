import Modal from "react-modal/lib/components/Modal";
import EditComplete from '../../EditComplete/EditComplete';
import "./ModalSolicitacaoDeDespesaControladoria.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function ModalSolicitacaoDeDespesaControladoria(props){

    const {id_solicitacao} = useParams(); 
    const [codconta, setCondConta] = useState(0);
    const [descricaoConta, SetDescricaoConta] = useState("");
    const [codCentroDeCusto, setCentroDeCusto] = useState(0);
    const [descricaoCentroDeCusto, SetDescricaoCentroDeCusto] = useState("");    

    return <Modal isOpen={props.isOpen}
    onRequestClose={props.onRequestClose}
    overlayClassName="react-modal-overlay"
    className="react-modal-content"  >


  <div className="bsmodal-content">
      
      <div className="bsmodal-header">
          <label>Direcionar Despesa</label>                        
      </div>

      
      <div className="bsmodal-body">                        


              <div className="row">       
                    <div className="col-12 mb-3">     
                        <label htmlFor="ct" className="mb-3">Conta Gerencial</label>                                     
                        <EditComplete   autoFocus placeholder={"Informe a Conta Gerencial"} id={"cg"} 
                                        onClickCodigo={setCondConta} 
                                        onClickDescricao={SetDescricaoConta}
                                        value={descricaoConta}/>
                    </div> 
                    <div className="col-12 mb-3">     
                        <label htmlFor="cc" className="mb-3">Centro de Custo</label>                                     
                        <EditComplete   autoFocus placeholder={"Informe o Centro de Custo"} id={"cc"} 
                                        onClickCodigo={setCentroDeCusto} 
                                        onClickDescricao={SetDescricaoCentroDeCusto}
                                        value={descricaoCentroDeCusto}/>
                    </div> 
              </div>             

      </div>

                        
      <div className="bsmodal-footer">
          
          <p className="d-flex w-100 mb-1 justify-content-between">                                
                  <button type="button" className="btn btn-secondary px-4" onClick={props.onRequestClose}><i className="bi bi-arrow-left"></i> Voltar</button>                       
                  <button type="button" className="btn btn-primary px-4" ><i className="bi bi-send"></i> Enviar</button>                                       
          </p>                      

      </div>

  </div>
</Modal>
}

export default ModalSolicitacaoDeDespesaControladoria;