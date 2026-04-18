import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./GridDesktop.css";

function GridDesktop(props) {  

  const [proximoIndexItem, setProximoIndexItem] = useState(0);
  const [qtRegistro, SetQtRegistro] = useState(0);
  const [total, setTotal] = useState(0);
  const { tipoTela } = useParams();

  function recalcularTotais() {
    let calculoTotal = 0;

    props.dados.map((i) => {
      SetQtRegistro(props.dados.length);  
      calculoTotal = calculoTotal + i.quantidade * i.vlunit;         
    });

    setTotal(calculoTotal);
  }
   
  function NovoItem() {
    props.SeItemSelecionado({ coditem: 0, descricao: "", quantidade: 0, vlunit: 0 });
    props.openModalItem(); 
    props.tipoModal("Adicionar");      
  }

  function SelecinarItem(ItemSelecionado, index) {
    if (props.tabhabilitada) {
      props.setIndex(index);
      props.SeItemSelecionado(ItemSelecionado);
      props.openModalItem(); 
      props.tipoModal("Editar");
    }
  }

  useEffect(() => {
    recalcularTotais();
    setProximoIndexItem(props.dados.length + 1);
  }, [props.dados]);

  return (
    <>
      <div className="grid-desktop-itemdespesa">
        <div className="bg-grid">

          <div className="row tableFixHead">
            <table className="table table-hover">
              <thead className="Titulos-Table">
                <tr>
                  <th scope="col" className="text-center">Código</th>
                  <th scope="col">Descrição</th>
                  <th scope="col" className="text-center">Quantidade</th>
                  <th scope="col" className="text-end">Valor Unitário</th>
                  <th scope="col" className="text-end">Valor Total</th>
                  <th scope="col" className="text-end">
                    {props.tabhabilitada && (
                      <button
                        onClick={() => NovoItem()}
                        className="btn-add-item"
                        disabled={props.disabled}
                        title="Adicionar novo item"
                      >
                        <i className="bi-plus-lg"></i>
                      </button>
                    )}
                  </th>
                </tr>
              </thead>

              <tbody>
                {props.dados.map((i, index) => {
                  return (
                    <tr 
                      key={index} 
                      onClick={() => SelecinarItem(i, index)} 
                      className="item-Table"
                    >
                      <td className="text-center">{i.coditem}</td>
                      <td>{i.descricao}</td>
                      <td className="text-center">{i.quantidade}</td>
                      <td className="text-end">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.vlunit)}
                      </td>
                      <td className="text-end">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.quantidade * i.vlunit)}
                      </td>
                      <td></td>
                    </tr>
                  );  
                })}
              </tbody>                  
            </table>                                
          </div>              

          <div className="row">
            <div className="Total mt-1 d-flex w-100 justify-content-between">
              <div>
                <label>Itens:</label>            
                <span>{qtRegistro}</span>
              </div>
              <div>   
                <label>Total:</label>            
                <span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total - props.totalvale)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default GridDesktop;
