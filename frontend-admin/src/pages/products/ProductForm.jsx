import React, { useState, useEffect, useMemo } from 'react';
import productService from '../../services/productService';
import brandService from '../../services/brandService';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';

const PRODUCT_TYPE = {
  XeMay: {
    label: 'Xe máy',
    rootNames: ['xe máy', 'xe may'],
    help: 'Chỉ hiện các danh mục thuộc nhóm Xe máy.',
  },
  PhuTung: {
    label: 'Phụ tùng',
    rootNames: ['phụ tùng', 'phu tung', 'phụ kiện', 'phu kien'],
    help: 'Chỉ hiện các danh mục thuộc nhóm Phụ tùng/Phụ kiện.',
  },
};

function generateSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const getCategoryId = (category) => category.maDanhMuc || category.id;
const getCategoryName = (category) => category.tenDanhMuc || category.name || '';
const getParentCategoryId = (category) => category.maDanhMucCha ?? category.parentId ?? category.parentCategoryId ?? category.danhMucChaId ?? null;
const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const ProductForm = ({ show, onClose, onSaved, product, categories = [], brands = [], manufacturers = [], fixedProductType = null }) => {
  const isEdit = !!product;
  const lockedType = fixedProductType || null;
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    maSP: '',
    tenSanPham: '',
    slug: '',
    loaiSP: 'XeMay',
    danhMucId: '',
    hangXeId: '',
    dongXeId: '',
    hangSXId: '',
    moTaNgan: '',
    giaGoc: '',
    giaKhuyenMai: '',
    soLuongTon: '',
    anhChinhUrl: '',
    anhChinhFile: null,
    trangThai: 'Available',
    noiBat: false,
    hotDeal: false,
  });

  const categoryTree = useMemo(() => {
    const byId = new Map();
    const childrenByParent = new Map();

    categories.forEach((category) => {
      const id = getCategoryId(category);
      if (!id) return;
      byId.set(Number(id), category);
      const parentId = getParentCategoryId(category);
      const key = parentId == null ? 'root' : Number(parentId);
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(category);
    });

    return { byId, childrenByParent };
  }, [categories]);

  const getRootForType = (type) => {
    const config = PRODUCT_TYPE[type];
    if (!config) return null;
    return categories.find((category) => {
      const isRoot = getParentCategoryId(category) == null;
      const name = normalizeText(getCategoryName(category));
      return isRoot && config.rootNames.some((rootName) => name === normalizeText(rootName));
    }) || null;
  };

  const getDescendantIds = (rootId) => {
    const result = new Set();
    const visit = (parentId) => {
      const children = categoryTree.childrenByParent.get(Number(parentId)) || [];
      children.forEach((child) => {
        const id = Number(getCategoryId(child));
        result.add(id);
        visit(id);
      });
    };
    visit(rootId);
    return result;
  };

  const filteredCategories = useMemo(() => {
    const root = getRootForType(form.loaiSP);
    if (!root) {
      return categories.filter((category) => getParentCategoryId(category) != null);
    }

    const rootId = Number(getCategoryId(root));
    const allowedIds = getDescendantIds(rootId);
    const hasChildren = allowedIds.size > 0;
    if (!hasChildren) allowedIds.add(rootId);

    return categories.filter((category) => allowedIds.has(Number(getCategoryId(category))));
  }, [categories, categoryTree, form.loaiSP]);

  const isCategoryAllowed = (categoryId) => {
    if (!categoryId) return true;
    return filteredCategories.some((category) => String(getCategoryId(category)) === String(categoryId));
  };

  useEffect(() => {
    if (product) {
      setForm({
        maSP: product.maSanPhamKinhDoanh || product.maSP || product.sku || '',
        tenSanPham: product.tenSanPham || product.name || '',
        slug: product.slug || '',
        loaiSP: lockedType || product.loaiSanPham || product.loaiSP || product.type || 'XeMay',
        danhMucId: String(product.maDanhMuc || product.danhMucId || product.categoryId || ''),
        hangXeId: String(product.maHangXe || product.hangXeId || product.brandId || ''),
        dongXeId: String(product.maDongXe || product.dongXeId || product.vehicleModelId || product.modelId || ''),
        hangSXId: String(product.maHangSanXuat || product.manufacturerId || ''),
        moTaNgan: product.moTaNgan || product.shortDescription || '',
        giaGoc: product.giaGoc || product.basePrice || '',
        giaKhuyenMai: product.giaKhuyenMai || product.salePrice || '',
        soLuongTon: product.soLuongTon ?? product.stock ?? 0,
        anhChinhUrl: product.anhChinhUrl || product.mainImage || '',
        anhChinhFile: null,
        trangThai: product.trangThaiSanPham || product.trangThai || product.status || 'Available',
        noiBat: product.noiBat ?? product.NoiBat ?? false,
        hotDeal: product.hotDeal ?? product.HotDeal ?? false,
      });
    } else {
      setForm({
        maSP: '',
        tenSanPham: '',
        slug: '',
        loaiSP: lockedType || 'XeMay',
        danhMucId: '',
        hangXeId: '',
        dongXeId: '',
        hangSXId: '',
        moTaNgan: '',
        giaGoc: '',
        giaKhuyenMai: '',
        soLuongTon: '',
        anhChinhUrl: '',
        anhChinhFile: null,
        trangThai: 'Available',
        noiBat: false,
        hotDeal: false,
      });
    }
    setErrors({});
  }, [product, show, lockedType]);

  useEffect(() => {
    if (show && form.danhMucId && !isCategoryAllowed(form.danhMucId)) {
      setForm((prev) => ({ ...prev, danhMucId: '' }));
    }
  }, [show, form.loaiSP, form.danhMucId, filteredCategories]);

  useEffect(() => {
    if (form.loaiSP === 'PhuTung' && (form.hangXeId || form.dongXeId)) {
      setForm((prev) => ({ ...prev, hangXeId: '', dongXeId: '' }));
    }
  }, [form.loaiSP, form.hangXeId, form.dongXeId]);

  useEffect(() => {
    if (form.hangXeId && form.loaiSP === 'XeMay') {
      brandService.getModels(form.hangXeId)
        .then((res) => {
          const data = res.data;
          setModels(Array.isArray(data) ? data : data.items || data.data || []);
        })
        .catch(() => setModels([]));
    } else {
      setModels([]);
    }
  }, [form.hangXeId, form.loaiSP]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'tenSanPham') {
        updated.slug = generateSlug(value);
      }
      if (name === 'loaiSP') {
        updated.danhMucId = '';
        if (value === 'PhuTung') {
          updated.hangXeId = '';
          updated.dongXeId = '';
        } else {
          updated.hangSXId = '';
        }
      }
      if (name === 'hangXeId') {
        updated.dongXeId = '';
      }
      return updated;
    });
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: normalizeMoneyInput(value) }));
  };

  const validate = () => {
    const errs = {};
    if (!form.tenSanPham.trim()) errs.tenSanPham = 'Tên sản phẩm là bắt buộc';
    if (!form.giaGoc || Number(form.giaGoc) <= 0) errs.giaGoc = 'Giá gốc phải lớn hơn 0';
    if (!form.danhMucId) errs.danhMucId = 'Vui lòng chọn danh mục';
    if (form.danhMucId && !isCategoryAllowed(form.danhMucId)) {
      errs.danhMucId = 'Danh mục không thuộc loại sản phẩm đã chọn';
    }
    if (form.loaiSP === 'XeMay' && form.dongXeId && !form.hangXeId) {
      errs.hangXeId = 'Vui lòng chọn hãng xe trước dòng xe';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const mainImageFile = form.anhChinhFile;
      const payload = {
        maSanPhamKinhDoanh: form.maSP || undefined,
        tenSanPham: form.tenSanPham,
        slug: form.slug || undefined,
        loaiSanPham: form.loaiSP,
        maDanhMuc: form.danhMucId ? Number(form.danhMucId) : undefined,
        maHangXe: form.loaiSP === 'XeMay' && form.hangXeId ? Number(form.hangXeId) : null,
        maDongXe: form.loaiSP === 'XeMay' && form.dongXeId ? Number(form.dongXeId) : null,
        maHangSanXuat: form.loaiSP === 'PhuTung' && form.hangSXId ? Number(form.hangSXId) : null,
        moTaNgan: form.moTaNgan || undefined,
        giaGoc: Number(form.giaGoc) || 0,
        giaKhuyenMai: Number(form.giaKhuyenMai) || null,
        anhChinhUrl: mainImageFile ? undefined : form.anhChinhUrl || undefined,
        trangThaiSanPham: form.trangThai,
        noiBat: !!form.noiBat,
        hotDeal: !!form.hotDeal,
      };
      let productId = product?.maSanPham || product?.id;
      if (isEdit) {
        const res = await productService.update(product.maSanPham || product.id, payload);
        productId = res.data?.id || productId;
      } else {
        const res = await productService.create(payload);
        productId = res.data?.id || productId;
      }

      if (mainImageFile && productId) {
        const formData = new FormData();
        formData.append('file', mainImageFile);
        formData.append('isMain', 'true');
        await productService.uploadImage(productId, formData);
      }
      onSaved();
    } catch (err) {
      alert(isEdit ? 'Cập nhật sản phẩm thất bại!' : 'Thêm sản phẩm thất bại!');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const selectedType = PRODUCT_TYPE[form.loaiSP] || PRODUCT_TYPE.XeMay;
  const showVehicleFields = form.loaiSP === 'XeMay';

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Mã SP kinh doanh</label>
                    <input type="text" className="form-control" name="maSP" value={form.maSP} onChange={handleChange} placeholder="VD: SP001" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Tên sản phẩm <span className="text-danger">*</span></label>
                    <input type="text" className={`form-control ${errors.tenSanPham ? 'is-invalid' : ''}`} name="tenSanPham" value={form.tenSanPham} onChange={handleChange} />
                    {errors.tenSanPham && <div className="invalid-feedback">{errors.tenSanPham}</div>}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className={lockedType ? 'col-md-12' : 'col-md-6'}>
                  <div className="form-group">
                    <label>Slug</label>
                    <input type="text" className="form-control" name="slug" value={form.slug} onChange={handleChange} placeholder="Tự động tạo từ tên" />
                  </div>
                </div>
                {!lockedType && (
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Nhóm kinh doanh</label>
                      <select className="form-control" name="loaiSP" value={form.loaiSP} onChange={handleChange}>
                        <option value="XeMay">Xe máy</option>
                        <option value="PhuTung">Phụ tùng</option>
                      </select>
                      <small className="form-text text-muted">{selectedType.help}</small>
                    </div>
                  </div>
                )}
              </div>

              <div className="row">
                <div className={showVehicleFields ? 'col-md-4' : 'col-md-6'}>
                  <div className="form-group">
                    <label>Danh mục {selectedType.label.toLowerCase()} <span className="text-danger">*</span></label>
                    <select className={`form-control ${errors.danhMucId ? 'is-invalid' : ''}`} name="danhMucId" value={form.danhMucId} onChange={handleChange}>
                      <option value="">-- Chọn danh mục {selectedType.label.toLowerCase()} --</option>
                      {filteredCategories.map((category) => (
                        <option key={getCategoryId(category)} value={String(getCategoryId(category))}>
                          {getCategoryName(category)}
                        </option>
                      ))}
                    </select>
                    {filteredCategories.length === 0 && (
                      <small className="form-text text-danger">Chưa có danh mục con phù hợp cho nhóm này.</small>
                    )}
                    {errors.danhMucId && <div className="invalid-feedback">{errors.danhMucId}</div>}
                  </div>
                </div>
                {!showVehicleFields && (
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Hãng sản xuất</label>
                      <select className="form-control" name="hangSXId" value={form.hangSXId} onChange={handleChange}>
                        <option value="">-- Chọn hãng sản xuất --</option>
                        {manufacturers.map((manufacturer) => (
                          <option key={manufacturer.id} value={String(manufacturer.id)}>{manufacturer.ten || manufacturer.name}</option>
                        ))}
                      </select>
                      {manufacturers.length === 0 && (
                        <small className="form-text text-muted">Chưa có hãng sản xuất. Thêm tại mục "Hãng sản xuất phụ tùng".</small>
                      )}
                    </div>
                  </div>
                )}
                {showVehicleFields && (
                  <>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Hãng xe</label>
                        <select className={`form-control ${errors.hangXeId ? 'is-invalid' : ''}`} name="hangXeId" value={form.hangXeId} onChange={handleChange}>
                          <option value="">-- Chọn hãng --</option>
                          {brands.map((brand) => (
                            <option key={brand.maHangXe || brand.id} value={String(brand.maHangXe || brand.id)}>{brand.tenHang || brand.name}</option>
                          ))}
                        </select>
                        {errors.hangXeId && <div className="invalid-feedback">{errors.hangXeId}</div>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Dòng xe</label>
                        <select className="form-control" name="dongXeId" value={form.dongXeId} onChange={handleChange} disabled={!form.hangXeId}>
                          <option value="">-- Chọn dòng xe --</option>
                          {models.map((model) => (
                            <option key={model.maDongXe || model.id} value={String(model.maDongXe || model.id)}>{model.tenDongXe || model.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select className="form-control" name="trangThai" value={form.trangThai} onChange={handleChange}>
                      <option value="Available">Đang bán</option>
                      <option value="Inactive">Ngừng bán</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Hiển thị trang chủ</label>
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="productNoiBat"
                        checked={form.noiBat}
                        onChange={(e) => setForm((prev) => ({ ...prev, noiBat: e.target.checked }))}
                      />
                      <label className="custom-control-label" htmlFor="productNoiBat">Sản phẩm nổi bật</label>
                    </div>
                    <div className="custom-control custom-switch mt-1">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="productHotDeal"
                        checked={form.hotDeal}
                        onChange={(e) => setForm((prev) => ({ ...prev, hotDeal: e.target.checked }))}
                      />
                      <label className="custom-control-label" htmlFor="productHotDeal">Hot deal</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả ngắn</label>
                <textarea className="form-control" name="moTaNgan" value={form.moTaNgan} onChange={handleChange} rows="3" />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Giá gốc <span className="text-danger">*</span></label>
                    <input type="text" inputMode="numeric" className={`form-control ${errors.giaGoc ? 'is-invalid' : ''}`} name="giaGoc" value={formatMoneyInput(form.giaGoc)} onChange={handleMoneyChange} />
                    {errors.giaGoc && <div className="invalid-feedback">{errors.giaGoc}</div>}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Giá khuyến mại</label>
                    <input type="text" inputMode="numeric" className="form-control" name="giaKhuyenMai" value={formatMoneyInput(form.giaKhuyenMai)} onChange={handleMoneyChange} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Ảnh chính</label>
                <div className="custom-file">
                  <input
                    type="file"
                    className="custom-file-input"
                    id="mainImageFile"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setForm((prev) => ({ ...prev, anhChinhFile: file, anhChinhUrl: URL.createObjectURL(file) }));
                      }
                    }}
                  />
                  <label className="custom-file-label" htmlFor="mainImageFile">
                    {form.anhChinhFile ? form.anhChinhFile.name : 'Chọn ảnh từ máy tính...'}
                  </label>
                </div>
                {form.anhChinhUrl && (
                  <img src={form.anhChinhUrl} alt="Preview" className="mt-2 rounded border" style={{ maxHeight: 100, maxWidth: 150, objectFit: 'cover' }} />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm mr-1"></span>Đang lưu...</> : (isEdit ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
