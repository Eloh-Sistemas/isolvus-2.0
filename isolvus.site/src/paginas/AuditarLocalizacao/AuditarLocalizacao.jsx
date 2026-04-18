import React, { useEffect, useState } from 'react';
import Menu from "../../componentes/Menu/Menu";
import moment from 'moment';
import ModalAuditarLocalizacao from './ModalAuditarLocalizacao';
import api from '../../servidor/api';
import { ToastContainer } from 'react-toastify';


function AuditarLocalizacao() {
    const [tabDados, setTabDados] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [filtroCliente, setFiltroCliente] = useState('');
    const [clienteSelecionado, setClienteSelecionado] = useState({});

    const [isOpen , setisOpen] = useState(false);

    function onRequestClose () {
        setisOpen(false);
        ListarPendenciaGeoLocalizacao();
    }

    function selecionaCliente(cliente){
        setClienteSelecionado(cliente);
        setisOpen(true);
    }


    function ListarPendenciaGeoLocalizacao(){

            const jsonReq = {
                id_grupo_empresa: localStorage.getItem("id_grupo_empresa"),
                filtro: filtroCliente 
            }

            api.post('v1/Auditar/Localizacao/Listar', jsonReq)
            .then( (reposta)=> {
                setTabDados(reposta.data);
            })
            .catch( (err)=>{
                console.log(err);
            })
    
    }


    useEffect( ()=>{
        ListarPendenciaGeoLocalizacao();
    },[filtroCliente])


    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    function handleFiltroChange (cliente) {
        setFiltroCliente(cliente);
    };

    const dadosFiltrados = tabDados.filter(item =>
        item.cliente.toLowerCase().includes(filtroCliente.toLowerCase()) ||
        item.cgc.includes(filtroCliente)
    );

    return (
        <>
            <Menu/>

            <ModalAuditarLocalizacao 
                isOpen={isOpen}
                onRequestClose={onRequestClose} 
                clienteSelecionado = {clienteSelecionado}  
                ListarPendenciaGeoLocalizacao={ListarPendenciaGeoLocalizacao}             
            />

            <div className="container-fluid Containe-Tela">
                <div className="row text-body-secondary mb-2">
                    <h1 className="mb-4 titulo-da-pagina">Auditar Localização</h1>
                </div>

                {/* --- Container do Filtro e da Tabela --- */}
                <div className="row">
                    <div className="col-12 mb-4">
                        <label htmlFor="inputCliente" className="mb-2">Cliente</label>
                        <input
                            autoFocus
                            type="text"
                            className="form-control"
                            id="inputCliente"
                            placeholder="Nome, CPF ou CNPJ"
                            value={filtroCliente}
                            onChange={(e) => handleFiltroChange(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>

                {/* --- Tabela de Auditoria (Responsiva) --- */}
                <div className="row">
                    <div className="col-12">
                        {isMobile ? (
                            <div className="mobile-list">
                                {dadosFiltrados.length > 0 ? (
                                    dadosFiltrados.map((item, index) => (
                                        <div key={index} className="mobile-card" onClick={() => selecionaCliente(item)}>
                                            <div className="mobile-card-row">
                                                <span className="label">Cliente:</span>
                                                <span className="value">{item.id_cliente+' - '+item.cliente}</span>
                                            </div>
                                            <div className="mobile-card-row">
                                                <span className="label">CPF/CNPJ:</span>
                                                <span className="value">{item.cgc}</span>
                                            </div>
                                            <div className="mobile-card-row">
                                                <span className="label">Promotor:</span>
                                                <span className="value">{item.id_promotor+' - '+item.nome}</span>
                                            </div>
                                            <div className="mobile-card-row">
                                                <span className="label">Distância:</span>
                                                <span className="value">{item.distancia_atedimento+" KM"}</span>
                                            </div>
                                            <div className="mobile-card-row">
                                                <span className="label">Data da Solcitação:</span>
                                                <span className="value">{moment(item.dtcheckin).format("DD/MM/YYYY HH:mm")}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center">Nenhum dado encontrado.</p>
                                )}
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className='Titulos-Table'>
                                        <tr>
                                            <th scope="col-4">Cliente</th>
                                            <th scope="col-2">CPF/CNPJ</th>
                                            <th scope="col-4">Promotor</th>
                                            <th scope="col-1">Distância</th>
                                            <th scope="col-1">Data da Solcitação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dadosFiltrados.length > 0 ? (
                                            dadosFiltrados.map((item, index) => (
                                                <tr className='item-Table' key={index} onClick={() => selecionaCliente(item)}>
                                                    <td>{item.id_cliente+' - '+item.cliente}</td>
                                                    <td>{item.cgc}</td>
                                                    <td>{item.id_promotor+' - '+item.nome}</td>
                                                    <td>{item.distancia_atedimento}</td>
                                                    <td>{moment(item.dtcheckin).format("DD/MM/YYYY HH:mm")}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center">Nenhum dado encontrado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ToastContainer position="top-center" autoClose={1500}/>
        </>
    );
}

export default AuditarLocalizacao;