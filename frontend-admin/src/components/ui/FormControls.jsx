import React from 'react';
import { cn } from '../../utils/cn';

const controlClass = 'block w-full rounded border border-[#ced4da] bg-white px-3 py-1.5 text-[#495057] transition focus:border-[#80bdff] focus:outline-none focus:ring-4 focus:ring-primary/25';

export function Input({ className, ...props }) {
  return <input className={cn(controlClass, 'h-[calc(2.25rem+2px)]', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(controlClass, 'h-[calc(2.25rem+2px)]', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(controlClass, className)} {...props} />;
}

export function Checkbox({ className, ...props }) {
  return <input type="checkbox" className={cn('h-4 w-4 rounded border-[#ced4da] text-primary focus:ring-primary/25', className)} {...props} />;
}
