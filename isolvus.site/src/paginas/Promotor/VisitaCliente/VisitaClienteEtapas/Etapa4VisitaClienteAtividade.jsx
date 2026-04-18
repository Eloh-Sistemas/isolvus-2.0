import { useEffect, useState } from "react";
import ModalVisitaClienteAtividades from "./ModalVisitaClienteAtividades";
import api from "../../../../servidor/api";

function Etapa3VisitaClienteAtividade(props) {
  const [dados, setDados] = useState([]);
  const [atividadeSelecionada, SetAtividadeSelecionada] = useState([]);
  const [isOpen, SetisOpen] = useState(false);

  

  // Função para consultar atividades
  function consultarAtividades() {
    api
      .post("v1/promotor/listaratividadespromotor", {
        id_visita: props.idvisita
      })
      .then((response) => {
        setDados(response.data);
        console.log(response.data);
      })
      .catch((erro) => {
        console.log(erro.response.error);
      });
  }

  function closeModalItem() {
    SetisOpen(false);
  }

  function openModalItem(atividade) {
    SetAtividadeSelecionada(atividade);  // Define a atividade selecionada
    SetisOpen(true);  // Abre o modal
  }

  function openModalNovo() {
    SetAtividadeSelecionada([]);  // Define a atividade selecionada
    SetisOpen(true);  // Abre o modal
  }

  useEffect(() => {
    consultarAtividades();
  }, []);

  return (
    <>
      <ModalVisitaClienteAtividades
        isOpen={isOpen}
        onRequestClose={closeModalItem}
        ariaHideApp={false}
        idvisita={props.idvisita}
        atividade={atividadeSelecionada}
        consultarAtividades={consultarAtividades}
      />
      

      <div className="row">
        <div className="col-lg-12 mt-1">          
          <table className="table table-hover">
            <thead>
              <tr>
                <th className="text-center" colSpan="2">
                  Atividades / Visita {props.idvisita}
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.length > 0 ? (
                dados.map((item) => (
                  <tr onClick={() => openModalItem(item)} key={item.id_evidencia}>
                    <td>
                      {item.id_evidencia} - {item.descricao}
                    </td>
                    <td className="text-center">
                      {item.realizado === "S" ? (
                        <i className="bi bi-check-circle-fill text-success fs-5"></i>
                      ) : (
                        <i className="bi bi-x-circle-fill text-danger fs-5"></i>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-center">
                    Nenhuma atividade encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>                    
        </div>

        <div className="col-lg-1 ms-auto">
          <button onClick={() => openModalNovo()} className="btn btn-success w-100">Adicionar</button>
        </div>
      </div>
    </>
  );
}

export default Etapa3VisitaClienteAtividade;
