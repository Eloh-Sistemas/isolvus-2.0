import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";
import moment from "moment";
import "./Etapa3VisitaClienteCheckIn.css";
import ModalVisitaClienteJustificar from "./ModalVisitaClienteJustificar";

function Etapa2VisitaClienteCheckIn(props) {
  const [enderecoPromotor, setEnderecoPromotor] = useState("");
  const [enderecoCliente, setEnderecoCliente] = useState("");
  const [dataCheckIn, setDataCheckIn] = useState(moment().format("DD/MM/YYYY HH:mm:ss"));
  const [location, setLocation] = useState(null);
  const [geolocationError, setGeolocationError] = useState(null);
  const [distancia, setDistancia] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [gpsOverlay, setGpsOverlay] = useState(false);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsAcuracia, setGpsAcuracia] = useState(null);
  const [gpsAguardando, setGpsAguardando] = useState(true);

  const closeModalItem = () => setIsOpen(false);
  const openModalItem = () => setIsOpen(true);

  const createCustomPin = (color) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  };

  const isValidLatLng = (lat, lng) =>
    lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const parseCoordinate = (coord) => {
    if (typeof coord === "string") {
      const cleanedCoord = coord.replace(",", ".");
      return parseFloat(cleanedCoord);
    }
    return parseFloat(coord);
  };

  const clientLat = parseCoordinate(props.clienteSelecionado.latitude);
  const clientLng = parseCoordinate(props.clienteSelecionado.longitude);

  const clientLocation = isValidLatLng(clientLat, clientLng)
    ? [clientLat, clientLng]
    : [0, 0];

  const locations = [
    {
      position: location ? [location.lat, location.lng] : [0, 0],
      label: "Você está aqui",
      color: "red",
      showRoute: false,
    },
    {
      position: clientLocation,
      label: props.clienteSelecionado.cliente,
      color: "blue",
      showRoute: true,
    },
  ];

  const AdjustZoom = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
      const validMarkers = markers.filter(
        (m) =>
          m.position &&
          m.position.length === 2 &&
          !isNaN(m.position[0]) &&
          !isNaN(m.position[1])
      );
      if (validMarkers.length > 0) {
        const bounds = validMarkers.map((m) => m.position);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [markers, map]);
    return null;
  };

  const formatAddress = (address) => {
    if (!address) return "Endereço não encontrado";
    const { road, suburb, city, town, state, postcode, country } = address;
    const cidade = city || town || "";
    return `${road || ""}, ${suburb || ""}, ${cidade}, ${state || ""}, ${
      postcode || ""
    }, ${country || ""}`
      .replace(/ ,/g, "")
      .trim();
  };

  const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (location && isValidLatLng(clientLocation[0], clientLocation[1])) {
      const distanciaCalculada = haversineDistance(
        [location.lat, location.lng],
        clientLocation
      ).toFixed(2);
      setDistancia(distanciaCalculada);
    } else {
      setDistancia("Não disponível");
    }
  }, [location, clientLocation]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeolocationError("Geolocalização não é suportada pelo seu navegador.");
      setLocation({ lat: 0, lng: 0 });
      setGpsAguardando(false);
      return;
    }

    setGpsAguardando(true);
    setGeolocationError(null);

    // Limite de acurácia aceitável em metros
    const ACURACIA_MAXIMA = 50;
    // Tempo máximo aguardando GPS preciso (30s)
    const TIMEOUT_GPS = 30000;

    let watchId = null;
    let timeoutId = null;
    let melhorPosicao = null;

    const aplicarPosicao = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      if (!isValidLatLng(latitude, longitude)) return;

      // Guarda sempre a melhor posição obtida até agora
      if (!melhorPosicao || accuracy < melhorPosicao.accuracy) {
        melhorPosicao = { latitude, longitude, accuracy };
      }

      setGpsAcuracia(Math.round(accuracy));
      setLocation({ lat: latitude, lng: longitude });
      setGpsOverlay(false);
      setGpsBlocked(false);

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        .then((r) => r.json())
        .then((data) => setEnderecoPromotor(formatAddress(data.address)))
        .catch(() => setEnderecoPromotor("Erro ao obter o endereço atual"));

      // Acurácia boa o suficiente — para de assistir
      if (accuracy <= ACURACIA_MAXIMA) {
        clearTimeout(timeoutId);
        navigator.geolocation.clearWatch(watchId);
        setGpsAguardando(false);
      }
    };

    const onErro = (error) => {
      console.error("Erro ao obter localização:", error);
      if (error.code === error.PERMISSION_DENIED) {
        setGpsOverlay(true);
        setGpsBlocked(true);
      }
      // Se já temos alguma posição, usamos ela mesmo assim
      if (!melhorPosicao) {
        setGeolocationError("Permissão negada ou erro ao obter localização");
        setLocation({ lat: 0, lng: 0 });
      }
      clearTimeout(timeoutId);
      navigator.geolocation.clearWatch(watchId);
      setGpsAguardando(false);
    };

    watchId = navigator.geolocation.watchPosition(aplicarPosicao, onErro, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });

    // Após TIMEOUT_GPS para de assistir e usa a melhor posição obtida
    timeoutId = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      setGpsAguardando(false);
    }, TIMEOUT_GPS);
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (isValidLatLng(clientLat, clientLng)) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${clientLat}&lon=${clientLng}&format=json`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.address) {
            setEnderecoCliente(formatAddress(data.address));
          } else if (data.display_name) {
            setEnderecoCliente(data.display_name);
          } else {
            setEnderecoCliente("Endereço não encontrado");
          }
        })
        .catch(() => setEnderecoCliente("Erro ao obter endereço do cliente"));
    } else {
      setEnderecoCliente("Cliente com coordenadas inválidas");
    }
  }, [props.clienteSelecionado]);

  useEffect(() => {
    props.setDataCheckin(dataCheckIn);
    props.setLocalizacaopromotor(location);
    props.setDistancia(distancia);
  }, [dataCheckIn, location, distancia]);

  return (
    <>
      <ModalVisitaClienteJustificar
        isOpen={isOpen}
        onRequestClose={closeModalItem}
        ariaHideApp={false}
        setidjustificativa={props.setidjustificativa}
      />

      {gpsOverlay && (
        <div className="overlay-gps">
          <h4>Permissão de GPS necessária</h4>
          <p>
            {gpsBlocked
              ? "Você negou a permissão de GPS. Ative a localização nas configurações do dispositivo e recarregue a página."
              : "Ative o GPS do dispositivo para continuar."}
          </p>
          {!gpsBlocked && (
            <button className="btn btn-primary mt-3" onClick={requestLocation}>
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <div className="row">
        <div className="col-12 mb-3">
          <MapContainer center={[-23.55052, -46.633308]} zoom={5} className="MapContainer">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AdjustZoom markers={locations} />
            {locations.map((loc, index) => (
              <Marker key={index} position={loc.position} icon={createCustomPin(loc.color)}>
                <Popup>
                  <div className="text-center">
                    <strong>{loc.label}</strong> <br />
                    {loc.showRoute && (
                      <button
                        className="btn btn-primary mt-2 d-flex align-items-center"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${loc.position[0]},${loc.position[1]}`,
                            "_blank"
                          )
                        }
                      >
                        <i className="bi bi-geo-alt-fill me-1"></i> Ir até o cliente
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {parseFloat(distancia) > 3 && props.idjustificativa === 0 && (
          <div className="col-12">
            <div className="alert alert-danger text-center" role="alert">
              <h6>Você está muito distante do cliente!</h6>
              <button onClick={openModalItem} className="btn btn-danger mt-2 w-100">
                Justificar
              </button>
            </div>
          </div>
        )}

        {gpsAguardando && (
          <div className="col-12 mb-2">
            <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-0" role="alert">
              <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
              <span>
                Aguardando sinal de GPS preciso...
                {gpsAcuracia != null && ` (precisão atual: ~${gpsAcuracia}m)`}
              </span>
            </div>
          </div>
        )}

        {!gpsAguardando && gpsAcuracia != null && (
          <div className="col-12 mb-2">
            <div className={`alert py-2 mb-0 ${gpsAcuracia <= 50 ? 'alert-success' : 'alert-warning'}`}>
              <i className={`bi ${gpsAcuracia <= 50 ? 'bi-geo-alt-fill' : 'bi-exclamation-triangle'} me-1`}></i>
              Precisão do GPS: ~{gpsAcuracia}m
              {gpsAcuracia > 50 && ' — ative o GPS do dispositivo para melhor precisão'}
            </div>
          </div>
        )}

        <div className="col-md-2 mb-3">
          <label>Data Check-in<span className="text-danger">*</span></label>
          <input type="text" className="form-control" value={dataCheckIn} disabled />
        </div>

        <div className="col-md-4 mb-3">
          <label>Endereço Atual<span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            value={gpsAguardando && !enderecoPromotor ? "Obtendo localização precisa..." : enderecoPromotor || geolocationError || "Obtendo endereço..."}
            disabled
          />
        </div>

        <div className="col-md-4 mb-3">
          <label>Endereço Cliente<span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            value={enderecoCliente || "Obtendo endereço..."}
            disabled
          />
        </div>

        <div className="col-md-2 mb-3">
          <label>Distância em KM</label>
          <input
            type="text"
            className="form-control"
            value={distancia || "N/A"}
            disabled
          />
        </div>
      </div>
    </>
  );
}

export default Etapa2VisitaClienteCheckIn;
