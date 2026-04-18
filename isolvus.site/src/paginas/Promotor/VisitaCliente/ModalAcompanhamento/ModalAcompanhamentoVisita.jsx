import React, { useEffect, useState } from 'react';
import Modal from "react-modal/lib/components/Modal";
import api from '../../../../servidor/api';
import moment from 'moment';
import './ModalAcompanhamentoVisita.css';
import ModalAcompanhamentoVisitaDetalheAtividade from './ModalAcompanhamentoVisitaDetalheAtividade';

function ModalAcompanhamnetoVisita(props) {
    const [tabDados, setTabDados] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    const [isOpenAtividade, setisOpenAtividade] = useState(false);
    const [atividadeSelecionada, setatividadeSelecionada] = useState({});

    function buscaAtividades() {
        const jsonReq = {
            id_grupo_empresa: Number(localStorage.getItem("id_grupo_empresa")),
            id_cliente: props.atvcliselecionado.id_cliente,
            id_atividade: props.atvcliselecionado.id_atividade,
            data1: moment(props.dataInicial).format("DD/MM/YYYY"),
            data2: moment(props.dataFinal).format("DD/MM/YYYY")
        };

        api.post('v1/promotor/atividadeporcliente', jsonReq)
            .then((resposta) => {
                setTabDados(resposta.data);             
            })
            .catch((err) => {
                console.log(err);
            });
    }

    useEffect(() => {
        buscaAtividades();
    }, [props.atvcliselecionado.id_atividade, props.atvcliselecionado.id_cliente]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Bloqueia scroll da tela mãe quando modal está aberto
    useEffect(() => {
        if (props.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [props.isOpen]);

    // Agrupa tabDados por data formatada (DD/MM/YYYY) usando Map para manter a ordem original
    const groupedByDateMap = new Map();
    tabDados.forEach(item => {
        const date = moment(item.data).format("DD/MM/YYYY");
        if (!groupedByDateMap.has(date)) groupedByDateMap.set(date, []);
        groupedByDateMap.get(date).push(item);
    });

    const orderedDates = Array.from(groupedByDateMap.keys());    


    function abrirAtividade(item){           
        setatividadeSelecionada(item);
        setisOpenAtividade(true);        
    }

    function fechaAtividade(){
        setisOpenAtividade(false);
    }

    return (
        
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="full-modal-overlay"
            ariaHideApp={false}
            className="full-modal-content"
        >         

        <ModalAcompanhamentoVisitaDetalheAtividade
           isOpen={isOpenAtividade}
           onRequestClose={fechaAtividade}
           atividadeSelecionada={atividadeSelecionada}
        />

            <div className="bsmodal-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="bsmodal-header">
                    <h3 className="modal-title text-center bolt">LISTA DE ATIVIDADES</h3>
                    <h3 className="modal-title text-center">CLIENTE: {props.atvcliselecionado.cliente}</h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isMobile ? (
                        <div className="mobile-list">
                            {orderedDates.length > 0 ? (
                                orderedDates.map(date => (
                                    <div key={date}>
                                        {/* Linha da timeline com a data */}
                                        <div className="timeline-date-separator">
                                            ATIVIDADE DO DIA: {date}
                                        </div>

                                        {/* Cards daquele dia */}
                                        {groupedByDateMap.get(date).map((item, index) => (
                                            <div onClick={() => abrirAtividade(item)} key={index} className="mobile-card">
                                                <div className="mobile-card-row">
                                                    <span className="label">ID Visita:</span>
                                                    <span className="value">{item.id_visita}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Promotor:</span>
                                                    <span className="value">{item.promotor}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Atividade:</span>
                                                    <span className="value">{item.atividade}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Equipe:</span>
                                                    <span className="value">{item.equipe}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Qt. Pessoas:</span>
                                                    <span className="value">{item.qtpessoas}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Veterinário:</span>
                                                    <span className="value">{item.veterinario}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Venda:</span>
                                                    <span className="value">{item.houvevenda}</span>
                                                </div>
                                                <div className="mobile-card-row">
                                                    <span className="label">Realizada:</span>
                                                    <span className="value">{item.realizado}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center">Nenhum dado encontrado.</p>
                            )}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table tablefont table-hover mb-0" style={{ minWidth: '900px' }}>
                                <thead>
                                    <tr>
                                        <th>ID Visita</th>
                                        <th>Data</th>
                                        <th>Promotor</th>
                                        <th>Atividade</th>
                                        <th>Equipe</th>
                                        <th>Qt.Pessoas</th>
                                        <th>Veterinário</th>
                                        <th className="text-center">Venda</th>
                                        <th className="text-center">Realizada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabDados.length > 0 ? (
                                        tabDados.map((item, index) => (
                                            <tr key={index} onClick={() => abrirAtividade(item)}>
                                                <td>{item.id_visita}</td>
                                                <td>{moment(item.data).format("DD/MM/YYYY")}</td>
                                                <td>{`${item.id_promotor} - ${item.promotor}`}</td>
                                                <td>{`${item.id_atividade} - ${item.atividade}`}</td>
                                                <td>{item.equipe}</td>
                                                <td className='text-center'>{item.qtpessoas}</td>
                                                <td>{item.veterinario}</td>
                                                <td className="text-center">{item.houvevenda}</td>
                                                <td className="text-center">{item.realizado}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="text-center">
                                                Nenhum dado encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bsmodal-footer" style={{ justifyContent: 'flex-start' }}>
                    <button
                        onClick={props.onRequestClose}
                        type="button"
                        className="btn btn-secondary px-4"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ModalAcompanhamnetoVisita;
