const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F2FF' } };
const HEADER_FONT = { bold: true, color: { argb: 'FF1F2937' } };
const BORDER = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeCellValue = (value, type) => {
  if (value === undefined || value === null) return '';
  if (type === 'number' || type === 'currency') return Number(value) || 0;
  if (type === 'date') return toDate(value) || '';
  return value;
};

const applyColumnFormats = (worksheet, columns) => {
  columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);

    if (column.type === 'currency') {
      excelColumn.numFmt = '#,##0';
    } else if (column.type === 'date') {
      excelColumn.numFmt = 'dd/mm/yyyy hh:mm';
    } else if (column.type === 'number') {
      excelColumn.numFmt = '#,##0';
    }

    let maxLength = String(column.header || '').length;
    excelColumn.eachCell({ includeEmpty: true }, (cell) => {
      const raw = cell.value instanceof Date
        ? 'dd/mm/yyyy hh:mm'
        : String(cell.value ?? '');
      maxLength = Math.max(maxLength, raw.length);
    });

    excelColumn.width = Math.min(Math.max(maxLength + 2, column.width || 10), column.maxWidth || 45);
  });
};

const addSheet = (workbook, sheet) => {
  const worksheet = workbook.addWorksheet(sheet.name);
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  worksheet.columns = sheet.columns.map((column) => ({
    header: column.header,
    key: column.key,
  }));

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  sheet.rows.forEach((row) => {
    worksheet.addRow(
      sheet.columns.reduce((acc, column) => {
        acc[column.key] = normalizeCellValue(row[column.key], column.type);
        return acc;
      }, {})
    );
  });

  worksheet.eachRow((row, rowIndex) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const column = sheet.columns[colNumber - 1];
      cell.border = BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: column.align || (column.type === 'number' || column.type === 'currency' ? 'right' : 'left'),
        wrapText: true,
      };
      if (rowIndex > 1 && column.type === 'date' && !cell.value) {
        cell.value = '';
      }
    });
  });

  applyColumnFormats(worksheet, sheet.columns);
  return worksheet;
};

export const createDateStamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const exportWorkbook = async ({ fileName, sheets }) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MoToSale Admin';
  workbook.created = new Date();

  sheets.forEach((sheet) => addSheet(workbook, sheet));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
