import "./StatusSolicitacaoDespesa.css";

function StatusSolicitacaoDespesa (props) {
 
    if (props.status == "A") {
        return <> <small className="FW600 Aberto">PEND. CONTROLADORIA</small> </>
    }else if (props.status == "EA") {
        return <> <small className="FW600 Analise">PEND. ORDENADOR</small>  </>
    }else if (props.status == "AJ") {
        return <> <small className="FW600 ajustar">AJUSTAR ORÇAMENTO</small>  </>
    }else if (props.status == "L") {
        return <> <small className="FW600 Liberado">PEND. FINANCEIRO</small>  </>
    }else if (props.status == "P") {
        return <> <small className="FW600 Pedenete">PEND. SOLICITANTE</small>  </>
    }else if (props.status == "N") {
        return <> <small className="FW600 Negado">NEGADO. ORDENADOR</small>  </>
    }else if (props.status == "F") {
        return <> <small className="FW600 Finalizado">PEND. INTEGRAÇÃO</small> </>
    }else if (props.status == "I") {
        return <> <small className="FW600 Integrado"> WINTHOR ({props.rotina && props.rotina}) </small> </>
    }

}

export default StatusSolicitacaoDespesa;