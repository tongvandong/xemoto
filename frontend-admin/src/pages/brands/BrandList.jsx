import React, { useState, useEffect, useCallback } from 'react';
import brandService from '../../services/brandService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Tạo slug từ chuỗi tiếng Việt
 */
function generateSlug(str) {
  if (!str) return '';
  let slug = str.toLowerCase().trim();
  slug = slug.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  slug = slug.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  slug = slug.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  slug = slug.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  slug = slug.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  slug = slug.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  slug = slug.replace(/đ/g, 'd');
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  return slug;
}

const BrandList = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('brands');

  // === BRANDS STATE ===
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [errorBrands, setErrorBrands] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState({
    tenHang: '',
    slug: '',
    logoUrl: '',
    logoFile: null,
    dangHoatDong: true,
  });

  // === MODELS STATE ===
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorModels, setErrorModels] = useState('');
  const [showModelModal, setShowModelModal] = useState(false);
  const [editModel, setEditModel] = useState(null);
  const [savingModel, setSavingModel] = useState(false);
  const [filterBrandId, setFilterBrandId] = useState('');
  const [modelForm, setModelForm] = useState({
    hangXeId: '',
    tenDongXe: '',
    slug: '',
    dangHoatDong: true,
  });

  // Pagination state for brands
  const [brandPage, setBrandPage] = useState(1);
  const [brandTotalPages, setBrandTotalPages] = useState(1);
  const brandPageSize = 20;

  // Pagination state for models
  const [modelPage, setModelPage] = useState(1);
  const [modelTotalPages, setModelTotalPages] = useState(1);
  const modelPageSize = 20;

  // === FETCH BRANDS ===
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true);
    setErrorBrands('');
    try {
      const res = await brandService.getAll({ page: brandPage, pageSize: brandPageSize });
      const data = res.data;
      if (Array.isArray(data)) {
        setBrands(data);
        setBrandTotalPages(1);
      } else {
        setBrands(data.items || data.data || []);
        setBrandTotalPages(data.totalPages || Math.ceil((data.totalItems || 0) / brandPageSize) || 1);
      }
    } catch (err) {
      setErrorBrands('Không thể tải danh sách hãng xe.');
      console.error(err);
    } finally {
      setLoadingBrands(false);
    }
  }, [brandPage]);

  // === FETCH MODELS ===
  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setErrorModels('');
    try {
      const params = { page: modelPage, pageSize: modelPageSize };
      if (filterBrandId) params.brandId = filterBrandId;
      const res = await brandService.getAllModels(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setModels(data);
        setModelTotalPages(1);
      } else {
        setModels(data.items || data.data || []);
        setModelTotalPages(data.totalPages || Math.ceil((data.totalItems || 0) / modelPageSize) || 1);
      }
    } catch (err) {
      setErrorModels('Không thể tải danh sách dòng xe.');
      console.error(err);
    } finally {
      setLoadingModels(false);
    }
  }, [filterBrandId, modelPage]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (activeTab === 'models') {
      fetchModels();
    }
  }, [activeTab, fetchModels, modelPage]);

  // === BRAND HANDLERS ===
  const openAddBrand = () => {
    setEditBrand(null);
    setBrandForm({ tenHang: '', slug: '', logoUrl: '', logoFile: null, dangHoatDong: true });
    setShowBrandModal(true);
  };

  const openEditBrand = (item) => {
    setEditBrand(item);
    setBrandForm({
      tenHang: item.tenHang || item.name || '',
      slug: item.slug || '',
      logoUrl: item.logoUrl || item.logo || '',
      logoFile: null,
      dangHoatDong: item.dangHoatDong !== undefined ? item.dangHoatDong : item.status === 1,
    });
    setShowBrandModal(true);
  };

  const handleBrandChange = (e) => {
    const { name, value } = e.target;
    setBrandForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'tenHang') updated.slug = generateSlug(value);
      return updated;
    });
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    if (!brandForm.tenHang.trim()) {
      alert('Tên hãng xe là bắt buộc!');
      return;
    }
    setSavingBrand(true);
    try {
      const payload = {
        tenHang: brandForm.tenHang,
        slug: brandForm.slug,
        logoUrl: brandForm.logoUrl,
        dangHoatDong: brandForm.dangHoatDong,
      };
      const brandFile = brandForm.logoFile;
      let brandId = editBrand?.id;
      if (editBrand) {
        const res = await brandService.update(editBrand.id, payload);
        brandId = res.data?.id || editBrand.id;
      } else {
        const res = await brandService.create(payload);
        brandId = res.data?.id;
      }
      if (brandFile && brandId) {
        const formData = new FormData();
        formData.append('file', brandFile);
        await brandService.uploadLogo(brandId, formData);
      }
      setShowBrandModal(false);
      fetchBrands();
    } catch (err) {
      alert('Lưu hãng xe thất bại!');
      console.error(err);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDeleteBrand = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hãng xe "${name}"?`)) return;
    try {
      await brandService.delete(id);
      fetchBrands();
    } catch (err) {
      alert('Xóa hãng xe thất bại!');
      console.error(err);
    }
  };

  // === MODEL HANDLERS ===
  const openAddModel = () => {
    setEditModel(null);
    setModelForm({ hangXeId: '', tenDongXe: '', slug: '', dangHoatDong: true });
    setShowModelModal(true);
  };

  const openEditModel = (item) => {
    setEditModel(item);
    setModelForm({
      hangXeId: String(item.maHangXe || item.hangXeId || item.brandId || ''),
      tenDongXe: item.tenDongXe || item.name || '',
      slug: item.slug || '',
      dangHoatDong: item.dangHoatDong !== undefined ? item.dangHoatDong : item.status === 1,
    });
    setShowModelModal(true);
  };

  const handleModelChange = (e) => {
    const { name, value } = e.target;
    setModelForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'tenDongXe') updated.slug = generateSlug(value);
      return updated;
    });
  };

  const handleModelSubmit = async (e) => {
    e.preventDefault();
    if (!modelForm.tenDongXe.trim()) {
      alert('Tên dòng xe là bắt buộc!');
      return;
    }
    if (!modelForm.hangXeId) {
      alert('Vui lòng chọn hãng xe!');
      return;
    }
    setSavingModel(true);
    try {
      const payload = {
        maHangXe: Number(modelForm.hangXeId),
        tenDongXe: modelForm.tenDongXe,
        slug: modelForm.slug,
        dangHoatDong: modelForm.dangHoatDong,
      };
      if (editModel) {
        await brandService.updateModel(editModel.id, payload);
      } else {
        await brandService.createModel(payload);
      }
      setShowModelModal(false);
      fetchModels();
    } catch (err) {
      alert('Lưu dòng xe thất bại!');
      console.error(err);
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dòng xe "${name}"?`)) return;
    try {
      await brandService.deleteModel(id);
      fetchModels();
    } catch (err) {
      alert('Xóa dòng xe thất bại!');
      console.error(err);
    }
  };

  const getBrandName = (brandId) => {
    const brand = brands.find(b => b.id === brandId || b.maHangXe === brandId);
    return brand ? (brand.tenHang || brand.name) : '';
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Hãng xe & Dòng xe</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header p-0">
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'brands' ? 'active' : ''}`} onClick={() => setActiveTab('brands')}>
                    <i className="fas fa-industry mr-1"></i> Hãng xe
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>
                    <i className="fas fa-motorcycle mr-1"></i> Dòng xe
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {/* === TAB: BRANDS === */}
              {activeTab === 'brands' && (
                <>
                  <div className="mb-3">
                    <button className="btn btn-primary btn-sm" onClick={openAddBrand}>
                      <i className="fas fa-plus"></i> Thêm hãng xe
                    </button>
                  </div>

                  {errorBrands && <div className="alert alert-danger">{errorBrands}</div>}

                  {loadingBrands ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Đang tải...</span>
                      </div>
                    </div>
                  ) : brands.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-industry fa-2x mb-2"></i>
                      <p>Chưa có hãng xe nào.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped table-sm">
                        <thead>
                          <tr>
                            <th className="table-col-code">ID</th>
                            <th className="table-col-text">Tên hãng</th>
                            <th className="table-col-code">Slug</th>
                            <th className="table-col-image">Logo</th>
                            <th className="table-col-status">Trạng thái</th>
                            <th className="table-col-actions">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brands.map(b => (
                            <tr key={b.id}>
                              <td className="table-col-code">{b.id}</td>
                              <td className="table-col-text">{b.tenHang || b.name}</td>
                              <td className="table-col-code"><code>{b.slug}</code></td>
                              <td className="table-col-image">
                                {(b.logoUrl || b.logo) ? (
                                  <img className="brand-table-logo" src={b.logoUrl || b.logo} alt="Logo" />
                                ) : <span className="text-muted">-</span>}
                              </td>
                              <td className="table-col-status">
                                <span className={`badge badge-${b.dangHoatDong ? 'success' : 'secondary'}`}>
                                  {b.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                                </span>
                              </td>
                              <td className="table-col-actions">
                                <button className="btn btn-xs btn-info mr-1" onClick={() => openEditBrand(b)}>
                                  <i className="fas fa-edit"></i>
                                </button>
                                {isAdmin() && (
                                  <button className="btn btn-xs btn-danger" onClick={() => handleDeleteBrand(b.id, b.tenHang || b.name)}>
                                    <i className="fas fa-trash"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Brand Pagination */}
                  {brandTotalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${brandPage <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setBrandPage(p => p - 1)}>«</button>
                        </li>
                        {Array.from({ length: brandTotalPages }, (_, i) => i + 1).map(p => (
                          <li key={p} className={`page-item ${p === brandPage ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setBrandPage(p)}>{p}</button>
                          </li>
                        ))}
                        <li className={`page-item ${brandPage >= brandTotalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setBrandPage(p => p + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}

              {/* === TAB: MODELS === */}
              {activeTab === 'models' && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <select className="form-control form-control-sm" value={filterBrandId} onChange={(e) => { setFilterBrandId(e.target.value); setModelPage(1); }}>
                        <option value="">-- Tất cả hãng xe --</option>
                        {brands.map(b => (
                          <option key={b.id} value={String(b.id)}>{b.tenHang || b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-8 text-right">
                      <button className="btn btn-primary btn-sm" onClick={openAddModel}>
                        <i className="fas fa-plus"></i> Thêm dòng xe
                      </button>
                    </div>
                  </div>

                  {errorModels && <div className="alert alert-danger">{errorModels}</div>}

                  {loadingModels ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Đang tải...</span>
                      </div>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-motorcycle fa-2x mb-2"></i>
                      <p>Chưa có dòng xe nào.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped table-sm">
                        <thead>
                          <tr>
                            <th className="table-col-code">ID</th>
                            <th className="table-col-text">Hãng xe</th>
                            <th className="table-col-text">Tên dòng xe</th>
                            <th className="table-col-code">Slug</th>
                            <th className="table-col-status">Trạng thái</th>
                            <th className="table-col-actions">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.map(m => (
                            <tr key={m.id}>
                              <td className="table-col-code">{m.id}</td>
                              <td className="table-col-text">{getBrandName(m.maHangXe || m.hangXeId || m.brandId) || m.tenHang || m.brandName || ''}</td>
                              <td className="table-col-text">{m.tenDongXe || m.name}</td>
                              <td className="table-col-code"><code>{m.slug}</code></td>
                              <td className="table-col-status">
                                <span className={`badge badge-${m.dangHoatDong ? 'success' : 'secondary'}`}>
                                  {m.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                                </span>
                              </td>
                              <td className="table-col-actions">
                                <button className="btn btn-xs btn-info mr-1" onClick={() => openEditModel(m)}>
                                  <i className="fas fa-edit"></i>
                                </button>
                                {isAdmin() && (
                                  <button className="btn btn-xs btn-danger" onClick={() => handleDeleteModel(m.id, m.tenDongXe || m.name)}>
                                    <i className="fas fa-trash"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Model Pagination */}
                  {modelTotalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${modelPage <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setModelPage(p => p - 1)}>«</button>
                        </li>
                        {Array.from({ length: modelTotalPages }, (_, i) => i + 1).map(p => (
                          <li key={p} className={`page-item ${p === modelPage ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setModelPage(p)}>{p}</button>
                          </li>
                        ))}
                        <li className={`page-item ${modelPage >= modelTotalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setModelPage(p => p + 1)}>»</button>
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

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editBrand ? 'Sửa hãng xe' : 'Thêm hãng xe mới'}</h5>
                <button type="button" className="close" onClick={() => setShowBrandModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleBrandSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  <div className="form-group">
                    <label>Tên hãng <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="tenHang" value={brandForm.tenHang} onChange={handleBrandChange} />
                  </div>
                  <div className="form-group">
                    <label>Slug</label>
                    <input type="text" className="form-control" name="slug" value={brandForm.slug} onChange={handleBrandChange} />
                  </div>
                  <div className="form-group">
                    <label>Logo</label>
                    <div className="custom-file">
                      <input
                        type="file"
                        className="custom-file-input"
                        id="brandLogoFile"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setBrandForm(prev => ({ ...prev, logoFile: file, logoUrl: URL.createObjectURL(file) }));
                          }
                        }}
                      />
                      <label className="custom-file-label" htmlFor="brandLogoFile">
                        {brandForm.logoFile ? brandForm.logoFile.name : 'Chọn logo từ máy tính...'}
                      </label>
                    </div>
                    {brandForm.logoUrl && <img src={brandForm.logoUrl} alt="Logo preview" className="mt-2 rounded border" style={{ maxHeight: 50 }} />}
                  </div>
                  <div className="form-group">
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="brandDangHoatDong"
                        checked={brandForm.dangHoatDong}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, dangHoatDong: e.target.checked }))}
                      />
                      <label className="custom-control-label" htmlFor="brandDangHoatDong">
                        {brandForm.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBrandModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={savingBrand}>
                    {savingBrand ? 'Đang lưu...' : (editBrand ? 'Cập nhật' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Model Modal */}
      {showModelModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" style={{ maxHeight: '90vh' }}>
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editModel ? 'Sửa dòng xe' : 'Thêm dòng xe mới'}</h5>
                <button type="button" className="close" onClick={() => setShowModelModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleModelSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  <div className="form-group">
                    <label>Hãng xe <span className="text-danger">*</span></label>
                    <select className="form-control" name="hangXeId" value={modelForm.hangXeId} onChange={handleModelChange}>
                      <option value="">-- Chọn hãng xe --</option>
                      {brands.map(b => (
                        <option key={b.id} value={String(b.id)}>{b.tenHang || b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tên dòng xe <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="tenDongXe" value={modelForm.tenDongXe} onChange={handleModelChange} />
                  </div>
                  <div className="form-group">
                    <label>Slug</label>
                    <input type="text" className="form-control" name="slug" value={modelForm.slug} onChange={handleModelChange} />
                  </div>
                  <div className="form-group">
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="modelDangHoatDong"
                        checked={modelForm.dangHoatDong}
                        onChange={(e) => setModelForm(prev => ({ ...prev, dangHoatDong: e.target.checked }))}
                      />
                      <label className="custom-control-label" htmlFor="modelDangHoatDong">
                        {modelForm.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModelModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={savingModel}>
                    {savingModel ? 'Đang lưu...' : (editModel ? 'Cập nhật' : 'Thêm mới')}
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

export default BrandList;
