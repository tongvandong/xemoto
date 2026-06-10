import React, { useCallback, useEffect, useState } from 'react';
import userService from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatDate';

const INTERNAL_ROLES = {
  Admin: 'Quản trị viên',
  Staff: 'Nhân viên',
};

const ACCOUNT_STATUS = {
  1: { label: 'Hoạt động', color: 'success' },
  0: { label: 'Khóa', color: 'danger' },
  '-1': { label: 'Đã xóa', color: 'secondary' },
};

const emptyForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'Staff',
  status: 1,
};

const getPrimaryRole = (user) => user?.role || user?.vaiTro || user?.roles?.[0] || 'Staff';
const getUserId = (user) => user?.id ?? user?.userId ?? user?.maNguoiDung ?? user?.sub;
const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;

const normalizeStatus = (value) => {
  if (value === 'Active') return 1;
  if (value === 'Inactive') return 0;
  if (value === 'Deleted' || value === 'Locked') return -1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 1;
};

const UserList = () => {
  const { user: currentUser } = useAuth();
  const currentUserId = getUserId(currentUser);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState(emptyForm);

  const isCurrentUser = useCallback((item) => String(getUserId(item)) === String(currentUserId), [currentUserId]);
  const isAdminUser = (item) => getPrimaryRole(item) === 'Admin';
  const editItemIsSelf = editItem ? isCurrentUser(editItem) : false;
  const editItemWasAdmin = editItem ? isAdminUser(editItem) : false;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus !== '') params.status = filterStatus;
      if (filterRole) params.role = filterRole;

      const res = await userService.getAll(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
      } else {
        setUsers(data.items || data.data || []);
        setTotalPages(data.totalPages || Math.ceil((data.totalItems || data.total || 0) / pageSize) || 1);
      }
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải danh sách tài khoản hệ thống.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      fullName: item.fullName || item.hoTen || '',
      email: item.email || '',
      phoneNumber: item.phoneNumber || item.soDienThoai || item.phone || '',
      password: '',
      role: getPrimaryRole(item) === 'Admin' ? 'Admin' : 'Staff',
      status: normalizeStatus(item.status ?? item.trangThai),
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'status' ? normalizeStatus(value) : value }));
  };

  const validateChange = () => {
    if (!editItem && form.role === 'Admin') {
      alert('Hệ thống chỉ duy trì một tài khoản Admin. Tài khoản mới nên là Nhân viên.');
      return false;
    }

    if (editItemIsSelf && form.status !== 1) {
      alert('Không thể khóa chính tài khoản đang đăng nhập.');
      return false;
    }

    if (editItemWasAdmin && form.status !== 1) {
      return window.confirm('Bạn đang khóa tài khoản Admin. Hệ thống sẽ chặn nếu đây là Admin hoạt động cuối cùng. Tiếp tục?');
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      alert('Họ tên và Email là bắt buộc.');
      return;
    }
    if (!editItem && !form.password) {
      alert('Mật khẩu là bắt buộc khi thêm tài khoản nhân viên.');
      return;
    }
    if (!validateChange()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        role: editItemWasAdmin ? 'Admin' : 'Staff',
      };
      if (editItem && !payload.password) delete payload.password;

      if (editItem) {
        await userService.update(editItem.id, payload);
      } else {
        await userService.create(payload);
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(getApiMessage(err, 'Lưu tài khoản thất bại.'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const active = normalizeStatus(item.status ?? item.trangThai) === 1;
    const nextStatus = active ? 0 : 1;
    const action = active ? 'khóa' : 'kích hoạt';
    const name = item.fullName || item.hoTen || item.email;

    if (isCurrentUser(item)) {
      alert('Không thể khóa chính tài khoản đang đăng nhập.');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản "${name}"?`)) return;

    try {
      await userService.updateStatus(item.id, { status: nextStatus });
      fetchUsers();
    } catch (err) {
      alert(getApiMessage(err, `${action[0].toUpperCase()}${action.slice(1)} tài khoản thất bại.`));
      console.error(err);
    }
  };

  const getRoleBadge = (role) => {
    const color = role === 'Admin' ? 'danger' : 'warning';
    return <span className={`badge badge-${color}`}>{INTERNAL_ROLES[role] || role || 'Không rõ'}</span>;
  };

  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    const info = ACCOUNT_STATUS[normalized] || ACCOUNT_STATUS[1];
    return <span className={`badge badge-${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Tài khoản hệ thống</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách tài khoản nội bộ</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm nhân viên
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-info py-2">
                Trang này chỉ quản lý tài khoản đăng nhập admin nội bộ. Khách mua hàng được quản lý ở trang Khách hàng.
              </div>

              <form className="row mb-3" onSubmit={handleSearch}>
                <div className="col-md-4 mb-2 mb-md-0">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tìm theo tên, email, SĐT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-3 mb-2 mb-md-0">
                  <select
                    className="form-control form-control-sm"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Tất cả trạng thái --</option>
                    <option value="1">Hoạt động</option>
                    <option value="0">Khóa</option>
                  </select>
                </div>
                <div className="col-md-3 mb-2 mb-md-0">
                  <select
                    className="form-control form-control-sm"
                    value={filterRole}
                    onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                  >
                    <option value="">-- Tất cả vai trò --</option>
                    <option value="Admin">Quản trị viên</option>
                    <option value="Staff">Nhân viên</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-info btn-sm btn-block">
                    <i className="fas fa-search"></i> Tìm
                  </button>
                </div>
              </form>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-user-shield fa-2x mb-2"></i>
                  <p>Chưa có tài khoản nội bộ phù hợp.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          <th className="table-col-text">Họ tên</th>
                          <th className="table-col-text">Email</th>
                          <th className="table-col-code">SĐT</th>
                          <th className="table-col-status">Vai trò</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Ngày tạo</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const role = getPrimaryRole(u);
                          const status = normalizeStatus(u.status ?? u.trangThai);
                          const isSelf = isCurrentUser(u);
                          const active = status === 1;

                          return (
                            <tr key={u.id}>
                              <td className="table-col-text">
                                {u.fullName || u.hoTen}
                                {isSelf && <span className="badge badge-primary ml-2">Bạn</span>}
                              </td>
                              <td className="table-col-text">{u.email}</td>
                              <td className="table-col-code">{u.phoneNumber || u.soDienThoai || u.phone || '-'}</td>
                              <td className="table-col-status">{getRoleBadge(role)}</td>
                              <td className="table-col-status">{getStatusBadge(status)}</td>
                              <td className="table-col-date">{formatDate(u.createdDate || u.createdAt || u.ngayTao)}</td>
                              <td className="table-col-actions">
                                <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(u)} title="Sửa">
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className={`btn btn-xs ${active ? 'btn-warning' : 'btn-success'}`}
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={isSelf}
                                  title={isSelf ? 'Không thể khóa chính mình' : (active ? 'Khóa tài khoản' : 'Kích hoạt tài khoản')}
                                >
                                  <i className={`fas ${active ? 'fa-lock' : 'fa-unlock'}`}></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>»</button>
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa tài khoản hệ thống' : 'Thêm tài khoản nhân viên'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  {editItemIsSelf && (
                    <div className="alert alert-warning py-2">
                      Bạn có thể sửa thông tin cá nhân, nhưng không thể tự khóa tài khoản đang đăng nhập.
                    </div>
                  )}
                  <div className="form-group">
                    <label>Họ tên <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="fullName" value={form.fullName} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Email <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} disabled={Boolean(editItem)} />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input type="text" className="form-control" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
                  </div>
                  {!editItem && (
                    <div className="form-group">
                      <label>Mật khẩu <span className="text-danger">*</span></label>
                      <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} />
                    </div>
                  )}
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Vai trò</label>
                        <select className="form-control" name="role" value={form.role} onChange={handleChange} disabled>
                          {editItemWasAdmin && <option value="Admin">Quản trị viên</option>}
                          <option value="Staff">Nhân viên</option>
                        </select>
                      </div>
                    </div>
                    {editItem && (
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Trạng thái</label>
                          <select
                            className="form-control"
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            disabled={editItemIsSelf}
                          >
                            <option value="1">Hoạt động</option>
                            <option value="0">Khóa</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Thêm mới')}
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

export default UserList;
