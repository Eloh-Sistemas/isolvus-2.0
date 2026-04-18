import React from 'react';
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  BarElement,
  LineElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const chartMap = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut
};

const DashboardIA = ({ dashboard }) => {
  if (!dashboard || !dashboard.chart || !dashboard.chart.data) {
    return <div>Nenhum dado disponível para renderizar o gráfico.</div>;
  }

  const { type, data, options } = dashboard.chart;
  const ChartComponent = chartMap[type];

  if (!ChartComponent) {
    return <div>Tipo de gráfico "{type}" não suportado.</div>;
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ChartComponent data={data} options={defaultOptions} />
    </div>
  );
};

export default DashboardIA;