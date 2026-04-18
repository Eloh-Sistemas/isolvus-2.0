import "./ModalVisitaClienteJustificar.css";
import React, { useEffect, useState } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import api from "../../../../servidor/api";

function ModalVisitaClienteJustificar(props) {

   const [listaJustificativa, setlistaJustificativa] = useState([]);
   const [itemSelecionado, setitemSelecionado] = useState("");
   const [idjustificativa, setidjustificativa] = useState(0);


   function consultarJustificativas(){
        api.post('v1/promotor/listarjustificativa',{id_grupo_empresa: Number(localStorage.getItem('id_grupo_empresa'))})
        .then((retorno) =>{
           setlistaJustificativa(retorno.data);
        })
        .catch((err)=>{
            console.log(err)
        })
   }

   function selecionarJustificativa(justificativa) {

        setitemSelecionado(justificativa.idjustificativa+" - "+justificativa.justificativa);
        setidjustificativa(justificativa.idjustificativa);

   }

   function salvarJustificativa(){
        
        props.setidjustificativa(idjustificativa);    
        props.onRequestClose();    

   }

  useEffect(()=>{
    if (props.isOpen == true){
        consultarJustificativas();
        setitemSelecionado("");
        setidjustificativa(0);
    }
  },[props.isOpen])

  return (<>
    <Modal
      isOpen={props.isOpen}
      onRequestClose={props.onRequestClose}
      overlayClassName="react-modal-overlay"
      ariaHideApp={false}
      className="react-modal-content"
    >
      <div className="bsmodal-content">
        <div className="bsmodal-header">
          <h3 className="modal-title text-center">Justificar Localização / Visita {props.idvisita}</h3>
        </div>

        <div className="col-md-4 mb-3">
          <label>Justificativa Selecionada</label>
          <input type="text" className="form-control" value={itemSelecionado||"Selecione a justificativa desejada..."} disabled />
        </div>
    

        <div className="row">
        <div className="col-lg-12 mt-1">
          <table className="table table-hover">

            <tbody>
              {listaJustificativa.length > 0 ? (
                listaJustificativa.map((item) => (
                  <tr onClick={() => selecionarJustificativa(item)} key={item.idjustificativa}>
                    <td>
                      {item.idjustificativa} - {item.justificativa}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-center">
                    Nenhuma justificativa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
       

        <div className="bsmodal-footer">
          <div className="d-flex justify-content-between w-100">
            <button onClick={props.onRequestClose} type="button" className="btn btn-secondary px-4">
              Voltar
            </button>
            <button onClick={salvarJustificativa} type="button" className="btn btn-primary px-4">
              Justificar
            </button>
          </div>
        </div>
        
      </div>
      
    </Modal>
    <ToastContainer position="top-center" />
    </>
  );
}

export default ModalVisitaClienteJustificar;
