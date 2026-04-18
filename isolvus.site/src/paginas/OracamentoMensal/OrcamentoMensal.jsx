import { useEffect, useState } from "react";
import Menu from "../../componentes/Menu/Menu";
import "./OrcamentoMensal.css";
import * as XLSX from "xlsx";
import api from "../../servidor/api";
import { ToastContainer, toast } from "react-toastify";
import ChartView from "../../componentes/Charts/ChartView";
import { useNavigate } from "react-router-dom";

function OrcamentoMensal() {
  
   const [nomeArquivo, setNomeArquivo] = useState("");
   const [data, SetData] = useState([]);  
   const [id_usuario, SetId_usuario] = useState(0);
   const [id_grupo_empresa, SetId_grupo_empresa] = useState(0); 
   const [categories, SetCategories] = useState([]);
   const [seriesDash, setseriesDash] = useState([{name:"Total",data:[]}]);
   const navigate = useNavigate();

   function IniciarTela () {
     SetId_usuario(localStorage.getItem("id_usuario_erp"));
     SetId_grupo_empresa(localStorage.getItem("id_grupo_empresa"));  
    }


    function ProcessarDash(){

      SetCategories(["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]);       

      //data.map( (i) =>{
      //  console.log({name:i.Ano, data:[i.Janeiro, i.Fevereiro]});
      //})

      var name = "Total";      
      var Janeiro = 0;
      var Fevereiro = 0;
      var Março = 0;
      var Abril = 0;
      var Maio = 0;
      var Junho = 0;
      var Julho = 0;
      var Agosto = 0;
      var Setembro = 0;
      var Outubro = 0;
      var Novembro = 0;
      var Dezembro = 0;

      data.map( (i) =>{

        Janeiro = Janeiro+i.Janeiro;
        Fevereiro = Fevereiro+i.Fevereiro;
        Março = Março+i.Março;
        Abril = Abril+i.Abril;
        Maio = Maio+i.Maio;
        Junho = Junho+i.Junho;
        Julho = Julho+i.Julho;
        Agosto = Agosto+i.Agosto;
        Setembro = Setembro+i.Setembro;
        Outubro = Outubro+i.Outubro;
        Novembro = Novembro+i.Novembro;
        Dezembro = Dezembro+i.Dezembro;

      });  

      setseriesDash([{name, data:[Janeiro, Fevereiro, Março, Abril, Maio, Junho, Julho, Agosto, Setembro, Outubro, Novembro, Dezembro]}])
    

    }

    function ProximaTela(tempo){
      setTimeout(function(){
          //navigate('/OrcamentoMensal');
          window.location.reload();
      }, tempo);
      
  }


   function enviarDados () {  
    
    const notify = toast.loading("Enviando Orçamento...",{position: "top-center"})

       api.post("/v1/orcamentomensal/"+id_usuario+"/"+id_grupo_empresa, data)
       .then((retorno) => {
            toast.update(notify, {
              render: "Dados enviado com sucesso !", 
              type: "success", 
              isLoading: false, 
              closeOnClick: true,                            
              autoClose: 1700,
              pauseOnHover: false,
              onclose : ProximaTela(2550)
            }); 
       })
       .catch((erro) =>{
          toast.update(notify, {
            render: erro.response.data.error, 
            type: "error", 
            isLoading: false,
            autoClose: 2000,
            pauseOnHover: false});
       });

   }   

   const handleImageChange = (e) => {
    const reader = new FileReader();
    reader.readAsBinaryString(e.target.files[0]);
    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, {type: "binary"});
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);
      SetData(parsedData);      
    };
    setNomeArquivo(e.target.files[0].name);        
  }  

  useEffect( () => {    
    IniciarTela();
  },[])

  useEffect( () => {    
    ProcessarDash();
  },[data])

  return <>
    <Menu />
    <div className="container-fluid Containe-Tela">
            <div className="row text-body-secondary mb-2">
                            <h1 className="mb-4 titulo-da-pagina">{
                              "Enviar Orçamento Mensal" 
                            }</h1>
            </div> 

            

            <div className="row conteiner-campos">
                                                    
                <div className="col-lg-4">                            
                      <input type="text" id="edtArquivo" className="col-6" placeholder="Buscar arquivo ..." value={nomeArquivo} disabled/> 
                      <label htmlFor="exampleFormControlFile1" className="btn btn-primary btnarquivo col-3">Buscar Arquivo</label>                    
                      <button onClick={enviarDados} className="btn btn-success btnarquivo col-3">Enviar</button>                    
                      <input type="file"  accept=".xlsx, .xls" className="form-control-file" id="exampleFormControlFile1" onChange={handleImageChange}/>  
                </div>   


                <div className="row mt-4">
                <div className="col-12">
                    <ChartView 
                       type={"bar"}
                       series={seriesDash}
                       options={
                        
                        { labels: categories, 
                          legend: {show: true, showForSingleSeries: true},
                          yaxis: {labels:{formatter: (val) => { return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(val) }}},
                          dataLabels: {
                            enabled: true,
                            enabledOnSeries: undefined,
                            formatter: function(value, { seriesIndex, dataPointIndex, w }) {
                              return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value)
                            }
                      
                          }
                        
                        }
                      }


                       height={400}
                       title={"Total Ano"}
                    />
                </div>
                </div>   

                         

               <div className="col-12 mt-4">

                <table className="table tablefont table-hover">
                <thead>

                  <tr>
                    <th scope="col">Filial</th>
                    <th scope="col">Ano</th>
                    <th scope="col">Código</th>
                    <th scope="col">Conta</th>
                    <th scope="col">Janeiro</th>
                    <th scope="col">Fevereiro</th>
                    <th scope="col">Março</th>
                    <th scope="col">Abril</th>
                    <th scope="col">Maio</th>
                    <th scope="col">Junho</th>
                    <th scope="col">Julho</th>
                    <th scope="col">Agosto</th>
                    <th scope="col">Setembro</th>
                    <th scope="col">Outubro</th>
                    <th scope="col">Novembro</th>
                    <th scope="col">Dezembro</th>
                    <th scope="col">Total</th>                    
                  </tr>
                  
                </thead>
                <tbody>            
                  
                    {data.map( (i, index) => {
                      return<tr key={index}>   
                        <td className="bolt">{i.Filial}</td>
                        <td className="bolt">{i.Ano}</td>
                        <td className="bolt">{i.CodConta}</td>
                        <td className="bolt">{i.Conta}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Janeiro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Fevereiro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Março)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Abril)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Maio)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Junho)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Julho)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Agosto)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Setembro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Outubro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Novembro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Dezembro)}</td>
                        <td>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.Total)}</td>
                      </tr>
                    })

                    }                                                   
                </tbody>
              </table>
              </div>

            </div>
            <ToastContainer />  
    </div>
  </>
}

export default OrcamentoMensal;