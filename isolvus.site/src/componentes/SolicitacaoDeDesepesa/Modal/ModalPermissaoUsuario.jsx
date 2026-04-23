import Modal from "react-modal/lib/components/Modal";
import api from "../../../servidor/api";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ModalPermissaoUsuario.css';

function ModalPermissaoUsuario(props) {
   const [permissoes, setPermissoes] = useState([]);
   const [filtro, setFiltro] = useState("");
   const [checkedItems, setCheckedItems] = useState({});
   const [subPermissoesPorRotina, setSubPermissoesPorRotina] = useState({});
   const [modulosExpandidos, setModulosExpandidos] = useState({});
   const [rotinasExpandidas, setRotinasExpandidas] = useState({});
   const [loadingPermissoes, setLoadingPermissoes] = useState(false);
   const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);
   const [abaAtiva, setAbaAtiva] = useState("rotinas");
   const estadoInicialRotinasRef = useRef({});
   const estadoInicialSubPermissoesRef = useRef({});

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
         setModulosExpandidos({});
         setRotinasExpandidas({});
         estadoInicialRotinasRef.current = {};
         estadoInicialSubPermissoesRef.current = {};
         return;
      }

      setLoadingPermissoes(true);

      api.post('/v1/consultarPermissoesDoUsuario', { matricula: props.idUsuario })
         .then((retorno) => {
            const permissoesData = retorno.data;

            const initialCheckedItems = {};
            const initialSubPermissoes = {};
            const initialSubPermissoesMap = {};
            permissoesData.forEach((modulo) => {
               modulo.rotinas.forEach((rotina) => {
                  initialCheckedItems[`rotina-${rotina.id_rotina}`] = rotina.permitir === "S";
                  const subPermissoesNormalizadas = normalizarSubPermissoes(rotina);
                  initialSubPermissoes[rotina.id_rotina] = subPermissoesNormalizadas;

                  const mapaSubPermissoes = {};
                  subPermissoesNormalizadas.forEach((subPermissao) => {
                     if (subPermissao.id_subpermissao) {
                        mapaSubPermissoes[subPermissao.id_subpermissao] = subPermissao.permitir ? 'S' : 'N';
                     }
                  });
                  initialSubPermissoesMap[rotina.id_rotina] = mapaSubPermissoes;
               });
            });

            setPermissoes(permissoesData);
            setCheckedItems(initialCheckedItems);
            setSubPermissoesPorRotina(initialSubPermissoes);
            setModulosExpandidos({});
            setRotinasExpandidas({});
            estadoInicialRotinasRef.current = initialCheckedItems;
            estadoInicialSubPermissoesRef.current = initialSubPermissoesMap;
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

   useEffect(() => {
      const filtroLimpo = filtro.trim();
      if (!filtroLimpo) {
         setModulosExpandidos({});
         setRotinasExpandidas({});
         return;
      }

      const modulosParaExpandir = {};
      const rotinasParaExpandir = {};

      permissoes.forEach((modulo) => {
         const rotinasFiltradas = filtrarRotinas(modulo.rotinas);
         if (rotinasFiltradas.length > 0) {
            modulosParaExpandir[modulo.id_modulo] = true;
            rotinasFiltradas.forEach((rotina) => {
               rotinasParaExpandir[rotina.id_rotina] = true;
            });
         }
      });

      setModulosExpandidos(modulosParaExpandir);
      setRotinasExpandidas(rotinasParaExpandir);
   }, [filtro, permissoes]);

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

   const toggleExpandirModulo = (idModulo) => {
      setModulosExpandidos((prev) => ({
         ...prev,
         [idModulo]: !prev[idModulo]
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

   const salvarPermissoes = async () => {
      if (!props.idUsuario) {
         Swal.fire({
            icon: 'warning',
            title: 'Usuário não selecionado',
            text: 'Selecione um usuário para alterar permissões.'
         });
         return;
      }

      if (salvandoPermissoes) {
         return;
      }

      const permissoesAlteradas = permissoes.flatMap((modulo) =>
         modulo.rotinas.map((rotina) => ({
            chave: `rotina-${rotina.id_rotina}`,
            id_usuario: props.idUsuario,
            id_rotina: rotina.id_rotina,
            permitir: checkedItems[`rotina-${rotina.id_rotina}`] ? "S" : "N",
         }))
      ).filter((permissao) => {
         const valorInicial = estadoInicialRotinasRef.current[permissao.chave] ? 'S' : 'N';
         return valorInicial !== permissao.permitir;
      }).map(({ chave, ...permissao }) => permissao);

      const subPermissoesAlteradas = Object.entries(subPermissoesPorRotina).flatMap(([idRotina, lista]) =>
         lista
            .filter((subPermissao) => Boolean(subPermissao.id_subpermissao))
            .map((subPermissao) => {
               const mapaInicial = estadoInicialSubPermissoesRef.current[idRotina] || {};
               const valorInicial = mapaInicial[subPermissao.id_subpermissao] || 'N';
               const valorAtual = subPermissao.permitir ? 'S' : 'N';

               if (valorInicial === valorAtual) {
                  return null;
               }

               return {
                  id_usuario: props.idUsuario,
                  id_rotina: Number(idRotina),
                  id_subpermissao: subPermissao.id_subpermissao,
                  descricao: subPermissao.descricao,
                  permitir: valorAtual
               };
            })
            .filter(Boolean)
      );

      if (permissoesAlteradas.length === 0 && subPermissoesAlteradas.length === 0) {
         Swal.fire({
            icon: 'info',
            title: 'Sem alterações',
            text: 'Nenhuma permissão foi alterada.'
         });
         return;
      }

      setSalvandoPermissoes(true);
      Swal.fire({
         title: 'Salvando permissões',
         text: 'Aguarde a finalização do processamento.',
         allowEscapeKey: false,
         allowOutsideClick: false,
         showConfirmButton: false,
         didOpen: () => {
            Swal.showLoading();
         }
      });

      try {
         const requisicoes = [];

         if (permissoesAlteradas.length > 0) {
            requisicoes.push(api.post('/v1/AlterarPermissoesDoUsuario', permissoesAlteradas));
         }

         if (subPermissoesAlteradas.length > 0) {
            requisicoes.push(api.post('/v1/AlterarSubPermissoesDoUsuario', subPermissoesAlteradas));
         }

         await Promise.all(requisicoes);

         Swal.close();
         await Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: 'Permissões salvas com sucesso!'
         });

         setSalvandoPermissoes(false);
         props.onRequestClose();
      } catch (error) {
         Swal.close();
         await Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar',
            text: 'Erro ao salvar permissões. Tente novamente.'
         });
         setSalvandoPermissoes(false);
      }
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
               <button className="btn btn-outline-secondary" onClick={props.onRequestClose} disabled={salvandoPermissoes}>Fechar</button>
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
                     Permissão a Rotinas
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
                  <button
                     type="button"
                     role="tab"
                     aria-selected={abaAtiva === "replica"}
                     className={`perm-tab-btn ${abaAtiva === "replica" ? "active" : ""}`}
                     onClick={() => setAbaAtiva("replica")}
                  >
                     Replicar Permissões
                  </button>
                  <button
                     type="button"
                     role="tab"
                     aria-selected={abaAtiva === "perfis"}
                     className={`perm-tab-btn ${abaAtiva === "perfis" ? "active" : ""}`}
                     onClick={() => setAbaAtiva("perfis")}
                  >
                     Cadastro de Perfis
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
                              const moduloExpandido = modulosExpandidos[modulo.id_modulo] || false;

                              return (
                                 <div key={modulo.id_modulo} className="perm-module-card">
                                    <div className="perm-module-header" onClick={() => toggleExpandirModulo(modulo.id_modulo)}>
                                       <div>
                                          <span className="perm-level-tag perm-level-module">MODULO</span>
                                          <span className={`perm-tree-toggle ${moduloExpandido ? 'expanded' : ''}`}></span>
                                          <h5 className="perm-module-title">{modulo.modulo}</h5>
                                          <small className="text-muted">{totalModuloPermitidas}/{totalModulo} permitidas</small>
                                       </div>
                                       <div className="perm-module-actions" onClick={(event) => event.stopPropagation()}>
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

                                    {moduloExpandido && (
                                       <div className="perm-module-list">
                                          {modulo.rotinasFiltradas.map((rotina) => {
                                          const listaSubPermissoes = subPermissoesPorRotina[rotina.id_rotina] || [];
                                          const rotinaMarcada = checkedItems[`rotina-${rotina.id_rotina}`] || false;
                                          const rotinaExpandida = rotinasExpandidas[rotina.id_rotina] || false;

                                          return (
                                             <div key={rotina.id_rotina} className="perm-rotina-item">
                                                <div className="perm-rotina-row" onClick={() => toggleExpandirRotina(rotina.id_rotina)}>
                                                   <div className="perm-rotina-main-label">
                                                      <span className="perm-level-tag perm-level-rotina">ROTINAS</span>
                                                      <span className={`perm-tree-toggle ${rotinaExpandida ? 'expanded' : ''}`}></span>
                                                      <span className="perm-rotina-text">{`${rotina.id_rotina} - ${rotina.rotina}`}</span>
                                                   </div>

                                                   <div className="perm-rotina-actions" onClick={(event) => event.stopPropagation()}>
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
                                                         <span className="perm-level-tag perm-level-sub">PERMISSÕES</span>
                                                         <h6 className="perm-sub-title">Permissões</h6>
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
                                                                     <span className="perm-sub-dot"></span>
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
                                    )}
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </>
               ) : abaAtiva === "dados" ? (
                  <>
                     <p className="perm-section-title">Permissão a Dados</p>
                     <div className="perm-card perm-empty-data-tab">
                        <h6 className="mb-2">Em breve</h6>
                        <p className="text-muted mb-0">Esta aba está preparada para receber as regras de acesso a dados (escopo por empresa, filial, centro de custo e demais restrições).</p>
                     </div>
                  </>
               ) : abaAtiva === "replica" ? (
                  <>
                     <p className="perm-section-title">Replicar Permissões</p>
                     <div className="perm-card perm-empty-data-tab">
                        <h6 className="mb-2">Em breve</h6>
                        <p className="text-muted mb-0">Esta aba será usada para selecionar um usuário/perfil de origem e replicar as permissões para outro usuário/perfil de destino.</p>
                     </div>
                  </>
               ) : (
                  <>
                     <p className="perm-section-title">Cadastro de Perfis</p>
                     <div className="perm-card perm-empty-data-tab">
                        <h6 className="mb-2">Em breve</h6>
                        <p className="text-muted mb-0">Esta aba será usada para cadastrar perfis de permissão reutilizáveis e aplicar esses perfis aos usuários do sistema.</p>
                     </div>
                  </>
               )}
            </div>

            <div className="perm-modal-footer">
               <div className="perm-modal-footer-start">
                  <small className="text-muted mb-0">As permissões marcadas serão aplicadas ao usuário selecionado.</small>
               </div>
               <div className="perm-modal-footer-actions">
                  <button type="button" className="btn btn-primary perm-footer-btn" onClick={salvarPermissoes} disabled={salvandoPermissoes}>
                     {salvandoPermissoes ? 'Processando...' : 'Salvar permissões'}
                  </button>
                  </div>
               </div>
         </Modal>

         <ToastContainer position="top-center" autoClose={2000} />
      </>
   );
}

export default ModalPermissaoUsuario;
