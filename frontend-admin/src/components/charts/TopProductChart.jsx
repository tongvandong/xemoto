import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const TopProductChart = ({ data = [] }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.name),
        datasets: [
          {
            label: 'Số lượng bán',
            data: data.map((item) => Number(item.sold || 0)),
            backgroundColor: '#17a2b8',
            borderColor: '#138496',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ minHeight: 320, height: 320 }}>
      <canvas ref={canvasRef} aria-label="Top sản phẩm bán chạy"></canvas>
    </div>
  );
};

export default TopProductChart;
