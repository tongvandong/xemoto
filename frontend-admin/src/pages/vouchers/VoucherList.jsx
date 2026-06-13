import React, { useEffect, useState } from 'react';
import voucherService from '../../services/voucherService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { useAuth } from '../../contexts/AuthContext';

// Khớp đúng backend SaveVoucherRequest/VoucherDto:
// - discountType chỉ có Percent | Amount (backend không hỗ trợ FreeShipping hay phạm vi sản phẩm/danh mục/hãng).
// - status là số (1 = hoạt động, 0 = ngừng).
// - Tên trường: maxDiscount, startAt, endAt, perUserLimit.
const VOUCHER_TYPES = {
  Percent: 'Phần trăm (%)',
  Amount: 'Cố định (VNĐ)',
  Fixed: 'Cố định (VNĐ)',
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
};

const toDateInputValue = (value) => (value ? String(value).substring(0, 10) : '');

const isExpired = (voucher) => Boolean(voucher.endAt) && new Date(voucher.endAt) < new Date();

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;

const VoucherList = () => {
  const { isAdmin } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const pageSize = 10;

  const fetchVouchers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await voucherService.getAll({ page, pageSize });
      const data = res.data;
      setVouchers(data.items || data.data || data || []);
      setTotalPages(data.totalPages || Math.ceil(((data.totalItems ?? data.total) || 0) / pageSize) || 1);
    } catch (err) {
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEditModal = (voucher) => {
    setEditingId(voucher.id);
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
      status: voucher.status === 0 ? 0 : 1,
    });
    setShowModal(true);
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
    if (voucher.status !== 1) return <span className="badge badge-secondary">Ngừng</span>;
    if (isExpired(voucher)) return <span className="badge badge-danger">Hết hạn</span>;
    return <span className="badge badge-success">Hoạt động</span>;
  };

  const formatDiscountValue = (voucher) => {
    const value = voucher.discountValue || 0;
    if (voucher.discountType === 'Percent') return `${value}%`;
    return formatCurrency(value);
  };

  const formatValidity = (voucher) => {
    if (!voucher.startAt && !voucher.endAt) return 'Không giới hạn';
    return `${voucher.startAt ? formatDateShort(voucher.startAt) : '—'} - ${voucher.endAt ? formatDateShort(voucher.endAt) : '—'}`;
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
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <i className="fas fa-plus"></i> Thêm Voucher
                </button>
              </div>
            </div>
            <div className="card-body">
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

                  <div className="form-group mb-0">
                    <label>Mô tả</label>
                    <textarea className="form-control" name="description" rows="2" value={form.description} onChange={handleChange} placeholder="Mô tả voucher..." />
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
