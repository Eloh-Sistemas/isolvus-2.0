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
   const [loadingPermissoes, setLoadingPermissoes] = useState(false);

   function consultaPermissoes() {
      if (!props.idUsuario) {
         setPermissoes([]);
         setCheckedItems({});
         return;
      }

      setLoadingPermissoes(true);

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
            toast.error('Erro ao consultar permissões');
         })
         .finally(() => {
            setLoadingPermissoes(false);
         });
   }

   useEffect(() => {
      if (props.isOpen) {
         consultaPermissoes();
         setFiltro("");
      }
   }, [props.isOpen, props.idUsuario]);

   const filtrarRotinas = (rotinas) => {
      return rotinas.filter((rotina) =>
         rotina.rotina.toLowerCase().includes(filtro.toLowerCase()) ||
         rotina.id_rotina.toString().includes(filtro)
      );
   };

   const modulosFiltrados = permissoes
      .map((modulo) => ({
         ...modulo,
         rotinasFiltradas: filtrarRotinas(modulo.rotinas)
      }))
      .filter((modulo) => modulo.rotinasFiltradas.length > 0);

   const totalRotinas = permissoes.reduce((total, modulo) => total + modulo.rotinas.length, 0);
   const totalPermitidas = Object.values(checkedItems).filter(Boolean).length;
   const totalVisiveis = modulosFiltrados.reduce((total, modulo) => total + modulo.rotinasFiltradas.length, 0);

   const handleCheckboxChange = (event) => {
      const { id, checked } = event.target;
      setCheckedItems((prev) => ({
         ...prev,
         [id]: checked
      }));
   };

   const marcarModulo = (modulo, permitir) => {
      setCheckedItems((prev) => {
         const next = { ...prev };
         modulo.rotinasFiltradas.forEach((rotina) => {
            next[`rotina-${rotina.id_rotina}`] = permitir;
         });
         return next;
      });
   };

   const marcarTodasFiltradas = (permitir) => {
      setCheckedItems((prev) => {
         const next = { ...prev };
         modulosFiltrados.forEach((modulo) => {
            modulo.rotinasFiltradas.forEach((rotina) => {
               next[`rotina-${rotina.id_rotina}`] = permitir;
            });
         });
         return next;
      });
   };

   const salvarPermissoes = () => {
      if (!props.idUsuario) {
         toast.warn('Selecione um usuário para alterar permissões.', { position: 'top-center' });
         return;
      }

      const permissoesSalvas = permissoes.flatMap((modulo) =>
         modulo.rotinas.map((rotina) => ({
            id_usuario: props.idUsuario,
            id_rotina: rotina.id_rotina,
            permitir: checkedItems[`rotina-${rotina.id_rotina}`] ? "S" : "N",
         }))
      );

      api.post('/v1/AlterarPermissoesDoUsuario', permissoesSalvas)
         .then(() => {
            toast.success('Permissões salvas com sucesso!', {
               onClose: () => {
                  props.onRequestClose();
               }
            });
         })
         .catch(() => {
            toast.error('Erro ao salvar permissões. Tente novamente.');
         });
   };


   return (
      <>
         <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="perm-modal-overlay"
            ariaHideApp={false}
            className="perm-modal-content"
         >
            <div className="perm-modal-header">
               <div>
                  <h4 className="perm-modal-title">Permissões de Rotina</h4>
                  <p className="text-muted mb-0">Gerencie as rotinas permitidas para o usuário selecionado.</p>
               </div>
               <button className="btn btn-outline-secondary" onClick={props.onRequestClose}>Fechar</button>
            </div>

            <div className="perm-modal-body">
               <p className="perm-section-title">Filtros</p>
               <div className="perm-card">
                  <div className="row g-3 align-items-end">
                     <div className="col-md-8">
                        <label htmlFor="filtro-rotina" className="form-label">Pesquisar rotina</label>
                        <input
                           id="filtro-rotina"
                           type="text"
                           className="form-control"
                           placeholder="Filtre por código ou nome da rotina"
                           value={filtro}
                           onChange={(e) => setFiltro(e.target.value)}
                        />
                        <small className="text-muted">Use este filtro para localizar rotinas específicas.</small>
                     </div>
                     <div className="col-md-4">
                        <div className="perm-actions-grid">
                           <button type="button" className="btn btn-outline-secondary" onClick={() => marcarTodasFiltradas(true)}>
                              Marcar filtradas
                           </button>
                           <button type="button" className="btn btn-outline-secondary" onClick={() => marcarTodasFiltradas(false)}>
                              Desmarcar filtradas
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="perm-summary">
                     <span>Módulos: <strong>{permissoes.length}</strong></span>
                     <span>Rotinas: <strong>{totalRotinas}</strong></span>
                     <span>Visíveis: <strong>{totalVisiveis}</strong></span>
                     <span>Permitidas: <strong>{totalPermitidas}</strong></span>
                  </div>
               </div>

               <p className="perm-section-title">Permissões por Módulo</p>
               <div className="perm-card perm-permissions-area">
                  {loadingPermissoes ? (
                     <div className="perm-empty-state">Carregando permissões...</div>
                  ) : modulosFiltrados.length === 0 ? (
                     <div className="perm-empty-state">Nenhuma rotina encontrada para o filtro informado.</div>
                  ) : (
                     modulosFiltrados.map((modulo) => {
                        const totalModulo = modulo.rotinasFiltradas.length;
                        const totalModuloPermitidas = modulo.rotinasFiltradas.filter(
                           (rotina) => checkedItems[`rotina-${rotina.id_rotina}`]
                        ).length;

                        return (
                           <div key={modulo.id_modulo} className="perm-module-card">
                              <div className="perm-module-header">
                                 <div>
                                    <h5 className="perm-module-title">{modulo.modulo}</h5>
                                    <small className="text-muted">{totalModuloPermitidas}/{totalModulo} permitidas</small>
                                 </div>
                                 <div className="perm-module-actions">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => marcarModulo(modulo, true)}>
                                       Marcar
                                    </button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => marcarModulo(modulo, false)}>
                                       Desmarcar
                                    </button>
                                 </div>
                              </div>

                              <div className="perm-module-list">
                                 {modulo.rotinasFiltradas.map((rotina) => (
                                    <label key={rotina.id_rotina} htmlFor={`rotina-${rotina.id_rotina}`} className="perm-rotina-row">
                                       <span className="perm-rotina-text">{`${rotina.id_rotina} - ${rotina.rotina}`}</span>
                                       <input
                                          className="form-check-input"
                                          type="checkbox"
                                          value={`${rotina.id_rotina} - ${rotina.rotina}`}
                                          id={`rotina-${rotina.id_rotina}`}
                                          checked={checkedItems[`rotina-${rotina.id_rotina}`] || false}
                                          onChange={handleCheckboxChange}
                                       />
                                    </label>
                                 ))}
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
            </div>

            <div className="perm-modal-footer">
               <div className="perm-modal-footer-start">
                  <small className="text-muted mb-0">As permissões marcadas serão aplicadas ao usuário selecionado.</small>
               </div>
               <div className="perm-modal-footer-actions">
                  <button type="button" className="btn btn-primary perm-footer-btn" onClick={salvarPermissoes}>
                     Salvar permissões
                  </button>
                  </div>
               </div>
         </Modal>

         <ToastContainer position="top-center" autoClose={2000} />
      </>
   );
}

export default ModalPermissaoUsuario;
