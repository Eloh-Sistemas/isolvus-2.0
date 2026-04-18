import { toast } from "react-toastify";
import api from "../../../servidor/api";

function PreCadastroClienteEtapa1(props) {
    const formatCPF = (value) => {
        return value
            .replace(/\D/g, '') // Remove não dígitos
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };

    const formatTelefone = (value) => {
        return value
            .replace(/\D/g, '') // Remove não dígitos
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d{4})$/, '$1-$2');
    };


    const consultaCGC = (cgc) => {
        api.get('v1/clientes/'+(cgc || '').replace(/\D/g, ''))
        .then((resposta) =>{                           

            toast.success('Cliete ja cadastrado');
            props.setcodigo(resposta.data.cliente.IDCLIENTEVENDAERP || resposta.data.cliente.IDCLIENTEVENDA);         
            props.setnome(resposta.data.cliente.CLIENTE);  
            props.setcontato(resposta.data.cliente.CONTATO);   
            props.setdisableBtnCadastrar(true);                             

        })
        .catch((err) =>{
            if (err.status === 404){
                toast.warn(err.response.data.mensagem);
                props.setcodigo(0);         
                props.setnome("");  
                props.setcontato(""); 
                props.setdisableBtnCadastrar(false);
            }            
        })
    }

    return (
        <div className="row align-items-center">
            <div className="col-lg-2 d-flex mb-2">
                <div className="flex-grow-1 me-3">
                    <label htmlFor="cpf" className="mb-2">CPF</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        id="cpf"
                        placeholder="Informe o CPF"
                        value={props.cpf}
                        maxLength={14}
                        onChange={(e) => props.setcpf(formatCPF(e.target.value))}
                        onBlur={(e) => consultaCGC(e.target.value)}
                    />
                </div>
            </div>

            <div className="col-lg-1 d-flex mb-2">
                <div className="flex-grow-1 me-3">
                    <label htmlFor="codigo" className="mb-2">Código</label>
                    <input
                        disabled
                        type="text"
                        className="form-control"
                        id="codigo"
                        placeholder="0"
                        value={props.codigo}
                        onChange={(e) => props.setcodigo(e.target.value.toUpperCase())}
                    />
                </div>
            </div>

            <div className="col-lg-7 d-flex mb-2">
                <div className="flex-grow-1 me-3">
                    <label htmlFor="nome" className="mb-2">Nome</label>
                    <input
                        type="text"
                        className="form-control"
                        id="nome"
                        placeholder="Informe o nome"
                        value={props.nome}
                        onChange={(e) => props.setnome(e.target.value.toUpperCase())}
                    />
                </div>
            </div>

            <div className="col-lg-2 d-flex mb-2">
                <div className="flex-grow-1 me-3">
                    <label htmlFor="contato" className="mb-2">Contato</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="form-control"
                        id="contato"
                        placeholder="Informe o contato"
                        value={props.contato}
                        maxLength={15}
                        onChange={(e) => props.setcontato(formatTelefone(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
}

export default PreCadastroClienteEtapa1;
