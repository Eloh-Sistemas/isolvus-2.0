import "./GridMobile.css";
import { useEffect, useState } from "react";

function GridMobile(props) {

   const [qtRegistro, setQtRegistro] = useState(0);
   const [total, setTotal] = useState(0);

   function recalcularTotais() {
      let calculoTotal = 0;
      props.dados.forEach((i) => {
         calculoTotal += i.quantidade * i.vlunit;
      });
      setQtRegistro(props.dados.length);
      setTotal(calculoTotal);
   }

   function NovoItem() {
      props.SeItemSelecionado({ coditem: 0, descricao: "", quantidade: 0, vlunit: 0 });
      props.openModalItem();
      props.tipoModal("Adicionar");
   }

   function SelecinarItem(ItemSelecionado, index) {
      if (ItemSelecionado?._somenteVisual) {
         return;
      }

      props.setIndex(index);
      props.SeItemSelecionado(ItemSelecionado);
      props.openModalItem();
      props.tipoModal("Editar");
   }

   useEffect(() => {
      recalcularTotais();
   }, [props.dados]);

   return (
      <div className="grid-mobile-itemdespesa">
         <div className="grid-mobile-header">
            <div className="grid-mobile-totais">
               <span><strong>Itens:</strong> {qtRegistro}</span>
               <span>
                  <strong>Total: </strong>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total - props.totalvale)}
               </span>
            </div>
            {props.tabhabilitada && (
               <button onClick={() => NovoItem()} className="grid-mobile-btn-add">
                  <i className="bi-plus-lg me-1"></i> Adicionar
               </button>
            )}
         </div>

         {props.dados.length === 0 ? (
            <div className="grid-mobile-empty">Nenhum item adicionado</div>
         ) : (
            <div className="grid-mobile-card-list">
               {props.dados.map((i, index) => (
                  <article key={index} className="grid-mobile-card-item">
                     <div className="grid-mobile-card-top">
                        <span className="grid-mobile-badge">Cod. {i.coditem}</span>
                        {props.tabhabilitada && !i?._somenteVisual ? (
                           <button
                              className="grid-mobile-btn-edit"
                              onClick={() => SelecinarItem(i, index)}
                           >
                              <i className="bi bi-pencil-square me-1"></i>Editar
                           </button>
                        ) : null}
                     </div>

                     <h6 className="grid-mobile-desc">{i.descricao}</h6>

                     <div className="grid-mobile-metrics">
                        <div>
                           <small>Qtd</small>
                           <strong>{i.quantidade}</strong>
                        </div>
                        <div>
                           <small>Valor Unit.</small>
                           <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.vlunit)}</strong>
                        </div>
                        <div>
                           <small>Total</small>
                           <strong className="grid-mobile-total">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.quantidade * i.vlunit)}</strong>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         )}

      </div>
   );
}

export default GridMobile;
