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
   const [subPermissoesPorRotina, setSubPermissoesPorRotina] = useState({});
   const [rotinasExpandidas, setRotinasExpandidas] = useState({});
   const [loadingPermissoes, setLoadingPermissoes] = useState(false);
   const [abaAtiva, setAbaAtiva] = useState("rotinas");

   const criarSlug = (texto) =>
      texto
         .toString()
         .trim()
         .toLowerCase()
         .replace(/\s+/g, '-')
         .replace(/[^a-z0-9-]/g, '');

   const normalizarSubPermissoes = (rotina) => {
      const subPermissoes = rotina.subpermissoes || rotina.subPermissoes || [];

      if (!Array.isArray(subPermissoes)) {
         return [];
      }

      return subPermissoes
         .map((sub, indice) => {
            if (typeof sub === 'string') {
               const descricao = sub.trim();
               if (!descricao) {
                  return null;
               }

               return {
                  chave: `api-${rotina.id_rotina}-${criarSlug(descricao) || indice}`,
                  descricao,
                  permitir: false,
                  id_subpermissao: null,
               };
            }

            const descricao = (sub.descricao || sub.nome || sub.acao || '').toString().trim();
            if (!descricao) {
               return null;
            }

            const idSub = sub.id_subpermissao || sub.idSubPermissao || sub.id || null;

            return {
               chave: `api-${rotina.id_rotina}-${idSub || criarSlug(descricao) || indice}`,
               descricao,
               permitir: (sub.permitir || 'N') === 'S' || sub.permitir === true,
               id_subpermissao: idSub,
            };
         })
         .filter(Boolean);
   };

   function consultaPermissoes() {
      if (!props.idUsuario) {
         setPermissoes([]);
         setCheckedItems({});
         setSubPermissoesPorRotina({});
         setRotinasExpandidas({});
         return;
      }

      setLoadingPermissoes(true);

      api.post('/v1/consultarPermissoesDoUsuario', { matricula: props.idUsuario })
         .then((retorno) => {
            const permissoesData = retorno.data;

            const initialCheckedItems = {};
            const initialSubPermissoes = {};
            permissoesData.forEach((modulo) => {
               modulo.rotinas.forEach((rotina) => {
                  initialCheckedItems[`rotina-${rotina.id_rotina}`] = rotina.permitir === "S";
                  initialSubPermissoes[rotina.id_rotina] = normalizarSubPermissoes(rotina);
               });
            });

            setPermissoes(permissoesData);
            setCheckedItems(initialCheckedItems);
            setSubPermissoesPorRotina(initialSubPermissoes);
            setRotinasExpandidas({});
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
         setAbaAtiva("rotinas");
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
   const totalSubPermissoes = Object.values(subPermissoesPorRotina).reduce((total, lista) => total + lista.length, 0);

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

   const toggleExpandirRotina = (idRotina) => {
      setRotinasExpandidas((prev) => ({
         ...prev,
         [idRotina]: !prev[idRotina]
      }));
   };

   const atualizarSubPermissao = (idRotina, chave, permitir) => {
      setSubPermissoesPorRotina((prev) => ({
         ...prev,
         [idRotina]: (prev[idRotina] || []).map((item) =>
            item.chave === chave ? { ...item, permitir } : item
         )
      }));
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

      const subPermissoesSalvas = Object.entries(subPermissoesPorRotina).flatMap(([idRotina, lista]) =>
         lista.map((subPermissao) => ({
            id_usuario: props.idUsuario,
            id_rotina: Number(idRotina),
            id_subpermissao: subPermissao.id_subpermissao,
            descricao: subPermissao.descricao,
            permitir: subPermissao.permitir ? 'S' : 'N'
         }))
      );

      api.post('/v1/AlterarPermissoesDoUsuario', permissoesSalvas)
         .then(() => {
            if (subPermissoesSalvas.length === 0) {
               toast.success('Permissões salvas com sucesso!', {
                  onClose: () => {
                     props.onRequestClose();
                  }
               });
               return;
            }

            api.post('/v1/AlterarSubPermissoesDoUsuario', subPermissoesSalvas)
               .then(() => {
                  toast.success('Permissões e subpermissões salvas com sucesso!', {
                     onClose: () => {
                        props.onRequestClose();
                     }
                  });
               })
               .catch(() => {
                  toast.warn('As rotinas foram salvas, mas o endpoint de subpermissões ainda não está disponível.');
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
               <div className="perm-tabs" role="tablist" aria-label="Abas de permissões">
                  <button
                     type="button"
                     role="tab"
                     aria-selected={abaAtiva === "rotinas"}
                     className={`perm-tab-btn ${abaAtiva === "rotinas" ? "active" : ""}`}
                     onClick={() => setAbaAtiva("rotinas")}
                  >
                     Permissão de Módulos e Rotinas
                  </button>
                  <button
                     type="button"
                     role="tab"
                     aria-selected={abaAtiva === "dados"}
                     className={`perm-tab-btn ${abaAtiva === "dados" ? "active" : ""}`}
                     onClick={() => setAbaAtiva("dados")}
                  >
                     Permissão a Dados
                  </button>
               </div>

               {abaAtiva === "rotinas" ? (
                  <>
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
                           <span>Subpermissões: <strong>{totalSubPermissoes}</strong></span>
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
                              const moduloMarcado = totalModulo > 0 && totalModuloPermitidas === totalModulo;

                              return (
                                 <div key={modulo.id_modulo} className="perm-module-card">
                                    <div className="perm-module-header">
                                       <div>
                                          <h5 className="perm-module-title">{modulo.modulo}</h5>
                                          <small className="text-muted">{totalModuloPermitidas}/{totalModulo} permitidas</small>
                                       </div>
                                       <div className="perm-module-actions">
                                          <label htmlFor={`modulo-toggle-${modulo.id_modulo}`} className="perm-module-toggle">
                                             <span>Marcar todas as rotinas</span>
                                             <input
                                                id={`modulo-toggle-${modulo.id_modulo}`}
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={moduloMarcado}
                                                onChange={(event) => marcarModulo(modulo, event.target.checked)}
                                             />
                                          </label>
                                       </div>
                                    </div>

                                    <div className="perm-module-list">
                                       {modulo.rotinasFiltradas.map((rotina) => {
                                          const listaSubPermissoes = subPermissoesPorRotina[rotina.id_rotina] || [];
                                          const rotinaMarcada = checkedItems[`rotina-${rotina.id_rotina}`] || false;
                                          const rotinaExpandida = rotinasExpandidas[rotina.id_rotina] || false;

                                          return (
                                             <div key={rotina.id_rotina} className="perm-rotina-item">
                                                <div className="perm-rotina-row">
                                                   <label htmlFor={`rotina-${rotina.id_rotina}`} className="perm-rotina-main-label">
                                                      <span className="perm-rotina-text">{`${rotina.id_rotina} - ${rotina.rotina}`}</span>
                                                   </label>

                                                   <div className="perm-rotina-actions">
                                                      <button
                                                         type="button"
                                                         className="btn btn-sm btn-outline-secondary"
                                                         onClick={() => toggleExpandirRotina(rotina.id_rotina)}
                                                      >
                                                         {rotinaExpandida ? 'Ocultar subpermissões' : 'Subpermissões'}
                                                      </button>
                                                      <input
                                                         className="form-check-input"
                                                         type="checkbox"
                                                         value={`${rotina.id_rotina} - ${rotina.rotina}`}
                                                         id={`rotina-${rotina.id_rotina}`}
                                                         checked={rotinaMarcada}
                                                         onChange={handleCheckboxChange}
                                                      />
                                                   </div>
                                                </div>

                                                {rotinaExpandida && (
                                                   <div className="perm-sub-card">
                                                      <div className="perm-sub-header">
                                                         <h6 className="perm-sub-title">Subpermissões da rotina</h6>
                                                         <small className="text-muted">{listaSubPermissoes.length} disponível(is)</small>
                                                      </div>

                                                      {!rotinaMarcada && (
                                                         <small className="text-muted d-block mb-2">Marque a rotina para habilitar a seleção das subpermissões.</small>
                                                      )}

                                                      {listaSubPermissoes.length === 0 ? (
                                                         <div className="perm-sub-empty">Nenhuma subpermissão disponível para esta rotina.</div>
                                                      ) : (
                                                         <div className="perm-sub-list">
                                                            {listaSubPermissoes.map((subPermissao) => (
                                                               <div key={subPermissao.chave} className="perm-sub-row">
                                                                  <label htmlFor={`sub-${subPermissao.chave}`} className="perm-sub-label">
                                                                     <span>{subPermissao.descricao}</span>
                                                                  </label>
                                                                  <div className="perm-sub-actions">
                                                                     <input
                                                                        id={`sub-${subPermissao.chave}`}
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        checked={subPermissao.permitir}
                                                                        onChange={(event) =>
                                                                           atualizarSubPermissao(rotina.id_rotina, subPermissao.chave, event.target.checked)
                                                                        }
                                                                        disabled={!rotinaMarcada}
                                                                     />
                                                                  </div>
                                                               </div>
                                                            ))}
                                                         </div>
                                                      )}
                                                   </div>
                                                )}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </>
               ) : (
                  <>
                     <p className="perm-section-title">Permissão a Dados</p>
                     <div className="perm-card perm-empty-data-tab">
                        <h6 className="mb-2">Em breve</h6>
                        <p className="text-muted mb-0">Esta aba está preparada para receber as regras de acesso a dados (escopo por empresa, filial, centro de custo e demais restrições).</p>
                     </div>
                  </>
               )}
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
