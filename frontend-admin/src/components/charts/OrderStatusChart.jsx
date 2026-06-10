import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const OrderStatusChart = ({ data = [] }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.label),
        datasets: [
          {
            data: data.map((item) => Number(item.value || 0)),
            backgroundColor: ['#ffc107', '#28a745', '#17a2b8', '#dc3545', '#6c757d', '#007bff'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
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
    <div style={{ minHeight: 300, height: 300 }}>
      <canvas ref={canvasRef} aria-label="Đơn hàng theo trạng thái"></canvas>
    </div>
  );
};

export default OrderStatusChart;
