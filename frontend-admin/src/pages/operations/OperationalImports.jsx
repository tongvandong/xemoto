import React, { useState } from 'react';
import productService from '../../services/productService';
import inventoryService from '../../services/inventoryService';

const normalize = (value) => String(value ?? '').trim();
const number = (value) => Number(normalize(value).replace(/,/g, ''));
const normalizeText = (value) => normalize(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');

const isPartKind = (value) => {
  const text = normalizeText(value);
  return text === '2' || text.includes('phu tung') || text.includes('phu kien') || text.includes('part');
};

const headerMap = (sheet) => {
  const result = {};
  sheet.getRow(1).eachCell((cell, index) => { result[normalize(cell.value).toLowerCase()] = index; });
  return result;
};

const cell = (row, headers, names) => {
  const key = names.find((name) => headers[name]);
  return key ? row.getCell(headers[key]).value : '';
};

const readSheet = async (file) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  if (!workbook.worksheets[0]) throw new Error('Không tìm thấy sheet dữ liệu.');
  return workbook.worksheets[0];
};

const OperationalImports = () => {
  const [tab, setTab] = useState('products');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [quickText, setQuickText] = useState('');

  const parse = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const sheet = await readSheet(file);
      const headers = headerMap(sheet);
      const next = [];
      for (let index = 2; index <= sheet.rowCount; index += 1) {
        const row = sheet.getRow(index);
        if (tab === 'products') {
          const item = {
            row: index,
            code: normalize(cell(row, headers, ['mã sản phẩm', 'ma san pham', 'code'])),
            name: normalize(cell(row, headers, ['tên sản phẩm', 'ten san pham', 'name'])),
            kind: isPartKind(cell(row, headers, ['loại', 'loai', 'kind'])) ? 2 : 1,
            categoryId: number(cell(row, headers, ['mã danh mục', 'ma danh muc', 'categoryid'])),
            brandId: number(cell(row, headers, ['mã hãng', 'ma hang', 'brandid'])) || null,
            listPrice: number(cell(row, headers, ['giá niêm yết', 'gia niem yet', 'listprice'])),
            salePrice: number(cell(row, headers, ['giá bán', 'gia ban', 'saleprice'])) || null,
            skuCode: normalize(cell(row, headers, ['sku', 'mã sku', 'ma sku', 'skucode'])),
            variantName: normalize(cell(row, headers, ['tên biến thể', 'ten bien the', 'variantname'])),
          };
          if (!item.code && !item.name && !item.skuCode) continue;
          item.errors = [!item.code && 'Thiếu mã sản phẩm', !item.name && 'Thiếu tên sản phẩm', !item.categoryId && 'Thiếu mã danh mục', !item.skuCode && 'Thiếu SKU', !(item.listPrice >= 0) && 'Giá không hợp lệ'].filter(Boolean);
          next.push(item);
        } else {
          const item = {
            row: index,
            skuId: number(cell(row, headers, ['mã sku', 'ma sku', 'skuid'])),
            qty: number(cell(row, headers, ['tồn đầu kỳ', 'ton dau ky', 'quantity', 'qty'])),
          };
          if (!item.skuId && !item.qty) continue;
          item.errors = [!item.skuId && 'Thiếu mã SKU', !(item.qty >= 0) && 'Tồn đầu kỳ không hợp lệ'].filter(Boolean);
          next.push(item);
        }
      }
      setRows(next);
    } catch (err) {
      alert(`Không thể đọc XLSX: ${err.message}`);
    }
  };

  const parseQuickProducts = () => {
    const next = quickText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const parts = line.split(/\t|;|,/).map((part) => part.trim());
        const item = {
          row: index + 1,
          code: parts[0] || '',
          name: parts[1] || '',
          kind: isPartKind(parts[2]) ? 2 : 1,
          categoryId: number(parts[3]),
          brandId: number(parts[4]) || null,
          listPrice: number(parts[5]),
          salePrice: number(parts[6]) || null,
          skuCode: parts[7] || parts[0] || '',
          variantName: parts[8] || 'Mặc định',
        };
        item.errors = [!item.code && 'Thiếu mã sản phẩm', !item.name && 'Thiếu tên sản phẩm', !item.categoryId && 'Thiếu mã danh mục', !item.skuCode && 'Thiếu SKU', !(item.listPrice >= 0) && 'Giá không hợp lệ'].filter(Boolean);
        return item;
      });
    setRows(next);
  };

  const commit = async () => {
    if (!rows.length || rows.some((row) => row.errors.length)) return alert('Vui lòng sửa toàn bộ dòng lỗi trước khi ghi dữ liệu.');
    if (!window.confirm(`Ghi ${rows.length} dòng dữ liệu vào hệ thống?`)) return;
    setSaving(true);
    const errors = [];
    try {
      if (tab === 'products') {
        for (const row of rows) {
          try {
            const created = await productService.create({
              code: row.code,
              name: row.name,
              categoryId: row.categoryId,
              brandId: row.brandId,
              kind: row.kind,
              listPrice: row.listPrice,
              salePrice: row.salePrice,
              shortDescription: 'Import XLSX',
            });
            await productService.createVariant(created.data.id, {
              skuCode: row.skuCode,
              variantName: row.variantName || 'Mặc định',
              listPrice: row.listPrice,
              salePrice: row.salePrice,
            });
          } catch (err) {
            errors.push(`Dòng ${row.row}: ${err?.response?.data?.message || 'không thể lưu'}`);
          }
        }
      } else {
        const skuRes = await inventoryService.getSkus();
        const skus = skuRes.data?.items || skuRes.data || [];
        for (const row of rows) {
          try {
            if (!skus.some((x) => x.id === row.skuId)) throw new Error('Mã SKU không tồn tại');
            await inventoryService.adjustStock({
              skuId: row.skuId,
              transactionType: 'Adjust',
              qty: row.qty,
              reason: 'Import tồn đầu kỳ từ XLSX',
            });
          } catch (err) {
            errors.push(`Dòng ${row.row}: ${err?.response?.data?.message || err.message || 'không thể lưu'}`);
          }
        }
      }
      if (!errors.length) setRows([]);
      alert(errors.length ? errors.join('\n') : 'Import thành công.');
    } finally {
      setSaving(false);
    }
  };

  const productHeaders = ['Dòng', 'Mã SP', 'Tên sản phẩm', 'Loại', 'Danh mục', 'SKU', 'Giá', 'Kết quả'];
  const stockHeaders = ['Dòng', 'Mã SKU', 'Tồn đầu kỳ', 'Kết quả'];

  return (
    <div className="content-wrapper">
      <div className="content-header"><div className="container-fluid"><h1 className="m-0">Import dữ liệu vận hành</h1></div></div>
      <section className="content"><div className="container-fluid">
        <div className="card">
          <div className="card-header p-2">
            <div className="nav nav-pills">
              <button className={`nav-link ${tab === 'products' ? 'active' : ''}`} onClick={() => { setTab('products'); setRows([]); setQuickText(''); }}>Sản phẩm và SKU</button>
              <button className={`nav-link ${tab === 'stock' ? 'active' : ''}`} onClick={() => { setTab('stock'); setRows([]); setQuickText(''); }}>Tồn đầu kỳ</button>
            </div>
          </div>
          <div className="card-body">
            <p className="text-muted">
              {tab === 'products'
                ? 'Cột XLSX: Mã sản phẩm, Tên sản phẩm, Loại, Mã danh mục, Mã hãng, Giá niêm yết, Giá bán, SKU, Tên biến thể.'
                : 'Cột XLSX: Mã SKU, Tồn đầu kỳ.'}
            </p>
            {tab === 'products' && (
              <div className="card card-body mb-3">
                <label>Nhập nhanh sản phẩm/SKU</label>
                <textarea className="form-control" rows="4" value={quickText} onChange={(e) => setQuickText(e.target.value)} placeholder="Mỗi dòng: Mã SP, Tên sản phẩm, Loại, Mã danh mục, Mã hãng, Giá niêm yết, Giá bán, SKU, Tên biến thể" />
                <div className="mt-2"><button type="button" className="btn btn-outline-primary" onClick={parseQuickProducts}>Đọc dữ liệu nhập nhanh</button></div>
              </div>
            )}
            <label className="btn btn-primary"><i className="fas fa-file-import mr-1" />Chọn file XLSX<input type="file" accept=".xlsx" className="d-none" onChange={parse} /></label>
            {rows.length > 0 && (
              <>
                <button className="btn btn-success ml-2" disabled={saving} onClick={commit}>Xác nhận import</button>
                <div className="table-responsive mt-3">
                  <table className="table table-bordered table-striped">
                    <thead><tr>{(tab === 'products' ? productHeaders : stockHeaders).map((x) => <th key={x}>{x}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((row) => (tab === 'products' ? (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          <td>{row.code}</td>
                          <td>{row.name}</td>
                          <td>{row.kind === 2 ? 'Phụ tùng' : 'Xe máy'}</td>
                          <td>{row.categoryId}</td>
                          <td>{row.skuCode}</td>
                          <td className="text-right">{row.listPrice}</td>
                          <td className={row.errors.length ? 'text-danger' : 'text-success'}>{row.errors.join(', ') || 'Hợp lệ'}</td>
                        </tr>
                      ) : (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          <td>{row.skuId}</td>
                          <td className="text-right">{row.qty}</td>
                          <td className={row.errors.length ? 'text-danger' : 'text-success'}>{row.errors.join(', ') || 'Hợp lệ'}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div></section>
    </div>
  );
};

export default OperationalImports;
