import React, { useEffect, useState  } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../../servidor/api';
import moment from 'moment';
import './ModalCadastroDeUsuario.css';
import './ModalCadastroDeItem.css';


function ModalCadastroDeItem(props){

    const [codigo, SetCodigo] = useState(0);
    const [descricao, SetDescricao] = useState("");
    const [descricao2, SetDescricao2] = useState("");
    const [usuarioUltimaAlteracao, SetUsuarioUltimaAlteracao] = useState("");
    const [dataUltimaAlteradcao, SetDataUltimaAlteradcao] = useState("");    
    const [tipoitem, SetTipoItem] = useState("DP");

    function consultarDetalheItem(){

        SetCodigo(0);
        SetDescricao("");
        SetDescricao2("");
        SetDataUltimaAlteradcao("");
        SetUsuarioUltimaAlteracao("");

        var JsonPost = { 
            "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
            "id_item": props.idItemSelecionado
        }

        api.post('/v1/consultarItemCadastro',JsonPost)
        .then((retorno) =>{
                        
            if (retorno.data.length > 0 && retorno.data[0].id_item != 0) {

                SetCodigo(retorno.data[0].id_item);
                SetDescricao(retorno.data[0].descricao);
                SetDescricao2(retorno.data[0].descricao2);
                SetDataUltimaAlteradcao(moment.utc(retorno.data[0].dtcadastro).format("DD/MM/YYYY HH:mm:ss"));
                SetUsuarioUltimaAlteracao(retorno.data[0].id_usercadastro+' - '+retorno.data[0].nome);
                SetTipoItem(retorno.data[0].tipodeitem);

            }else{
                SetCodigo(0);
                SetDescricao("");
                SetDescricao2("");
                SetDataUltimaAlteradcao(moment().format("DD/MM/YYYY HH:mm:ss"));
                SetUsuarioUltimaAlteracao(localStorage.getItem("id_usuario_erp")+" - "+localStorage.getItem("nome"))
            }
            

        })
        .catch((err) =>{
            console.log(err)
        })

    }

    function salvarDados(){    
        if (codigo > 0) {

            const id = toast.loading("Alterando Item...")                      

              var JsonPost =
              { "id_item": codigo,
                "descricao": descricao,
                "descricao2": descricao2,
                "id_usuario": localStorage.getItem("id_usuario_erp"),
                "tipodeitem": tipoitem
              }
            
              api.post('/v1/alterarItem',JsonPost)
            .then((retorno) =>{

                toast.update(id, {
                    render: retorno.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 2000,
                    onClose: props.onRequestClose}); 

            })
            .catch((err) =>{

                toast.update(id, {
                    render: err.response.data.erro,
                    type: "error",
                    isLoading: false,
                    autoClose: 2000,
                  });

            });
              
            

        }else{
            
            const id = toast.loading("Cadastrando Item...")

            var JsonPost = {
                "id_grupo_empresa": localStorage.getItem("id_grupo_empresa"),
                "descricao": descricao,
                "descricao2": descricao2,
                "id_usuario": localStorage.getItem("id_usuario_erp"),
                "tipodeitem": tipoitem
            }

            api.post('/v1/cadastrarItem',JsonPost)
            .then((retorno) =>{

                toast.update(id, {
                    render: retorno.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                   autoClose: 2000,
                   onClose: props.onRequestClose}); 

            })
            .catch((err) =>{

                toast.update(id, {
                    render: err.response.data.erro,
                    type: "error",
                    isLoading: false,
                    autoClose: 2000,
                  });

            })
        }
    }

    useEffect(()=>{
        consultarDetalheItem();
    },[props.idItemSelecionado])

    
    return<>

        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="cad-modal-overlay item-modal-overlay-compact"
            ariaHideApp={false}
            className="cad-modal-content item-modal-content-compact"
        >
            <div className="cad-modal-header">
                <div>
                    <h4 className="cad-modal-title">Cadastro de Item</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                        Preencha os dados do item e clique em Salvar.
                    </p>
                </div>
                <button className="btn btn-outline-secondary" onClick={props.onRequestClose}>Fechar</button>
            </div>

            <div className="bsmodal-body">
                <p className="cad-section-title">Dados Básicos</p>
                <div className="cad-section">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-2">
                            <label htmlFor="item-codigo" className="form-label">Código</label>
                            <input
                                type="text"
                                className="form-control"
                                id="item-codigo"
                                placeholder="Código"
                                value={codigo}
                                disabled
                                onChange={(e) => SetCodigo(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-md-5">
                            <label htmlFor="item-descricao" className="form-label">Descrição<span className="text-danger">*</span></label>
                            <input
                                autoFocus
                                type="text"
                                className="form-control"
                                id="item-descricao"
                                placeholder="Descrição"
                                value={descricao}
                                onChange={(e) => SetDescricao(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-md-5">
                            <label htmlFor="item-categoria" className="form-label">Categoria<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                id="item-categoria"
                                placeholder="Categoria"
                                value={descricao2}
                                onChange={(e) => SetDescricao2(e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>

                    <div className="row g-3 align-items-end mt-1">
                        <div className="col-md-2">
                            <label htmlFor="item-data-alteracao" className="form-label">Data Última Alteração</label>
                            <input
                                type="text"
                                className="form-control"
                                id="item-data-alteracao"
                                placeholder="Data"
                                value={dataUltimaAlteradcao}
                                disabled
                                onChange={(e) => SetDataUltimaAlteradcao(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="col-md-5">
                            <label htmlFor="item-usuario-alteracao" className="form-label">Usuário Última Alteração</label>
                            <input
                                type="text"
                                className="form-control"
                                id="item-usuario-alteracao"
                                placeholder="Usuário"
                                value={usuarioUltimaAlteracao}
                                disabled
                                onChange={(e) => SetUsuarioUltimaAlteracao(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className='col-md-5'>
                            <label htmlFor="item-tipo" className="form-label">Tipo</label>
                            <select id="item-tipo" className="form-control" value={tipoitem} onChange={(e) => SetTipoItem(e.target.value)}>
                                <option value={'DP'}>Despesa</option>
                                <option value={'AM'}>Amostra</option>
                                <option value={'MT'}>Material Tecnico</option>
                                <option value={'BD'}>Brinde</option>
                                <option value={'RV'}>Revenda</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cad-modal-footer">
                <div className="cad-modal-footer-actions ms-auto">
                    <button
                        type="button"
                        className="btn btn-outline-secondary cad-footer-btn"
                        onClick={props.onRequestClose}
                    >
                        Voltar
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary cad-footer-btn"
                        onClick={salvarDados}
                    >
                        Salvar
                    </button>
                </div>
            </div>

            <ToastContainer position="top-center"/>
        </Modal>

    </>
}

export default ModalCadastroDeItem;