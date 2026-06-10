import React, { useState, useEffect, useCallback, useMemo } from 'react';
import categoryService from '../../services/categoryService';
import { useAuth } from '../../contexts/AuthContext';

function generateSlug(str) {
  if (!str) return '';
  let slug = str.toLowerCase().trim();
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/đ/g, 'd');
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  return slug;
}

const emptyForm = {
  tenDanhMuc: '',
  slug: '',
  moTa: '',
  danhMucChaId: '',
  thuTu: 0,
  dangHoatDong: true,
};

const getCategoryId = (category) => category.id || category.maDanhMuc;
const getParentId = (category) => category.danhMucChaId || category.maDanhMucCha || category.parentId || null;
const getCategoryName = (category) => category.tenDanhMuc || category.name || '';
const getCategoryKind = (category) => Number(category.kind ?? category.loai ?? 0);
const SYSTEM_ROOT_SLUGS = new Set(['xe-may', 'phu-tung']);
const isSystemRootCategory = (category) => !getParentId(category) && SYSTEM_ROOT_SLUGS.has(category.slug);

const CategoryList = () => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(() => new Set());
  const [form, setForm] = useState(emptyForm);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await categoryService.getAll({ activeOnly: false });
      const data = res.data;
      const items = Array.isArray(data) ? data : data.items || data.data || [];
      setCategories(items);
    } catch (err) {
      setError('Không thể tải danh sách danh mục.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const parentIds = useMemo(() => new Set(categories.map(getParentId).filter(Boolean).map(String)), [categories]);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      const parentKey = String(getParentId(category) || 'root');
      if (!map.has(parentKey)) map.set(parentKey, []);
      map.get(parentKey).push(category);
    });

    map.forEach((items) => {
      items.sort((a, b) => {
        const orderA = a.thuTu || a.thuTuHienThi || a.sortOrder || 0;
        const orderB = b.thuTu || b.thuTuHienThi || b.sortOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        return getCategoryName(a).localeCompare(getCategoryName(b), 'vi');
      });
    });

    return map;
  }, [categories]);

  const getDescendantIds = useCallback((categoryId) => {
    const descendants = new Set();
    const collect = (parentId) => {
      categories
        .filter((category) => String(getParentId(category)) === String(parentId))
        .forEach((child) => {
          const childId = getCategoryId(child);
          if (!descendants.has(String(childId))) {
            descendants.add(String(childId));
            collect(childId);
          }
        });
    };
    collect(categoryId);
    return descendants;
  }, [categories]);

  const rootParentOptions = useMemo(
    () => categories.filter(isSystemRootCategory).sort((a, b) => (getCategoryKind(a) || 0) - (getCategoryKind(b) || 0)),
    [categories],
  );

  const parentOptions = useMemo(() => {
    if (editItem && isSystemRootCategory(editItem)) {
      return [];
    }

    return rootParentOptions;
  }, [editItem, rootParentOptions]);

  const visibleRows = useMemo(() => {
    if (levelFilter === 'child') {
      return categories
        .filter((category) => Boolean(getParentId(category)))
        .sort((a, b) => getCategoryName(a).localeCompare(getCategoryName(b), 'vi'))
        .map((category) => ({ category, level: 1 }));
    }

    const rows = [];
    const addRows = (parentKey, level) => {
      const items = childrenByParent.get(parentKey) || [];
      items.forEach((category) => {
        rows.push({ category, level });
        const id = String(getCategoryId(category));
        if (levelFilter !== 'root' && expandedCategoryIds.has(id)) {
          addRows(id, level + 1);
        }
      });
    };

    addRows('root', 0);
    return rows;
  }, [categories, childrenByParent, expandedCategoryIds, levelFilter]);

  const toggleExpanded = (categoryId) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      const key = String(categoryId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tenDanhMuc: getCategoryName(item),
      slug: item.slug || '',
      moTa: item.moTa || item.description || '',
      danhMucChaId: getParentId(item) || '',
      thuTu: item.thuTu || item.thuTuHienThi || item.sortOrder || 0,
      dangHoatDong: item.dangHoatDong !== undefined ? item.dangHoatDong : true,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'tenDanhMuc' && !(editItem && isSystemRootCategory(editItem))) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tenDanhMuc.trim()) {
      alert('Tên danh mục là bắt buộc.');
      return;
    }
    const editingSystemRoot = editItem && isSystemRootCategory(editItem);
    const selectedParent = rootParentOptions.find((category) => String(getCategoryId(category)) === String(form.danhMucChaId));
    if (!editingSystemRoot && !selectedParent) {
      alert('Vui lòng chọn danh mục cha là Xe máy hoặc Phụ tùng.');
      return;
    }
    if (editItem && form.danhMucChaId) {
      const blockedIds = getDescendantIds(getCategoryId(editItem));
      blockedIds.add(String(getCategoryId(editItem)));
      if (blockedIds.has(String(form.danhMucChaId))) {
        alert('Danh mục cha không hợp lệ. Không thể chọn chính nó hoặc danh mục con của nó làm cha.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        tenDanhMuc: form.tenDanhMuc.trim(),
        slug: form.slug.trim(),
        moTa: form.moTa,
        danhMucChaId: editingSystemRoot ? null : Number(form.danhMucChaId),
        kind: editingSystemRoot ? getCategoryKind(editItem) : getCategoryKind(selectedParent),
        thuTu: Number(form.thuTu) || 0,
        dangHoatDong: form.dangHoatDong,
      };
      if (editItem) {
        await categoryService.update(getCategoryId(editItem), payload);
      } else {
        await categoryService.create(payload);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || 'Lưu danh mục thất bại.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) return;
    try {
      await categoryService.delete(id);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || 'Xóa danh mục thất bại.');
      console.error(err);
    }
  };

  const getParentName = (parentId) => {
    if (!parentId) return 'Danh mục gốc';
    const parent = categories.find((category) => String(getCategoryId(category)) === String(parentId));
    return parent ? getCategoryName(parent) : 'Không tìm thấy';
  };

  const getLevelBadge = (category) => {
    const isRoot = !getParentId(category);
    return (
      <span className={`badge badge-${isRoot ? 'primary' : 'light'}`}>
        {isRoot ? 'Gốc' : 'Con'}
      </span>
    );
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Danh mục</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách danh mục</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm danh mục
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="alert alert-info py-2">
                Xe máy và Phụ tùng là danh mục gốc nghiệp vụ. Các nhóm nhỏ hơn nên đặt dưới đúng danh mục gốc.
              </div>

              <div className="row mb-3">
                <div className="col-md-3">
                  <select
                    className="form-control form-control-sm"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="">Cây danh mục</option>
                    <option value="root">Chỉ danh mục gốc</option>
                    <option value="child">Chỉ danh mục con</option>
                  </select>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-folder-open fa-2x mb-2"></i>
                  <p>Không có danh mục phù hợp.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped table-sm">
                    <thead>
                      <tr>
                        <th className="table-col-code">ID</th>
                        <th className="table-col-text">Tên danh mục</th>
                        <th className="table-col-code">Slug</th>
                        <th className="table-col-status">Cấp</th>
                        <th className="table-col-text">Danh mục cha</th>
                        <th className="table-col-number">Thứ tự</th>
                        <th className="table-col-status">Trạng thái</th>
                        <th className="table-col-actions">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(({ category, level }) => {
                        const id = getCategoryId(category);
                        const parentId = getParentId(category);
                        const hasChildren = parentIds.has(String(id));
                        const expanded = expandedCategoryIds.has(String(id));
                        return (
                          <tr key={id}>
                            <td className="table-col-code">{id}</td>
                            <td className="table-col-text">
                              <div className="d-flex align-items-center" style={{ paddingLeft: `${level * 24}px` }}>
                                {hasChildren ? (
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-light mr-2"
                                    onClick={() => toggleExpanded(id)}
                                    title={expanded ? 'Thu gọn' : 'Mở danh mục con'}
                                  >
                                    <i className={`fas fa-chevron-${expanded ? 'down' : 'right'}`}></i>
                                  </button>
                                ) : (
                                  <span className="mr-2" style={{ width: 26, display: 'inline-block' }}></span>
                                )}
                                <span>{getCategoryName(category)}</span>
                                {hasChildren && <span className="badge badge-secondary ml-2">{(childrenByParent.get(String(id)) || []).length} mục con</span>}
                              </div>
                            </td>
                            <td className="table-col-code"><code>{category.slug}</code></td>
                            <td className="table-col-status">{getLevelBadge(category)}</td>
                            <td className="table-col-text">
                              {parentId ? getParentName(parentId) : <span className="text-primary font-weight-bold">Danh mục gốc</span>}
                            </td>
                            <td className="table-col-number">{category.thuTu || category.thuTuHienThi || category.sortOrder || 0}</td>
                            <td className="table-col-status">
                              <span className={`badge badge-${category.dangHoatDong ? 'success' : 'secondary'}`}>
                                {category.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                              </span>
                            </td>
                            <td className="table-col-actions">
                              <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(category)} title="Sửa">
                                <i className="fas fa-edit"></i>
                              </button>
                              {isAdmin() && (
                                <button className="btn btn-xs btn-danger" onClick={() => handleDelete(id, getCategoryName(category))} title="Xóa">
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                <h5 className="modal-title">{editItem ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                  <div className="form-group">
                    <label>Tên danh mục <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="tenDanhMuc" value={form.tenDanhMuc} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Slug</label>
                    <input
                      type="text"
                      className="form-control"
                      name="slug"
                      value={form.slug}
                      onChange={handleChange}
                      disabled={editItem && isSystemRootCategory(editItem)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea className="form-control" name="moTa" value={form.moTa} onChange={handleChange} rows="3" />
                  </div>
                  <div className="form-group">
                    <label>Danh mục cha <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      name="danhMucChaId"
                      value={form.danhMucChaId}
                      onChange={handleChange}
                      disabled={editItem && isSystemRootCategory(editItem)}
                      required={!(editItem && isSystemRootCategory(editItem))}
                    >
                      <option value="">
                        {editItem && isSystemRootCategory(editItem)
                          ? 'Danh mục gốc hệ thống'
                          : '-- Chọn Xe máy hoặc Phụ tùng --'}
                      </option>
                      {parentOptions.map((category) => (
                        <option key={getCategoryId(category)} value={String(getCategoryId(category))}>
                          {getCategoryName(category)}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Chỉ có 2 danh mục cha cấp gốc: Xe máy và Phụ tùng. Danh mục mới phải nằm dưới một trong 2 nhóm này.
                    </small>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Thứ tự hiển thị</label>
                        <input type="number" className="form-control" name="thuTu" value={form.thuTu} onChange={handleChange} min="0" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <div className="custom-control custom-switch mt-2">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="catDangHoatDong"
                            checked={form.dangHoatDong}
                            onChange={(e) => setForm((prev) => ({ ...prev, dangHoatDong: e.target.checked }))}
                            disabled={editItem && isSystemRootCategory(editItem)}
                          />
                          <label className="custom-control-label" htmlFor="catDangHoatDong">
                            {form.dangHoatDong ? 'Hoạt động' : 'Ẩn'}
                          </label>
                        </div>
                      </div>
                    </div>
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

export default CategoryList;
