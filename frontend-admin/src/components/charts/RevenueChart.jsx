import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatCurrency } from '../../utils/formatCurrency';

const RevenueChart = ({ data = [], label = 'Doanh thu' }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = data.map((item) => item.label);
    const values = data.map((item) => Number(item.value || 0));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.12)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${label}: ${formatCurrency(context.parsed.y || 0)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatCurrency(value),
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
  }, [data, label]);

  return (
    <div style={{ minHeight: 300, height: 300 }}>
      <canvas ref={canvasRef} aria-label={label}></canvas>
    </div>
  );
};

export default RevenueChart;
