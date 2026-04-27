import { useEffect, useState } from "react";
import "./GridDesktop.css";
import "../../../paginas/CadastroDeUsuario/CadastroDeUsuario.css";

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

      <div className="grid-item-toolbar">
        <div className="grid-item-totais">
          <span><strong>Itens:</strong> {qtRegistro}</span>
          <span>
            <strong>Total:</strong>{" "}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total - (props.totalvale || 0))}
          </span>
        </div>
        {props.tabhabilitada && (
          <button
            onClick={() => NovoItem()}
            className="btn-add-item"
            title="Adicionar novo item"
          >
            <i className="bi-plus-lg me-1"></i> Adicionar
          </button>
        )}
      </div>

      <div className="cadastro-table-card">
        <div className="tableFixHead">
          <table className="table table-hover mb-0 cadastro-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Código</th>
                <th>Descrição</th>
                <th className="text-center" style={{ width: "110px" }}>Qtd</th>
                <th className="text-end" style={{ width: "140px" }}>Valor Unit.</th>
                <th className="text-end" style={{ width: "140px" }}>Valor Total</th>
                <th style={{ width: "40px" }}></th>
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
                    className={props.tabhabilitada ? "cadastro-row-clickable" : ""}
                  >
                    <td><span className="grid-item-cod-badge">{i.coditem}</span></td>
                    <td>{i.descricao}</td>
                    <td className="text-center">{i.quantidade}</td>
                    <td className="text-end">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.vlunit)}
                    </td>
                    <td className="text-end fw-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.quantidade * i.vlunit)}
                    </td>
                    <td className="text-center">
                      {props.tabhabilitada && (
                        <i className="bi bi-pencil grid-item-edit-icon"></i>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default GridDesktop;
