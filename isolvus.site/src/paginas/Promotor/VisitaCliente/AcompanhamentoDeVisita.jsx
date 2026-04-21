import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css"; 
import { useEffect, useState } from "react";
import Menu from "../../../componentes/Menu/Menu";
import Card from "../../../componentes/Card/Card";
import "./AcompanhamentoDeVisita.css";
import ChartView from "../../../componentes/Charts/ChartView";
import EditComplete from "../../../componentes/EditComplete/EditComplete";
import MultEditComplete from "../../../componentes/EditComplete/MultEditComplete"
import L from "leaflet";
import api from "../../../servidor/api";
import moment from "moment";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import ModalAcompanhamnetoVisita from "./ModalAcompanhamento/ModalAcompanhamentoVisita";

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Aplica o ícone padrão para todos os markers
L.Marker.prototype.options.icon = DefaultIcon;

function AcompanhamentoDeVisita() {


  const [isOpen, setisOpen] = useState(false);
  const [atvcliselecionado, setatvcliselecionado] = useState({});

  function onRequestClose(){
    setisOpen(false);
  }


  // Altere o tipo de estado de um array para uma string
  const [id_Filial, Set_Id_Filial] = useState("");
  const [id_Promotor, Set_id_Promtor] = useState("");
  const [id_Cliente, Set_Id_Cliente] = useState("");

  const [dataInicial, SetdataInicial] = useState(moment().format("YYYY-MM") + "-01");
  const [dataFinal, SetdataFinal] = useState(moment().format("YYYY-MM-DD"));

  const [totalCliente, settotalCliente] = useState(0);
  const [totalPromotor, settotalPromotor] = useState(0);
  const [totalAtividade, settotalAtividade] = useState(0);
  const [totalHoras, settotalHoras] = useState(0);
  const [totalATD, settotalATD] = useState(0);
  const [totalATF, settotalATF] = useState(0);
  const [perATF, setperATF] = useState(0);
  const [perATD, setperATD] = useState(0);

  const [seriesDash, setseriesDash] = useState([]);
  const [categories, setcategories] = useState([
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sabado",
  ]);
  const [selectedDay, setSelectedDay] = useState(0);

  const dayMap = {
  0: 1,  // Domingo -> 1
  1: 2,  // Segunda -> 2
  2: 3,  // Terça -> 3
  3: 4,  // Quarta -> 4
  4: 5,  // Quinta -> 5
  5: 6,  // Sexta -> 6
  6: 7,  // Sábado -> 7
};


  const [dadosTabela, setDadosTabela] = useState([]);
  const [dadosTabelaAtividadeporCliente, setTabelaAtividadeporClient] = useState([]);
  const [coordenadascheckin, setcoordenadascheckin] = useState([]);

  // Componente que adiciona os pins no mapa
  const MarkersLayer = () => {
    const map = useMap();

    useEffect(() => {
      if (!coordenadascheckin || coordenadascheckin.length === 0) return;

      // Remove markers antigos
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Adiciona markers para cada coordenada válida
      coordenadascheckin.forEach((coord) => {
        if (
          Array.isArray(coord) &&
          coord.length >= 2 &&
          typeof coord[0] === "number" &&
          typeof coord[1] === "number" &&
          !isNaN(coord[0]) &&
          !isNaN(coord[1])
        ) {
          const marker = L.marker([coord[0], coord[1]]);
          marker.addTo(map);
        }
      });

      // Ajusta o mapa para mostrar todos os pins
      const bounds = L.latLngBounds(coordenadascheckin.map((p) => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 140] });

      return () => {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });
      };
    }, [map, coordenadascheckin]);

    return null;
  };

  function onclickItemTabAtividadePorCliente(item){
    setisOpen(true);
    setatvcliselecionado(item);
  }

  function onclickItemTabelaPromotor(item) {
    const jaFiltrado = Array.isArray(id_Promotor) && id_Promotor.length === 1 && id_Promotor[0].codigo === item.id_usuario;
    Set_id_Promtor(jaFiltrado ? [] : [{ codigo: item.id_usuario, descricao: item.nome }]);
  }

  function onclickCardCliente() {
    //alert("Cliente");
  }

  function onclickCardPromotor() {
    //alert("Promotor");
  }

  function onclickCardAtividades() {
    //alert("Atividades");
  }

  function onclickCardTempo() {
    //alert("Tempo");
  }

  function onclickCardATD() {
    //alert("ATD");
  }

  function onclickCardATF() {
    //alert("ATF");
  }

  function consultarDadosN1() {


    const filialCodigos = id_Filial && Array.isArray(id_Filial) ? id_Filial.map(item => item.codigo) : [];
    const promotorCodigos = id_Promotor && Array.isArray(id_Promotor) ? id_Promotor.map(item => item.codigo) : [];
    const clienteCodigos = id_Cliente && Array.isArray(id_Cliente) ? id_Cliente.map(item => item.codigo) : [];

    const jsonReq = {
      id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
      id_filial: filialCodigos,
      id_usuario: promotorCodigos,
      id_cliente: clienteCodigos,
      data1: moment(dataInicial).format("DD/MM/YYYY"),
      data2: moment(dataFinal).format("DD/MM/YYYY"),
      dia: selectedDay
    };

    api
      .post("v1/promotor/dashboardn1", jsonReq)
      .then((resp) => {

        const totalATD = resp.data.qtatdc;
        const totalATF = resp.data.qtatfc;
        const totalGeral = totalATD + totalATF;

        settotalCliente(resp.data.qtcliatd);
        settotalPromotor(resp.data.qtpromotor);
        settotalAtividade(resp.data.qtatvexe);
        settotalHoras(resp.data.qthoras ?? 0);
        settotalATD(totalATD);
        settotalATF(totalATF);

        if (totalGeral > 0) {
          const percentualATD = ((totalATD / totalGeral) * 100).toFixed(1);
          const percentualATF = ((totalATF / totalGeral) * 100).toFixed(1);
          setperATD(percentualATD);
          setperATF(percentualATF);
        } else {
          setperATD(0);
          setperATF(0);
        }

        setseriesDash([{ name: "Atendimento", data: resp.data.visitaporidasemana }]);
        setDadosTabela(resp.data.chekinporpromotor);
        setTabelaAtividadeporClient(resp.data.tabatividadeporcliente ?? []);
        setcoordenadascheckin(resp.data.coordenadascheckin);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  useEffect(() => {
    consultarDadosN1();
  }, [id_Filial, id_Promotor, id_Cliente, dataInicial, dataFinal, selectedDay]);

  return (
    <>
      <Menu />

      <ModalAcompanhamnetoVisita 
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        atvcliselecionado={atvcliselecionado}        
        dataInicial={dataInicial}
        dataFinal={dataFinal}
      />

      <div className="acompanhamento-visita-wrapper">
      <div className="container-fluid Containe-Tela">
        <div className="row text-body-secondary mb-4">
          <h1 className="mb-2 titulo-da-pagina">Dashboard - Acompanhamento de Visita</h1>
        </div>

        <div className="row">
          <div className="col-lg-3 mb-3">
            <label htmlFor="fl-2" className="mb-2">
              Filial
            </label>
              <MultEditComplete
                isMultiSelect={true} 
                autoFocus
                placeholder={"Filial"}
                id={"fl"}
                value={id_Filial} // O valor inicial também é a string
                onChange={(codigos) => Set_Id_Filial(codigos)}
              />
          </div>

          <div className="col-lg-3 mb-3">
            <label htmlFor="fl-2" className="mb-2">
              Promotor
            </label>

              <MultEditComplete
                isMultiSelect={true} 
                autoFocus
                placeholder={"Promotor"}
                id={"us"}
                value={id_Promotor} // O valor inicial também é a string
                onChange={(codigos) => Set_id_Promtor(codigos)}
              />

          </div>

          <div className="col-lg-3 mb-3">
            <label htmlFor="fl-2" className="mb-2">
              Cliente
            </label>

              <MultEditComplete
                isMultiSelect={true} 
                autoFocus
                placeholder={"Cliente"}
                id={"cl"}
                value={id_Cliente} // O valor inicial também é a string
                onChange={(codigos) => Set_Id_Cliente(codigos)}
              />
          </div>

            <div className="col-lg-3">
              {/* ➡️ Adicione uma nova linha (row) aqui */}
              <div className="row">
                  <div className="col-lg-6 mb-3">
                      <label htmlFor="DataDaSolicitação" className="mb-2">
                          Data Inicial
                      </label>
                      <input
                          type="date"
                          className="form-control"
                          id="DataDaSolicitação"
                          placeholder={dataInicial}
                          onChange={(e) => {
                              SetdataInicial(e.target.value);
                          }}
                          value={dataInicial}
                      />
                  </div>

                  <div className="col-lg-6 mb-3">
                      <label htmlFor="DataDaSolicitação" className="mb-2">
                          Data Final
                      </label>
                      <input
                          type="date"
                          className="form-control"
                          id="DataDaSolicitação"
                          placeholder={dataFinal}
                          onChange={(e) => {
                              SetdataFinal(e.target.value);
                          }}
                          value={dataFinal}
                      />
                  </div>
              </div>
          </div>

        </div>

        <div className="row">
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardCliente}
              titulo={"Cliente"}
              valor={totalCliente}
              inf={"Total de Cliente Atendido"}
              iconebootstrap={"bi bi-person-circle"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardPromotor}
              titulo={"Promotor"}
              valor={totalPromotor}
              inf={"Qtde de Promotor Ativos"}
              iconebootstrap={"bi bi-person-workspace"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardAtividades}
              titulo={"Atividades"}
              valor={totalAtividade}
              inf={"Total de Atividade Executada"}
              iconebootstrap={"bi bi-list-check"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardTempo}
              titulo={"Tempo"}
              valor={totalHoras + " horas"}
              inf={"Total de Tempo Gasto no Cliente"}
              iconebootstrap={"bi bi-clock-history"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardATD}
              titulo={"Checkin no Cliente"}
              valor={totalATD}
              inf={"Total de Realizado no Cliente"}
              iconebootstrap={"bi bi-pin-map"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardATF}
              titulo={"Checkin Fora do Cliente"}
              valor={totalATF}
              inf={"Total de Checkin realizado Fora do Cliente"}
              iconebootstrap={"bi bi-ban"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardATD}
              titulo={"% ATD"}
              valor={perATD + " %"}
              inf={"Percentual de atendimento dentro do cliente"}
              iconebootstrap={"bi bi-arrow-down-circle"}
            />
          </div>
          <div className="col-lg-3 mb-3">
            <Card
              onclickCard={onclickCardATF}
              titulo={"% ATF"}
              valor={perATF + " %"}
              inf={"Percentual de atendimento fora do cliente"}
              iconebootstrap={"bi bi-graph-down-arrow"}
            />
          </div>
        </div>

        <div className="row">
          {/* Mapa */}
          <div className="col-lg-6 mb-3">
            <div className="col-lg-12">
              <div className="ChartFundo">
                <MapContainer
                  className="mt-0 mapacontaioner"
                  center={[-23.55052, -46.633308]}
                  zoom={5}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MarkersLayer />
                </MapContainer>
              </div>
            </div>
          </div>

            <div className="col-lg-6 mb-3">
              <div className="col-12">
                <ChartView
                  type={"bar"}
                  series={seriesDash}
                  options={{
                    labels: categories,
                    legend: { show: true, showForSingleSeries: true },
                    yaxis: {
                      labels: {
                        formatter: (val) => {
                          return new Intl.NumberFormat("pt-BR").format(val);
                        },
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      enabledOnSeries: undefined,
                      formatter: function (value, { seriesIndex, dataPointIndex, w }) {
                        return new Intl.NumberFormat("pt-BR").format(value);
                      },
                    },
                    chart: {
                    events: {
                      dataPointSelection: (event, chartContext, config) => {
                        const dayNumber = dayMap[config.dataPointIndex];

                        setSelectedDay((prevDay) => {
                          const newDay = prevDay === dayNumber ? 0 : dayNumber;

                          // Ex.: buscar dados no backend
                          // fetchDataForDay(newDay);

                          return newDay;
                        });
                      },
                    },
                  },
                  }}
                  height={313}
                  title={"Atendimento por Dia"}
                />
              </div>
            </div>


          {/* Tabela atividade por cliente */}
          <div className="col-lg-6 d-flex flex-column tabela-bloco">
            <table className="table tablefont table-hover mb-0">
              <thead>
                <tr>
                  <th className="col-7" scope="col">
                    Atividade por Cliente
                  </th>
                  <th className="col-4" scope="col">
                    Atividade
                  </th>
                  <th className="col-1 text-end" scope="col">
                    Qtde
                  </th>
                </tr>
              </thead>
            </table>

            <div className="tabela-scroll-container">
              <table className="table tablefont table-hover mb-0">
                <tbody>
                  {dadosTabelaAtividadeporCliente.length > 0 ? (
                    dadosTabelaAtividadeporCliente.map((item) => (
                      <tr onClick={() => onclickItemTabAtividadePorCliente(item)} key={item.id_linha} className="linha-grid-desktop-analisedespesa">
                        <td className="col-7">{`${item.id_cliente} - ${item.cliente}`}</td>
                        <td className="col-4">{`${item.id_atividade} - ${item.descricao}`}</td>
                        <td className="col-1 text-end">{item.qtde}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center">
                        Dados não encontrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé fixo fora do scroll */}
            <table className="table tablefont table-hover mb-0">
              <tfoot>
                <tr>
                  <td className="col-11" colSpan="2">
                    <strong>Total de registros:</strong> {dadosTabelaAtividadeporCliente.length}
                  </td>
                  <td className="col-1 text-end">
                    <strong>{dadosTabelaAtividadeporCliente.reduce((acc, item) => acc + Number(item.qtde), 0)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tabela Checkin por promotor */}
          <div className="col-lg-6 d-flex flex-column tabela-bloco tabela-checkin-promotor">
            <table className="table tablefont table-hover mb-0">
              <thead>
                <tr>
                  <th className="col-5" scope="col">
                    Chekin por Promotor
                  </th>
                  <th className="col-1 text-end">
                    ATD
                  </th>
                  <th className="col-1 text-end">
                    ATF
                  </th>
                  <th className="col-1 text-end">
                    ATT
                  </th>
                </tr>
              </thead>
            </table>

            <div className="tabela-scroll-container">
              <table className="table tablefont table-hover mb-0">
                <tbody>
                  {dadosTabela.length > 0 ? (
                    dadosTabela.map((item) => (
                      <tr
                        key={item.id_usuario}
                        onClick={() => onclickItemTabelaPromotor(item)}
                        className={`linha-grid-desktop-analisedespesa ${Array.isArray(id_Promotor) && id_Promotor.length === 1 && id_Promotor[0].codigo === item.id_usuario ? 'linha-selecionada' : ''}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="col-5">{`${item.id_usuario} - ${item.nome}`}</td>
                        <td className="col-1 text-end">{item.atd_dentro}</td>
                        <td className="col-1 text-end">{item.atd_fora}</td>
                        <td className="col-1 text-end">{item.total}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">
                        Dados não encontrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé fixo fora do scroll */}
            <table className="table tablefont table-hover mb-0">
              <tfoot>
                <tr>
                  <td className="col-5">
                    <strong>Total de registros:</strong> {dadosTabela.length}
                  </td>
                  <td className="col-1 text-end">
                    <strong>{dadosTabela.reduce((acc, item) => acc + Number(item.atd_dentro), 0)}</strong>
                  </td>
                  <td className="col-1 text-end">
                    <strong>{dadosTabela.reduce((acc, item) => acc + Number(item.atd_fora), 0)}</strong>
                  </td>
                  <td className="col-1 text-end">
                    <strong>{dadosTabela.reduce((acc, item) => acc + Number(item.total), 0)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default AcompanhamentoDeVisita;
