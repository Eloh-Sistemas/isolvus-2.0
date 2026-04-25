import { useEffect, useState } from "react";
import "./GridDesktop.css";

function GridDesktop(props) {  

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
    if (props.tabhabilitada) {
      props.setIndex(index);
      props.SeItemSelecionado(ItemSelecionado);
      props.openModalItem(); 
      props.tipoModal("Editar");
    }
  }

  useEffect(() => {
    recalcularTotais();
  }, [props.dados]);

  return (
    <div className="grid-desktop-itemdespesa">
      <div className="bg-grid">

        <div className="tableFixHead">
          <table className="table table-hover">
            <thead className="Titulos-Table">
              <tr>
                <th scope="col" className="text-center" style={{ width: "80px" }}>Código</th>
                <th scope="col">Descrição</th>
                <th scope="col" className="text-center" style={{ width: "110px" }}>Qtd</th>
                <th scope="col" className="text-end" style={{ width: "140px" }}>Valor Unit.</th>
                <th scope="col" className="text-end" style={{ width: "140px" }}>Valor Total</th>
                <th scope="col" style={{ width: "60px" }}>
                  {props.tabhabilitada && (
                    <button
                      onClick={() => NovoItem()}
                      className="btn-add-item"
                      title="Adicionar novo item"
                    >
                      <i className="bi-plus-lg"></i>
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {props.dados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-3">Nenhum item adicionado</td>
                </tr>
              ) : (
                props.dados.map((i, index) => (
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
                ))
              )}
            </tbody>                  
          </table>                                
        </div>              

        <div className="Total d-flex w-100 justify-content-between">
          <div>
            <label>Registros:</label>
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
  );
}

export default GridDesktop;
