import React from 'react';
import { cn } from '../../utils/cn';

export function Loading({ label = 'Đang tải...', className }) {
  return (
    <div className={cn('py-6 text-center text-primary', className)}>
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" role="status" aria-hidden="true" />
      <span className="sr-only absolute h-px w-px overflow-hidden whitespace-nowrap">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'fas fa-inbox', title = 'Không có dữ liệu', className }) {
  return (
    <div className={cn('py-6 text-center text-[#6c757d]', className)}>
      <i className={cn(icon, 'mb-2 text-2xl')} />
      <p className="m-0">{title}</p>
    </div>
  );
}
