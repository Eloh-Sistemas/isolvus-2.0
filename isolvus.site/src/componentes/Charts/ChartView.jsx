import Chart from "react-apexcharts";
import "./ChartView.css";

function ChartView(props){

  return<>
    {   
        <div className="ChartFundo">
           <div>
             <label className="ChartTitle">{props.title}</label>            
           </div>
           <hr className="Chartlinha"/>
          <Chart options={props.options || {}} series={props.series || []} type={props.type} height={props.height}/>
        </div>     
    }
    
  </>
}

export default ChartView;