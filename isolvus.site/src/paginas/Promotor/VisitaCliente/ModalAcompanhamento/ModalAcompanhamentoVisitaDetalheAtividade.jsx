import moment from "moment";
import "./ModalAcompanhamentoVisitaDetalheAtividade.css";
import Modal from "react-modal/lib/components/Modal";
import UploadArquivos from "../../../../componentes/UploadArquivos/UploadArquivos";
import { useRef } from "react";
import TabItem from "../../../../componentes/tabItem/tabitem";

function ModalAcompanhamentoVisitaDetalheAtividade(props){
    const uploadRef = useRef();  

    return(
        <>
        <Modal
                    isOpen={props.isOpen}
                    onRequestClose={props.onRequestClose}
                    overlayClassName="atividade-modal-overlay"
                    ariaHideApp={false}
                    className="atividade-modal-content"
                > 

            <div className="bsmodal-content" >
                
                <div className="bsmodal-header">
                    <h3 className="modal-title text-center bolt">Detalhamento da Atividade</h3>
                </div>

                <div className="row">

                    <div className="col-12">
                    <h4 className="section-title mt-3">Promotor</h4>
                    </div>

                    <div className="col-md-1">
                    <label htmlFor="codigo" className="mb-2">Cód.Promtor</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Promotor"
                        placeholder="Promotor"
                        value={props.atividadeSelecionada.id_promotor}  // Agora pega do pai corretamente                       
                    />
                    </div>

                    <div className="col-md-11">
                    <label htmlFor="codigo" className="mb-2">Promotor</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Promotor"
                        placeholder="Promotor"
                        value={props.atividadeSelecionada.promotor}  // Agora pega do pai corretamente                       
                    />
                    </div>

                    {/* ATIVIDADE */}  
                    <div className="col-12">
                    <h4 className="section-title mt-3 text-center">Atividade</h4>
                    </div>

                    <div className="col-md-1">
                    <label htmlFor="Data" className="mb-2">Visita</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Data"
                        placeholder="Data"
                        value={props.atividadeSelecionada.id_visita}             
                    />
                    </div> 
                    <div className="col-md-1">
                    <label htmlFor="Data" className="mb-2">Evidencia</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Data"
                        placeholder="Data"
                        value={props.atividadeSelecionada.id_evidencia}             
                    />
                    </div>                                         
                    <div className="col-md-7">                    
                    <label htmlFor="codigo" className="mb-2">Atividade</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Atividade"
                        placeholder="Atividade"
                        value={props.atividadeSelecionada.atividade}                        
                    />
                    </div> 
                    <div className="col-md-2">
                    <label htmlFor="Data" className="mb-2">Data</label>
                    <input
                        disabled
                        type="text"
                        className="form-control mb-2"
                        id="Data"
                        placeholder="Data"
                        value={moment(props.atividadeSelecionada.data).format("DD/MM/YYYY")}  
                    />
                    </div>        
                    {props.atividadeSelecionada.realizado != null && <>
                        <div className="col-md-1">
                        <label htmlFor="houvevenda" className="mb-2">Realizado ?</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="realizado"
                            placeholder="Realizado ?"
                            value={props.atividadeSelecionada.realizado ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}   
                    {/* ====================== */}                              

                     
                    {props.atividadeSelecionada.veterinario != null && <>
                        <div className="col-12">
                        <h4 className="section-title mt-3 text-center">Veterinario</h4>
                        </div>
                        <div className="col-md-10">
                        <label htmlFor="Veterinario" className="mb-2">Veterinario</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="Veterinario"
                            placeholder="Nome Veterinario"
                            value={props.atividadeSelecionada.veterinario ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                        <div className="col-md-2">
                        <label htmlFor="Contato" className="mb-2">Contato</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="Contato"
                            placeholder="Contato"
                            value={props.atividadeSelecionada.telefone ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}    

                    {props.atividadeSelecionada.houvevenda != null && <>
                        <div className="col-12">
                        <h4 className="section-title mt-3 text-center">Venda</h4>
                        </div>
                        <div className="col-md-12">
                        <label htmlFor="houvevenda" className="mb-2">Realizado Venda ?</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="houvevenda"
                            placeholder="Houve venda ?"
                            value={props.atividadeSelecionada.houvevenda ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}   

                    <TabItem 
                    disabled
                    idvisita={props.atividadeSelecionada.id_visita}  
                    idatividade={props.atividadeSelecionada.id_atividade}
                    idevidencia={props.atividadeSelecionada.id_evidencia}        
                    />   

                    {props.atividadeSelecionada.fezquiz && <>
                        <div className="col-12">
                        <h4 className="section-title mt-3 text-center">Quiz</h4>
                        </div>
                        <div className="col-md-1">
                        <label htmlFor="quiz" className="mb-2">Fez Quiz ?</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="quiz"
                            placeholder="Fez Quiz ?"
                            value={props.atividadeSelecionada.fezquiz ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}            

                                     

                    {props.atividadeSelecionada.equipe && <>
                        <div className="col-md-2">
                        <label htmlFor="codigo" className="mb-2">Equipe</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="Equipe"
                            placeholder="Equipe"
                            value={props.atividadeSelecionada.equipe ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}

                    {props.atividadeSelecionada.qtpessoas && <>
                        <div className="col-md-1">
                        <label htmlFor="Qtde.Pessoas" className="mb-2">Qtde.Pessoas</label>
                        <input
                            disabled
                            type="text"
                            className="form-control mb-2"
                            id="Qtde.Pessoas"
                            placeholder="Qtde.Pessoas"
                            value={props.atividadeSelecionada.qtpessoas ?? ""}  // Agora pega do pai corretamente                       
                        />
                        </div>
                    </>}                                                           
                    
                    <div className="col-12">
                    <h4 className="section-title mt-3 text-center">Foto</h4>
                    </div>
                    <div className="col-md-12 mb-2">                                     
                    <UploadArquivos 
                        ref={uploadRef} 
                        idRotina={"3001.1"}
                        idRelacional={props.atividadeSelecionada.id_visita+""+props.atividadeSelecionada.id_atividade+""+props.atividadeSelecionada.id_evidencia}
                        acceptTypes="image/*"
                        capture={true}  // ou nem passa a prop     
                        disabled
                    /> 
                    </div>
                    
                    <div className="col-12">
                    <h4 className="section-title mt-3 text-center">Comentario</h4>   
                    </div>
                    <div className="col-md-12 mb-3">
                    <textarea
                        disabled
                        type="text"
                        className="form-control"
                        id="Comentario"
                        rows="8"                        
                        placeholder="Não foi realizado comentario..."
                        value={props.atividadeSelecionada.comentario ?? ""}
                        />
                    </div>                                                            
                    

                </div>


            </div>
            
            <div className="bsmodal-footer" style={{ justifyContent: 'flex-start' }}>
                    <button
                        onClick={props.onRequestClose}
                        type="button"
                        className="btn btn-secondary px-4"
                    >
                        Voltar
                    </button>
            </div>
        </Modal>
        </>
    );
}

export default ModalAcompanhamentoVisitaDetalheAtividade;