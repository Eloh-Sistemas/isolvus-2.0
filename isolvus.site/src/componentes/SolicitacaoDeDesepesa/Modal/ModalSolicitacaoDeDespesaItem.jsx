import Modal from 'react-modal/lib/components/Modal';
import "./ModalCadastroDeUsuario.css";
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
                  overlayClassName="cad-modal-overlay despesa-item-modal-overlay"
                  ariaHideApp={false}
                  className="cad-modal-content despesa-item-modal-content">

        <div className="cad-modal-header">
            <div>
                <h4 className="cad-modal-title">Dados do Item</h4>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>{props.tipoModal}</p>
            </div>
            <button className="btn btn-outline-secondary" onClick={props.onRequestClose}>Fechar</button>
        </div>

        <div className="bsmodal-body">
            <p className="cad-section-title">Informações do Item</p>
            <div className="cad-section">
                <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                        <label htmlFor="fl-1" className="form-label">Código</label>
                        <input className="form-control" id="fl-1" disabled value={coditem}/>
                    </div>
                    <div className="col-md-9">
                        <label htmlFor="DP" className="form-label">Descrição</label>
                        <EditComplete autoFocus placeholder={"Informe o item"} id={"DP"}
                                     onClickCodigo={SetCodItem}
                                     onClickDescricao={SetDescricao}
                                     value={descricao}/>
                    </div>
                </div>

                <div className="row g-3 align-items-end mt-2">
                    <div className="col-md-4">
                        <label htmlFor="quantidade" className="form-label">Quantidade</label>
                        <NumericFormat onChange={(e) => SetQuantidade(e.target.value)} className="form-control" decimalScale={2} placeholder='0' value={quantidade}/>
                    </div>
                    <div className="col-md-4">
                        <label htmlFor="vlunit" className="form-label">Valor Unitário</label>
                        <NumericFormat onChange={(e) => SetVlUnit(e.target.value)} className="form-control" decimalScale={2} placeholder='R$ 0' value={vlunit}/>
                    </div>
                    <div className="col-md-4">
                        <label htmlFor="vltotal" className="form-label">Valor Total</label>
                        <NumericFormat className="form-control" decimalScale={2} prefix={"R$ "} thousandSeparator="." decimalSeparator=',' disabled placeholder='R$ 0' value={vltotal}/>
                    </div>
                </div>
            </div>
        </div>

        <div className="cad-modal-footer despesa-item-footer">
            <button type="button" className="btn btn-danger despesa-item-btn" onClick={() => onClickExcluir()}>
                <i className="bi bi-trash-fill"></i> Excluir
            </button>
            <button type="button" className="btn btn-primary despesa-item-btn" onClick={() => onClikSalvar()}>
                <i className="bi bi-floppy"></i> Salvar
            </button>
        </div>

    </Modal>
}

export default ModalSolicitacaoDeDespesaItem;