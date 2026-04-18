import { useEffect, useState } from "react";
import "./EditComplete.css";
import api from "../../servidor/api";

function EditComplete (props) {


    const [listaPesquisa, SetListaPesquisa] = useState([]);
    const [texto, setTexto] = useState("");

    const pTipo = props.id.substr(0,2);

    function ConsultarDados (pvalue) {          
       
        if (pvalue.length > 1) {


            if (pTipo == "ib") {

                // consumir api consultarFilial

                api.post('/v1/instituicaobancaria/consultar', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "fl") {

                // consumir api consultarFilial

                api.post('/v1/consultarFilial', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "cb") {

                // consumir api consultarFilial

                api.post('/v1/consultarCaixaBancoComplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "cl") { 
            
                api.post('/v1/consultarClientEditcomplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{    
                
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "eq") { 
            
                api.post('/v1/consultarEquipeTreinamentoEditcomplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                                    

                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "at") { 
            
                api.post('/v1/consultarAtividadePromotorEditcomplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                                    

                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "cg") { 
            
                api.post('/v1/consultarContaGerencial', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                                    

                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "cc") { 
            
                api.post('/v1/consultarCentroDeCusto', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                     
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
            
            }else if (pTipo == "fo") {

                // consumir api consultarFornecedor

                api.post('/v1/consultarFornecedor', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
 
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 

            }else if (pTipo == "DP") {

                // consumir api consultarItem

                api.post('/v1/consultarItem', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: pTipo})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "AM") {

                // consumir api consultarItem

                api.post('/v1/consultarItem', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: pTipo})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "BD") {

                // consumir api consultarItem

                api.post('/v1/consultarItem', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: pTipo})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "MT") {

                // consumir api consultarItem

                api.post('/v1/consultarItem', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: pTipo})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "us") {

                // consumir api consultarUsuario

                api.post('/v1/consultarUsuarioComplete', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "se") {

                // consumir api consultarItem
                api.post('/v1/consultarSetor', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "mv") {

                // consumir api consultarItem

                api.post('/v1/consultarMarcaVeiculoEditComplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "md") {

                // consumir api consultarItem

                api.post('/v1/consultarModeloVeiculoEditComplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }else if (pTipo == "gs") {

                // consumir api consultarItem

                api.post('/v1/consultarCombustivelVeiculoEditComplet', {descricao:pvalue, id_grupo_empresa: localStorage.getItem("id_grupo_empresa")})
                .then((retorno) =>{                        
                    
                    SetListaPesquisa(retorno.data);                
                
                })
                .catch((err) =>{          
                    SetListaPesquisa([]);  
                }); 
                
            }
        
        }else{

            SetListaPesquisa([]);

        };
    }

    function Filtrar(e){
        setTexto(e.target.value.toUpperCase());
        ConsultarDados(e.target.value.toUpperCase());
    }

    function SelecionarItem(codigo, descricao){
        setTexto(descricao);
        props.onClickCodigo(codigo);
        props.onClickDescricao(descricao);
        SetListaPesquisa([]);
    }

    function Clear(){
        setTexto("");
        props.onClickCodigo(0);
        props.onClickDescricao("");
        SetListaPesquisa([]);
    }

    useEffect( () => {
        document.addEventListener('click', (e) => SetListaPesquisa([]));
    },[]);

    function inserirTesto(){
        if (props.value == null){

        }else{
            setTexto(props.value);
        }
    }

    useEffect( () => {
        inserirTesto();
    }, [props.value])


    return <>
      
        <div className="EditComplete">

           <div>
                <input type="text" id={props.id} className="form-control" autoFocus={props.autoFocus}  placeholder={props.placeholder} disabled={props.disabled} onChange={Filtrar}  value={texto} /> 
                {
                    (texto.length > 0) ? 
                        <button className="EditComplete-clear btn btn-light" id="btn-editcomplete" onClick={Clear} disabled={props.disabled}>
                            <i className="bi bi-x-lg"></i>
                        </button> 
                    : null
                }
            </div>          
            {
                listaPesquisa.length > 0 ? 
                <div className="EditComplete-items">
                    <div className="form-control container-lista">
                    <ul className="p-1 m-0">
                        {listaPesquisa.map((item)=>{

                        return <div key={item.codigo} onClick={(e) => SelecionarItem(item.codigo, item.descricao)}> 
                                    <li className="item">
                                        <div>
                                            <label>{item.descricao}</label>
                                        </div>

                                        <div>
                                        <span>{item.descricao2}</span>
                                        </div>
                                    </li>
                                </div>
                        })}
                    </ul>
                </div>
                </div> : null 
            }

        </div>  
        
                

           
      
     
 

    </>
}
export default EditComplete;