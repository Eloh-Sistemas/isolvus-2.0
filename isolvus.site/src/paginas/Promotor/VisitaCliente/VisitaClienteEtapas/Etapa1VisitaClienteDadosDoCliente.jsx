import { useEffect, useState } from "react";
import EditComplete from "../../../../componentes/EditComplete/EditComplete";
import api from "../../../../servidor/api";

function Etapa1VisitaClienteDadosDoCliente(props){

    const [Id_Cliente, Set_Id_Cliente] = useState(0);
    const [Cliente, SetCliente] = useState("");    

    const [cgc, setcgc] = useState("");
    const [contato, setcontato] = useState("");
    const [email, setemail] = useState("");    
    const [promotor, setpromotor] = useState("");  


    const formatarTelefone = (telefone) => {
        telefone = telefone.replace(/\D/g, ''); // Remove tudo que não for número
        if (telefone.length === 11) {
            return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); // Formato (XX) XXXXX-XXXX
        } else if (telefone.length === 10) {
            return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); // Formato (XX) XXXX-XXXX
        }
        return telefone; // Retorna sem formatação se não tiver 10 ou 11 dígitos
    };
    
    const formatarCgc = (cgc) => {
        cgc = cgc.replace(/\D/g, ''); // Remove tudo que não for número
        if (cgc.length === 11) {
            return cgc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); // Formato CPF XXX.XXX.XXX-XX
        } else if (cgc.length === 14) {
            return cgc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); // Formato CNPJ XX.XXX.XXX/XXXX-XX
        }
        return cgc; // Retorna sem formatação se não for CPF ou CNPJ válido
    };

    function consultarClienteCompleto(Id_Cliente){


        

        if (Id_Cliente != 0){
            api.post('/v1/consultarClienteID',{ id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), idclientevenda: Id_Cliente})
            .then ((resposta) =>{

                props.OnSelecionaCliente(resposta.data);

                setcgc(formatarCgc(resposta.data.cgc));
                setcontato(formatarTelefone(resposta.data.contato));
                setemail(resposta.data.email);


            })
            .then((err) =>{
                console.log(err)
            })
        }        

    }


    useEffect( () =>{
       consultarClienteCompleto(Id_Cliente);
    },[Id_Cliente])

    useEffect(() =>{
        setpromotor(localStorage.getItem("id_usuario_erp")+' - '+localStorage.getItem("nome"));
    },[])

    
    return<>
      <div className="row tabela-container">
            
            <div className="col-md-4 mb-3">
            <label htmlFor="cl-1" className="mb-2">Informe o Cliente<span className="text-danger">*</span></label>
            <EditComplete   autoFocus placeholder={"Informe o cliente"} id={"cl-1"}  
                            isMultiSelect={false}                             
                            onClickCodigo={Set_Id_Cliente} 
                            onClickDescricao={SetCliente}
                            value={Cliente} 
                            />
            </div>

            <div className="col-md-4 mb-3">
            <label htmlFor="codigo" className="mb-2">CPF / CNPJ</label>
            <input
                type="text"
                className="form-control"
                id="cgc"
                placeholder="CPF / CNPJ"
                value={cgc}
                disabled                           
                //onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            </div>

            <div className="col-md-4 mb-3">
            <label htmlFor="codigo" className="mb-2">Telefone</label>
            <input
                type="text"
                className="form-control"
                id="cgc"
                placeholder="Telefone para contato"
                value={contato}
                disabled                           
                //onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            </div>

            <div className="col-md-4 mb-3">
            <label htmlFor="codigo" className="mb-2">E-mail</label>
            <input
                type="text"
                className="form-control"
                id="cgc"
                placeholder="E-mail"
                value={email}
                disabled                           
                //onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            </div>

            <div className="col-md-4 mb-3">
            <label htmlFor="codigo" className="mb-2">Promotor Técnico</label>
            <input
                type="text"
                className="form-control"
                id="cgc"
                placeholder="Promotor Técnico"
                value={promotor}
                disabled                           
                //onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
            </div>

            <div className="col-md-4 mb-3">
            <label htmlFor="codigo" className="mb-2">Responsável pelo atendimento no local<span className="text-danger">*</span></label>
            <input
                type="text"
                className="form-control mb-4"
                id="cgc"
                placeholder="Responsável pelo atendimento no local"
                value={props.responsavel}  // Agora pega do pai corretamente
                onChange={(e) => {
                    const valor = e.target.value.toUpperCase();
                    props.setResponsavel(valor);  // Atualiza diretamente no pai
                }}
            />
            </div>

            
          
      </div>
    </>
}

export default Etapa1VisitaClienteDadosDoCliente;