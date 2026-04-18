import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from "react-leaflet";
import Modal from "react-modal/lib/components/Modal";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./AuditarLocalizacao.css";
import moment from 'moment';
import "./ModalAuditarLocalizacao.css";
import api from '../../servidor/api';
import { toast } from 'react-toastify';

function ModalAuditarLocalizacao(props){

    const [coordenadas, setCoordenadas] = useState([]);
    const [enderecoPromotor, setEnderecoPromotor] = useState(""); 
    const [geolocationError, setGeolocationError] = useState(null);
    const [location, setLocation] = useState(null);  

    const isValidLatLng = (lat, lng) => {
    if (lat == null || lng == null) {
      return false;
    }
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    const formatAddress = (address) => {
    const { road, suburb, city, town, state, postcode, country } = address;
    const cidade = city || town || "";
    return `${road || ""}, ${suburb || ""}, ${cidade}, ${state}, ${postcode || ""}, ${country || ""}`.replace(/ ,/g, "").trim();
  };

  

    // Função para garantir que a coordenada está no formato de ponto flutuante
    const parseCoordinate = (coord) => {
        if (typeof coord === 'string') {
            const cleanedCoord = coord.replace(',', '.');
            return parseFloat(cleanedCoord);
        }
        return parseFloat(coord);
    };


    function aceitar(){

        const jsonReq = {
            id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
            id_cliente: props.clienteSelecionado.id_cliente,
            latitude: parseCoordinate(props.clienteSelecionado.pro_latitude_checkin),
            longitude: parseCoordinate(props.clienteSelecionado.pro_longitude_checkin),
            id_usuario: localStorage.getItem("id_usuario"),
            idclientevendaerp: props.clienteSelecionado.idclientevendaerp
        }

        api.post('v1/Auditar/Localizacao/Aceitar', jsonReq)
        .then((resposta) =>{
            toast.success(resposta.data.mensagem,
                {onClose: props.onRequestClose}
            );            
        })
        .catch((err) =>{
            console.log(err.response.data);
            toast.error(err.response.data.message)
        });        

    }

    
    function rejeitar(){

        const jsonReq = {
            id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
            id_cliente: props.clienteSelecionado.id_cliente,
            id_usuario: localStorage.getItem("id_usuario")
        }

        api.post('v1/Auditar/Localizacao/Rejeitar', jsonReq)
        .then((resposta) =>{
            toast.success(resposta.data.mensagem,
                {onClose: props.onRequestClose}
            );            
        })
        .catch((err) =>{
            console.log(err);
            toast.error("Erro ao Rejeitar Geolocalização !")
        });        


    }

    useEffect(() => {
        // Define as coordenadas dos dois pontos
        const latitude_checkin = parseCoordinate(props.clienteSelecionado.pro_latitude_checkin);
        const longitude_checkin = parseCoordinate(props.clienteSelecionado.pro_longitude_checkin);
        const latitude_cliente = parseCoordinate(props.clienteSelecionado.latitude);
        const longitude_cliente = parseCoordinate(props.clienteSelecionado.longitude);
      
        const coords = [
            {
                position: [latitude_checkin, longitude_checkin],
                label: "Localização Solicitada",
                color: "blue" // Marcador azul
            },
            {
                position: [latitude_cliente, longitude_cliente],
                label: "Localização Cadastrada",
                color: "red" // Marcador vermelho
            }
        ];


        setCoordenadas(coords);
    }, [props.clienteSelecionado]);

      
      useEffect(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                if (isValidLatLng(latitude, longitude)) {
                  setLocation({ lat: latitude, lng: longitude });
      
                  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                      setEnderecoPromotor(formatAddress(data.address));
                    })
                    .catch(error => console.error('Erro ao obter o endereço:', error));
                } else {
                  setLocation({ lat: 0, lng: 0 });
                  setGeolocationError("Localização inválida, usando coordenadas padrão.");
                }
              },
              (error) => {
                setLocation({ lat: 0, lng: 0 });
                setGeolocationError("Erro ao obter a localização. Verifique as permissões de geolocalização.");
                console.error("Erro ao obter a localização:", error);
              },
              { timeout: 10000 }
            );
          } else {
            setLocation({ lat: 0, lng: 0 });
            setGeolocationError("Geolocalização não é suportada pelo seu navegador.");
          }
        }, []);


    // Função para criar ícones de pin personalizados com cores
    const createCustomPin = (color) => {
        return new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            shadowSize: [41, 41]
        });
    };

    const MarkersLayer = () => {
        const map = useMap();

        useEffect(() => {
            if (!coordenadas || coordenadas.length === 0) return;
    
            // Filtra coordenadas válidas para o fitBounds
            const validCoords = coordenadas.filter(coord => 
                coord.position && coord.position.length === 2 && !isNaN(coord.position[0]) && !isNaN(coord.position[1])
            );

            if (validCoords.length > 0) {
                const bounds = L.latLngBounds(validCoords.map(p => p.position));
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }, [map, coordenadas]);

        return (
            <>
                {coordenadas.map((coord, index) => {
                    // Renderiza apenas se a posição for válida
                    if (coord.position && coord.position.length === 2 && !isNaN(coord.position[0]) && !isNaN(coord.position[1])) {
                        return (
                            <Marker 
                                key={index} 
                                position={coord.position} 
                                icon={createCustomPin(coord.color)}
                            >
                                <Popup>
                                    <strong>{coord.label}</strong>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </>
        );
    };

    return(
        <>
            <Modal
                isOpen={props.isOpen}
                onRequestClose={props.onRequestClose}
                overlayClassName="react-modal-overlay"
                ariaHideApp={false}
                className="react-modal-content"
            >
                <div className="bsmodal-content">
                    <div className="bsmodal-header">
                        <h3 className="modal-title text-center bolt">AJUSTE DE GEOLOCALIZAÇÃO</h3>
                    </div>

                    <div className="col-12">
                        <h4 className="section-title text-center">Divergência Sinalizada</h4>
                    </div>

                    {/* Mapa */}
                    <div className="col-lg-12 mb-3">
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

                    {/* Campos */}
                    <div className='row'>
                        <div className="col-12">
                            <h4 className="section-title text-center">Solicitação de Ajuste</h4>
                        </div>
                        <div className="col-lg-10 mt-2">
                            <label htmlFor="cliente" className="mb-2">Usuário Solicitante</label>
                            <input                                
                                disabled
                                type="text"
                                className="form-control mb-2"
                                id="cliente"
                                placeholder="Usuário"
                                value={props.clienteSelecionado.id_promotor+' - '+props.clienteSelecionado.nome}
                            />
                        </div>
                        <div className="col-lg-2 mt-2">
                            <label htmlFor="cgc" className="mb-2">Data da Solicitação</label>
                            <input
                                disabled
                                type="text"
                                className="form-control mb-2"
                                id="cgc"
                                placeholder="Data"
                                value={moment(props.clienteSelecionado.dtcheckin).format("DD/MM/YYYY HH:mm")}
                            />
                        </div>
                        <div className="col-lg-10 mt-2">
                            <label htmlFor="cliente" className="mb-2">Cliente</label>
                            <input
                                disabled
                                type="text"
                                className="form-control mb-2"
                                id="cliente"
                                placeholder="Cliente"
                                value={props.clienteSelecionado.id_cliente+' - '+props.clienteSelecionado.cliente}
                            />
                        </div>
                        <div className="col-lg-2 mt-2">
                            <label htmlFor="cgc" className="mb-2">CPF / CNPJ</label>
                            <input
                                disabled
                                type="text"
                                className="form-control mb-2"
                                id="cgc"
                                placeholder="CPF / CNPJ"
                                value={props.clienteSelecionado.cgc}
                            />
                        </div>
                        <div className="col-lg-5 mt-2">
                            <label htmlFor="cliente" className="mb-2">Endereço Cadastrado</label>
                            <textarea className="form-control" 
                                      id="Objetivo" rows="2" 
                                      value={(props.clienteSelecionado.enderecoatual || "Não cadastrado").toUpperCase()} 
                                      disabled       
                                      ></textarea>
                        </div>
                        <div className="col-lg-5 mt-2">
                            <label htmlFor="cliente" className="mb-2">Endereço do Check-in</label>                               
                            <textarea className="form-control" 
                                      id="Objetivo" rows="2" 
                                      value={(enderecoPromotor || "Não encontrado").toUpperCase()} 
                                      disabled       
                                      ></textarea>
                        </div>
                        <div className="col-lg-2 mt-2">
                            <label htmlFor="cliente" className="mb-2">{"Diferença de Distância"}</label>
                            <textarea className="form-control" 
                                      id="Objetivo" rows="2" 
                                      value={props.clienteSelecionado.distancia_atedimento+' KM'} 
                                      disabled       
                                      ></textarea>
                        </div>
                        <div className="col-lg-12 mt-2">
                            <label htmlFor="cliente" className="mb-2">Justificativa</label>
                            <input
                                disabled
                                type="text"
                                className="form-control mb-2"
                                id="cliente"
                                placeholder="Justificativa"
                                value={props.clienteSelecionado.justificativa}
                            />
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="bsmodal-footer">
                        <p className="d-flex mb-1 justify-content-between">
                            <button autoFocus type="button" className="btn btn-secondary px-lg-4 m-1" 
                                onClick={props.onRequestClose}
                            >Voltar</button>
                            <button onClick={rejeitar} type="button" className="btn btn-warning px-lg-4 m-1">Rejeitar</button>
                            <button onClick={aceitar} type="button" className="btn btn-primary px-lg-4 m-1">Aceitar</button>
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default ModalAuditarLocalizacao;