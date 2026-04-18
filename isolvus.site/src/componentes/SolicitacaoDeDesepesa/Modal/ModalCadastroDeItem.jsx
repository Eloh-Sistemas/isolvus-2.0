import React, { useEffect, useState  } from 'react';
import Modal from "react-modal/lib/components/Modal";
import { ToastContainer, toast } from 'react-toastify';
import api from '../../../servidor/api';
import moment from 'moment';
import EditComplete from '../../EditComplete/EditComplete';


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
                    overlayClassName="react-modal-overlay"
                    ariaHideApp={false}
                    className="react-modal-content"
                 >
                
            <div className="bsmodal-content">
                <div className="bsmodal-header">
                    <h3 className="modal-title">Editar Item</h3>
                </div>
              

               <div className="bsmodal-body">
                    <h4 className="section-title">Dados da Basico</h4>
                    <div className='row'>
                        <div className="col-md-2 mb-3">
                            <label htmlFor="codigo" className="mb-2">Código<span className="text-danger">*</span></label>
                            <input
                            type="text"                            
                            className="form-control"
                            id="codigo"
                            placeholder="Código"
                            value={codigo}
                            disabled                           
                            onChange={(e) => SetCodigo(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-md-5 mb-3">
                            <label htmlFor="Descrição" className="mb-2">Descrição<span className="text-danger">*</span></label>
                            <input
                            autoFocus
                            type="text"
                            className="form-control"
                            id="Descrição"
                            placeholder="Descrição"
                            value={descricao}
                            //disabled                           
                            onChange={(e) => SetDescricao(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-md-5 mb-3">
                            <label htmlFor="Descrição2" className="mb-2">Categoria<span className="text-danger">*</span></label>
                            <input
                            type="text"
                            className="form-control"
                            id="Categoria"
                            placeholder="Categoria"
                            value={descricao2}
                            //disabled                           
                            onChange={(e) => SetDescricao2(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="col-md-2 mb-3">
                            <label htmlFor="Descrição2" className="mb-2">Data Ultima Alteração</label>
                            <input
                            type="text"
                            className="form-control"
                            id="Descrição2"
                            placeholder="Descrição 2"
                            value={dataUltimaAlteradcao}
                            disabled                           
                            onChange={(e) => SetDataUltimaAlteradcao(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="col-md-5 mb-3">
                            <label htmlFor="Descrição2" className="mb-2">Usuario Ultima Alteração</label>
                            <input
                            type="text"
                            className="form-control"
                            id="Descrição2"
                            placeholder="Descrição 2"
                            value={usuarioUltimaAlteracao}
                            disabled                           
                            onChange={(e) => SetUsuarioUltimaAlteracao(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className='col-md-5'>
                            <label htmlFor="Tipo" className="mb-2">Tipo</label> 
                            <select id="Tipo" className="form-control" value={tipoitem} onChange={(e) => SetTipoItem(e.target.value)}>                                
                                <option value={'DP'}>Despesa</option>
                                <option value={'AM'}>Amostra</option>
                                <option value={'MT'}>Material Tecnico</option>
                                <option value={'BD'}>Brinde</option>
                                <option value={'RV'}>Revenda</option>
                            </select>
                        </div>
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
                        onClick={salvarDados}
                     >
                        Salvar
                     </button>
                  </div>
               </div>
               <ToastContainer position="top-center"/>
            </div>

        </Modal>

    </>
}

export default ModalCadastroDeItem;