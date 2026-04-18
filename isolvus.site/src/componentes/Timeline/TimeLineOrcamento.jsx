import moment from "moment";
import StatusListaPedido from "../StatusListaPedido/StatusListaPedido";
import "./TimeLineOrcamento.css";

function TimeLineOrcamento (props) {
    return<>
        <div className="TimeLine-scroll">
           <ul className="TimeLine">                    
                {props.pListaTimeLine.map((i) => {
                    return<li key={i.index} className="TimeLine-Item">
                            <section>
                                <div className="pin"></div>
                                <div className="TimeLine-Item-Card">
                                   <StatusListaPedido psituacao={i.situacao}/>
                                   <p className="mb-0 mt-0">Por: {i.funcultateracao}</p>
                                   <p className="mb-0 mt-0">Data: {moment(i.data).utc().format('DD/MM/YYYY')}</p>
                                   <p className="mb-2 mt-0">Hora: {moment(i.data).utc().format('HH:mm:ss')}</p>                                
                                </div>                                
                            </section>
                          </li>                    
                })}                                   
          </ul>
          </div>
        </>
}
export default TimeLineOrcamento;