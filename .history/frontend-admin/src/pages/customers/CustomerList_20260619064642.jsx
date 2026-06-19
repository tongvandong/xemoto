import React, { useCallback, useEffect, useState } from 'react';
import userService from '../../services/userService';
import businessOperationsService from '../../services/businessOperationsService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';

const CUSTOMER_STATUS = {
  1: { label: '\u0110ang ho\u1ea1t \u0111\u1ed9ng', color: 'success' },
  '-1': { label: '\u0110\u00e3 kh\u00f3a', color: 'secondary' },
};

const CUSTOMER_SORT_FIELDS = {
  id: 'Mới nhất',
  fullName: 'Tên khách hàng',
  phoneNumber: 'Số điện thoại',
  email: 'Email',
  status: 'Trạng thái',
  createdDate: 'Ngày tạo',
};

const CUSTOMER_LIST_CONTROLS = {
  showSearch: true, // Đổi thành false để ẩn ô tìm kiếm khách hàng trên giao diện.
  showStatusFilter: true, // Đổi thành false để ẩn bộ lọc trạng thái khách hàng trên giao diện.
  showPhoneFilter: false, // Đổi thành false để ẩn bộ lọc số điện thoại trên giao diện.
  showEmailFilter: false, // Đổi thành false để ẩn bộ lọc email trên giao diện.
  showCareNoteFilter: false, // Đổi thành false để ẩn bộ lọc ghi chú chăm sóc trên giao diện.
  showCreatedDateFilter: false, // Đổi thành false để ẩn bộ lọc ngày tạo trên giao diện.
  showSort: false, // Đổi thành false để ẩn phần sắp xếp trên giao diện.
  showReload: false, // Đổi thành false để ẩn nút tải lại trên giao diện.
};

const emptyCustomerForm = {
  fullName: '',
  phoneNumber: '',
  email: '',
  status: 1,
  careNote: '',
};

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;
const asItems = (payload) => payload?.items || payload?.data || payload || [];

const normalizeStatus = (value) => {
  if (value === 'Active') return 1;
  if (value === 'Inactive' || value === 'Deleted' || value === 'Locked') return -1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return numeric === 1 ? 1 : -1;
};

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [careNoteFilter, setCareNoteFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDescending, setSortDescending] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [careNote, setCareNote] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [crmForm, setCrmForm] = useState({ subject: '', note: '', followUpAt: '' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getCustomers({
        page,
        pageSize,
        keyword: search.trim() || undefined,
        status: status !== '' ? Number(status) : undefined,
        phoneNumber: phoneFilter.trim() || undefined,
        email: emailFilter.trim() || undefined,
        hasCareNote: careNoteFilter === '' ? undefined : careNoteFilter === 'has',
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        sortBy,
        sortDescending,
      });

      const data = res.data;
      setCustomers(asItems(data));
      setTotalPages(data.totalPages || Math.ceil(((data.totalItems ?? data.total) || 0) / pageSize) || 1);
    } catch (err) {
      setCustomers([]);
      setTotalPages(1);
      setError(getApiMessage(err, 'Không thể tải danh sách khách hàng.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, phoneFilter, emailFilter, careNoteFilter, createdFrom, createdTo, sortBy, sortDescending]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enrichCustomer = (customer) => {
    return {
      ...customer,
      totalOrders: customer.totalOrders ?? customer.tongDon ?? 0,
      totalSpent: customer.totalSpent ?? customer.tongChiTieu ?? 0,
      cancelledOrders: customer.cancelledOrders ?? customer.donHuy ?? 0,
      lastOrderAt: customer.lastOrderAt ?? customer.donGanNhat ?? null,
    };
  };

  const customerName = (customer) => customer.hoTen || customer.fullName || customer.name || '';
  const customerPhone = (customer) => customer.soDienThoai || customer.phoneNumber || '';
  // Hiển thị đúng email trong DB (kể cả @motosale.local) để admin thấy chính xác
  // khách đăng nhập bằng gì; không ẩn nữa vì email nội bộ vẫn là tài khoản dùng được.
  const customerEmail = (customer) => customer.email || '';
  const customerStatus = (customer) => normalizeStatus(customer.trangThai ?? customer.status);
  const customerCareNote = (customer) => customer.ghiChuChamSoc || customer.careNote || '';

  const statusBadge = (value) => {
    const info = CUSTOMER_STATUS[normalizeStatus(value)] || CUSTOMER_STATUS[1];
    return <span className={`badge badge-${info.color}`}>{info.label}</span>;
  };

  const openCustomerAdd = () => {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomerForm);
    setShowCustomerModal(true);
  };

  const openCustomerEdit = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      fullName: customerName(customer),
      phoneNumber: customerPhone(customer),
      email: customerEmail(customer),
      status: customerStatus(customer),
      careNote: customerCareNote(customer),
    });
    setShowCustomerModal(true);
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: name === 'status' ? normalizeStatus(value) : value }));
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.fullName.trim()) {
      alert('Tên khách hàng là bắt buộc.');
      return;
    }
    if (!customerForm.phoneNumber.trim() && !customerForm.email.trim()) {
      alert('Khách hàng nên có ít nhất SĐT hoặc Email để chăm sóc và đối soát đơn hàng.');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await userService.updateCustomer(editingCustomer.id, customerForm);
      } else {
        await userService.createCustomer(customerForm);
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
      await fetchData();
    } catch (err) {
      alert(getApiMessage(err, 'Lưu khách hàng thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const openNote = (customer) => {
    setSelected(customer);
    setCareNote(customerCareNote(customer));
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await userService.updateCustomerCareNote(selected.id, { careNote });
      setSelected(null);
      await fetchData();
    } catch (err) {
      alert(getApiMessage(err, 'Không thể lưu ghi chú chăm sóc.'));
    } finally {
      setSaving(false);
    }
  };

  const openProfile = async (customer) => {
    setProfile(null);
    setProfileLoading(true);
    setCrmForm({ subject: '', note: '', followUpAt: '' });
    try {
      const res = await userService.getCustomerProfile(customer.id);
      setProfile(res.data);
    } catch (err) {
      alert(getApiMessage(err, 'Không thể tải hồ sơ khách hàng.'));
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfile(null);
    setProfileLoading(false);
  };

  const createFollowUp = async () => {
    if (!profile?.customer?.id) return;
    if (!crmForm.subject.trim()) {
      alert('Vui lòng nhập nội dung chăm sóc.');
      return;
    }
    setSaving(true);
    try {
      await businessOperationsService.createInteraction({
        customerId: profile.customer.id,
        assignedStaffId: null,
        interactionType: 'FollowUp',
        subject: crmForm.subject,
        note: crmForm.note,
        followUpAt: crmForm.followUpAt || null,
      });
      const res = await userService.getCustomerProfile(profile.customer.id);
      setProfile(res.data);
      setCrmForm({ subject: '', note: '', followUpAt: '' });
    } catch (err) {
      alert(getApiMessage(err, 'Không thể tạo lịch chăm sóc.'));
    } finally {
      setSaving(false);
    }
  };

  const exportCustomers = async () => {
    setExporting(true);
    try {
      await exportWorkbook({
        fileName: `khach-hang-${createDateStamp()}.xlsx`,
        sheets: [{
          name: 'KhachHang',
          columns: [
            { header: 'Họ tên', key: 'name', width: 28 },
            { header: 'SĐT', key: 'phone', width: 16 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Trạng thái', key: 'status', width: 18 },
            { header: 'Tổng đơn', key: 'orders', type: 'number', width: 12 },
            { header: 'Tổng chi tiêu', key: 'spent', type: 'currency', width: 18 },
            { header: 'Đơn hủy', key: 'cancelled', type: 'number', width: 12 },
            { header: 'Đơn gần nhất', key: 'lastOrderAt', type: 'date', width: 20 },
            { header: 'Ghi chú chăm sóc', key: 'note', width: 50 },
          ],
          rows: customers.map(enrichCustomer).map((customer) => ({
            name: customerName(customer),
            phone: customerPhone(customer),
            email: customerEmail(customer),
            status: CUSTOMER_STATUS[customerStatus(customer)]?.label || 'Không rõ',
            orders: customer.totalOrders,
            spent: customer.totalSpent,
            cancelled: customer.cancelledOrders,
            lastOrderAt: customer.lastOrderAt,
            note: customerCareNote(customer),
          })),
        }],
      });
    } catch (err) {
      alert('Xuất Excel khách hàng thất bại.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Khách hàng</h1></div>
            <div className="col-sm-6 text-right">
              {CUSTOMER_LIST_CONTROLS.showReload && (
                <button className="btn btn-outline-secondary mr-2" onClick={fetchData} disabled={loading}>
                  <i className="fas fa-sync-alt mr-1"></i>Tải lại
                </button>
              )}
              <button className="btn btn-primary mr-2" onClick={openCustomerAdd}>
                <i className="fas fa-plus mr-1"></i>Thêm khách hàng
              </button>
              <button className="btn btn-outline-success" onClick={exportCustomers} disabled={exporting}>
                <i className="fas fa-file-excel mr-1"></i>{exporting ? 'Đang xuất...' : 'Xuất Excel'}
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
              <div className="row mb-2">
                {CUSTOMER_LIST_CONTROLS.showSearch && (
                  <div className="col-md-4 mb-2">
                    <input className="form-control" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên, SĐT hoặc email..." />
                  </div>
                )}
                {CUSTOMER_LIST_CONTROLS.showStatusFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                      <option value="">Trạng thái</option>
                      <option value="1">Đang hoạt động</option>
                      <option value="-1">Đã khóa</option>
                    </select>
                  </div>
                )}
                {CUSTOMER_LIST_CONTROLS.showPhoneFilter && (
                  <div className="col-md-2 mb-2">
                    <input className="form-control" value={phoneFilter} onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }} placeholder="Số điện thoại..." />
                  </div>
                )}
                {CUSTOMER_LIST_CONTROLS.showEmailFilter && (
                  <div className="col-md-2 mb-2">
                    <input className="form-control" value={emailFilter} onChange={(e) => { setEmailFilter(e.target.value); setPage(1); }} placeholder="Email..." />
                  </div>
                )}
                {CUSTOMER_LIST_CONTROLS.showCareNoteFilter && (
                  <div className="col-md-2 mb-2">
                    <select className="form-control" value={careNoteFilter} onChange={(e) => { setCareNoteFilter(e.target.value); setPage(1); }}>
                      <option value="">Ghi chú CSKH</option>
                      <option value="has">Có ghi chú</option>
                      <option value="none">Chưa có ghi chú</option>
                    </select>
                  </div>
                )}
                {CUSTOMER_LIST_CONTROLS.showCreatedDateFilter && (
                  <>
                    <div className="col-md-2 mb-2">
                      <input type="date" className="form-control" value={createdFrom} onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }} title="Ngày tạo từ" />
                    </div>
                    <div className="col-md-2 mb-2">
                      <input type="date" className="form-control" value={createdTo} onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }} title="Ngày tạo đến" />
                    </div>
                  </>
                )}
                {CUSTOMER_LIST_CONTROLS.showSort && (
                  <>
                    <div className="col-md-3 mb-2">
                      <select className="form-control" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                        {Object.entries(CUSTOMER_SORT_FIELDS).map(([key, label]) => (
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
                  </>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Liên hệ</th>
                      <th className="text-center">Trạng thái</th>
                      <th className="text-center">Tổng đơn</th>
                      <th className="text-right">Tổng chi tiêu</th>
                      <th className="text-center">Đơn hủy</th>
                      <th>Đơn gần nhất</th>
                      <th>Ghi chú chăm sóc</th>
                      <th className="text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="9" className="text-center py-4">Đang tải khách hàng...</td></tr>
                    ) : customers.length === 0 ? (
                      <tr><td colSpan="9" className="text-center text-muted py-4">Chưa có khách hàng phù hợp.</td></tr>
                    ) : customers.map((raw) => {
                      const customer = enrichCustomer(raw);
                      return (
                        <tr key={customer.id}>
                          <td>
                            <strong>{customerName(customer)}</strong>
                            <div className="text-muted small">#{customer.id}</div>
                          </td>
                          <td>
                            <div>{customerPhone(customer) || '-'}</div>
                            <div className="text-muted small">{customerEmail(customer) || '-'}</div>
                          </td>
                          <td className="text-center">{statusBadge(customerStatus(customer))}</td>
                          <td className="text-center">{customer.totalOrders}</td>
                          <td className="text-right">{formatCurrency(customer.totalSpent)}</td>
                          <td className="text-center">{customer.cancelledOrders}</td>
                          <td>{formatDate(customer.lastOrderAt)}</td>
                          <td className="text-break">{customerCareNote(customer) || '-'}</td>
                          <td className="text-center text-nowrap">
                            <button className="btn btn-xs btn-info mr-1" onClick={() => openCustomerEdit(customer)} title="Sửa khách hàng">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-xs btn-primary mr-1" onClick={() => openProfile(customer)} title="Hồ sơ 360">
                              <i className="fas fa-user-clock"></i>
                            </button>
                            <button className="btn btn-xs btn-secondary" onClick={() => openNote(customer)} title="Ghi chú chăm sóc">
                              <i className="fas fa-sticky-note"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <nav className="p-3">
                  <ul className="pagination justify-content-center mb-0">
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
            </div>
          </div>
        </div>
      </section>

      {showCustomerModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h5>
                <button type="button" className="close" onClick={() => setShowCustomerModal(false)}><span>&times;</span></button>
              </div>
              <form onSubmit={saveCustomer}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Họ tên <span className="text-danger">*</span></label>
                        <input className="form-control" name="fullName" value={customerForm.fullName} onChange={handleCustomerChange} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select className="form-control" name="status" value={customerForm.status} onChange={handleCustomerChange}>
                          <option value="1">Đang hoạt động</option>
                          <option value="-1">Đã khóa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Số điện thoại</label>
                        <input className="form-control" name="phoneNumber" value={customerForm.phoneNumber} onChange={handleCustomerChange} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" className="form-control" name="email" value={customerForm.email} onChange={handleCustomerChange} />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Ghi chú chăm sóc</label>
                    <textarea className="form-control" rows="4" name="careNote" value={customerForm.careNote} onChange={handleCustomerChange} placeholder="Nhu cầu, lịch hẹn, lưu ý chăm sóc khách hàng..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)} disabled={saving}>Đóng</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu khách hàng'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ghi chú chăm sóc - {customerName(selected)}</h5>
                <button type="button" className="close" onClick={() => setSelected(null)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <textarea className="form-control" rows="5" value={careNote} onChange={(e) => setCareNote(e.target.value)} placeholder="Nhu cầu, lịch hẹn, lưu ý chăm sóc khách hàng..." />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelected(null)} disabled={saving}>Đóng</button>
                <button className="btn btn-primary" onClick={saveNote} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu ghi chú'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(profile || profileLoading) && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Hồ sơ khách hàng 360</h5>
                <button type="button" className="close" onClick={closeProfile}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                {profileLoading ? (
                  <div className="text-center py-5">Đang tải hồ sơ khách hàng...</div>
                ) : (
                  <>
                    <div className="row">
                      <div className="col-md-3"><div className="small-box bg-info"><div className="inner"><h3>{profile.summary?.orderCount || 0}</h3><p>Đơn hàng</p></div></div></div>
                      <div className="col-md-3"><div className="small-box bg-success"><div className="inner"><h3>{formatCurrency(profile.summary?.orderTotal || 0)}</h3><p>Tổng mua</p></div></div></div>
                      <div className="col-md-3"><div className="small-box bg-warning"><div className="inner"><h3>{profile.summary?.warrantyCount || 0}</h3><p>Bảo hành</p></div></div></div>
                      <div className="col-md-3"><div className="small-box bg-primary"><div className="inner"><h3>{profile.summary?.openCrmCount || 0}</h3><p>CSKH mở</p></div></div></div>
                    </div>

                    <div className="card card-outline card-primary">
                      <div className="card-header"><h3 className="card-title">Tạo lịch chăm sóc</h3></div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4"><input className="form-control" value={crmForm.subject} onChange={(e) => setCrmForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Nội dung cần chăm sóc..." /></div>
                          <div className="col-md-3"><input type="datetime-local" className="form-control" value={crmForm.followUpAt} onChange={(e) => setCrmForm((prev) => ({ ...prev, followUpAt: e.target.value }))} /></div>
                          <div className="col-md-4"><input className="form-control" value={crmForm.note} onChange={(e) => setCrmForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Ghi chú..." /></div>
                          <div className="col-md-1"><button className="btn btn-primary btn-block" onClick={createFollowUp} disabled={saving}>Tạo</button></div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <ProfileTable title="Đơn hàng gần đây" headers={['Mã', 'Trạng thái', 'Thanh toán', 'Tổng tiền', 'Ngày']}>
                          {(profile.orders || []).map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.orderStatus}</td><td>{x.paymentStatus}</td><td className="text-right">{formatCurrency(x.grandTotal)}</td><td>{formatDate(x.placedAt || x.createdDate)}</td></tr>)}
                        </ProfileTable>
                      </div>
                      <div className="col-md-6">
                        <ProfileTable title="Timeline khách hàng" headers={['Ngày', 'Loại', 'Nội dung', 'Trạng thái']}>
                          {(profile.timeline || []).map((x, index) => <tr key={`${x.type}-${index}`}><td>{formatDate(x.date)}</td><td>{x.type}</td><td>{x.title}<div className="text-muted small">{x.note || ''}</div></td><td>{x.status}</td></tr>)}
                        </ProfileTable>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <ProfileTable title="Bảo hành" headers={['Mã', 'Sản phẩm', 'Trạng thái', 'Ngày nhận']}>
                          {(profile.warranties || []).map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.productSnapshot}</td><td>{x.warrantyStatus}</td><td>{formatDate(x.receivedAt)}</td></tr>)}
                        </ProfileTable>
                      </div>
                      <div className="col-md-6">
                        <ProfileTable title="Sửa chữa" headers={['Mã', 'Xe', 'Lỗi', 'Trạng thái', 'Tổng phí']}>
                          {(profile.repairs || []).map((x) => <tr key={x.id}><td>{x.code}</td><td>{x.vehicleDescription}</td><td>{x.reportedIssue}</td><td>{x.repairStatus}</td><td className="text-right">{formatCurrency(x.total)}</td></tr>)}
                        </ProfileTable>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeProfile}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileTable = ({ title, headers, children }) => (
  <div className="card">
    <div className="card-header"><h3 className="card-title">{title}</h3></div>
    <div className="card-body p-0">
      <div className="table-responsive">
        <table className="table table-bordered table-sm mb-0">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{React.Children.count(children) ? children : <tr><td colSpan={headers.length} className="text-center text-muted">Chưa có dữ liệu.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  </div>
);

export default CustomerList;
