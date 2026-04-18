import './PreCadastrpClienteEtapa2.css';

function PreCadastroClienteEtapa2(props) {
    return (
        <div className="resumo-wrapper">
            <div className="resumo-card">
                <h2 className="resumo-titulo">Confirmando dados do cliente</h2>

                <div className="resumo-item">
                    <span className="resumo-label">
                        <i className="bi bi-person-fill me-2"></i> Nome:
                    </span>
                    <span className="resumo-value">{props.nome}</span>
                </div>

                <div className="resumo-item">
                    <span className="resumo-label">
                        <i className="bi bi-credit-card-2-front-fill me-2"></i> CPF:
                    </span>
                    <span className="resumo-value">{props.cpf}</span>
                </div>

                <div className="resumo-item">
                    <span className="resumo-label">
                        <i className="bi bi-telephone-fill me-2"></i> Contato:
                    </span>
                    <span className="resumo-value">{props.contato}</span>
                </div>
            </div>
        </div>
    );
}

export default PreCadastroClienteEtapa2;
