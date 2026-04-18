import "./StatusVeiculo.css";

function StatusVeiculo(props) {

    if (props.psituacao == "L") {
        return <> <small className="FW600 Livre">Livre</small> </>
    }else if (props.psituacao == "V") {
        return <> <small className="FW600 Viajando">Viajando</small>  </>
    }else if (props.psituacao == "I") {
        return <> <small className="FW600 Inativo">Inativo</small>  </>
    }             

}

export default StatusVeiculo;