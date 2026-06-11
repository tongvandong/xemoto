import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

const colorClasses = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  success: 'bg-success text-white',
  info: 'bg-info text-white',
  warning: 'bg-warning text-[#1f2933]',
  danger: 'bg-danger text-white',
  light: 'bg-light text-[#1f2933]',
  dark: 'bg-dark text-white',
};

const StatCard = ({ color = 'info', icon = 'fas fa-chart-bar', label, value, to, footer = 'Chi tiết' }) => {
  return (
    <div className="w-1/2 px-[7.5px] lg:w-1/4">
      <div className={cn('relative mb-5 block min-h-[8.8rem] overflow-hidden rounded text-white shadow-[0_0_1px_rgba(0,0,0,0.125),0_1px_3px_rgba(0,0,0,0.2)]', colorClasses[color] || colorClasses.info)}>
        <div className="p-2.5">
          <h3 className="mb-2.5 mt-0 max-w-[calc(100%-4.8rem)] break-words text-[1.45rem] font-bold leading-tight md:text-[1.8rem] xl:text-[2rem]">{value}</h3>
          <p>{label}</p>
        </div>
        <div className="absolute right-4 top-4 text-[70px] text-black/15 transition-transform duration-200">
          <i className={icon}></i>
        </div>
        {to && (
          <Link to={to} className="absolute inset-x-0 bottom-0 block bg-black/10 py-[3px] text-center text-white/90 hover:bg-black/15 hover:text-white">
            {footer} <i className="fas fa-arrow-circle-right"></i>
          </Link>
        )}
      </div>
    </div>
  );
};

export default StatCard;
