import { useEffect, useState } from "react";
import EditComplete from "../EditComplete/EditComplete";
import api from "../../servidor/api";

function TabItem(props) {
  const [itens, setItens] = useState([]);
  const [tipo, setTipo] = useState("A");
  const [quantidade, setQuantidade] = useState("");
  const [coditem, setCodItem] = useState(0);
  const [descricao, setDescricao] = useState("");


  const consultarItens = () => {

    if (props.idatividade != 0){
        api.post('v1/consultarItemAtividade', {
          id_visita: props.idvisita,
          id_atividade: props.idatividade,
          id_evidencia: props.idevidencia
        })
        .then((resposta) =>{
          setItens(resposta.data)
        })
        .catch((err) => {
            console.log(err);
        });
    }
    
  }  

  
  const adicionarItem = () => {
    if (!descricao || !quantidade) {
      alert("Preencha todos os campos!");
      return;
    }

    const novoItem = { 
      id_evidencia: props.idevidencia,
      id_visita: props.idvisita, 
      id_atividade: props.idatividade, 
      id_item: coditem, 
      qt: Number(quantidade), 
      tipoitem: tipo
    };

    api.post('v1/cadastrarItemAtividade', novoItem)
    .then((resposta) =>{        
        consultarItens();
    })
    .catch((err)=>{
      console.log(err);
    });
    
    // Limpar campos depois de adicionar
    setDescricao("");
    setQuantidade("");
    setTipo("A");
    setCodItem(0);

  };

  const removerItem = (item) => {

    

    const itemSelecionado = {
      registro: item.reg
    };
    
    api.post('v1/excluirItemAtividade', itemSelecionado)
    .then((resposta) =>{
        consultarItens();
    })
    .catch((err)=>{
      console.log(err);
    })

  };

  const handleQuantidadeChange = (e) => {
    const valor = e.target.value.replace(",", ".");
    setQuantidade(valor);
  };

  useEffect(()=>{
    consultarItens();
  },[]);

  return (
    <>
      <div className="col-12">
      <h4 className="section-title mt-3">Itens</h4>
      </div>

      {itens.length > 0 && (
        <div className="col-md-12">
          <table className="table table-bordered mt-3">
            <thead>
              <tr>
                <th className="col-9">Item</th>
                <th className="col-1">Qtde</th>
                <th className="col-1">Tipo</th>
                <th className="col-1 text-center">Exluir</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={index} className="align-middle">
                  <td>{item.produto}</td>
                  <td>{item.quantidade}</td>
                  <td>{item.tipo}</td>
                  <td className="text-center">
                    <button
                      disabled={props.disabled}
                      className="btn btn-link text-danger p-0"
                      onClick={() => removerItem(item)}
                      title="Excluir"
                    >
                      <i className="bi bi-trash fs-5"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {!props.disabled && <>
        <div className="row">
        <div className="col-lg-2 mb-3">
          <label htmlFor="amostra" className="mb-2">
            Tipo
          </label>
          <select
            id="amostra"
            className="form-control"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Selecione o tipo</option>
            <option value="AM">Amostra</option>
            <option value="MT">Material Técnico</option>
            <option value="BD">Brinde</option>
          </select>
        </div>

        <div className="col-md-8 mb-3">
          <label htmlFor="Produto" className="mb-2">
            Item
          </label>
          <EditComplete
            placeholder={"Informe o item"}
            id={tipo}
            onClickCodigo={setCodItem}
            onClickDescricao={setDescricao}
            value={descricao}
          />
        </div>

        <div className="col-md-1 mb-3">
          <label htmlFor="Quantidade" className="mb-2">
            Qtd
          </label>
          <input
            type="text"
            inputMode="decimal"
            className="form-control"
            id="Quantidade"
            placeholder="Qtd"
            value={quantidade}
            onChange={handleQuantidadeChange}            
          />
        </div>

        <div className="col-lg-1 mb-3 text-end">
          <button
            className="btn w-100 margem-botao btn-primary"
            onClick={adicionarItem}
          >
            Adicionar
          </button>
        </div>
      </div>
      </>}
      


    </>
  );
}

export default TabItem;
