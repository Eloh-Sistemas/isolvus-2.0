import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import PreCadastroClienteEtapa1 from "./PrecadastroClienteEtapas/PreCadastroClienteEtapa1";
import PreCadastroClienteEtapa2 from "./PrecadastroClienteEtapas/PreCadastroClienteEtapa2";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import api from "../../servidor/api";

function PreCadastroCliente() {

    

    const [step, setStep] = useState(0);
    const [codigo, setcodigo] = useState(0);
    const [cpf, setcpf] = useState("");
    const [nome, setnome] = useState("");
    const [contato, setcontato] = useState("");
    const [disableBtnCadastrar, setdisableBtnCadastrar] = useState(true);

    function setarIdGrupoSeNaoTiver(){
        if (!localStorage.getItem("id_grupo_empresa")) {
            // Se não existir, cria com o código 1
            localStorage.setItem("id_grupo_empresa", "1");
        }
    }

    useEffect(()=>{
        setarIdGrupoSeNaoTiver();
    },[])


    useEffect(()=>{
        if (cpf.trim() == ""){
            setdisableBtnCadastrar(true);
        }
    },[cpf])

    function validarCPF(cpf) {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(10))) return false;

        return true;
    }

    function validarNome(nome) {
        return nome.trim().length >= 3;
    }

    function validarContato(contato) {
        const telefoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
        return telefoneRegex.test(contato);
    }

    function cadastrar() {

       const jsonReq = {
          cgcEnt: cpf,
          clienteNome: nome,
          telEnt: contato,
          grupoEmpresa: localStorage.getItem("id_grupo_empresa")
       }

       api.post('v1/clientes', jsonReq)
       .then( (resp) =>{

            if (resp.status === 201){

                Swal.fire({
                icon: 'success',
                title: resp.data.mensagem,
                html: `
                    <p>Código do cliente:</p>
                    <div style="font-size: 2rem; font-weight: 700; color: #3085d6;">
                    ${resp.data.cliente.IDCLIENTEVENDAERP || resp.data.cliente.IDCLIENTEVENDA}
                    </div>
                `,
                confirmButtonText: 'OK',
                });

            }else if (resp.status === 200){

                const idcli = resp.data.cliente.IDCLIENTEVENDAERP || resp.data.cliente.IDCLIENTEVENDA;
                
                Swal.fire({
                icon: 'warning',
                title: resp.data.mensagem,
                html: `
                    <p>Código do cliente:</p>
                    <div style="font-size: 2rem; font-weight: 700; color: #3085d6;">
                    ${idcli|| 'N/A'}
                    </div>
                `,
                confirmButtonText: 'OK',
                });

            }            
            
            

       })
       .catch( (err) =>{
           console.error(err.response.data.erro);

                Swal.fire({
                icon: 'error',
                title: err.response.data.mensagem,
                confirmButtonText: 'OK',
                });
         
       });

      



      setStep(0);
      // Se quiser limpar campos:
      setcpf(''); setnome(''); setcontato(''); setcodigo('');
    }

    function voltar() {
        setStep(step - 1);
    }

    function proximo() {
        if (step === 0) {
            if (!cpf) {
                toast.warn('CPF não informado!');
            } else if (!validarCPF(cpf)) {
                toast.error('CPF inválido!');
            } else if (!nome) {
                toast.warn('Nome não informado!');
            } else if (!validarNome(nome)) {
                toast.error('Nome deve ter no mínimo 3 caracteres!');
            } else if (!contato) {
                toast.warn('Contato não informado!');
            } else if (!validarContato(contato)) {
                toast.error(<>
                              Contato inválido!
                              <br />
                              Exemplo: (11) 91234-5678
                            </>);
            } else {
                setStep(step + 1);
            }
        } else if (step === 1) {
            cadastrar(); // Finaliza aqui
        }
    }

    return (
        <>
            <Menu />
            <div className="container-fluid Containe-Tela">
                <div className="row text-body-secondary mb-2">
                    <h1 className="mb-4 titulo-da-pagina">Pré-Cadastro de Cliente</h1>
                </div>

                {step === 0 && (
                    <PreCadastroClienteEtapa1
                        setcodigo={setcodigo}
                        setcpf={setcpf}
                        setnome={setnome}
                        setcontato={setcontato}
                        setdisableBtnCadastrar={setdisableBtnCadastrar}
                        codigo={codigo}
                        cpf={cpf}
                        nome={nome}
                        contato={contato}
                    />
                )}

                {step === 1 && (
                    <PreCadastroClienteEtapa2
                        cpf={cpf}
                        nome={nome}
                        contato={contato}
                    />
                )}
            </div>

            <div className="d-flex justify-content-between p-2 conteiner-botoes">
                {step > 0 && (
                    <button className="btn btn-secondary" onClick={voltar}>
                        Voltar
                    </button>
                )}
                {step <= 1 && (
                    <button
                        className={`btn ${step === 1 ? 'btn-success' : 'btn-primary'} ms-auto`}
                        onClick={proximo}
                        disabled={disableBtnCadastrar}
                    >
                        {step === 1 ? 'Finalizar' : 'Cadastrar'}
                    </button>
                )}
            </div>
            <ToastContainer position="top-center" autoClose={2000} />
        </>
    );
}

export default PreCadastroCliente;
