import "./GridMobile.css";
import { NumericFormat } from 'react-number-format';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function GridMobile(props){

   const [proximoIndexItem, setProximoIndexItem] = useState(0);
   const [qtRegistro, SetQtRegistro] = useState(0);
   const [total, setTotal] = useState(0);
   const {tipoTela} = useParams();



   function recalcularTotais(){

      var calculoTotal = 0;

      props.dados.map((i) => {
         SetQtRegistro(props.dados.length);  
         console.log(i.quantidade * i.vlunit); 
         calculoTotal = calculoTotal + i.quantidade * i.vlunit;         
      });

      setTotal(calculoTotal);
   }
   
   function NovoItem(){
      
      props.SeItemSelecionado({coditem: 0, descricao: "", quantidade: 0, vlunit:0});
      props.openModalItem(); 
      props.tipoModal("Adicionar");      

   }
 

   function SelecinarItem(ItemSelecionado, index){

      props.setIndex(index);
      props.SeItemSelecionado(ItemSelecionado);
      props.openModalItem(); 
      props.tipoModal("Editar");
      
   }

   useEffect(()=>{
      recalcularTotais();
      setProximoIndexItem(props.dados.length+1);
   },[props.dados])


    return <div>

             <div className="row">
                
                        <div className="col-12 mt-4 d-flex w-100 justify-content-between top-dados-grid">
                                <h1 className="mt-2 text-secondary">Gastos</h1>
                                <h4 className="mt-2 ">Itens: {qtRegistro}</h4>
                                <h4 className="mt-2 ">Total: {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(total)}</h4>
                        </div>    

             </div>

             {/*Tabela*/}


            {   props.dados.map((i, index) => {
                    return <div key={i.index} className="item-consulta-solicitacao mt-3"> 

                    <div className="col-12 d-flex w-100 justify-content-between" onClick={props.openModalItem}>   
                        <p className="mt-2"><label className="descricao-item">{i.descricao}</label></p>                                                                     
                    </div> 

                    <hr/>

                    <div>                            
                          <p><label>Quantidade:</label> {i.quantidade}</p>
                    </div>

                    <div>                            
                          <p><label>Valor Unitário:</label> {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.vlunit)}</p>
                    </div>

                    <div>                            
                          <p><label>Valor Total:</label> {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.quantidade * i.vlunit) }</p>
                    </div>

                    <hr/> 

                    {
                      props.tabhabilitada ? <button  className="btn btn-secondary me-2" id="button-grid-desktop-despesas" onClick={()=>SelecinarItem(i, index)}><i className="bi bi-pencil-square"></i></button> : null
                    }
                    

                 </div>   
                })
            }

            { props.tabhabilitada ?<div className="row mt-4">              
                                          <div className="col-12">
                                             <button onClick={() =>NovoItem()} className="btn btn-secondary w-100" ><i className="bi-plus-lg m-2"></i>Adcionar</button>                                                                                                      
                                          </div>                                          
                                       </div> :null
            }
            

            <hr className="mt-4"/>
             

            

    </div>
}

export default GridMobile;