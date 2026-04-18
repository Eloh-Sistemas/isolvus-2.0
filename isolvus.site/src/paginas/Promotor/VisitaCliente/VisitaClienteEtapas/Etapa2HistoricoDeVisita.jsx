import { useEffect, useState } from "react";
import './Etapa2HistoricoDeVisita.css';  // Importe o CSS
import moment from "moment";

function Etapa2HistoricoDeVisita(props) {

    useEffect(()=>{
        props.consultarHistorico();
    },[])

    function selecionaVisita(id_visita, dtcheckin){
        props.setStep(4);        
        props.setIdVisita(id_visita); 
        props.setDataCheckin(moment(dtcheckin).format("DD/MM/YYYY HH:mm:ss"));       
    }
    
    return (
        <div className="row">
            <div className="col-lg-12">
                <div>
                    <table className="table table-hover">
                        <tbody>
                            {props.historicodeVisita.length > 0 ? (
                                props.historicodeVisita.map((item) => (
                                    <tr key={item.id_visita} onClick={() => selecionaVisita(item.id_visita, item.dtcheckin)}>
                                        <td >{item.id_visita+' - '+item.status}</td>
                                        <td className="text-end">{moment(item.dtcheckin).format("DD/MM/YYYY HH:mm:ss")}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="text-center">
                                        Nenhum histórico encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Etapa2HistoricoDeVisita;
