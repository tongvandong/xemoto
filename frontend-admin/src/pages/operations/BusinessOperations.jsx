import React, { useEffect, useMemo, useState } from 'react';
import service from '../../services/businessOperationsService';
import advancedOperationsService from '../../services/advancedOperationsService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { useAuth } from '../../contexts/AuthContext';

// Mỗi trang = 1 nhóm nghiệp vụ (truyền qua prop `section`).
const SECTIONS = {
  supply: { title: 'Cung ứng & mua hàng', tabs: ['suppliers', 'purchases'] },
  service: { title: 'Dịch vụ & chăm sóc khách hàng', tabs: ['repairs', 'crm'] },
  finance: { title: 'Tài chính: thu chi & công nợ', tabs: ['cash', 'receivables'] },
};

const TAB_META = {
  suppliers: { label: 'Nhà cung cấp', create: 'Thêm nhà cung cấp', desc: 'Quản lý danh sách nhà cung cấp phụ tùng/hàng hóa.', search: 'Tìm theo mã, tên, SĐT nhà cung cấp...' },
  purchases: { label: 'Mua hàng', create: 'Lập đơn mua', desc: 'Đơn mua & công nợ nhà cung cấp. Quy trình: Nháp → Duyệt → Nhận hàng → Thanh toán.', search: 'Tìm theo mã đơn mua, nhà cung cấp...' },
  cash: { label: 'Thu chi', create: 'Lập phiếu thu chi', desc: 'Sổ quỹ: phiếu thu/chi tiền mặt & chuyển khoản trong kỳ.', search: 'Tìm theo mã phiếu, nhóm, ghi chú...' },
  repairs: { label: 'Sửa chữa', create: 'Tiếp nhận sửa chữa', desc: 'Phiếu sửa chữa xe. Quy trình: Nhận → Kiểm tra → Báo giá → Sửa → Bàn giao.', search: 'Tìm theo mã phiếu, khách hàng, xe...' },
  crm: { label: 'Chăm sóc KH', create: 'Tạo lịch CSKH', desc: 'Lịch chăm sóc & tương tác với khách hàng.', search: 'Tìm theo khách hàng, nội dung chăm sóc...' },
  receivables: { label: 'Công nợ', create: null, desc: 'Các đơn còn phải thu của khách (sau khi trừ đã thu & đã hoàn tiền).', search: 'Tìm theo mã đơn, khách hàng...' },
};

const emptySupplier = { code: '', name: '', taxCode: '', contactName: '', phone: '', email: '', address: '', note: '', status: 1 };
const emptyPurchaseLine = { skuId: '', qty: 1, unitCost: 0 };
const emptyPurchase = { supplierId: '', note: '', lines: [{ ...emptyPurchaseLine }] };
const emptyCash = { transactionType: 'Receipt', category: 'Other', amount: '', method: 'Cash', note: '' };
const emptyRepairLine = { skuId: '', description: '', qty: 1, unitPrice: 0 };
const emptyRepair = { customerId: '', assignedStaffId: '', vehicleDescription: '', reportedIssue: '', laborCost: 0, note: '', lines: [] };
const emptyCrm = { customerId: '', assignedStaffId: '', interactionType: 'Call', subject: '', note: '', followUpAt: '' };
const emptyPayment = { amount: '', method: 'Cash', note: '' };

const msg = (err, fallback) => err?.response?.data?.message || fallback;
const labels = {
  Draft: 'Nháp', Approved: 'Đã duyệt', PartiallyReceived: 'Đã nhận một phần', Received: 'Đã nhận đủ', Cancelled: 'Đã hủy',
  Receipt: 'Thu', Payment: 'Chi', Cash: 'Tiền mặt', BankTransfer: 'Chuyển khoản',
  Inspecting: 'Đang kiểm tra', Quoted: 'Đã báo giá', Repairing: 'Đang sửa', Completed: 'Hoàn thành', Delivered: 'Đã bàn giao',
  Open: 'Đang mở', Call: 'Gọi điện', Email: 'Email', Visit: 'Tại cửa hàng', Message: 'Tin nhắn',
};
const label = (value) => labels[value] || value || '-';
const StatusBadge = ({ value }) => <span className={`badge ${['Cancelled'].includes(value) ? 'badge-danger' : ['Completed', 'Delivered', 'Received'].includes(value) ? 'badge-success' : ['Draft', 'Open', 'PartiallyReceived'].includes(value) ? 'badge-warning' : 'badge-info'}`}>{label(value)}</span>;

const BusinessOperations = ({ section = 'supply' }) => {
  const { isAdmin } = useAuth();
  const sectionConfig = SECTIONS[section] || SECTIONS.supply;
  const sectionTabs = sectionConfig.tabs;
  const [tab, setTab] = useState(sectionTabs[0]);
  const [data, setData] = useState({});
  const [lookups, setLookups] = useState({ skus: [], suppliers: [], customers: [], staff: [] });
  const [summary, setSummary] = useState({});
  const [modal, setModal] = useState('');
  const [supplier, setSupplier] = useState(emptySupplier);
  const [purchase, setPurchase] = useState(emptyPurchase);
  const [cash, setCash] = useState(emptyCash);
  const [repair, setRepair] = useState(emptyRepair);
  const [crm, setCrm] = useState(emptyCrm);
  const [crmStatus, setCrmStatus] = useState('');
  const [crmKeyword, setCrmKeyword] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailPurchase, setDetailPurchase] = useState(null);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [payment, setPayment] = useState(emptyPayment);
  const [repairDetail, setRepairDetail] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [lookup, stats, suppliers, purchases, cashRows, repairs, crmRows, receivableRows] = await Promise.all([
        service.getLookups(),
        service.getSummary(),
        service.getSuppliers(),
        service.getPurchases(),
        isAdmin() ? service.getCash() : Promise.resolve({ data: { items: [] } }),
        service.getRepairs(),
        service.getInteractions(),
        isAdmin() ? advancedOperationsService.getReceivables() : Promise.resolve({ data: { items: [] } }),
      ]);
      setLookups(lookup.data || {});
      setSummary(stats.data || {});
      setData({
        suppliers: suppliers.data.items || [],
        purchases: purchases.data.items || [],
        cash: cashRows.data.items || [],
        repairs: repairs.data.items || [],
        crm: crmRows.data.items || [],
        receivables: receivableRows.data.items || [],
      });
    } catch (err) {
      alert(msg(err, 'Không thể tải dữ liệu vận hành cửa hàng.'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, crmKeyword, crmStatus]);

  const openCreate = () => {
    if (tab === 'suppliers') setSupplier(emptySupplier);
    if (tab === 'purchases') setPurchase(emptyPurchase);
    if (tab === 'cash') setCash(emptyCash);
    if (tab === 'repairs') setRepair(emptyRepair);
    if (tab === 'crm') setCrm(emptyCrm);
    setModal(tab === 'suppliers' ? 'supplier' : tab === 'purchases' ? 'purchase' : tab === 'cash' ? 'cash' : tab === 'repairs' ? 'repair' : 'crm');
  };

  const save = async () => {
    try {
      if (modal === 'supplier') {
        supplier.id ? await service.updateSupplier(supplier.id, supplier) : await service.createSupplier(supplier);
      }
      if (modal === 'purchase') {
        const purchasePayload = {
          supplierId: Number(purchase.supplierId),
          note: purchase.note,
          lines: purchase.lines.filter((x) => x.skuId).map((x) => ({ skuId: Number(x.skuId), qty: Number(x.qty), unitCost: Number(x.unitCost) })),
        };
        if (purchase.id) await service.updatePurchase(purchase.id, purchasePayload);
        else await service.createPurchase(purchasePayload);
      }
      if (modal === 'cash') await service.createCash({ ...cash, amount: Number(cash.amount) });
      if (modal === 'repair') {
        const repairPayload = {
          customerId: Number(repair.customerId),
          assignedStaffId: repair.assignedStaffId ? Number(repair.assignedStaffId) : null,
          laborCost: Number(repair.laborCost),
          vehicleDescription: repair.vehicleDescription,
          reportedIssue: repair.reportedIssue,
          note: repair.note || null,
          lines: repair.lines.filter((x) => x.description || x.skuId).map((x) => ({
            skuId: x.skuId ? Number(x.skuId) : null,
            description: x.description || (lookups.skus || []).find((sku) => String(sku.id) === String(x.skuId))?.productName || 'Phụ tùng',
            qty: Number(x.qty),
            unitPrice: Number(x.unitPrice),
          })),
        };
        if (repair.id) await service.updateRepair(repair.id, repairPayload);
        else await service.createRepair(repairPayload);
      }
      if (modal === 'crm') {
        const payload = {
          ...crm,
          customerId: Number(crm.customerId),
          assignedStaffId: crm.assignedStaffId ? Number(crm.assignedStaffId) : null,
          followUpAt: crm.followUpAt || null,
        };
        crm.id ? await service.updateInteraction(crm.id, payload) : await service.createInteraction(payload);
      }
      setModal('');
      await load();
    } catch (err) {
      alert(msg(err, 'Lưu dữ liệu thất bại.'));
    }
  };

  const run = async (action) => {
    try {
      await action();
      await load();
    } catch (err) {
      alert(msg(err, 'Thao tác thất bại.'));
    }
  };

  const editPurchase = (row) => {
    setPurchase({
      id: row.id,
      supplierId: String(row.supplierId ?? ''),
      note: row.note || '',
      lines: (row.lines || []).map((line) => ({ skuId: String(line.skuId), qty: line.orderedQty, unitCost: line.unitCost })),
    });
    setModal('purchase');
  };

  const openReceive = (row) => {
    setReceiveTarget({
      ...row,
      lines: (row.lines || []).filter((line) => line.receivedQty < line.orderedQty).map((line) => ({ ...line, qty: line.orderedQty - line.receivedQty })),
      note: '',
    });
  };

  const receivePurchase = async () => {
    const lines = (receiveTarget?.lines || []).filter((line) => Number(line.qty) > 0).map((line) => ({ purchaseOrderLineId: line.id, qty: Number(line.qty) }));
    if (!lines.length) return alert('Vui lòng nhập số lượng nhận hàng.');
    await run(() => service.receivePurchase(receiveTarget.id, { note: receiveTarget.note, lines }));
    setReceiveTarget(null);
  };

  const payPurchase = async () => {
    if (!(Number(payment.amount) > 0)) return alert('Vui lòng nhập số tiền thanh toán.');
    await run(() => service.payPurchase(paymentTarget.id, { ...payment, amount: Number(payment.amount) }));
    setPaymentTarget(null);
  };

  const exportCurrent = async () => {
    const configs = {
      suppliers: { name: 'NhaCungCap', columns: [['Mã NCC', 'code'], ['Tên nhà cung cấp', 'name'], ['Liên hệ', 'contactName'], ['Điện thoại', 'phone'], ['Mã số thuế', 'taxCode'], ['Địa chỉ', 'address']] },
      purchases: { name: 'DonMuaHang', columns: [['Mã đơn mua', 'code'], ['Nhà cung cấp', 'supplierName'], ['Trạng thái', 'purchaseStatus'], ['Tổng tiền', 'totalAmount', 'currency'], ['Còn phải trả', 'outstanding', 'currency'], ['Ngày tạo', 'createdDate', 'date']] },
      cash: { name: 'ThuChi', columns: [['Mã phiếu', 'code'], ['Loại', 'transactionType'], ['Nhóm', 'category'], ['Số tiền', 'amount', 'currency'], ['Hình thức', 'method'], ['Ngày ghi nhận', 'occurredAt', 'date'], ['Ghi chú', 'note']] },
      repairs: { name: 'SuaChua', columns: [['Mã phiếu', 'code'], ['Khách hàng', 'customerName'], ['Xe', 'vehicleDescription'], ['Lỗi ghi nhận', 'reportedIssue'], ['Trạng thái', 'repairStatus'], ['Tổng phí', 'total', 'currency'], ['Ngày nhận', 'receivedAt', 'date']] },
      crm: { name: 'ChamSocKhachHang', columns: [['Khách hàng', 'customerName'], ['Loại', 'interactionType'], ['Nội dung', 'subject'], ['Trạng thái', 'interactionStatus'], ['Nhắc lại', 'followUpAt', 'date'], ['Hoàn thành', 'completedAt', 'date']] },
      receivables: { name: 'CongNo', columns: [['Mã đơn', 'orderCode'], ['Khách hàng', 'customerName'], ['Tổng đơn', 'grandTotal', 'currency'], ['Sau trả hàng', 'adjustedTotal', 'currency'], ['Đã thu', 'totalPaid', 'currency'], ['Đã hoàn', 'totalRefunded', 'currency'], ['Còn phải thu', 'outstanding', 'currency']] },
    };
    const config = configs[tab];
    await exportWorkbook({
      fileName: `${config.name}-${createDateStamp()}.xlsx`,
      sheets: [{ name: config.name, columns: config.columns.map(([header, key, type]) => ({ header, key, type, width: 22 })), rows: data[tab] || [] }],
    });
  };

  const importSuppliers = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('Không tìm thấy sheet dữ liệu.');
      const headers = {};
      sheet.getRow(1).eachCell((cell, index) => { headers[String(cell.value || '').trim().toLowerCase()] = index; });
      const value = (row, names) => {
        const key = names.find((x) => headers[x]);
        return key ? String(row.getCell(headers[key]).value || '').trim() : '';
      };
      const errors = [];
      let saved = 0;
      for (let index = 2; index <= sheet.rowCount; index += 1) {
        const row = sheet.getRow(index);
        const payload = {
          code: value(row, ['mã ncc', 'ma ncc', 'code']),
          name: value(row, ['tên nhà cung cấp', 'ten nha cung cap', 'name']),
          taxCode: value(row, ['mã số thuế', 'ma so thue', 'tax code']),
          contactName: value(row, ['liên hệ', 'lien he', 'contact']),
          phone: value(row, ['điện thoại', 'dien thoai', 'phone']),
          email: value(row, ['email']),
          address: value(row, ['địa chỉ', 'dia chi', 'address']),
          status: 1,
        };
        if (!payload.code && !payload.name) continue;
        try {
          await service.createSupplier(payload);
          saved += 1;
        } catch (err) {
          errors.push(`Dòng ${index}: ${msg(err, 'không thể lưu')}`);
        }
      }
      await load();
      alert(`Đã import ${saved} nhà cung cấp.${errors.length ? `\n${errors.join('\n')}` : ''}`);
    } catch (err) {
      alert(`Import XLSX thất bại: ${err.message}`);
    }
  };

  const printRecord = (title, rows) => {
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;
    popup.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#222}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:18px}th,td{border:1px solid #ddd;padding:9px;text-align:left}th{width:32%;background:#f3f4f6}.sign{display:grid;grid-template-columns:1fr 1fr;gap:80px;text-align:center;margin-top:54px}</style></head><body><h1>MoToSale - ${title}</h1><table>${rows.map(([rowLabel, value]) => `<tr><th>${rowLabel}</th><td>${value ?? '-'}</td></tr>`).join('')}</table><div class="sign"><div>Người lập phiếu<br/><br/><br/>........................</div><div>Người xác nhận<br/><br/><br/>........................</div></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const filteredCrm = useMemo(() => (data.crm || []).filter((row) => {
    const statusOk = !crmStatus || row.interactionStatus === crmStatus;
    const text = `${row.customerName || ''} ${row.subject || ''} ${row.note || ''}`.toLowerCase();
    return statusOk && (!crmKeyword || text.includes(crmKeyword.toLowerCase()));
  }), [data.crm, crmStatus, crmKeyword]);

  const filteredRows = useMemo(() => {
    const source = tab === 'crm' ? filteredCrm : (data[tab] || []);
    return source.filter((row) => {
      const text = JSON.stringify(row).toLowerCase();
      const status = row.purchaseStatus || row.repairStatus || row.interactionStatus || '';
      return (!keyword || text.includes(keyword.toLowerCase()))
        && (!statusFilter || status === statusFilter);
    });
  }, [data, filteredCrm, keyword, statusFilter, tab]);

  const selectTab = (nextTab) => {
    setTab(nextTab);
    setKeyword('');
    setStatusFilter('');
    setPage(1);
  };

  const modalTitle = {
    supplier: supplier.id ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp',
    purchase: purchase.id ? 'Sửa đơn mua hàng' : 'Lập đơn mua hàng',
    cash: 'Lập phiếu thu chi',
    repair: repair.id ? 'Sửa phiếu sửa chữa' : 'Tiếp nhận sửa chữa',
    crm: crm.id ? 'Cập nhật lịch chăm sóc khách hàng' : 'Tạo lịch chăm sóc khách hàng',
  }[modal];
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const summaryItems = {
    supply: [
      ['NCC hoạt động', summary.suppliers],
      ['Đơn mua đang xử lý', summary.pendingPurchases],
      ...(isAdmin() ? [['Giá trị mua hàng (toàn kỳ)', formatCurrency(summary.purchaseValue)]] : []),
    ],
    service: [
      ['Phiếu sửa đang mở', summary.openRepairs],
      ['CSKH cần xử lý', summary.openInteractions],
    ],
    finance: isAdmin() ? [['Thu ròng (toàn kỳ)', formatCurrency((summary.cashIn || 0) - (summary.cashOut || 0))]] : [],
  }[section] || [];

  return (
    <div className="content-wrapper">
      <div className="content-header"><div className="container-fluid"><h1 className="m-0">{sectionConfig.title}</h1></div></div>
      <section className="content"><div className="container-fluid">
        <div className="row">
          {summaryItems.map(([itemLabel, value]) => (
            <div className="col-lg-3 col-md-4 col-6" key={itemLabel}><div className="small-box bg-light"><div className="inner"><h4>{value || 0}</h4><p>{itemLabel}</p></div></div></div>
          ))}
        </div>

        <div className="card">
          <div className="card-header border-b border-slate-200 px-4 pt-3">
            <div className="flex flex-wrap gap-x-2 gap-y-1" role="tablist" aria-label={sectionConfig.title}>
              {sectionTabs.filter((key) => isAdmin() || !['cash', 'receivables'].includes(key)).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`} onClick={() => selectTab(key)}>
                  {TAB_META[key].label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body">
            <p className="text-muted">{TAB_META[tab]?.desc}</p>
            {TAB_META[tab]?.create && (isAdmin() || !['suppliers', 'cash'].includes(tab)) && <button className="btn btn-primary mb-3" onClick={openCreate}><i className="fas fa-plus mr-1" />{TAB_META[tab].create}</button>}
            <button className="btn btn-success mb-3 ml-2" onClick={exportCurrent}><i className="fas fa-file-excel mr-1" />Xuất XLSX</button>
            {tab === 'suppliers' && isAdmin() && <label className="btn btn-outline-success mb-3 ml-2"><i className="fas fa-file-import mr-1" />Import XLSX<input type="file" accept=".xlsx" className="d-none" onChange={importSuppliers} /></label>}

            <div className="row mb-3">
              <div className="col-md-4"><input className="form-control" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={TAB_META[tab]?.search || 'Tìm kiếm...'} /></div>
              {['purchases', 'repairs'].includes(tab) && <div className="col-md-3"><select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{(tab === 'purchases' ? ['Draft', 'Approved', 'PartiallyReceived', 'Received', 'Cancelled'] : ['Received', 'Inspecting', 'Quoted', 'Repairing', 'Completed', 'Delivered', 'Cancelled']).map((x) => <option key={x} value={x}>{label(x)}</option>)}</select></div>}
            </div>

            {tab === 'suppliers' && <SuppliersTable rows={visibleRows} canEdit={isAdmin()} edit={(x) => { setSupplier(x); setModal('supplier'); }} />}
            {tab === 'purchases' && <PurchasesTable rows={visibleRows} isAdmin={isAdmin()} run={run} view={setDetailPurchase} edit={editPurchase} receive={openReceive} pay={(x) => { setPaymentTarget(x); setPayment({ ...emptyPayment, amount: x.outstanding }); }} printRecord={printRecord} />}
            {tab === 'cash' && <CashTable rows={visibleRows} isAdmin={isAdmin()} run={run} printRecord={printRecord} />}
            {tab === 'receivables' && <ReceivablesTable rows={visibleRows} />}
            {tab === 'repairs' && <RepairsTable rows={visibleRows} run={run} view={setRepairDetail} printRecord={printRecord} edit={(x) => { setRepair({ id: x.id, customerId: x.customerId, assignedStaffId: x.assignedStaffId || '', vehicleDescription: x.vehicleDescription, reportedIssue: x.reportedIssue, laborCost: x.laborCost, note: x.note || '', lines: (x.lines || []).map((l) => ({ skuId: l.skuId || '', description: l.description, qty: l.qty, unitPrice: l.unitPrice })) }); setModal('repair'); }} />}
            {tab === 'crm' && (
              <>
                <div className="row mb-3">
                  <div className="col-md-3"><select className="form-control" value={crmStatus} onChange={(e) => setCrmStatus(e.target.value)}><option value="">Tất cả CSKH</option><option value="Open">Đang mở</option><option value="Completed">Hoàn thành</option><option value="Cancelled">Đã hủy</option></select></div>
                  <div className="col-md-5"><input className="form-control" placeholder="Tìm khách hàng hoặc nội dung chăm sóc..." value={crmKeyword} onChange={(e) => setCrmKeyword(e.target.value)} /></div>
                </div>
                <CrmTable rows={visibleRows} run={run} edit={(x) => { setCrm({ ...x, followUpAt: x.followUpAt ? new Date(x.followUpAt).toISOString().slice(0, 16) : '' }); setModal('crm'); }} />
              </>
            )}

            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-muted">Hiển thị {visibleRows.length} / {filteredRows.length} dòng</span>
              <div>
                <button className="btn btn-outline-secondary btn-sm mr-2" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Trước</button>
                <span>Trang {page}/{totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm ml-2" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Sau</button>
              </div>
            </div>
          </div>
        </div>
      </div></section>

      {modal && <Modal title={modalTitle} close={() => setModal('')} save={save}>
        {modal === 'supplier' && <SupplierForm value={supplier} set={setSupplier} />}
        {modal === 'purchase' && <PurchaseForm value={purchase} set={setPurchase} lookups={lookups} />}
        {modal === 'cash' && <CashForm value={cash} set={setCash} />}
        {modal === 'repair' && <RepairForm value={repair} set={setRepair} lookups={lookups} />}
        {modal === 'crm' && <CrmForm value={crm} set={setCrm} lookups={lookups} />}
      </Modal>}
      {detailPurchase && <PurchaseDetail value={detailPurchase} close={() => setDetailPurchase(null)} />}
      {receiveTarget && <ReceiveModal value={receiveTarget} set={setReceiveTarget} close={() => setReceiveTarget(null)} save={receivePurchase} />}
      {paymentTarget && <Modal title={`Thanh toán đơn mua ${paymentTarget.code}`} close={() => setPaymentTarget(null)} save={payPurchase}><MoneyInput label="Số tiền" value={payment.amount} set={(x) => setPayment({ ...payment, amount: x })} /><Select label="Hình thức" value={payment.method} set={(x) => setPayment({ ...payment, method: x })} items={[{ id: 'Cash', name: 'Tiền mặt' }, { id: 'BankTransfer', name: 'Chuyển khoản' }]} text={(x) => x.name} /><Input label="Ghi chú" value={payment.note} set={(x) => setPayment({ ...payment, note: x })} /></Modal>}
      {repairDetail && <RepairDetail value={repairDetail} close={() => setRepairDetail(null)} />}
    </div>
  );
};

const Table = ({ headers, children }) => <div className="table-responsive"><table className="table table-bordered table-striped"><thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{React.Children.count(children) ? children : <tr><td colSpan={headers.length} className="text-center text-muted">Chưa có dữ liệu.</td></tr>}</tbody></table></div>;
const Input = ({ label, value, set, type = 'text', inputMode }) => <div className="form-group"><label>{label}</label><input className="form-control" type={type} inputMode={inputMode} value={value} onChange={(e) => set(e.target.value)} /></div>;
const MoneyInput = ({ label, value, set }) => <Input label={label} type="text" inputMode="numeric" value={formatMoneyInput(value)} set={(x) => set(normalizeMoneyInput(x))} />;
const Select = ({ label, value, set, items = [], text }) => <div className="form-group"><label>{label}</label><select className="form-control" value={value} onChange={(e) => set(e.target.value)}><option value="">-- Chọn --</option>{items.map((x) => <option key={x.id} value={x.id}>{text(x)}</option>)}</select></div>;
const Modal = ({ title, close, save, children }) => <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.5)' }}><div className="modal-dialog modal-lg"><div className="modal-content"><div className="modal-header"><h5>{title}</h5><button className="close" onClick={close}>&times;</button></div><div className="modal-body">{children}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={close}>Đóng</button>{save && <button className="btn btn-primary" onClick={save}>Lưu</button>}</div></div></div></div>;

const SuppliersTable = ({ rows, edit, canEdit }) => <Table headers={['Mã NCC', 'Tên nhà cung cấp', 'Liên hệ', 'Điện thoại', 'Mã số thuế', 'Trạng thái', 'Thao tác']}>{rows.map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.name}</td><td>{x.contactName || '-'}</td><td>{x.phone || '-'}</td><td>{x.taxCode || '-'}</td><td>{x.status === 1 ? 'Hoạt động' : 'Ngừng hợp tác'}</td><td>{canEdit && <button className="btn btn-info btn-xs" onClick={() => edit(x)}>Sửa</button>}</td></tr>)}</Table>;
const PurchasesTable = ({ rows, run, view, edit, receive, pay, isAdmin, printRecord }) => <Table headers={['Mã đơn mua', 'Nhà cung cấp', 'Tổng tiền', 'Còn phải trả', 'Trạng thái', 'Ngày tạo', 'Thao tác']}>{rows.map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.supplierName}</td><td className="text-right">{formatCurrency(x.totalAmount)}</td><td className="text-right">{formatCurrency(x.outstanding)}</td><td><StatusBadge value={x.purchaseStatus} /></td><td>{formatDate(x.createdDate)}</td><td className="text-nowrap"><button className="btn btn-secondary btn-xs mr-1" onClick={() => view(x)}>Chi tiết</button>{isAdmin && x.purchaseStatus === 'Draft' && <><button className="btn btn-info btn-xs mr-1" onClick={() => edit(x)}>Sửa</button><button className="btn btn-success btn-xs mr-1" onClick={() => run(() => service.approvePurchase(x.id))}>Duyệt</button><button className="btn btn-danger btn-xs mr-1" onClick={() => window.confirm('Hủy đơn mua này?') && run(() => service.cancelPurchase(x.id))}>Hủy</button></>}{['Approved', 'PartiallyReceived'].includes(x.purchaseStatus) && <button className="btn btn-info btn-xs mr-1" onClick={() => receive(x)}>Nhận hàng từ NCC</button>}{isAdmin && x.outstanding > 0 && !['Draft', 'Cancelled'].includes(x.purchaseStatus) && <button className="btn btn-warning btn-xs mr-1" onClick={() => pay(x)}>Thanh toán</button>}<button className="btn btn-outline-secondary btn-xs" onClick={() => printRecord(`Đơn mua ${x.code}`, [['Nhà cung cấp', x.supplierName], ['Tổng tiền', formatCurrency(x.totalAmount)], ['Còn phải trả', formatCurrency(x.outstanding)], ['Trạng thái', label(x.purchaseStatus)], ['Ngày tạo', formatDate(x.createdDate)]])}>In</button></td></tr>)}</Table>;
const CashTable = ({ rows, printRecord, isAdmin, run }) => <Table headers={['Mã phiếu', 'Loại', 'Nhóm', 'Số tiền', 'Hình thức', 'Ngày ghi nhận', 'Ghi chú', 'Thao tác']}>{rows.map((x) => <tr key={x.id}><td>{x.code}</td><td>{label(x.transactionType)}</td><td>{x.category}</td><td className="text-right">{formatCurrency(x.amount)}</td><td>{label(x.method)}</td><td>{formatDate(x.occurredAt)}</td><td>{x.note || '-'}</td><td className="text-nowrap"><button className="btn btn-secondary btn-xs mr-1" onClick={() => printRecord(`Phiếu ${label(x.transactionType).toLowerCase()} ${x.code}`, [['Nhóm', x.category], ['Số tiền', formatCurrency(x.amount)], ['Hình thức', label(x.method)], ['Ngày ghi nhận', formatDate(x.occurredAt)], ['Ghi chú', x.note]])}>In</button>{isAdmin && x.referenceType !== 'CashReversal' && <button className="btn btn-outline-danger btn-xs" onClick={() => window.confirm(`Đảo phiếu ${x.code}?`) && run(() => service.reverseCash(x.id))}>Đảo phiếu</button>}</td></tr>)}</Table>;
const RepairsTable = ({ rows, run, view, printRecord, edit }) => {
  const actions = { Received: ['Inspecting', 'Kiểm tra xe'], Inspecting: ['Quoted', 'Xác nhận báo giá'], Quoted: ['Repairing', 'Bắt đầu sửa'], Repairing: ['Completed', 'Sửa xong'], Completed: ['Delivered', 'Bàn giao'] };
  return <Table headers={['Mã phiếu', 'Khách hàng', 'Xe', 'Lỗi ghi nhận', 'Trạng thái', 'Tổng phí', 'Ngày nhận', 'Thao tác']}>{rows.map((x) => {
    const action = actions[x.repairStatus];
    return <tr key={x.id}><td>{x.code}</td><td>{x.customerName}</td><td>{x.vehicleDescription}</td><td>{x.reportedIssue}</td><td><StatusBadge value={x.repairStatus} /></td><td className="text-right">{formatCurrency(x.total)}</td><td>{formatDate(x.receivedAt)}</td><td className="text-nowrap"><button className="btn btn-secondary btn-xs mr-1" onClick={() => view(x)}>Chi tiết</button>{x.repairStatus === 'Received' && <button className="btn btn-warning btn-xs mr-1" onClick={() => edit(x)}>Sửa</button>}{action && <button className="btn btn-primary btn-xs mr-1" onClick={() => run(() => service.updateRepairStatus(x.id, { status: action[0], note: action[1] }))}>{action[1]}</button>}{['Received', 'Inspecting', 'Quoted'].includes(x.repairStatus) && <button className="btn btn-outline-danger btn-xs mr-1" onClick={() => window.confirm('Hủy phiếu sửa chữa này?') && run(() => service.updateRepairStatus(x.id, { status: 'Cancelled', note: 'Hủy phiếu sửa chữa' }))}>Hủy</button>}<button className="btn btn-outline-secondary btn-xs" onClick={() => printRecord(`Phiếu sửa chữa ${x.code}`, [['Khách hàng', x.customerName], ['Xe', x.vehicleDescription], ['Lỗi ghi nhận', x.reportedIssue], ['Trạng thái', label(x.repairStatus)], ['Tổng phí', formatCurrency(x.total)], ['Ngày nhận', formatDate(x.receivedAt)]])}>In</button></td></tr>;
  })}</Table>;
};
const CrmTable = ({ rows, run, edit }) => <Table headers={['Khách hàng', 'Loại', 'Nội dung', 'Trạng thái', 'Nhắc lại', 'Thao tác']}>{rows.map((x) => <tr key={x.id}><td>{x.customerName}</td><td>{label(x.interactionType)}</td><td>{x.subject}<div className="text-muted small">{x.note || ''}</div></td><td><StatusBadge value={x.interactionStatus} /></td><td>{formatDate(x.followUpAt)}</td><td className="text-nowrap">{x.interactionStatus === 'Open' && <><button className="btn btn-info btn-xs mr-1" onClick={() => edit(x)}>Sửa</button><button className="btn btn-success btn-xs mr-1" onClick={() => run(() => service.completeInteraction(x.id))}>Hoàn thành</button><button className="btn btn-outline-danger btn-xs" onClick={() => window.confirm('Hủy lịch chăm sóc này?') && run(() => service.cancelInteraction(x.id))}>Hủy</button></>}</td></tr>)}</Table>;
const ReceivablesTable = ({ rows }) => <Table headers={['Mã đơn', 'Khách hàng', 'Tổng đơn', 'Sau trả hàng', 'Đã thu', 'Đã hoàn', 'Còn phải thu', 'Trạng thái TT']}>{rows.map((x) => <tr key={x.orderId}><td>{x.orderCode}</td><td>{x.customerName || '-'}</td><td className="text-right">{formatCurrency(x.grandTotal)}</td><td className="text-right">{formatCurrency(x.adjustedTotal)}</td><td className="text-right">{formatCurrency(x.totalPaid)}</td><td className="text-right">{formatCurrency(x.totalRefunded)}</td><td className="text-right font-weight-bold text-danger">{formatCurrency(x.outstanding)}</td><td>{x.paymentStatus}</td></tr>)}</Table>;
const SupplierForm = ({ value, set }) => <><Input label="Mã nhà cung cấp" value={value.code} set={(x) => set({ ...value, code: x })} /><Input label="Tên nhà cung cấp" value={value.name} set={(x) => set({ ...value, name: x })} /><Input label="Người liên hệ" value={value.contactName} set={(x) => set({ ...value, contactName: x })} /><Input label="Điện thoại" value={value.phone} set={(x) => set({ ...value, phone: x })} /><Input label="Email" type="email" value={value.email || ''} set={(x) => set({ ...value, email: x })} /><Input label="Mã số thuế" value={value.taxCode} set={(x) => set({ ...value, taxCode: x })} /><Input label="Địa chỉ" value={value.address || ''} set={(x) => set({ ...value, address: x })} /><Input label="Ghi chú" value={value.note || ''} set={(x) => set({ ...value, note: x })} /><Select label="Trạng thái hợp tác" value={value.status} set={(x) => set({ ...value, status: Number(x) })} items={[{ id: 1, name: 'Hoạt động' }, { id: 0, name: 'Ngừng hợp tác' }]} text={(x) => x.name} /></>;
// Ô chọn SKU có tìm kiếm: gõ mã SKU / tên sản phẩm để lọc, đỡ phải cuộn cả danh sách dài.
const SkuPicker = ({ label, value, set, items = [] }) => {
  const [query, setQuery] = useState('');
  const selected = items.find((s) => String(s.id) === String(value));
  const kw = query.trim().toLowerCase();
  const matches = kw
    ? items.filter((s) => `${s.skuCode || ''} ${s.productName || ''} ${s.variantName || ''}`.toLowerCase().includes(kw)).slice(0, 15)
    : [];
  return (
    <div className="form-group">
      <label>{label}</label>
      {selected && (
        <div className="small text-success mb-1">
          Đã chọn: <strong>{selected.skuCode}</strong> - {selected.productName}{selected.variantName ? ` (${selected.variantName})` : ''}
          <button type="button" className="btn btn-link btn-sm p-0 ml-2" onClick={() => set('')}>bỏ chọn</button>
        </div>
      )}
      <input
        className="form-control form-control-sm"
        placeholder="Gõ mã SKU hoặc tên sản phẩm để tìm..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {kw && (
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ced4da', borderTop: 'none' }}>
          {matches.length === 0 ? (
            <div className="p-2 text-muted small">Không tìm thấy SKU phù hợp.</div>
          ) : (
            matches.map((s) => (
              <button
                type="button"
                key={s.id}
                className="dropdown-item"
                style={{ whiteSpace: 'normal' }}
                onClick={() => { set(String(s.id)); setQuery(''); }}
              >
                <strong>{s.skuCode}</strong> - {s.productName}{s.variantName ? ` (${s.variantName})` : ''}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const PurchaseForm = ({ value, set, lookups }) => {
  const update = (index, key, nextValue) => set({ ...value, lines: value.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: nextValue } : line)) });
  return <><Select label="Nhà cung cấp" value={value.supplierId} set={(x) => set({ ...value, supplierId: x })} items={lookups.suppliers || []} text={(x) => `${x.code} - ${x.name}`} />{value.lines.map((line, index) => <div className="border rounded p-2 mb-2" key={index}><SkuPicker label={`SKU nhập #${index + 1}`} value={line.skuId} set={(x) => update(index, 'skuId', x)} items={lookups.skus || []} /><div className="row"><div className="col-md-6"><Input label="Số lượng" type="number" value={line.qty} set={(x) => update(index, 'qty', x)} /></div><div className="col-md-6"><MoneyInput label="Giá nhập" value={line.unitCost} set={(x) => update(index, 'unitCost', x)} /></div></div>{value.lines.length > 1 && <button className="btn btn-outline-danger btn-sm" onClick={() => set({ ...value, lines: value.lines.filter((_, i) => i !== index) })}>Xóa dòng</button>}</div>)}<button className="btn btn-outline-primary btn-sm mb-3" onClick={() => set({ ...value, lines: [...value.lines, { ...emptyPurchaseLine }] })}>Thêm dòng SKU</button><Input label="Ghi chú" value={value.note || ''} set={(x) => set({ ...value, note: x })} /></>;
};
const CashForm = ({ value, set }) => <><Select label="Loại phiếu" value={value.transactionType} set={(x) => set({ ...value, transactionType: x })} items={[{ id: 'Receipt', name: 'Phiếu thu' }, { id: 'Payment', name: 'Phiếu chi' }]} text={(x) => x.name} /><Select label="Nhóm thu chi" value={value.category} set={(x) => set({ ...value, category: x })} items={[{ id: 'Other', name: 'Khác' }, { id: 'Service', name: 'Dịch vụ sửa chữa' }, { id: 'OperatingExpense', name: 'Chi phí vận hành' }, { id: 'SupplierPayment', name: 'Thanh toán nhà cung cấp' }]} text={(x) => x.name} /><Select label="Hình thức" value={value.method} set={(x) => set({ ...value, method: x })} items={[{ id: 'Cash', name: 'Tiền mặt' }, { id: 'BankTransfer', name: 'Chuyển khoản' }]} text={(x) => x.name} /><MoneyInput label="Số tiền" value={value.amount} set={(x) => set({ ...value, amount: x })} /><Input label="Ngày ghi nhận" type="datetime-local" value={value.occurredAt || ''} set={(x) => set({ ...value, occurredAt: x || null })} /><Input label="Ghi chú" value={value.note} set={(x) => set({ ...value, note: x })} /></>;
const RepairForm = ({ value, set, lookups }) => {
  const updateLine = (index, key, nextValue) => set({ ...value, lines: value.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: nextValue } : line)) });
  return <><Select label="Khách hàng" value={value.customerId} set={(x) => set({ ...value, customerId: x })} items={lookups.customers || []} text={(x) => `${x.fullName} - ${x.email}`} /><Select label="Nhân viên phụ trách" value={value.assignedStaffId} set={(x) => set({ ...value, assignedStaffId: x })} items={lookups.staff || []} text={(x) => x.fullName} /><Input label="Thông tin xe" value={value.vehicleDescription} set={(x) => set({ ...value, vehicleDescription: x })} /><Input label="Lỗi ghi nhận" value={value.reportedIssue} set={(x) => set({ ...value, reportedIssue: x })} /><MoneyInput label="Công sửa chữa" value={value.laborCost} set={(x) => set({ ...value, laborCost: x })} /><Input label="Ghi chú" value={value.note || ''} set={(x) => set({ ...value, note: x })} /><hr /><strong>Phụ tùng sử dụng</strong>{value.lines.map((line, index) => <div className="border rounded p-2 mb-2" key={index}><Select label="SKU phụ tùng" value={line.skuId} set={(x) => updateLine(index, 'skuId', x)} items={lookups.skus || []} text={(x) => `${x.skuCode} - ${x.productName}`} /><Input label="Mô tả" value={line.description} set={(x) => updateLine(index, 'description', x)} /><div className="row"><div className="col-md-6"><Input label="Số lượng" type="number" value={line.qty} set={(x) => updateLine(index, 'qty', x)} /></div><div className="col-md-6"><MoneyInput label="Đơn giá" value={line.unitPrice} set={(x) => updateLine(index, 'unitPrice', x)} /></div></div><button className="btn btn-outline-danger btn-sm" onClick={() => set({ ...value, lines: value.lines.filter((_, i) => i !== index) })}>Xóa phụ tùng</button></div>)}<button className="btn btn-outline-primary btn-sm" onClick={() => set({ ...value, lines: [...value.lines, { ...emptyRepairLine }] })}>Thêm phụ tùng</button></>;
};
const CrmForm = ({ value, set, lookups }) => <><Select label="Khách hàng" value={value.customerId} set={(x) => set({ ...value, customerId: x })} items={lookups.customers || []} text={(x) => `${x.fullName} - ${x.email}`} /><Select label="Loại tương tác" value={value.interactionType} set={(x) => set({ ...value, interactionType: x })} items={[{ id: 'Call', name: 'Gọi điện' }, { id: 'Email', name: 'Email' }, { id: 'Visit', name: 'Tại cửa hàng' }, { id: 'Message', name: 'Tin nhắn' }]} text={(x) => x.name} /><Select label="Nhân viên phụ trách" value={value.assignedStaffId} set={(x) => set({ ...value, assignedStaffId: x })} items={lookups.staff || []} text={(x) => x.fullName} /><Input label="Nội dung chăm sóc" value={value.subject} set={(x) => set({ ...value, subject: x })} /><Input label="Nhắc lại lúc" type="datetime-local" value={value.followUpAt} set={(x) => set({ ...value, followUpAt: x })} /><Input label="Ghi chú" value={value.note} set={(x) => set({ ...value, note: x })} /></>;
const PurchaseDetail = ({ value, close }) => <Modal title={`Chi tiết đơn mua - ${value.code}`} close={close}>
  <div className="row mb-3"><div className="col-md-6"><strong>Nhà cung cấp:</strong> {value.supplierName}</div><div className="col-md-6"><strong>Trạng thái:</strong> {label(value.purchaseStatus)}</div></div>
  <Table headers={['SKU', 'Sản phẩm', 'Đặt mua', 'Đã nhận', 'Còn lại', 'Giá nhập']}>{(value.lines || []).map((line) => <tr key={line.id}><td>{line.skuCode || line.skuId}</td><td>{line.productName || '-'}</td><td className="text-right">{line.orderedQty}</td><td className="text-right">{line.receivedQty}</td><td className="text-right">{line.orderedQty - line.receivedQty}</td><td className="text-right">{formatCurrency(line.unitCost)}</td></tr>)}</Table>
</Modal>;

const ReceiveModal = ({ value, set, close, save }) => <Modal title={`Nhận hàng từ NCC - ${value.code}`} close={close} save={save}>
  <p>Nhập đúng số lượng thực nhận cho từng SKU. Có thể nhận một phần và tiếp tục nhận ở lần sau.</p>
  <Table headers={['SKU', 'Sản phẩm', 'Còn phải nhận', 'Nhận lần này']}>{value.lines.map((line, index) => <tr key={line.id}><td>{line.skuCode || line.skuId}</td><td>{line.productName || '-'}</td><td className="text-right">{line.orderedQty - line.receivedQty}</td><td><input className="form-control" type="number" min="0" max={line.orderedQty - line.receivedQty} value={line.qty} onChange={(e) => set({ ...value, lines: value.lines.map((item, itemIndex) => (itemIndex === index ? { ...item, qty: e.target.value } : item)) })} /></td></tr>)}</Table>
  <Input label="Ghi chú nhận hàng" value={value.note || ''} set={(x) => set({ ...value, note: x })} />
</Modal>;

const RepairDetail = ({ value, close }) => <Modal title={`Chi tiết sửa chữa - ${value.code}`} close={close}>
  <div className="row mb-3"><div className="col-md-4"><strong>Khách hàng:</strong> {value.customerName}</div><div className="col-md-4"><strong>Xe:</strong> {value.vehicleDescription}</div><div className="col-md-4"><strong>Trạng thái:</strong> {label(value.repairStatus)}</div></div>
  <p><strong>Lỗi ghi nhận:</strong> {value.reportedIssue}</p>
  <h6>Phụ tùng sử dụng</h6>
  <Table headers={['Mô tả', 'Số lượng', 'Đơn giá']}>{(value.lines || []).map((line) => <tr key={line.id}><td>{line.description}</td><td className="text-right">{line.qty}</td><td className="text-right">{formatCurrency(line.unitPrice)}</td></tr>)}</Table>
  <h6>Lịch sử xử lý</h6>
  <Table headers={['Thời gian', 'Trạng thái trước', 'Trạng thái sau', 'Ghi chú']}>{(value.histories || []).map((history) => <tr key={history.id}><td>{formatDate(history.changedAt)}</td><td>{label(history.fromStatus)}</td><td>{label(history.toStatus)}</td><td>{history.note || '-'}</td></tr>)}</Table>
</Modal>;

export default BusinessOperations;
