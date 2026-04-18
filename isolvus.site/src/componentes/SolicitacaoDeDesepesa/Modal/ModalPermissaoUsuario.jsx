import Modal from "react-modal/lib/components/Modal";
import api from "../../../servidor/api";
import { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ModalPermissaoUsuario.css';

function ModalPermissaoUsuario(props) {
   const [permissoes, setPermissoes] = useState([]);
   const [filtro, setFiltro] = useState("");
   const [checkedItems, setCheckedItems] = useState({});

   function consultaPermissoes() {

      // Simulando uma requisição
      api.post('/v1/consultarPermissoesDoUsuario', { matricula: props.idUsuario })
        .then((retorno) => {
          const permissoesData = retorno.data;
  
          const initialCheckedItems = {};
          permissoesData.forEach((modulo) => {
            modulo.rotinas.forEach((rotina) => {
              initialCheckedItems[`rotina-${rotina.id_rotina}`] = rotina.permitir === "S";
            });
          });
  
          setPermissoes(permissoesData);
          setCheckedItems(initialCheckedItems);
           
        })
        .catch((err) => {
          console.error(err);
  
          // Atualiza o toast de carregamento com a mensagem de erro
          toast.error('Erro ao consultar permições');
        });
    }
    

   useEffect(() => {
      if (props.isOpen) {
         consultaPermissoes();
      }
   }, [props.isOpen]);

   const filtrarRotinas = (rotinas) => {
      return rotinas.filter((rotina) =>
         rotina.rotina.toLowerCase().includes(filtro.toLowerCase()) ||
         rotina.id_rotina.toString().includes(filtro)
      );
   };

   const handleCheckboxChange = (event) => {
      const { id, checked } = event.target;
      setCheckedItems((prev) => ({
         ...prev,
         [id]: checked
      }));
   };

   const salvarPermissoes = () => {
   const permissoesSalvas = permissoes.flatMap((modulo) =>
      modulo.rotinas.map((rotina) => ({
         id_usuario: props.idUsuario,  // Usando o id_usuario passado
         id_rotina: rotina.id_rotina,
         permitir: checkedItems[`rotina-${rotina.id_rotina}`] ? "S" : "N",  // Verifica se está marcado
      }))
   );



   api.post('/v1/AlterarPermissoesDoUsuario', permissoesSalvas)
      .then((response) => {         
         toast.success("Permissões salvas com sucesso !",{onClose: () => {props.onRequestClose()}         
      });         
      })
      .catch((err) => {         
         toast.error("Erro ao salvar permissões. Tente novamente.");
      });
};


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
                  <h3 className="modal-title">Permissões</h3>
               </div>

               <div className="bsmodal-body">
                  <div className="mb-3">
                     <input
                        type="text"
                        className="form-control"
                        placeholder="Pesquisar rotina"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                     />
                  </div>

                  <div className="m-4">
                     {permissoes.map((modulo) => (
                        <div key={modulo.id_modulo} className="modulo-section">
                           <h5 className="modulo-title">{modulo.modulo}</h5>
                           {filtrarRotinas(modulo.rotinas).map((rotina) => (
                              <div key={rotina.id_rotina} className="form-check">
                                 <input
                                    className="form-check-input"
                                    type="checkbox"
                                    value={`${rotina.id_rotina} - ${rotina.rotina}`}
                                    id={`rotina-${rotina.id_rotina}`}
                                    checked={checkedItems[`rotina-${rotina.id_rotina}`] || false}
                                    onChange={handleCheckboxChange}
                                 />
                                 <label
                                    className="form-check-label"
                                    htmlFor={`rotina-${rotina.id_rotina}`}
                                 >
                                    {`${rotina.id_rotina} - ${rotina.rotina}`}
                                 </label>
                              </div>
                           ))}
                        </div>
                     ))}
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
                        onClick={salvarPermissoes}
                     >
                        Salvar
                     </button>
                  </div>
               </div>
            </div>
         </Modal>

         {/* ToastContainer para exibir as mensagens */}
         <ToastContainer position="top-center" autoClose="1000"/>
      </>
   );
}

export default ModalPermissaoUsuario;
