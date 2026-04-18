import "./StatusListaPedido.css";

function StatusListaPedido(props) {

    if (props.psituacao == "P") {
        return <> <small className="FW600 Pendente">P</small> </>
    }else if (props.psituacao == "AT") {
        return <> <small className="FW600 Atribuido">A.T</small>  </>
    }else if (props.psituacao == "SI") {
        return <> <small className="FW600 Iniciado">S.I</small>  </>
    }else if (props.psituacao == "SF") {
        return <> <small className="FW600 Iniciado">S.F</small>  </>
    }else if (props.psituacao == "CI") {
        return <> <small className="FW600 Iniciado">C.I</small>  </>
    }else if (props.psituacao == "CF") {
        return <> <small className="FW600 Iniciado-finalizado">C.F</small>  </>
    }else if (props.psituacao == "FD") {
        return <> <small className="FW600 Divergencia">Divergencia</small>  </>
    }else if (props.psituacao == "TF") {
        return <> <small className="FW600 Transferido">T.F</small>  </>
    }                   

}

export default StatusListaPedido;