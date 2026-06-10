import React, { useEffect, useState } from 'react';
import warrantyService from '../../services/warrantyService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';

const STATUS = {
  Received: { label: 'Tiếp nhận', color: 'info' },
  Processing: { label: 'Đang xử lý', color: 'primary' },
  WaitingParts: { label: 'Chờ linh kiện', color: 'warning' },
  Completed: { label: 'Hoàn tất', color: 'success' },
  Rejected: { label: 'Từ chối', color: 'danger' },
};

const emptyForm = {
  tenKhachHang: '',
  soDienThoai: '',
  maDonHang: '',
  maNguoiDung: '',
  maSanPham: '',
  maBienSanPham: '',
  sku: '',
  tenSanPham: '',
  soKhung: '',
  soMay: '',
  ngayMua: '',
  hetHanBaoHanh: '',
  loiKhachBao: '',
  chiPhiDuKien: '',
  ghiChu: '',
};

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;
const statusBadge = (status) => {
  const meta = STATUS[status] || STATUS.Received;
  return <span className={`badge badge-${meta.color}`}>{meta.label}</span>;
};

const WarrantyList = () => {
  const [items, setItems] = useState([]);
  const [histories, setHistories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusForm, setStatusForm] = useState({ trangThai: 'Processing', ghiChu: '', chiPhiThucTe: '' });

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await warrantyService.getAll({ search: search || undefined, status: status || undefined, pageSize: 100 });
      setItems(res.data.items || []);
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải phiếu bảo hành.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, status]);

  const openDetail = async (item) => {
    try {
      const id = item.maBaoHanh ?? item.MaBaoHanh;
      const res = await warrantyService.getById(id);
      setSelected(res.data.warranty || item);
      setHistories(res.data.histories || []);
      setStatusForm({ trangThai: res.data.warranty?.trangThai || 'Processing', ghiChu: '', chiPhiThucTe: '' });
    } catch (err) {
      alert(getApiMessage(err, 'Không thể tải chi tiết bảo hành.'));
    }
  };

  const saveWarranty = async () => {
    if (!form.tenKhachHang.trim() || !form.soDienThoai.trim() || !form.tenSanPham.trim() || !form.loiKhachBao.trim()) {
      alert('Khách hàng, SĐT, sản phẩm và lỗi khách báo là bắt buộc.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        maDonHang: form.maDonHang ? Number(form.maDonHang) : null,
        maNguoiDung: form.maNguoiDung ? Number(form.maNguoiDung) : null,
        maSanPham: form.maSanPham ? Number(form.maSanPham) : null,
        maBienSanPham: form.maBienSanPham ? Number(form.maBienSanPham) : null,
        chiPhiDuKien: form.chiPhiDuKien ? Number(form.chiPhiDuKien) : null,
      };
      if (editingId) await warrantyService.update(editingId, payload);
      else await warrantyService.create(payload);
      setShowCreate(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchItems();
    } catch (err) {
      alert(getApiMessage(err, editingId ? 'Không thể cập nhật phiếu bảo hành.' : 'Không thể tạo phiếu bảo hành.'));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowCreate(true); };
  const openEditWarranty = (item) => {
    setEditingId(item.maBaoHanh ?? item.MaBaoHanh);
    setForm({
      tenKhachHang: item.tenKhachHang || '', soDienThoai: item.soDienThoai || '',
      maDonHang: item.maDonHang || '', maNguoiDung: item.maNguoiDung || '', maSanPham: '',
      maBienSanPham: item.maBienSanPham || '', sku: item.sku || '', tenSanPham: item.tenSanPham || '',
      soKhung: item.soKhung || '', soMay: item.soMay || '',
      ngayMua: item.ngayMua ? String(item.ngayMua).slice(0, 10) : '',
      hetHanBaoHanh: item.hetHanBaoHanh ? String(item.hetHanBaoHanh).slice(0, 10) : '',
      loiKhachBao: item.loiKhachBao || '', chiPhiDuKien: item.chiPhiDuKien || '', ghiChu: item.ghiChu || '',
    });
    setShowCreate(true);
  };

  const updateStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await warrantyService.updateStatus(selected.maBaoHanh ?? selected.MaBaoHanh, {
        trangThai: statusForm.trangThai,
        ghiChu: statusForm.ghiChu,
        chiPhiThucTe: statusForm.chiPhiThucTe ? Number(statusForm.chiPhiThucTe) : null,
      });
      await fetchItems();
      await openDetail(selected);
    } catch (err) {
      alert(getApiMessage(err, 'Cập nhật bảo hành thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const printWarranty = () => {
    if (!selected) return;
    const code = selected.maPhieuBaoHanh ?? selected.MaPhieuBaoHanh;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Phiếu bảo hành ${code}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-top: 16px; }
            .box { border: 1px solid #ddd; padding: 12px; margin-top: 16px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 42px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>MoToSale - Phiếu bảo hành</h1>
          <div>Mã phiếu: ${code}</div>
          <div class="grid">
            <div>Khách hàng: ${selected.tenKhachHang ?? selected.TenKhachHang}</div>
            <div>SĐT: ${selected.soDienThoai ?? selected.SoDienThoai}</div>
            <div>Sản phẩm: ${selected.tenSanPham ?? selected.TenSanPham}</div>
            <div>SKU: ${selected.sku ?? selected.SKU ?? '-'}</div>
            <div>Số khung: ${selected.soKhung ?? selected.SoKhung ?? '-'}</div>
            <div>Số máy: ${selected.soMay ?? selected.SoMay ?? '-'}</div>
            <div>Ngày mua: ${formatDate(selected.ngayMua ?? selected.NgayMua)}</div>
            <div>Hết hạn: ${formatDate(selected.hetHanBaoHanh ?? selected.HetHanBaoHanh)}</div>
            <div>Trạng thái: ${STATUS[selected.trangThai ?? selected.TrangThai]?.label || selected.trangThai || selected.TrangThai}</div>
            <div>Chi phí: ${formatCurrency(selected.chiPhiThucTe ?? selected.ChiPhiThucTe ?? selected.chiPhiDuKien ?? selected.ChiPhiDuKien ?? 0)}</div>
          </div>
          <div class="box"><strong>Lỗi khách báo:</strong><br>${selected.loiKhachBao ?? selected.LoiKhachBao}</div>
          <div class="box"><strong>Ghi chú xử lý:</strong><br>${selected.ghiChu ?? selected.GhiChu ?? '-'}</div>
          <div class="signatures">
            <div>Nhân viên tiếp nhận<br><br><br>........................</div>
            <div>Khách hàng<br><br><br>........................</div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Bảo hành</h1></div>
            <div className="col-sm-6 text-right">
              <button className="btn btn-primary" onClick={openCreate}>
                <i className="fas fa-plus mr-1"></i>
                Tạo phiếu bảo hành
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="card">
            <div className="card-body">
              <div className="row">
                <div className="col-md-8">
                  <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã phiếu, khách hàng, SĐT, SKU, sản phẩm..." />
                </div>
                <div className="col-md-4">
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Khách hàng</th>
                      <th>Sản phẩm</th>
                      <th>Trạng thái</th>
                      <th>Hết hạn</th>
                      <th>Chi phí</th>
                      <th>Ngày tạo</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="8" className="text-center py-4">Đang tải bảo hành...</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan="8" className="text-center text-muted py-4">Chưa có phiếu bảo hành.</td></tr>
                    ) : items.map((item) => (
                      <tr key={item.maBaoHanh ?? item.MaBaoHanh}>
                        <td><strong>{item.maPhieuBaoHanh ?? item.MaPhieuBaoHanh}</strong></td>
                        <td>{item.tenKhachHang ?? item.TenKhachHang}<div className="small text-muted">{item.soDienThoai ?? item.SoDienThoai}</div></td>
                        <td>{item.tenSanPham ?? item.TenSanPham}<div className="small text-muted">{item.sku ?? item.SKU}</div></td>
                        <td>{statusBadge(item.trangThai ?? item.TrangThai)}</td>
                        <td>{formatDate(item.hetHanBaoHanh ?? item.HetHanBaoHanh)}</td>
                        <td>{formatCurrency(item.chiPhiThucTe ?? item.ChiPhiThucTe ?? item.chiPhiDuKien ?? item.ChiPhiDuKien ?? 0)}</td>
                        <td>{formatDate(item.ngayTao ?? item.NgayTao)}</td>
                        <td className="text-center text-nowrap">
                          <button className="btn btn-xs btn-info mr-1" onClick={() => openDetail(item)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          {(item.trangThai ?? item.TrangThai) === 'Received' && (
                            <button className="btn btn-xs btn-warning" title="Sửa thông tin" onClick={() => openEditWarranty(item)}>
                              <i className="fas fa-pen"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showCreate && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Sửa phiếu bảo hành' : 'Tạo phiếu bảo hành'}</h5>
                <button className="close" onClick={() => setShowCreate(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {[
                    ['tenKhachHang', 'Khách hàng *'],
                    ['soDienThoai', 'SĐT *'],
                    ['tenSanPham', 'Sản phẩm *'],
                    ['sku', 'SKU'],
                    ['maDonHang', 'Mã đơn hàng'],
                    ['maNguoiDung', 'Mã khách hàng'],
                    ['maSanPham', 'Mã sản phẩm'],
                    ['maBienSanPham', 'Mã biến thể'],
                    ['soKhung', 'Số khung'],
                    ['soMay', 'Số máy'],
                    ['ngayMua', 'Ngày mua'],
                    ['hetHanBaoHanh', 'Hết hạn bảo hành'],
                    ['chiPhiDuKien', 'Chi phí dự kiến'],
                  ].map(([field, label]) => (
                    <div className="col-md-4" key={field}>
                      <div className="form-group">
                        <label>{label}</label>
                        <input
                          type={field.includes('ngay') || field.includes('hetHan') ? 'date' : field.includes('chiPhi') ? 'text' : field.startsWith('ma') ? 'number' : 'text'}
                          inputMode={field.includes('chiPhi') ? 'numeric' : undefined}
                          className="form-control"
                          value={field.includes('chiPhi') ? formatMoneyInput(form[field]) : form[field]}
                          onChange={(e) => setField(field, field.includes('chiPhi') ? normalizeMoneyInput(e.target.value) : e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Lỗi khách báo *</label>
                      <textarea className="form-control" rows="4" value={form.loiKhachBao} onChange={(e) => setField('loiKhachBao', e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Ghi chú</label>
                      <textarea className="form-control" rows="4" value={form.ghiChu} onChange={(e) => setField('ghiChu', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Đóng</button>
                <button className="btn btn-primary" onClick={saveWarranty} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu phiếu'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết bảo hành - {selected.maPhieuBaoHanh ?? selected.MaPhieuBaoHanh}</h5>
                <button className="close" onClick={() => setSelected(null)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-4"><strong>Khách hàng:</strong> {selected.tenKhachHang ?? selected.TenKhachHang}</div>
                  <div className="col-md-4"><strong>SĐT:</strong> {selected.soDienThoai ?? selected.SoDienThoai}</div>
                  <div className="col-md-4"><strong>Trạng thái:</strong> {statusBadge(selected.trangThai ?? selected.TrangThai)}</div>
                  <div className="col-md-4"><strong>Sản phẩm:</strong> {selected.tenSanPham ?? selected.TenSanPham}</div>
                  <div className="col-md-4"><strong>Số khung:</strong> {selected.soKhung ?? selected.SoKhung ?? '-'}</div>
                  <div className="col-md-4"><strong>Số máy:</strong> {selected.soMay ?? selected.SoMay ?? '-'}</div>
                </div>
                <div className="alert alert-light border"><strong>Lỗi khách báo:</strong> {selected.loiKhachBao ?? selected.LoiKhachBao}</div>
                <div className="row">
                  <div className="col-md-3">
                    <label>Trạng thái mới</label>
                    <select className="form-control" value={statusForm.trangThai} onChange={(e) => setStatusForm((prev) => ({ ...prev, trangThai: e.target.value }))}>
                      {Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label>Chi phí thực tế</label>
                    <input type="text" inputMode="numeric" className="form-control" value={formatMoneyInput(statusForm.chiPhiThucTe)} onChange={(e) => setStatusForm((prev) => ({ ...prev, chiPhiThucTe: normalizeMoneyInput(e.target.value) }))} />
                  </div>
                  <div className="col-md-6">
                    <label>Ghi chú xử lý</label>
                    <input className="form-control" value={statusForm.ghiChu} onChange={(e) => setStatusForm((prev) => ({ ...prev, ghiChu: e.target.value }))} />
                  </div>
                </div>
                <h5 className="mt-4">Lịch sử xử lý</h5>
                <table className="table table-sm table-bordered">
                  <thead><tr><th>Thời gian</th><th>Từ</th><th>Sang</th><th>Ghi chú</th><th>Người thực hiện</th></tr></thead>
                  <tbody>
                    {histories.length === 0 ? (
                      <tr><td colSpan="5" className="text-center text-muted">Chưa có lịch sử.</td></tr>
                    ) : histories.map((history) => (
                      <tr key={history.maLichSuBaoHanh ?? history.MaLichSuBaoHanh}>
                        <td>{formatDate(history.ngayTao ?? history.NgayTao)}</td>
                        <td>{STATUS[history.trangThaiCu ?? history.TrangThaiCu]?.label || history.trangThaiCu || history.TrangThaiCu || '-'}</td>
                        <td>{STATUS[history.trangThaiMoi ?? history.TrangThaiMoi]?.label || history.trangThaiMoi || history.TrangThaiMoi}</td>
                        <td>{history.ghiChu ?? history.GhiChu ?? '-'}</td>
                        <td>{history.maNguoiThucHien ?? history.MaNguoiThucHien ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-primary" onClick={printWarranty}><i className="fas fa-print mr-1"></i>In phiếu</button>
                <button className="btn btn-success" onClick={updateStatus} disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật trạng thái'}</button>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyList;
