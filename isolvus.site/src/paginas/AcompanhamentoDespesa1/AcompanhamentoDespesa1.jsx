import Menu from "../../componentes/Menu/Menu";
import ChartView from "../../componentes/Charts/ChartView";
import EditComplete from "../../componentes/EditComplete/EditComplete";
import { useEffect, useState } from "react";
import moment from "moment";
import api from "../../servidor/api";


function AcompanhamentoDespesa1() {

  const [loading, setLoading] = useState(false);


  const [dadosTabela, setDadosTabela] = useState([]);

  const [categoriaFiltrada, setCategoriaFiltrada] = useState("");

  const [id_Filial, Set_Id_Filial] = useState(0);
  const [filial, SetFilial] = useState("");

  const [codconta, setCondConta] = useState(0);
  const [descricaoConta, SetDescricaoConta] = useState("");

  const [codOrdenador, setCodOrdenador] = useState(0);
  const [descricaoOrdenador, SetDescricaoOrdenador] = useState("");

  const [dataInicial, SetdataInicial] = useState(moment().format("YYYY-MM")+"-01");
  const [dataFinal, SetFinal] = useState(moment().format("YYYY-MM-DD"));

  // Dados para o primeiro geral
  const [orcado1, setOrcado1] = useState(0); // Valor do orçado em reais
  const [realizado1, setRealizado1] = useState(0); // Valor do realizado em reais
  const [percentual1, setPercentual1] = useState(0); // ((realizado1 / orcado1) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal

  // Dados para o segundo ordenador
  const [orcado2, setOrcado2] = useState(0); // Valor do orçado em reais
  const [realizado2, setRealizado2] = useState(0); // Valor do realizado em reais
  const [percentual2, setPercentual2] = useState(0); // ((realizado2 / orcado2) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal
  const [nomeContaGerencial, setNomeContaGerencial] = useState("");

  // Dados para o segundo conta
  const [orcado3, setOrcado3] = useState(0); // Valor do orçado em reais
  const [realizado3, setRealizado3] = useState(0); // Valor do realizado em reais
  const [percentual3, setPercentual3] = useState(0); // ((realizado2 / orcado2) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal

  // Dados para o segundo conta
  const [orcado4, setOrcado4] = useState(0); // Valor do orçado em reais
  const [realizado4, setRealizado4] = useState(0); // Valor do realizado em reais
  const [percentual4, setPercentual4] = useState(0); // ((realizado2 / orcado2) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal

  // Função para formatar valores em reais
  const formatarValor = (valor) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  // Função para formatar percentual
  const formatarPercentual = (percentual) => `${percentual}%`;

  function consultarTabela(){
    
    return api.post('/v1/acompanhamentodedepsesa1/tabela', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_empresaerp: id_Filial, dataInicial: moment(dataInicial).format("DD/MM/YYYY"), dataFinal: moment(dataFinal).format("DD/MM/YYYY") , id_contaerp: codconta , codordenador :codOrdenador})
      .then((retorno) => {        
          
         setDadosTabela(retorno.data); 
         //consultarDashOrcamentoPorConta(retorno.data[0].codconta, retorno.data[0].conta );

      }).catch((err) =>{
          console.log(err)
      }); 
    
  }

  function consultarDashOrcamentoTotal(){
     api.post('/v1/acompanhamentodedepsesa1/dashorcamentototal', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_empresaerp: id_Filial, dataInicial: moment(dataInicial).format("DD/MM/YYYY"), dataFinal: moment(dataFinal).format("DD/MM/YYYY") , id_contaerp: 0, codordenador :0})
      .then((retorno) => {        
                    
 
          setOrcado1(retorno.data[0].orcado);
          setRealizado1(retorno.data[0].realizado); // Valor do realizado em reais]          
          setPercentual1(retorno.data[0].percentual_realizado); // ((realizado1 / orcado1) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal

      }).catch((err) =>{
          console.log(err)
      });
  }

  function consultarDashOrcamentoPorOrdenador(){
    api.post('/v1/acompanhamentodedepsesa1/dashorcamentototal', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_empresaerp: id_Filial, dataInicial: moment(dataInicial).format("DD/MM/YYYY"), dataFinal: moment(dataFinal).format("DD/MM/YYYY") , id_contaerp: codconta, codordenador :codOrdenador})
     .then((retorno) => {        
                      
        setOrcado2(retorno.data[0].orcado);
        setRealizado2(retorno.data[0].realizado); // Valor do realizado em reais]          
        setPercentual2(retorno.data[0].percentual_realizado); // ((realizado1 / orcado1) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal
  
     }).catch((err) =>{
         console.log(err)
     });
 }

  function consultarDashOrcamentoPorConta(codconta, conta){
    api.post('/v1/acompanhamentodedepsesa1/dashorcamenporconta', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_empresaerp: id_Filial, dataInicial: moment(dataInicial).format("DD/MM/YYYY"), dataFinal: moment(dataFinal).format("DD/MM/YYYY") , id_contaerp: codconta})
     .then((retorno) => {        
                   
        setOrcado3(retorno.data[0].orcado);
        setRealizado3(retorno.data[0].realizado); // Valor do realizado em reais]          
        setPercentual3(retorno.data[0].percentual_realizado); // ((realizado1 / orcado1) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal}

         if (conta || "") {
          setNomeContaGerencial(conta);
         }else{
          setNomeContaGerencial("por conta");
         }
         

     }).catch((err) =>{
         console.log(err)
     });
 }

 function consultarDashOrcamentoTotalTab(){
  api.post('/v1/acompanhamentodedepsesa1/dashorcamentototal', {id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), id_empresaerp: id_Filial, dataInicial: moment(dataInicial).format("DD/MM/YYYY"), dataFinal: moment(dataFinal).format("DD/MM/YYYY") , id_contaerp: codconta, codordenador :codOrdenador})
   .then((retorno) => {        

        setOrcado4(retorno.data[0].orcado);
        setRealizado4(retorno.data[0].realizado); // Valor do realizado em reais]          
        setPercentual4(retorno.data[0].percentual_realizado); // ((realizado1 / orcado1) * 100).toFixed(1); // Calcula o percentual com 1 casa decimal
  
   }).catch((err) =>{
       console.log(err)
   });
}

function consultarTudo() {
  setLoading(true);

  Promise.all([
    consultarTabela(),
    consultarDashOrcamentoPorOrdenador(),
    consultarDashOrcamentoTotal(),
    consultarDashOrcamentoTotalTab()
  ]).finally(() => {
    setLoading(false);
  });

}


  useEffect( () =>{
   // consultarTudo();              
  },[id_Filial, codconta, codOrdenador, dataInicial, dataFinal, categoriaFiltrada]);

  

  // Função para determinar a cor do fundo e do texto do percentual
  const determinarCorPercentual = (percentual) => {
    let corFundo, corTexto;
    
    if (percentual < 30) {
      corFundo = '#C6EFCD'; // Verde claro
      corTexto = '#218838'; // Verde escuro (mais forte)
    } else if (percentual >= 30 && percentual < 60) {
      corFundo = '#FEEB9C'; // Amarelo
      corTexto = '#856404'; // Amarelo escuro (mais forte)
    } else if (percentual >= 60 && percentual < 100) {
      corFundo = '#F7C11B'; // Laranja
      corTexto = '#D97A00'; // Laranja escuro (mais forte)
    } else {
      corFundo = '#FCC7CD'; // Vermelho
      corTexto = '#721C24'; // Vermelho escuro (mais forte)
    }

    return { 
      backgroundColor: corFundo, 
      color: corTexto, 
      textAlign: 'center',  // Centralizando o texto
      padding: '5px',       // Reduzindo o padding para compactar
      fontSize: '12px',     // Ajustando o tamanho da fonte
    };

    
  };

  return (
    <>
      <Menu />
      <div className="container-fluid Containe-Tela">


        <div className="row">
            <div className="col-lg-3 mb-3">   
                <label htmlFor="fl-2" className="mb-2">Filial</label>                   
                <EditComplete autoFocus placeholder={"Razão social ou CNPF"} id={"fl-1"}  
                              tipoConsulta={"filial1"} 
                              onClickCodigo={Set_Id_Filial} 
                              onClickDescricao={SetFilial}
                              value={filial} />
            </div>

            <div className="col-lg-2 mb-3">   
                <label htmlFor="us" className="mb-2">Ordenador</label>                   
                <EditComplete placeholder={"Nome"} id={"us"}  
                            tipoConsulta={"us"} 
                            onClickCodigo={setCodOrdenador} 
                            onClickDescricao={SetDescricaoOrdenador}
                            value={descricaoOrdenador} />
            </div> 
            
            <div className="col-lg-2 mb-3">   
                <label htmlFor="cg-1" className="mb-2">Conta Gerencial</label>                   
                <EditComplete placeholder={"Código ou Descrição"} id={"cg"}  
                            tipoConsulta={"cg"} 
                            onClickCodigo={setCondConta} 
                            onClickDescricao={SetDescricaoConta}
                            value={descricaoConta} />
            </div>

            <div className="col-lg-2 mb-3">
                    <label htmlFor="DataInicial" className="mb-2">Data Inicial</label>                   
                    <input type="date" className="form-control" id="DataInicial" 
                                                        placeholder={dataInicial}
                                                        onChange={(e) => {SetdataInicial(e.target.value)}}
                                                        value={dataInicial}/> 
            </div>

            <div className="col-lg-2">
                    <label htmlFor="DataFinal" className="mb-2">Data Final</label>                   
                    <input type="date" className="form-control" id="DataFinal" 
                                                        placeholder={dataFinal}
                                                        onChange={(e) => {SetFinal(e.target.value)}}
                                                        value={dataFinal}/> 
            </div>

            <div className="col-lg-1 mb-3">
            <button
              className="btn btn-primary me-2 btn-analisedespesa w-100"
              onClick={consultarTudo}
              disabled={loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="bi bi-arrow-clockwise me-1"></i>}
              {loading ? "" : "Atualizar"}
            </button>
            </div>
            
        </div>


        {loading && (
          <div className="text-center mt-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
            <div className="mt-3">Consultando titulos e orçamento, por favor aguarde...</div>
          </div>
        )}


        

       <div className="row">
          {/* Gráfico 1 */}
          {!loading && (<div className="col-md-4 mt-2">
            <ChartView
              type="donut"
              series={[orcado1 - realizado1, realizado1]}
              options={{
                labels: ["Restante", "Realizado"], // Categorias
                legend: {
                  position: "bottom", // Legenda embaixo do gráfico
                  horizontalAlign: "center", // Centraliza a legenda
                },
                tooltip: {
                  enabled: true,
                  y: {
                    formatter: (value, { seriesIndex }) => {
                      return seriesIndex === 0
                        ? formatarValor(orcado1 - realizado1)
                        : formatarValor(realizado1);
                    },
                  },
                },
                plotOptions: {
                  pie: {                
                    donut: {
                      labels: {
                        show: true,
                        name: {
                          show: true,
                          fontSize: "16px",
                          color: "#333",
                          offsetY: -10,
                        },
                        value: {
                          show: true,
                          fontSize: "20px",
                          color: "#333",
                          formatter: (value) => {
                            return formatarValor(value);
                          },
                        },
                        total: {
                          show: true,
                          label: "Atingimento",
                          formatter: () => formatarPercentual(percentual1),
                        },
                      },
                    },
                  },
                },
                /*chart: {
                  events: {

                    dataPointSelection: (event, chartContext, { dataPointIndex }) => {
                      
                      if (chartContext.w.config.labels[dataPointIndex] === categoriaFiltrada){
                        setCategoriaFiltrada("Geral")
                      }else{                      
                        setCategoriaFiltrada(chartContext.w.config.labels[dataPointIndex])
                      }
                                  
                    },
                  }, 
                },*/
              }}
              height={250}
              title={"Orçamento Total de " + formatarValor(orcado1)}
            />
          </div>)}



          {/* Gráfico 2 */}
          {!loading && (<div className="col-md-4 mt-2">

        <ChartView
          type="donut"
          series={[orcado2 - realizado2, realizado2]}
          options={{
            labels: ["Restante", "Realizado"],
            legend: {
              position: "bottom", // Legenda embaixo do gráfico
              horizontalAlign: "center", // Centraliza a legenda
            },
            tooltip: {
              enabled: true,
              y: {
                formatter: (value, { seriesIndex }) => {
                  // Mostra os valores originais no tooltip
                  return seriesIndex === 0 
                    ? formatarValor(orcado2 - realizado2) // Valor original do orçado
                    : formatarValor(realizado2); // Valor original do realizado
                },
              },
            },
            plotOptions: {
              pie: {
                donut: {
                  labels: {
                    show: true,
                    name: {
                      show: true,
                      fontSize: "16px",
                      color: "#333",
                      offsetY: -10,                      
                    },
                    value: {
                      show: true,
                      fontSize: "20px",
                      color: "#333",

                      formatter: (value) => {
                        return formatarValor(value);
                      }
                      
                      ,
                    },
                    total: {
                      show: true,
                      label: "Atingimento",
                      formatter: () => formatarPercentual(percentual2), // Exibe o percentual de atingimento no centro
                    },
                  },
                },
              },
            },
          }}
          height={250}
          title={"Por ordenador "+descricaoOrdenador+" "+formatarValor(orcado2)}
        />
      </div>)}

      {/* Gráfico 2 */}
      {!loading && (<div className="col-md-4 mt-2">
        <ChartView
          type="donut"
          series={[orcado3 - realizado3, realizado3]}
          options={{
            labels: ["Restante", "Realizado"],
            legend: {
              position: "bottom", // Legenda embaixo do gráfico
              horizontalAlign: "center", // Centraliza a legenda
            },
            tooltip: {
              enabled: true,
              y: {
                formatter: (value, { seriesIndex }) => {
                  // Mostra os valores originais no tooltip
                  return seriesIndex === 0 
                    ? formatarValor(orcado3 - realizado3) // Valor original do orçado
                    : formatarValor(realizado3); // Valor original do realizado
                },
              },
            },
            plotOptions: {
              pie: {
                donut: {
                  labels: {
                    show: true,
                    name: {
                      show: true,
                      fontSize: "16px",
                      color: "#333",
                      offsetY: -10,                      
                    },
                    value: {
                      show: true,
                      fontSize: "20px",
                      color: "#333",

                      formatter: (value) => {
                        return formatarValor(value);
                      }
                      
                      ,
                    },
                    total: {
                      show: true,
                      label: "Atingimento",
                      formatter: () => formatarPercentual(percentual3), // Exibe o percentual de atingimento no centro
                    },
                  },
                },
              },
            },
          }}
          height={250}
          title={"Por conta "+nomeContaGerencial+" "+formatarValor(orcado3)}
        />
      </div>)} 

          {/* Legenda de cores abaixo da tabela */}
          {!loading && (<div className="mt-3">
            <div className="d-flex align-items-center ChartFundo">
              <h6 className="m-2"><strong  style={{ fontSize: '13px'}}>{"Legenda do Campo (% Realizado): "}</strong></h6>
              <div className="d-flex flex-wrap align-items-center mt-2">
                <div className="d-flex align-items-center me-4 mb-2">
                  <div className="rounded-circle me-2" style={{ width: '20px', height: '20px', backgroundColor: '#C6EFCD' }}></div>
                  <span style={{ fontSize: '13px'}}>{"< 30%"}</span>
                </div>
                <div className="d-flex align-items-center me-4 mb-2">
                  <div className="rounded-circle me-2" style={{ width: '20px', height: '20px', backgroundColor: '#FEEB9C' }}></div>
                  <span style={{ fontSize: '13px'}}>{"> 30% e < 60%"}</span>
                </div>
                <div className="d-flex align-items-center me-4 mb-2">
                  <div className="rounded-circle me-2" style={{ width: '20px', height: '20px', backgroundColor: '#F7C11B' }}></div>
                  <span style={{ fontSize: '13px'}}>{"> 60% e < 100%"}</span>
                </div>
                <div className="d-flex align-items-center me-4 mb-2">
                  <div className="rounded-circle me-2" style={{ width: '20px', height: '20px', backgroundColor: '#FCC7CD' }}></div>
                  <span style={{ fontSize: '13px'}}> {">= 100%"}</span>
                </div>
              </div>
            </div>
          </div>)}

          {!loading && (<div className="col-12 mt-3">              

            <table className="table tablefont table-hover">
              <thead>
                <tr>
                  <th scope="col">CONTA GERENCIAL</th>
                  <th className="text-center" scope="col">ORÇADO</th>
                  <th className="text-center" scope="col">REALIZADO</th>
                  <th className="text-center" scope="col">RESTANTE</th>
                  <th className="text-center" scope="col">% REALIZADO</th>
                </tr>
              </thead>
              <tbody>
                {dadosTabela.length > 0 ? (
                  dadosTabela.map((i) => (
                    <tr key={i.codconta} onClick={() => consultarDashOrcamentoPorConta(i.codconta, i.conta)}>
                      <td>{i.codconta+' - '+i.conta}</td>
                      <td className="text-center">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(i.orcado)}</td>
                      <td className="text-center">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(i.realizado)}</td>
                      <td className="text-center">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(i.orcado - i.realizado)}</td>
                      <td style={determinarCorPercentual(i.perrealizado)}>{formatarPercentual(i.perrealizado)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center">Dados não encontrados</td>
                  </tr>
                )}
              </tbody>


              {/* Rodapé com Totais */}
              <tfoot>
                <tr>
                  <td><strong>TOTAL</strong></td>
                  <td className="text-center bolt">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orcado4)}
                  </td>
                  <td className="text-center bolt">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(realizado4)}
                  </td>
                  <td className="text-center bolt">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(orcado4 - realizado4)}
                  </td>
                  <td className="text-center bolt">
                    {formatarPercentual(percentual4)}
                  </td>
                </tr>
              </tfoot>
            </table>                        
          </div>)}
        </div>
      </div>
    </>
  );
}

export default AcompanhamentoDespesa1;
