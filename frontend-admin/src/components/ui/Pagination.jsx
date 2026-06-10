import React from 'react';
import { cn } from '../../utils/cn';

export function Pagination({ page, totalPages, onPageChange, className }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className={cn('mt-3', className)} aria-label="Phân trang">
      <ul className="m-0 flex list-none justify-center p-0">
        <li>
          <button
            className="relative -ml-px block border border-[#dee2e6] bg-white px-2 py-1 text-sm text-primary disabled:pointer-events-none disabled:text-[#6c757d]"
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            «
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
          <li key={item}>
            <button
              className={cn(
                'relative -ml-px block border border-[#dee2e6] bg-white px-2 py-1 text-sm text-primary',
                item === page && 'z-[1] border-primary bg-primary text-white',
              )}
              type="button"
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          </li>
        ))}
        <li>
          <button
            className="relative -ml-px block border border-[#dee2e6] bg-white px-2 py-1 text-sm text-primary disabled:pointer-events-none disabled:text-[#6c757d]"
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            »
          </button>
        </li>
      </ul>
    </nav>
  );
}
