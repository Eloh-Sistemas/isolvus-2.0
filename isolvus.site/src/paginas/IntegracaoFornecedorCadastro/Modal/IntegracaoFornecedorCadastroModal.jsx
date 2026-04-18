import Modal from 'react-modal/lib/components/Modal';
import "./IntegracaoFornecedorCadastroModal.css";
import EditComplete from '../../../componentes/EditComplete/EditComplete';
import { useEffect,  useState } from 'react';
import api from '../../../servidor/api';
import { toast, ToastContainer } from 'react-toastify';

function IntegracaoFornecedorCadastroModal(props) {
    
    const [CodFilial, setCodFilial] = useState(0);
    const [descricaoFilial, setDescricaoFilial] = useState("");
    const [codFornecedor, setCodFornecedor] = useState(0);
    const [descricaoFornecedor, setDescricaoFornecedor] = useState("");
    const [nomearquivo, setNomearquivo] = useState("");
    const [sql, setSQL] = useState("");
    const [tipoconexao, setTipoConexao] = useState("C");
    const [tipoarquivo, settipoarquivo] = useState("txt");
    const [status, setstatus] = useState("A");
    const [idintegracao, setidintegracao] = useState(0);
    const [separador, setseparador] = useState("");
    const [gerarcoluna, setgerarcoluna] = useState("N");


    function excluir(){

        const id1 = toast.loading("Processando...", {position : "top-center"});

        api.post('/v1/IntegracaoFornecedor/exluir', { id_grupo_empresa: localStorage.getItem('id_grupo_empresa') ,id_intfornec: idintegracao})
            .then((retorno) =>{
                toast.update(id1, {
                    render: retorno.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : onClose(2550)
                });  
            })
            .catch((err)=>{
                console.log(err);
            });
    }

    function onClose(timeout){      
        setTimeout(() => {
            props.consultar();
            props.onRequestClose();   
        }, timeout);          
    }


    function salvar(){

        const id1 = toast.loading("Processando...", {position : "top-center"});

        if (idintegracao == 0 || !idintegracao) {


            const jsonReq = {
                nomedoarquivo: nomearquivo,
                psql: sql,
                id_fornecerp: codFornecedor,
                id_grupo_empresa: localStorage.getItem('id_grupo_empresa'),
                id_funcultalt: localStorage.getItem('id_usuario_erp'),
                id_filialerp: CodFilial,
                basededados: tipoconexao,
                tipodoarquivo: tipoarquivo ,
                status: status,
                separador: separador,
                gerarcoluna: gerarcoluna   
            }

            api.post('/v1/IntegracaoFornecedor/cadastrar', jsonReq)
            .then((retorno) =>{
                toast.update(id1, {
                    render: retorno.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : onClose(2550)
                });  
            })
            .catch((err)=>{
                console.log(err);
            });

        }else{                   

            const jsonReq = {
                nomedoarquivo: nomearquivo,
                psql: sql,
                id_fornecerp: codFornecedor,
                id_grupo_empresa: localStorage.getItem('id_grupo_empresa'),
                id_funcultalt: localStorage.getItem('id_usuario_erp'),
                id_filialerp: CodFilial,
                basededados: tipoconexao,
                tipodoarquivo: tipoarquivo,
                id_intfornec: idintegracao,
                status: status,
                separador: separador,
                gerarcoluna: gerarcoluna 
            }

            api.post('/v1/IntegracaoFornecedor/alterar', jsonReq)
            .then((retorno) =>{
                toast.update(id1, {
                    render: retorno.data.mensagem, 
                    type: "success", 
                    isLoading: false,                             
                    autoClose: 1700,
                    pauseOnHover: false,
                    onclose : onClose(2550)
                }); 
            })
            .catch((err)=>{
                console.log(err);
            });

        }        

    }


    useEffect(()=>{

        setCodFilial(props.IdItemSelecionado.id_filialerp);
        setDescricaoFilial(props.IdItemSelecionado.razaosocial);
        setCodFornecedor(props.IdItemSelecionado.id_fornecerp);
        setDescricaoFornecedor(props.IdItemSelecionado.fornecedor);
        setNomearquivo(props.IdItemSelecionado.nomedoarquivo);
        settipoarquivo(props.IdItemSelecionado.tipodoarquivo? props.IdItemSelecionado.tipodoarquivo: "txt");
        setTipoConexao(props.IdItemSelecionado.basededados? props.IdItemSelecionado.basededados: "C");
        setSQL(props.IdItemSelecionado.psql);
        setidintegracao(props.IdItemSelecionado.id_intfornec);
        setstatus(props.IdItemSelecionado.status? props.IdItemSelecionado.status: "A");
        setseparador(props.IdItemSelecionado.separador);
        setgerarcoluna(props.IdItemSelecionado.gerarcoluna? props.IdItemSelecionado.gerarcoluna: "N");
        
    },[props.IdItemSelecionado]);

    return (
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            overlayClassName="react-modal-overlay"
            ariaHideApp={false}
            className="react-modal-content"
        >
            <div className="bsmodal-content">
                <div className="bsmodal-header mt-2">
                    <label>Cadastro de Integração</label>
                </div>

                <div className="bsmodal-body">
                    <div className="row">
                        <div className="row align-items-center mb-4">
                            <div className="col-lg-3 mb-3">
                                <label htmlFor="fl" className="mb-2">Filial</label>
                                <EditComplete
                                    placeholder={"Filial"}
                                    id={"fl"}
                                    tipoConsulta={"fl"}
                                    onClickCodigo={setCodFilial}
                                    onClickDescricao={setDescricaoFilial}
                                    value={descricaoFilial}
                                    disabled={false}
                                />
                            </div>

                            <div className="col-lg-3 mb-3">
                                <label htmlFor="fo" className="mb-2">Fornecedor</label>
                                <EditComplete
                                    placeholder={"Fornecedor"}
                                    id={"fo"}
                                    tipoConsulta={"fo"}
                                    onClickCodigo={setCodFornecedor}
                                    onClickDescricao={setDescricaoFornecedor}
                                    value={descricaoFornecedor}
                                    disabled={false}
                                />
                            </div>

                            <div className="col-lg-5 mb-3">
                                <label htmlFor="Veiculo" className="mb-2">Nome do Arquivo</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="Veiculo"
                                    placeholder="Informe o nome do arquivo"
                                    value={nomearquivo}
                                    onChange={(e) => setNomearquivo(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="col-lg-1 mb-3">
                                <label htmlFor="SelecaoStatus" className="mb-2">Extensão</label>
                                <select value={tipoarquivo} onChange={(e) => settipoarquivo(e.target.value)} className="form-control" id="SelecaoStatus" disabled={false}>
                                    <option value={"txt"}>.TXT</option>
                                    <option value={"csv"}>.CSV</option>
                                    <option value={"xlsx"}>.XLSX</option>                                    
                                </select>
                            </div>

                            <div className="col-lg-3 mb-3">
                                <label htmlFor="tipoconexao" className="mb-2">Conexão</label>
                                <select
                                    className="form-control"
                                    id="tipoconexao"
                                    onChange={(e) => setTipoConexao(e.target.value)}
                                    value={tipoconexao}
                                    disabled={false}
                                >
                                    <option value={"C"}>Base de Dados ERP</option>
                                    <option value={"L"}>Base de Dados Intranet</option>
                                </select>
                            </div>

                            <div className="col-lg-1 mb-3">
                                <label htmlFor="SelecaoStatus" className="mb-2">Status</label>
                                <select value={status} onChange={(e) => setstatus(e.target.value)} className="form-control" id="SelecaoStatus" disabled={false}>
                                    <option value={"A"}>Ativo</option>
                                    <option value={"I"}>Inativo</option>                                 
                                </select>
                            </div>

                            <div className="col-lg-1 mb-3">
                                <label htmlFor="SelecaoStatus" className="mb-2">Separador</label>
                                <input value={separador} onChange={(e) => setseparador(e.target.value)} className="form-control" id="SelecaoStatus" disabled={false} maxLength={1}/>
                            </div>

                            <div className="col-lg-1 mb-3">
                                <label htmlFor="SelecaoStatus" className="mb-2">Gerar Coluna</label>
                                <select value={gerarcoluna} onChange={(e) => setgerarcoluna(e.target.value)} className="form-control" id="SelecaoStatus" disabled={false}>
                                    <option value={"S"}>Sim</option>
                                    <option value={"N"}>Não</option>                                 
                                </select>
                            </div>


                            <div className=' col-12'>
                                <div className="d-flex align-items-center mb-3 text-ceter">
                                <h6 className="m-2">
                                <span style={{ fontSize: '13px' }}>
                                    <i className="bi bi-exclamation-circle-fill text-warning"> </i>
                                    <strong>Parametros:</strong> 
                                </span>
                                </h6>
                                <h6 className="m-2">
                                <span style={{ fontSize: '13px' }}>{`(Filial => :codfilial)`}</span>
                                </h6>
                                <h6 className="m-2">
                                <span style={{ fontSize: '13px' }}>{`(Fornecedor => :codfornec)`}</span>
                                </h6>
                                <h6 className="m-2">
                                <span style={{ fontSize: '13px' }}>{`(Data Inicial => :data1)`}</span>
                                </h6>
                                <h6 className="m-2">
                                <span style={{ fontSize: '13px' }}>{`(Data Final => :data2)`}</span>
                                </h6>
                            </div>
                            </div>
                            

                            <div className="col-12 mb-3">
                                <label htmlFor="Objetivo" className="mb-2">SQL</label>
                                <textarea
                                    className="form-control"
                                    id="Objetivo"
                                    rows="10"
                                    value={sql}
                                    onChange={(e) => setSQL(e.target.value)}
                                    placeholder={`Select [dados] as arquivo
    from [tabela] 
    where [filial] 
    and [fornecedor] 
    and [data1] and [data2]`}
                                    disabled={false}
                                ></textarea>
                            </div>
                           
                        </div>
                    </div>
                </div>

                <div className="bsmodal-footer">
                    <p className="d-flex mb-1 justify-content-between">
                        <button
                            type="button"
                            className="btn btn-secondary px-lg-4 m-1"
                            onClick={props.onRequestClose}
                        >
                            <i className="bi bi-arrow-left"></i> Voltar
                        </button>

                        <button onClick={excluir} type="button" className="btn btn-danger px-lg-4 m-1">
                            <i className="bi bi-trash-fill"></i> Excluir
                        </button>

                        <button onClick={salvar} type="button" className="btn btn-primary px-lg-4 m-1">
                            <i className="bi bi-floppy"></i> Salvar
                        </button>
                    </p>
                </div>
            </div>
    
        </Modal>
    );
}

export default IntegracaoFornecedorCadastroModal;
