import moment from "moment";
import { useEffect, useState } from "react";
import "./GridDesktoConsultaAPI.css";

function GridDesktopConsultaAPI(props) {
  const [tipoGrid, setTipoGrid] = useState("");
  const [loadingIds, setLoadingIds] = useState([]); // itens em reprocessamento

  function TipoGrid() {
    if (window.innerWidth > 1028) {
      setTipoGrid("D");
    } else {
      setTipoGrid("M");
    }
  }

  useEffect(() => {
    TipoGrid();
    window.addEventListener("resize", TipoGrid);
    return () => window.removeEventListener("resize", TipoGrid);
  }, []);

  const handleReprocessar = async (item) => {
    setLoadingIds((prev) => [...prev, item.id_integracao]);

    try {
      if (props.onReprocessar) {
        await props.onReprocessar(item);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // simulação
        console.log("Reprocessar chamado para: ", item);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== item.id_integracao));
    }
  };

  const isLoading = (id) => loadingIds.includes(id);

  // SVG moderno para reprocessar
  const ReprocessarIcon = ({ id }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="currentColor"
      className={isLoading(id) ? "spinning" : ""}
      viewBox="0 0 24 24"
      onClick={() => handleReprocessar({ id_integracao: id })}
      style={{ cursor: "pointer" }}
    >
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 .34-.03.67-.08 1h2.02c.05-.33.06-.66.06-1 0-4.42-3.58-8-8-8zm-6 7c0-.34.03-.67.08-1H4.06c-.05.33-.06.66-.06 1 0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6z"/>
    </svg>
  );

  return (
    <>
      {tipoGrid === "M" ? (
        <div className="mt-4">
          {props.dados.map((i, index) => (
            <div key={index} className="item-consulta-solicitacao">
              <div className="col-12 d-flex w-100 justify-content-between align-items-center">
                <p className="mt-1">
                  <label>Integração:</label> {i.id_integracao + " - " + i.integracao}
                </p>

                {/* Ícone Reprocessar */}
                <ReprocessarIcon id={i.id_integracao} />
              </div>

              <hr />

              <div>
                <p>
                  <label>Servidor:</label> {i.id_servidor}
                </p>
              </div>

              <div>
                <p>
                  <label>Proxima Atualização:</label>{" "}
                  {moment(i.datahora_proxima_atualizacao).utc().format("DD/MM/YYYY HH:mm")}
                </p>
              </div>

              <div>
                <p>
                  <label>Intervalo:</label> {i.intervalominutos} minutos
                </p>
              </div>

              <div>
                <p>
                  <label>Integra:</label>{" "}
                  {i.realizarintegracao === "S" ? (
                    <i className="bi bi-check-lg"></i>
                  ) : (
                    <i className="bi bi-x-lg"></i>
                  )}
                </p>
              </div>

              <hr />
            </div>
          ))}
        </div>
      ) : (
        // Grid Desktop
        <table className="table mt-5">
          <thead className="Titulos-Table">
            <tr>
              <th scope="col">Servidor</th>
              <th scope="col">Integração</th>
              <th scope="col">Proxima Atualização</th>
              <th scope="col" className="text-center">
                Intervalo
              </th>
              <th scope="col" className="text-center">
                Integra
              </th>
              <th scope="col" className="text-center">
                Reprocessar
              </th>
            </tr>
          </thead>
          <tbody>
            {props.dados.map((i, index) => (
              <tr key={index} className="linha-grid-desktop-analisedespesa">
                <td>{i.id_servidor}</td>
                <td>{i.id_integracao + " - " + i.integracao}</td>
                <td>{moment(i.datahora_proxima_atualizacao).utc().format("DD/MM/YYYY HH:mm")}</td>
                <td className="text-center">{i.intervalominutos} minutos</td>
                <td className="text-center">
                  {i.realizarintegracao === "S" ? (
                    <i className="bi bi-check-lg"></i>
                  ) : (
                    <i className="bi bi-x-lg"></i>
                  )}
                </td>
                <td className="text-center">
                  <ReprocessarIcon id={i.id_integracao} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tipoGrid === "M" ? <hr /> : null}
    </>
  );
}

export default GridDesktopConsultaAPI;
