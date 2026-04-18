import Modal from 'react-modal/lib/components/Modal';
import "./ModalSolicitacaoDeDespesaItem.css";
import { NumericFormat } from 'react-number-format';
import EditComplete from '../../EditComplete/EditComplete';
import { useEffect, useState } from 'react';


function ModalSolicitacaoDeDespesaItem(props){
    
    const [coditem, SetCodItem] = useState(0);
    const [descricao, SetDescricao] = useState("");    
    const [quantidade, SetQuantidade] = useState(0);
    const [vlunit, SetVlUnit] = useState(0);
    const [vltotal, SetVlTotal] = useState(0);


    function onClikSalvar(){

       if (props.tipoModal == "Editar") {
        props.AlterarItemListaDeGasto({coditem, descricao, quantidade, vlunit}); 
       }
       else if (props.tipoModal == "Adicionar"){
         props.AdcionarItemListaDeGasto({coditem, descricao, quantidade, vlunit});
       }
       
       props.onRequestClose(false);
       
    }

    
    function onClickExcluir(){
        
        props.ExluirItemListaDeGasto();
        props.onRequestClose();
       
    }
            
    function CarregadadosSelecionados(){   
        SetCodItem(props.GetItemSelecionado.coditem);
        SetDescricao(props.GetItemSelecionado.descricao);
        SetQuantidade(props.GetItemSelecionado.quantidade);
        SetVlUnit(props.GetItemSelecionado.vlunit);
    }

    useEffect(()=>{
        SetVlTotal(quantidade*vlunit);
    },[quantidade, vlunit])
    
    useEffect(()=>{
        CarregadadosSelecionados();
    },[props.isOpen])

    return <Modal isOpen={props.isOpen}
                  onRequestClose={props.onRequestClose}
                  overlayClassName="react-modal-overlay"
                  ariaHideApp={false}
                  className="react-modal-content"  >


                <div className="bsmodal-content">
                    
                    <div className="bsmodal-header">
                        <label>Dados do Item - {props.tipoModal}</label>                        
                    </div>
                    
                    <div className="bsmodal-body">                        


                            <div className="row">    

                                <div className="col-3 mb-3">   
                                    <label htmlFor="fl-1" className="mb-3">Codigo</label>                   
                                    <input className="form-control" id={"fl-1"} disabled value={coditem}/>  
                                </div>  


                                <div className="col-9 mb-3">     
                                <label htmlFor="DP" className="mb-3">Descrição</label>                                     
                                <EditComplete   autoFocus placeholder={"Informe o item"} id={"DP"} 
                                                onClickCodigo={SetCodItem} 
                                                onClickDescricao={SetDescricao}
                                                value={descricao}/>
                                </div> 
                            </div> 

                            <div className="d-flex w-100 mb-1 justify-content-between">   
                                
                                <div className="mb-3 mt-1 me-3">                 
                                    <label htmlFor="nTransferencia" className="mb-3">Quantidade</label>
                                    <NumericFormat onChange={(e) => SetQuantidade(e.target.value)} className="form-control"  decimalScale={2}  placeholder='0' value={quantidade}/>    
                                </div>  
                                <div className="mb-3 mt-1 me-3">   
                                    <label htmlFor="nTransferencia" className="mb-3">Valor Unitário</label>   
                                    <NumericFormat onChange={(e) => SetVlUnit(e.target.value)} className="form-control"  decimalScale={2}  placeholder='R$ 0' value={vlunit}/>                                               
                                </div>   
                                <div className="mb-3 mt-1">    
                                    <label htmlFor="nTransferencia" className="mb-3">Valor Total</label>             
                                    <NumericFormat className="form-control"  decimalScale={2} prefix={"R$ "} thousandSeparator="." decimalSeparator=','disabled placeholder='R$ 0' value={vltotal}/>  
                                </div>                               
                                
                            </div>  
              
                    </div>

                                      
                    <div className="bsmodal-footer">
                        
                        <p className="d-flex mb-1 justify-content-between">                                
                                <button type="button" className="btn btn-secondary px-lg-4 m-1" onClick={props.onRequestClose}><i className="bi bi-arrow-left"></i> Voltar</button>                       
                                <button type="button" className="btn btn-danger px-lg-4 m-1" onClick={() => onClickExcluir()} ><i className="bi bi-trash-fill"></i>  Excluir</button>
                                <button type="button" className="btn btn-primary px-lg-4 m-1" onClick={() => onClikSalvar() }><i className="bi bi-floppy"></i> Salvar</button>                                       
                        </p>                      

                    </div>

                </div>
            
    </Modal>
}

export default ModalSolicitacaoDeDespesaItem;