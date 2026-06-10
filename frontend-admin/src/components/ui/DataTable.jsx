import React from 'react';
import { cn } from '../../utils/cn';

export function DataTable({ columns, rows, rowKey = 'id', emptyText = 'Không có dữ liệu', className }) {
  return (
    <div className="block w-full overflow-x-auto">
      <table className={cn('w-full border-collapse bg-white text-[#212529]', className)}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn('whitespace-nowrap border border-[#dee2e6] border-b-2 px-1.5 py-1 align-bottom', column.className)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="border border-[#dee2e6] px-1.5 py-4 text-center text-[#6c757d]">{emptyText}</td>
            </tr>
          ) : rows.map((row, index) => (
            <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index} className="odd:bg-black/[0.025] hover:bg-black/[0.055]">
              {columns.map((column) => (
                <td key={column.key} className={cn('border border-[#dee2e6] px-1.5 py-1 align-middle', column.cellClassName)}>
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
