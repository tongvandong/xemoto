import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'border-primary bg-primary text-white hover:bg-[#0069d9]',
  secondary: 'border-secondary bg-secondary text-white hover:bg-[#5a6268]',
  success: 'border-success bg-success text-white hover:bg-[#218838]',
  info: 'border-info bg-info text-white hover:bg-[#138496]',
  warning: 'border-warning bg-warning text-[#1f2933] hover:bg-[#e0a800]',
  danger: 'border-danger bg-danger text-white hover:bg-[#c82333]',
  light: 'border-light bg-light text-[#1f2933] hover:bg-[#e2e6ea]',
  outlinePrimary: 'border-primary bg-transparent text-primary hover:bg-primary hover:text-white',
};

const sizes = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-base',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded border font-normal leading-normal transition disabled:pointer-events-none disabled:opacity-65',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
