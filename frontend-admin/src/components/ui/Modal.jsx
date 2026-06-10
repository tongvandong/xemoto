import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

const sizes = {
  md: 'max-w-[500px]',
  lg: 'max-w-[800px]',
  xl: 'max-w-[1140px]',
};

export function Modal({ open, title, size = 'md', onClose, footer, children, className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1050] overflow-x-hidden overflow-y-auto bg-black/50" tabIndex="-1">
      <div className={cn('relative mx-auto my-7 w-auto max-w-[calc(100vw-1rem)] pointer-events-none', sizes[size] || sizes.md, className)}>
        <div className="pointer-events-auto relative flex w-full flex-col rounded border border-black/20 bg-white shadow-[0_0.25rem_0.5rem_rgba(0,0,0,0.5)] outline-0">
          <div className="flex items-center justify-between border-b border-[#dee2e6] p-4">
            <h5 className="m-0 text-xl leading-normal">{title}</h5>
            <button type="button" className="border-0 bg-transparent text-2xl font-bold leading-none text-black opacity-50 hover:opacity-75" onClick={onClose} aria-label="Đóng">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="relative flex-auto p-4">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-[#dee2e6] p-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="mb-0">{message}</p>
    </Modal>
  );
}
