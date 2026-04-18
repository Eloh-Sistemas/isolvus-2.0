import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import "./ChartView.css";

function ChartView(props){

  const [Options, setOptions] = useState({});

  function iniciarChart(){
    
    setOptions(props.options);
    
  }

  useEffect( () =>{
    iniciarChart();
  },[props])

  return<>
    {   
        <div className="ChartFundo">
           <div>
             <label className="ChartTitle">{props.title}</label>            
           </div>
           <hr className="Chartlinha"/>
          <Chart options={Options} series={props.series} type={props.type} height={props.height}/>
        </div>     
    }
    
  </>
}

export default ChartView;