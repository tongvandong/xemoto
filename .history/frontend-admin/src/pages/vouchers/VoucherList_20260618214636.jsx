import React, { useCallback, useEffect, useState } from 'react';
import voucherService from '../../services/voucherService';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import brandService from '../../services/brandService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { useAuth } from '../../contexts/AuthContext';

// Khớp đúng backend SaveVoucherRequest/VoucherDto:
// - discountType chỉ có Percent | Amount.
// - status là số (1 = hoạt động, 0 = ngừng).
// - Tên trường: maxDiscount, startAt, endAt, perUserLimit.
// - Phạm vi áp dụng (scopeType + scopeRefIds): gắn voucher với Sản phẩm/Danh mục/Hãng.
//   'All' = áp toàn đơn. Đây chỉ là GẮN ĐỂ HIỂN THỊ; số tiền giảm khi đặt hàng vẫn tính trên toàn đơn.
const VOUCHER_TYPES = {
  Percent: 'Phần trăm (%)',
  Amount: 'Cố định (VNĐ)',
  Fixed: 'Cố định (VNĐ)',
};

// Các loại phạm vi áp dụng voucher.
const SCOPE_TYPES = {
  All: 'Toàn đơn hàng',
  Product: 'Theo sản phẩm',
  Category: 'Theo danh mục',
  Brand: 'Theo hãng xe',
};

const VOUCHER_SORT_FIELDS = {
  id: 'Mới nhất',
  code: 'Mã voucher',
  discountType: 'Loại giảm',
  discountValue: 'Giá trị giảm',
  minOrderValue: 'Đơn tối thiểu',
  usedCount: 'Đã dùng',
  usageLimit: 'Giới hạn dùng',
  perUserLimit: 'Giới hạn/khách',
  startAt: 'Ngày bắt đầu',
  endAt: 'Ngày kết thúc',
  status: 'Trạng thái',
};

const VOUCHER_LIST_CONTROLS = {
  showSearch: true, // Đổi thành false để ẩn ô tìm kiếm voucher trên giao diện.
  showDiscountTypeFilter: true, // Đổi thành false để ẩn bộ lọc loại giảm trên giao diện.
  showStatusFilter: true, // Đổi thành false để ẩn bộ lọc trạng thái trên giao diện.
  showScopeFilter: true, // Đổi thành false để ẩn bộ lọc phạm vi trên giao diện.
  showDateFilter: true, // Đổi thành false để ẩn bộ lọc ngày bắt đầu/kết thúc trên giao diện.
  showSort: true, // Đổi thành false để ẩn phần sắp xếp trên giao diện.
  showReload: true, // Đổi thành false để ẩn nút tải lại trên giao diện.
};

const defaultForm = {
  code: '',
  discountType: 'Percent',
  discountValue: '',
  minOrderValue: '',
  maxDiscount: '',
  startAt: '',
  endAt: '',
  usageLimit: '',
  perUserLimit: '',
  description: '',
  status: 1,
  scopeType: 'All',
  scopeRefIds: [],
};

const toDateInputValue = (value) => (value ? String(value).substring(0, 10) : '');

const isExpired = (voucher) => Boolean(voucher.endAt) && new Date(voucher.endAt) < new Date();

// status sau khi normalize là chuỗi 'Active'/'Inactive', nhưng BE/form dùng số 1/0.
// Hàm dưới hiểu cả hai kiểu để khỏi lệch hiển thị giữa danh sách và form.
const isInactiveStatus = (status) => status === 0 || status === 'Inactive' || status === 'Expired';

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;

const VoucherList = () => {
  const { isAdmin } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeTypeFilter, setScopeTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDescending, setSortDescending] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  // Danh sách đối tượng để chọn phạm vi (nạp 1 lần khi mở modal lần đầu).
  const [scopeOptions, setScopeOptions] = useState({ Product: [], Category: [], Brand: [] });
  const [scopeOptionsLoaded, setScopeOptionsLoaded] = useState(false);
  const pageSize = 10;

  // Nạp danh sách sản phẩm/danh mục/hãng để hiển thị trong ô chọn phạm vi.
  const ensureScopeOptions = async () => {
    if (scopeOptionsLoaded) return;
    try {
      const [productRes, categoryRes, brandRes] = await Promise.allSettled([
        productService.getAll({ all: true, pageSize: 1000 }),
        categoryService.getAll(),
        brandService.getAll(),
      ]);
      const pickItems = (settled) => {
        if (settled.status !== 'fulfilled') return [];
        const data = settled.value.data;
        return Array.isArray(data) ? data : data.items || data.data || [];
      };
      setScopeOptions({
        Product: pickItems(productRes).map((p) => ({ id: p.id ?? p.maSanPham, name: p.name ?? p.tenSanPham ?? `#${p.id}` })),
        Category: pickItems(categoryRes).map((c) => ({ id: c.id ?? c.maDanhMuc, name: c.name ?? c.tenDanhMuc ?? `#${c.id}` })),
        Brand: pickItems(brandRes).map((b) => ({ id: b.id ?? b.maHangXe, name: b.name ?? b.tenHang ?? `#${b.id}` })),
      });
      setScopeOptionsLoaded(true);
    } catch (err) {
      console.error('Không nạp được danh sách phạm vi voucher', err);
    }
  };

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await voucherService.getAll({
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
        discountType: discountTypeFilter || undefined,
        status: statusFilter !== '' ? Number(statusFilter) : undefined,
        scopeType: scopeTypeFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        sortBy,
        sortDescending,
      });
      const data = res.data;
      setVouchers(data.items || data.data || data || []);
      setTotalPages(data.totalPages || Math.ceil(((data.totalItems ?? data.total) || 0) / pageSize) || 1);
    } catch (err) {
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, discountTypeFilter, statusFilter, scopeTypeFilter, startDateFilter, endDateFilter, sortBy, sortDescending]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
    ensureScopeOptions();
  };

  const openEditModal = (voucher) => {
    setEditingId(voucher.id);
    // Suy ra phạm vi từ mảng scopes: rỗng = toàn đơn; ngược lại lấy loại của dòng đầu + tất cả refId cùng loại.
    const scopes = Array.isArray(voucher.scopes) ? voucher.scopes : [];
    const scopeType = scopes.length > 0 ? scopes[0].scopeType : 'All';
    const scopeRefIds = scopes.filter((s) => s.scopeType === scopeType).map((s) => s.refId);
    setForm({
      code: voucher.code || '',
      discountType: voucher.discountType === 'Amount' || voucher.discountType === 'Fixed' ? 'Amount' : 'Percent',
      discountValue: voucher.discountValue ?? '',
      minOrderValue: voucher.minOrderValue ?? '',
      maxDiscount: voucher.maxDiscount ?? '',
      startAt: voucher.startAt || '',
      endAt: voucher.endAt || '',
      usageLimit: voucher.usageLimit ?? '',
      perUserLimit: voucher.perUserLimit ?? '',
      description: voucher.description || '',
      status: isInactiveStatus(voucher.status) ? 0 : 1,
      scopeType,
      scopeRefIds,
    });
    setShowModal(true);
    ensureScopeOptions();
  };

  // Đổi loại phạm vi: reset danh sách Id đã chọn (vì khác loại đối tượng).
  const handleScopeTypeChange = (e) => {
    const scopeType = e.target.value;
    setForm((prev) => ({ ...prev, scopeType, scopeRefIds: [] }));
  };

  // Tích/bỏ tích 1 đối tượng trong phạm vi.
  const handleScopeRefToggle = (refId) => {
    setForm((prev) => {
      const exists = prev.scopeRefIds.includes(refId);
      const scopeRefIds = exists
        ? prev.scopeRefIds.filter((id) => id !== refId)
        : [...prev.scopeRefIds, refId];
      return { ...prev, scopeRefIds };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: normalizeMoneyInput(value) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      alert('Vui lòng nhập mã voucher.');
      return;
    }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      alert('Vui lòng nhập giá trị giảm lớn hơn 0.');
      return;
    }
    if (form.discountType === 'Percent' && Number(form.discountValue) > 100) {
      alert('Voucher phần trăm chỉ được giảm từ 1 đến 100%.');
      return;
    }
    if (form.scopeType !== 'All' && form.scopeRefIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 đối tượng cho phạm vi áp dụng, hoặc đổi về "Toàn đơn hàng".');
      return;
    }

    setSaving(true);
    try {
      // Payload đúng tên trường backend SaveVoucherRequest; ngày kết thúc lấy hết ngày (23:59:59).
      const payload = {
        code: form.code.trim(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
        startAt: form.startAt ? `${toDateInputValue(form.startAt)}T00:00:00` : null,
        endAt: form.endAt ? `${toDateInputValue(form.endAt)}T23:59:59` : null,
        status: Number(form.status),
        scopeType: form.scopeType,
        scopeRefIds: form.scopeType === 'All' ? [] : form.scopeRefIds,
      };

      if (editingId) {
        await voucherService.update(editingId, payload);
      } else {
        await voucherService.create(payload);
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      alert(getApiMessage(err, 'Lưu voucher thất bại. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa voucher này?')) return;
    try {
      await voucherService.delete(id);
      fetchVouchers();
    } catch (err) {
      alert(getApiMessage(err, 'Xóa voucher thất bại. Vui lòng thử lại.'));
    }
  };

  const getStatusBadge = (voucher) => {
    if (isInactiveStatus(voucher.status)) return <span className="badge badge-secondary">Ngừng</span>;
    if (isExpired(voucher)) return <span className="badge badge-danger">Hết hạn</span>;
    return <span className="badge badge-success">Hoạt động</span>;
  };

  const formatDiscountValue = (voucher) => {
    const value = voucher.discountValue || 0;
    if (voucher.discountType === 'Percent') {
      // Hiện kèm mức trần để khỏi hiểu nhầm: "10%" nhưng thực tế bị chặn ở "tối đa X đ".
      return voucher.maxDiscount ? `${value}% (tối đa ${formatCurrency(voucher.maxDiscount)})` : `${value}%`;
    }
    return formatCurrency(value);
  };

  const formatValidity = (voucher) => {
    if (!voucher.startAt && !voucher.endAt) return 'Không giới hạn';
    return `${voucher.startAt ? formatDateShort(voucher.startAt) : '—'} - ${voucher.endAt ? formatDateShort(voucher.endAt) : '—'}`;
  };

  // Hiển thị phạm vi gọn: "Toàn đơn" hoặc "Theo sản phẩm: A, B +2".
  const formatScope = (voucher) => {
    const scopes = Array.isArray(voucher.scopes) ? voucher.scopes : [];
    if (scopes.length === 0) return 'Toàn đơn';
    const typeLabel = SCOPE_TYPES[scopes[0].scopeType] || scopes[0].scopeType;
    const names = scopes.map((s) => s.refName).filter(Boolean);
    const shown = names.slice(0, 2).join(', ');
    const more = names.length > 2 ? ` +${names.length - 2}` : '';
    return names.length > 0 ? `${typeLabel}: ${shown}${more}` : typeLabel;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Voucher</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách Voucher</h3>
              <div className="card-tools">
                {VOUCHER_LIST_CONTROLS.showReload && (
                  <button type="button" className="btn btn-outline-secondary btn-sm mr-2" onClick={fetchVouchers} disabled={loading}>
                    <i className="fas fa-sync-alt"></i> Tải lại
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <i className="fas fa-plus"></i> Thêm Voucher
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                {VOUCHER_LIST_CONTROLS.showSearch && (
                  <div className="col-md-3 mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm mã, mô tả voucher..."
                      value={keyword}
                      onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                    />
                  </div>
                )}
                {VOUCHER_LIST_CONTROLS.showDiscountTypeFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={discountTypeFilter} onChange={(e) => { setDiscountTypeFilter(e.target.value); setPage(1); }}>
                      <option value="">Loại giảm</option>
                      <option value="Percent">Phần trăm (%)</option>
                      <option value="Amount">Cố định (VNĐ)</option>
                    </select>
                  </div>
                )}
                {VOUCHER_LIST_CONTROLS.showStatusFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                      <option value="">Trạng thái</option>
                      <option value="1">Hoạt động</option>
                      <option value="0">Ngừng</option>
                    </select>
                  </div>
                )}
                {VOUCHER_LIST_CONTROLS.showScopeFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={scopeTypeFilter} onChange={(e) => { setScopeTypeFilter(e.target.value); setPage(1); }}>
                      <option value="">Phạm vi</option>
                      {Object.entries(SCOPE_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {VOUCHER_LIST_CONTROLS.showDateFilter && (
                  <>
                    <div className="col-md-2 mb-2">
                      <input type="date" className="form-control" value={startDateFilter} onChange={(e) => { setStartDateFilter(e.target.value); setPage(1); }} title="Ngày bắt đầu từ" />
                    </div>
                    <div className="col-md-2 mb-2">
                      <input type="date" className="form-control" value={endDateFilter} onChange={(e) => { setEndDateFilter(e.target.value); setPage(1); }} title="Ngày kết thúc đến" />
                    </div>
                  </>
                )}
              </div>

              {VOUCHER_LIST_CONTROLS.showSort && (
                <div className="row mb-3">
                  <div className="col-md-3 mb-2">
                    <select className="form-control" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                      {Object.entries(VOUCHER_SORT_FIELDS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={sortDescending ? 'desc' : 'asc'} onChange={(e) => { setSortDescending(e.target.value === 'desc'); setPage(1); }}>
                      <option value="desc">Giảm dần</option>
                      <option value="asc">Tăng dần</option>
                    </select>
                  </div>
                </div>
              )}

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : vouchers.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Chưa có voucher nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th className="table-col-code">Mã voucher</th>
                          <th className="table-col-status">Loại giảm</th>
                          <th className="table-col-money">Giá trị</th>
                          <th className="table-col-money">Đơn tối thiểu</th>
                          <th>Phạm vi</th>
                          <th className="table-col-date">Thời hạn</th>
                          <th className="table-col-number">Đã dùng/Giới hạn</th>
                          <th className="table-col-number">Giới hạn/khách</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers.map((voucher) => (
                          <tr key={voucher.id}>
                            <td className="table-col-code"><strong>{voucher.code}</strong></td>
                            <td className="table-col-status">{VOUCHER_TYPES[voucher.discountType] || voucher.discountType}</td>
                            <td className="table-col-money">{formatDiscountValue(voucher)}</td>
                            <td className="table-col-money">{formatCurrency(voucher.minOrderValue || 0)}</td>
                            <td><small>{formatScope(voucher)}</small></td>
                            <td className="table-col-date">{formatValidity(voucher)}</td>
                            <td className="table-col-number">
                              {voucher.usedCount || 0} / {voucher.usageLimit || '∞'}
                            </td>
                            <td className="table-col-number">{voucher.perUserLimit || '∞'}</td>
                            <td className="table-col-status">{getStatusBadge(voucher)}</td>
                            <td className="table-col-actions">
                              <button className="btn btn-warning btn-sm mr-1" onClick={() => openEditModal(voucher)} title="Sửa">
                                <i className="fas fa-edit"></i>
                              </button>
                              {isAdmin() && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(voucher.id)} title="Xóa">
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <li key={pageNumber} className={`page-item ${pageNumber === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxHeight: '92vh' }}>
            <div className="modal-content" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <form onSubmit={handleSave} style={{ minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingId ? 'Sửa Voucher' : 'Thêm Voucher'}</h5>
                  <button type="button" className="close" onClick={() => setShowModal(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body" style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0, paddingBottom: 12 }}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Mã code <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" name="code" value={form.code} onChange={handleChange} placeholder="VD: SALE50" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Loại giảm giá <span className="text-danger">*</span></label>
                        <select className="form-control" name="discountType" value={form.discountType} onChange={handleChange}>
                          <option value="Percent">Phần trăm (%)</option>
                          <option value="Amount">Cố định (VNĐ)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giá trị giảm <span className="text-danger">*</span></label>
                        <input
                          type={form.discountType === 'Percent' ? 'number' : 'text'}
                          inputMode={form.discountType === 'Percent' ? undefined : 'numeric'}
                          className="form-control"
                          name="discountValue"
                          value={form.discountType === 'Percent' ? form.discountValue : formatMoneyInput(form.discountValue)}
                          onChange={form.discountType === 'Percent' ? handleChange : handleMoneyChange}
                          placeholder={form.discountType === 'Percent' ? 'VD: 10' : 'VD: 50000'}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giá trị đơn tối thiểu</label>
                        <input type="text" inputMode="numeric" className="form-control" name="minOrderValue" value={formatMoneyInput(form.minOrderValue)} onChange={handleMoneyChange} placeholder="VD: 200000" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giá trị giảm tối đa</label>
                        <input type="text" inputMode="numeric" className="form-control" name="maxDiscount" value={formatMoneyInput(form.maxDiscount)} onChange={handleMoneyChange} placeholder="VD: 100000" />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Ngày bắt đầu</label>
                        <input type="date" className="form-control" name="startAt" value={toDateInputValue(form.startAt)} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Ngày kết thúc</label>
                        <input type="date" className="form-control" name="endAt" value={toDateInputValue(form.endAt)} onChange={handleChange} />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giới hạn sử dụng</label>
                        <input type="number" className="form-control" name="usageLimit" value={form.usageLimit} onChange={handleChange} placeholder="Để trống = không giới hạn" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giới hạn mỗi khách</label>
                        <input type="number" className="form-control" name="perUserLimit" value={form.perUserLimit} onChange={handleChange} placeholder="Để trống = không giới hạn" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select className="form-control" name="status" value={form.status} onChange={handleChange}>
                          <option value={1}>Hoạt động</option>
                          <option value={0}>Ngừng</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea className="form-control" name="description" rows="2" value={form.description} onChange={handleChange} placeholder="Mô tả voucher..." />
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group mb-0">
                        <label>Phạm vi áp dụng</label>
                        <select className="form-control" name="scopeType" value={form.scopeType} onChange={handleScopeTypeChange}>
                          {Object.entries(SCOPE_TYPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <small className="text-muted">Gắn voucher với sản phẩm/danh mục/hãng (chỉ để hiển thị).</small>
                      </div>
                    </div>
                    <div className="col-md-8">
                      {form.scopeType !== 'All' && (
                        <div className="form-group mb-0">
                          <label>Chọn {SCOPE_TYPES[form.scopeType]?.toLowerCase()} ({form.scopeRefIds.length} đã chọn)</label>
                          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #ced4da', borderRadius: 4, padding: 8 }}>
                            {scopeOptions[form.scopeType].length === 0 ? (
                              <div className="text-muted small">Đang tải danh sách...</div>
                            ) : (
                              scopeOptions[form.scopeType].map((opt) => (
                                <div className="form-check" key={opt.id}>
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`scope-${form.scopeType}-${opt.id}`}
                                    checked={form.scopeRefIds.includes(opt.id)}
                                    onChange={() => handleScopeRefToggle(opt.id)}
                                  />
                                  <label className="form-check-label" htmlFor={`scope-${form.scopeType}-${opt.id}`}>{opt.name}</label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer" style={{ flex: '0 0 auto', background: '#fff' }}>
                  <button type="button" className="btn btn-default" onClick={() => setShowModal(false)}>Đóng</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherList;
