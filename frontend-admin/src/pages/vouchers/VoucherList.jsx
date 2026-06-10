import React, { useEffect, useState } from 'react';
import voucherService from '../../services/voucherService';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import brandService from '../../services/brandService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { useAuth } from '../../contexts/AuthContext';

const VOUCHER_TYPES = {
  Percent: 'Phần trăm (%)',
  Amount: 'Cố định (VNĐ)',
  Fixed: 'Cố định (VNĐ)',
  FreeShipping: 'Miễn phí vận chuyển',
};

const VOUCHER_STATUS = {
  Active: { label: 'Hoạt động', color: 'success' },
  Inactive: { label: 'Ngừng', color: 'secondary' },
  Expired: { label: 'Hết hạn', color: 'danger' },
};

const VOUCHER_SCOPES = {
  All: 'Toàn bộ đơn hàng',
  Product: 'Theo sản phẩm cụ thể',
  Category: 'Theo danh mục cụ thể',
  Brand: 'Theo hãng xe cụ thể',
};

const defaultForm = {
  code: '',
  discountType: 'Percent',
  discountValue: '',
  minOrderValue: '',
  maxDiscountValue: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  description: '',
  scope: 'All',
  productIds: [],
  categoryIds: [],
  brandIds: [],
  status: 'Active',
};

const getVoucherId = (voucher) => voucher.id || voucher.maVoucher;
const getVoucherCode = (voucher) => voucher.code || voucher.maVoucherCode || (typeof voucher.maVoucher === 'string' ? voucher.maVoucher : '');
const getDiscountType = (voucher) => voucher.discountType || voucher.loaiGiamGia || voucher.loaiGiam || 'Percent';
const getDiscountValue = (voucher) => voucher.discountValue ?? voucher.giaTriGiam ?? '';
const getMinOrderValue = (voucher) => voucher.minOrderValue ?? voucher.giaTriDonToiThieu ?? voucher.donToiThieu ?? '';
const getMaxDiscountValue = (voucher) => voucher.maxDiscountValue ?? voucher.giaTriGiamToiDa ?? voucher.giamToiDa ?? '';
const getStartDate = (voucher) => voucher.startDate || voucher.startsAt || voucher.ngayBatDau || '';
const getEndDate = (voucher) => voucher.endDate || voucher.endsAt || voucher.ngayKetThuc || '';
const getUsageLimit = (voucher) => voucher.usageLimit ?? voucher.gioiHanSuDung ?? '';
const getUsedCount = (voucher) => voucher.usedCount ?? voucher.daDung ?? 0;
const getDescription = (voucher) => voucher.description || voucher.moTa || '';
const getScope = (voucher) => voucher.scope || voucher.phamViApDung || 'All';
const getTargetIds = (voucher, key) => Array.isArray(voucher?.[key]) ? voucher[key].map(Number) : [];
const getStatus = (voucher) => voucher.status || voucher.trangThai || (voucher.dangHoatDong === false ? 'Inactive' : 'Active');
const toDateInputValue = (value) => (value ? String(value).substring(0, 10) : '');

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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
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

  useEffect(() => {
    const fetchTargetOptions = async () => {
      try {
        const [productsRes, categoriesRes, brandsRes] = await Promise.all([
          productService.getAll({ page: 1, pageSize: 300 }),
          categoryService.getAll({ activeOnly: false }),
          brandService.getAll({ page: 1, pageSize: 300 }),
        ]);

        const productPayload = productsRes.data;
        const categoryPayload = categoriesRes.data;
        const brandPayload = brandsRes.data;

        setProducts(productPayload.items || productPayload.data || productPayload || []);
        setCategories(Array.isArray(categoryPayload) ? categoryPayload : categoryPayload.items || categoryPayload.data || []);
        setBrands(brandPayload.items || brandPayload.data || brandPayload || []);
      } catch (err) {
        console.error('Không thể tải danh sách đối tượng áp dụng voucher', err);
      }
    };

    fetchTargetOptions();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEditModal = (voucher) => {
    setEditingId(getVoucherId(voucher));
    setForm({
      code: getVoucherCode(voucher),
      discountType: getDiscountType(voucher),
      discountValue: getDiscountValue(voucher),
      minOrderValue: getMinOrderValue(voucher),
      maxDiscountValue: getMaxDiscountValue(voucher),
      startDate: getStartDate(voucher),
      endDate: getEndDate(voucher),
      usageLimit: getUsageLimit(voucher),
      description: getDescription(voucher),
      scope: getScope(voucher),
      productIds: getTargetIds(voucher, 'productIds'),
      categoryIds: getTargetIds(voucher, 'categoryIds'),
      brandIds: getTargetIds(voucher, 'brandIds'),
      status: getStatus(voucher),
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'scope') {
        return { ...prev, scope: value, productIds: [], categoryIds: [], brandIds: [] };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: normalizeMoneyInput(value) }));
  };

  const handleMultiSelect = (name, options) => {
    const values = Array.from(options).filter((option) => option.selected).map((option) => Number(option.value));
    setForm((prev) => ({ ...prev, [name]: values }));
  };

  const handleTargetToggle = (name, id, checked) => {
    const value = Number(id);
    setForm((prev) => {
      const current = prev[name] || [];
      return {
        ...prev,
        [name]: checked
          ? Array.from(new Set([...current, value]))
          : current.filter((item) => Number(item) !== value),
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      alert('Vui lòng nhập mã voucher.');
      return;
    }
    if (form.discountType !== 'FreeShipping' && !form.discountValue) {
      alert('Vui lòng nhập giá trị giảm.');
      return;
    }

    if (form.scope === 'Product' && form.productIds.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm áp dụng.');
      return;
    }
    if (form.scope === 'Category' && form.categoryIds.length === 0) {
      alert('Vui lòng chọn ít nhất một danh mục áp dụng.');
      return;
    }
    if (form.scope === 'Brand' && form.brandIds.length === 0) {
      alert('Vui lòng chọn ít nhất một hãng xe áp dụng.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code,
        discountType: form.discountType,
        discountValue: form.discountType === 'FreeShipping' ? 0 : Number(form.discountValue),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
        maxDiscountValue: form.maxDiscountValue ? Number(form.maxDiscountValue) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        description: form.description,
        scope: form.scope,
        productIds: form.scope === 'Product' ? form.productIds : [],
        categoryIds: form.scope === 'Category' ? form.categoryIds : [],
        brandIds: form.scope === 'Brand' ? form.brandIds : [],
        status: form.status,
      };

      if (editingId) {
        await voucherService.update(editingId, payload);
      } else {
        await voucherService.create(payload);
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      alert('Lưu voucher thất bại. Vui lòng thử lại.');
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
      alert('Xóa voucher thất bại. Vui lòng thử lại.');
    }
  };

  const getStatusBadge = (status) => {
    const statusMeta = VOUCHER_STATUS[status];
    if (!statusMeta) return <span className="badge badge-secondary">{status}</span>;
    return <span className={`badge badge-${statusMeta.color}`}>{statusMeta.label}</span>;
  };

  const formatDiscountValue = (voucher) => {
    const type = getDiscountType(voucher);
    const value = getDiscountValue(voucher) || 0;
    if (type === 'FreeShipping') return 'Miễn phí ship';
    if (type === 'Percent') return `${value}%`;
    return formatCurrency(value);
  };

  const formatScope = (scope) => VOUCHER_SCOPES[scope] || scope || VOUCHER_SCOPES.All;
  const getProductId = (product) => product.id || product.maSanPham;
  const getProductLabel = (product) => product.tenSanPham || product.name || product.productName || `SP #${getProductId(product)}`;
  const getCategoryId = (category) => category.id || category.maDanhMuc;
  const getCategoryLabel = (category) => category.tenDanhMuc || category.name || `Danh mục #${getCategoryId(category)}`;
  const getBrandId = (brand) => brand.id || brand.maHangXe;
  const getBrandLabel = (brand) => brand.tenHang || brand.name || brand.brandName || `Hãng #${getBrandId(brand)}`;
  const targetListStyle = { maxHeight: 112, overflowY: 'auto', border: '1px solid #ced4da', borderRadius: 4, padding: '6px 8px' };

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
                          <th className="table-col-status">Phạm vi</th>
                          <th className="table-col-money">Đơn tối thiểu</th>
                          <th className="table-col-date">Thời hạn</th>
                          <th className="table-col-number">Đã dùng/Giới hạn</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers.map((voucher) => (
                          <tr key={getVoucherId(voucher)}>
                            <td className="table-col-code"><strong>{getVoucherCode(voucher)}</strong></td>
                            <td className="table-col-status">{VOUCHER_TYPES[getDiscountType(voucher)] || getDiscountType(voucher)}</td>
                            <td className="table-col-money">{formatDiscountValue(voucher)}</td>
                            <td className="table-col-status">{formatScope(getScope(voucher))}</td>
                            <td className="table-col-money">{formatCurrency(getMinOrderValue(voucher) || 0)}</td>
                            <td className="table-col-date">
                              {formatDateShort(getStartDate(voucher))} - {formatDateShort(getEndDate(voucher))}
                            </td>
                            <td className="table-col-number">
                              {getUsedCount(voucher)} / {getUsageLimit(voucher) || '∞'}
                            </td>
                            <td className="table-col-status">{getStatusBadge(getStatus(voucher))}</td>
                            <td className="table-col-actions">
                              <button className="btn btn-warning btn-sm mr-1" onClick={() => openEditModal(voucher)} title="Sửa">
                                <i className="fas fa-edit"></i>
                              </button>
                              {isAdmin() && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(getVoucherId(voucher))} title="Xóa">
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
                          <option value="FreeShipping">Miễn phí vận chuyển</option>
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
                          value={form.discountType === 'FreeShipping' ? 0 : form.discountType === 'Percent' ? form.discountValue : formatMoneyInput(form.discountValue)}
                          onChange={form.discountType === 'Percent' ? handleChange : handleMoneyChange}
                          disabled={form.discountType === 'FreeShipping'}
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
                        <input type="text" inputMode="numeric" className="form-control" name="maxDiscountValue" value={formatMoneyInput(form.maxDiscountValue)} onChange={handleMoneyChange} placeholder="VD: 100000" />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Ngày bắt đầu</label>
                        <input type="date" className="form-control" name="startDate" value={toDateInputValue(form.startDate)} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Ngày kết thúc</label>
                        <input type="date" className="form-control" name="endDate" value={toDateInputValue(form.endDate)} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Giới hạn sử dụng</label>
                        <input type="number" className="form-control" name="usageLimit" value={form.usageLimit} onChange={handleChange} placeholder="Để trống = không giới hạn" />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Phạm vi áp dụng</label>
                        <select className="form-control" name="scope" value={form.scope} onChange={handleChange}>
                          {Object.entries(VOUCHER_SCOPES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {form.scope !== 'All' && (
                          <small className="form-text text-muted">
                            Chọn danh sách áp dụng cụ thể bên dưới.
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select className="form-control" name="status" value={form.status} onChange={handleChange}>
                          <option value="Active">Hoạt động</option>
                          <option value="Inactive">Ngừng</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {form.scope === 'Product' && (
                    <div className="form-group">
                      <label>Sản phẩm áp dụng <span className="text-danger">*</span></label>
                      <div style={targetListStyle}>
                        {products.map((product) => {
                          const id = getProductId(product);
                          return (
                            <label key={id} className="d-flex align-items-center mb-1" style={{ gap: 8, fontWeight: 400 }}>
                              <input
                                type="checkbox"
                                checked={form.productIds.includes(Number(id))}
                                onChange={(e) => handleTargetToggle('productIds', id, e.target.checked)}
                              />
                              <span>{getProductLabel(product)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <small className="form-text text-muted">{`\u0110\u00e3 ch\u1ecdn ${form.productIds.length} s\u1ea3n ph\u1ea9m. Gi\u1eef Ctrl \u0111\u1ec3 ch\u1ecdn nhi\u1ec1u s\u1ea3n ph\u1ea9m.`}</small>
                    </div>
                  )}

                  {form.scope === 'Category' && (
                    <div className="form-group">
                      <label>Danh mục áp dụng <span className="text-danger">*</span></label>
                      <div style={targetListStyle}>
                        {categories.map((category) => {
                          const id = getCategoryId(category);
                          return (
                            <label key={id} className="d-flex align-items-center mb-1" style={{ gap: 8, fontWeight: 400 }}>
                              <input
                                type="checkbox"
                                checked={form.categoryIds.includes(Number(id))}
                                onChange={(e) => handleTargetToggle('categoryIds', id, e.target.checked)}
                              />
                              <span>{getCategoryLabel(category)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <small className="form-text text-muted">{`\u0110\u00e3 ch\u1ecdn ${form.categoryIds.length} danh m\u1ee5c. Gi\u1eef Ctrl \u0111\u1ec3 ch\u1ecdn nhi\u1ec1u danh m\u1ee5c.`}</small>
                    </div>
                  )}

                  {form.scope === 'Brand' && (
                    <div className="form-group">
                      <label>Hãng xe áp dụng <span className="text-danger">*</span></label>
                      <div style={targetListStyle}>
                        {brands.map((brand) => {
                          const id = getBrandId(brand);
                          return (
                            <label key={id} className="d-flex align-items-center mb-1" style={{ gap: 8, fontWeight: 400 }}>
                              <input
                                type="checkbox"
                                checked={form.brandIds.includes(Number(id))}
                                onChange={(e) => handleTargetToggle('brandIds', id, e.target.checked)}
                              />
                              <span>{getBrandLabel(brand)}</span>
                            </label>
                          );
                        })}
                      </div>
                      <small className="form-text text-muted">{`\u0110\u00e3 ch\u1ecdn ${form.brandIds.length} h\u00e3ng xe. Gi\u1eef Ctrl \u0111\u1ec3 ch\u1ecdn nhi\u1ec1u h\u00e3ng xe.`}</small>
                    </div>
                  )}

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
