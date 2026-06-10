import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  success: 'bg-success text-white',
  info: 'bg-info text-white',
  warning: 'bg-warning text-[#1f2933]',
  danger: 'bg-danger text-white',
  light: 'bg-light text-[#1f2933]',
  dark: 'bg-dark text-white',
};

export function Badge({ variant = 'secondary', className, children }) {
  return (
    <span className={cn('inline-block rounded px-1.5 py-1 text-[75%] font-bold leading-none', variants[variant] || variants.secondary, className)}>
      {children}
    </span>
  );
}
