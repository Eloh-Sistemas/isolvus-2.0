import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import moment from "moment";
import api from "../../../../servidor/api";

function Etapa4VisitaClienteCheckOut(props) {
  const [dataCheckOut, setDataCheckOut] = useState(moment().format("DD/MM/YYYY HH:mm:ss"));
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [tempoDeAtendimento, setTempoDeAtendimento] = useState("");
  const [error, setError] = useState(null);
  const [atividadeRealizada, setAtividadeRealizada] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Corrige o ícone padrão do Leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });

  // Função auxiliar para centralizar o mapa quando a localização for carregada
  const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
      if (position?.lat && position?.lng) {
        map.setView([position.lat, position.lng], 16);
      }
    }, [position, map]);
    return null;
  };

  // Obtém localização do usuário
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador.");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setIsLoadingLocation(false);
      },
      (err) => {
        setError("Erro ao obter localização: " + err.message);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  }, []);

  // Envia dados ao componente pai
  useEffect(() => {
    props.setDataCheckOut(dataCheckOut);
    props.setlocalizacaoCheckout(location);
  }, [dataCheckOut, location]);

  // Calcula o tempo de atendimento
  useEffect(() => {
    if (props.dataCheckin && dataCheckOut) {
      const checkIn = moment(props.dataCheckin, "DD/MM/YYYY HH:mm:ss");
      const checkOut = moment(dataCheckOut, "DD/MM/YYYY HH:mm:ss");
      const duracao = moment.duration(checkOut.diff(checkIn));
      setTempoDeAtendimento(
        `${duracao.hours()}h ${duracao.minutes()}m ${duracao.seconds()}s`
      );
    }
  }, [props.dataCheckin, dataCheckOut]);

  // Busca percentual de atividades realizadas
  useEffect(() => {
    if (!props.idvisita) return;
    api
      .post("v1/promotor/checkoutpercentualrealizado", { idvisita: props.idvisita })
      .then((resposta) => {
        setAtividadeRealizada(`${resposta.data.qtrealizado} Atividade`);
      })
      .catch((err) => {
        console.error("Erro ao buscar atividade realizada:", err);
      });
  }, [props.idvisita]);

  return (
    <>
      <div className="row">
        <div className="col-12 mb-3">
          {isLoadingLocation ? (
            <p>Obtendo localização atual...</p>
          ) : error ? (
            <div className="alert alert-danger mt-3">{error}</div>
          ) : location.lat && location.lng ? (
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={16}
              style={{ height: "250px", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <RecenterMap position={location} />
              <Marker position={[location.lat, location.lng]}>
                <Popup>📍 Você está aqui</Popup>
              </Marker>
            </MapContainer>
          ) : (
            <p>Localização não disponível.</p>
          )}
        </div>

        <div className="col-md-4 mb-3">
          <label>Data Check-in</label>
          <input type="text" className="form-control" value={props.dataCheckin} disabled />
        </div>

        <div className="col-md-4 mb-3">
          <label>Data Check-out</label>
          <input type="text" className="form-control" value={dataCheckOut} disabled />
        </div>

        <div className="col-md-4 mb-3">
          <label>Tempo de Atendimento</label>
          <input
            type="text"
            className="form-control"
            value={tempoDeAtendimento || "Calculando..."}
            disabled
          />
        </div>

        <div className="col-md-4 mb-3">
          <label>Atividade Realizada</label>
          <input
            type="text"
            className="form-control"
            value={atividadeRealizada || "Carregando..."}
            disabled
          />
        </div>
      </div>
    </>
  );
}

export default Etapa4VisitaClienteCheckOut;
