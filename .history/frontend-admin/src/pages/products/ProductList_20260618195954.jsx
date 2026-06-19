import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import brandService from '../../services/brandService';
import manufacturerService from '../../services/manufacturerService';
import { PRODUCT_STATUS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';
import ProductForm from './ProductForm';
import VariantManager from './VariantManager';
import ImageManager from './ImageManager';
import CompatibilityManager from './CompatibilityManager';
import ProductPromotionsModal from './ProductPromotionsModal';
import ProductRelatedManager from './ProductRelatedManager';
import ProductInventoryAgingModal from './ProductInventoryAgingModal';
import ProductBarcodeModal from './ProductBarcodeModal';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_CONFIG = {
  XeMay: {
    title: 'Quản lý xe máy',
    listTitle: 'Danh sách xe máy',
    addLabel: 'Thêm xe máy',
    emptyText: 'Không có xe máy nào.',
    searchPlaceholder: 'Tìm theo tên/mã xe...',
    categoryPlaceholder: '-- Danh mục xe máy --',
    brandPlaceholder: '-- Hãng xe --',
    nameHeader: 'Tên xe',
    codeHeader: 'Mã xe',
    showBrand: true,
    showVariants: true,
    showCompatibility: false,
    showManufacturer: false,
    rootNames: ['xe máy', 'xe may'],
  },
  PhuTung: {
    title: 'Quản lý phụ tùng',
    listTitle: 'Danh sách phụ tùng',
    addLabel: 'Thêm phụ tùng',
    emptyText: 'Không có phụ tùng nào.',
    searchPlaceholder: 'Tìm theo tên/mã phụ tùng/SKU...',
    categoryPlaceholder: '-- Danh mục phụ tùng --',
    brandPlaceholder: '-- Hãng tương thích --',
    nameHeader: 'Tên phụ tùng',
    codeHeader: 'Mã phụ tùng',
    showBrand: false,
    showVariants: true,
    showCompatibility: true,
    showManufacturer: true,
    rootNames: ['phụ tùng', 'phu tung', 'phụ kiện', 'phu kien'],
  },
};

const getCategoryId = (category) => category.maDanhMuc || category.id;
const getCategoryName = (category) => category.tenDanhMuc || category.name || '';
const getParentCategoryId = (category) => category.maDanhMucCha ?? category.parentId ?? category.parentCategoryId ?? category.danhMucChaId ?? null;
const SHOW_RELATED_PRODUCTS_ACTION = false; // Doi thanh true de bat lai nut "Phu kien / san pham ban kem".
const SHOW_INVENTORY_AGING_ACTION = false; // Doi thanh true de bat lai nut "Tuoi ton kho".
const SHOW_PRICE_RANGE_FILTER = false; // Doi thanh true de bat lai 2 o loc "Gia tu" va "Gia den".
const SORT_FIELD_VISIBILITY = {
  newest: false,
  code: false,
  name: false,
  category: false,
  brand: false,
  manufacturer: false,
  listPrice: false,
  salePrice: false,
  stock: false,
  status: false,
}; // Doi field can sap xep sang true de bat lai rieng field do.
const isSortFieldEnabled = (field) => Boolean(SORT_FIELD_VISIBILITY[field]);
const hasVisibleSortFields = Object.values(SORT_FIELD_VISIBILITY).some(Boolean);
const DEFAULT_SORT_BY = Object.entries(SORT_FIELD_VISIBILITY).find(([, visible]) => visible)?.[0] || 'newest';
const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const getSalePrice = (product) => {
  const value = product.giaKhuyenMai ?? product.salePrice;
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return numberValue > 0 ? numberValue : null;
};

const formatSalePrice = (product) => {
  const salePrice = getSalePrice(product);
  return salePrice === null ? 'Không' : formatCurrency(salePrice);
};

const ProductList = ({ productType = 'XeMay' }) => {
  const { isAdmin } = useAuth();
  const config = PAGE_CONFIG[productType] || PAGE_CONFIG.XeMay;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterPromotion, setFilterPromotion] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortDescending, setSortDescending] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showVariants, setShowVariants] = useState(null);
  const [showImages, setShowImages] = useState(null);
  const [showCompatibility, setShowCompatibility] = useState(null);
  const [showPromotions, setShowPromotions] = useState(null);
  const [showRelated, setShowRelated] = useState(null);
  const [showAging, setShowAging] = useState(null);
  const [showBarcodes, setShowBarcodes] = useState(null);

  const getProductId = (product) => product.maSanPham || product.id;

  const getProductCategoryName = useCallback((product) => {
    const category = categories.find((item) => String(getCategoryId(item)) === String(product.maDanhMuc ?? product.categoryId));
    return category?.tenDanhMuc || category?.name || '';
  }, [categories]);

  const getProductBrandName = useCallback((product) => {
    const brand = brands.find((item) => String(item.maHangXe || item.id) === String(product.maHangXe ?? product.brandId));
    return brand?.tenHang || brand?.name || '';
  }, [brands]);

  const getProductManufacturerName = useCallback((product) => (
    product.tenHangSanXuat
    || manufacturers.find((item) => String(item.id) === String(product.maHangSanXuat ?? product.manufacturerId))?.ten
    || ''
  ), [manufacturers]);

  const getSortValue = useCallback((product) => {
    if (sortBy === 'code') return product.maSanPhamKinhDoanh || product.maSP || product.sku || product.id || '';
    if (sortBy === 'name') return product.tenSanPham || product.name || '';
    if (sortBy === 'category') return getProductCategoryName(product);
    if (sortBy === 'brand') return getProductBrandName(product);
    if (sortBy === 'manufacturer') return getProductManufacturerName(product);
    if (sortBy === 'listPrice') return Number(product.giaGoc ?? product.basePrice ?? product.listPrice ?? 0);
    if (sortBy === 'salePrice') return Number(getSalePrice(product) ?? 0);
    if (sortBy === 'stock') return Number(product.soLuongTon ?? product.stock ?? 0);
    if (sortBy === 'status') return product.trangThaiSanPham || product.trangThai || product.status || '';
    return Number(product.id ?? product.maSanPham ?? 0);
  }, [sortBy, getProductCategoryName, getProductBrandName, getProductManufacturerName]);

  const displayProducts = useMemo(() => {
    const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

    return [...products].sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);

      let result;
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        result = leftValue - rightValue;
      } else {
        result = collator.compare(String(leftValue), String(rightValue));
      }

      return sortDescending ? -result : result;
    });
  }, [products, getSortValue, sortDescending]);

  const filteredCategories = useMemo(() => {
    const byParent = new Map();
    categories.forEach((category) => {
      const parentId = getParentCategoryId(category);
      const key = parentId == null ? 'root' : Number(parentId);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(category);
    });

    const root = categories.find((category) => {
      const isRoot = getParentCategoryId(category) == null;
      const name = normalizeText(getCategoryName(category));
      return isRoot && config.rootNames.some((rootName) => name === normalizeText(rootName));
    });

    if (!root) {
      return categories.filter((category) => getParentCategoryId(category) != null);
    }

    const rootId = Number(getCategoryId(root));
    const allowedIds = new Set();
    const visit = (parentId) => {
      (byParent.get(Number(parentId)) || []).forEach((child) => {
        const childId = Number(getCategoryId(child));
        allowedIds.add(childId);
        visit(childId);
      });
    };
    visit(rootId);
    if (allowedIds.size === 0) allowedIds.add(rootId);
    return categories.filter((category) => allowedIds.has(Number(getCategoryId(category))));
  }, [categories, config.rootNames]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        pageSize,
        loaiSanPham: productType,
        keyword: search || undefined,
        maDanhMuc: filterCategory || undefined,
        maHangXe: config.showBrand ? filterBrand || undefined : undefined,
        trangThaiSanPham: filterStatus || undefined,
        all: filterStatus ? undefined : true, // không lọc trạng thái -> admin xem tất cả (kể cả Ngừng bán)
        stockStatus: filterStockStatus || undefined,
        hasPromotion: filterPromotion === '' ? undefined : filterPromotion === 'true',
        minPrice: SHOW_PRICE_RANGE_FILTER && minPrice !== '' ? Number(minPrice) : undefined,
        maxPrice: SHOW_PRICE_RANGE_FILTER && maxPrice !== '' ? Number(maxPrice) : undefined,
        sortBy,
        sortDescending,
      };
      const res = await productService.getAll(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setProducts(data);
        setTotalPages(1);
        setTotalItems(data.length);
      } else {
        setProducts(data.items || data.data || []);
        setTotalPages(data.totalPages || Math.ceil((data.totalItems || 0) / pageSize) || 1);
        setTotalItems(data.totalItems || data.total || data.totalCount || 0);
      }
    } catch (err) {
      setError(`Không thể tải ${productType === 'XeMay' ? 'danh sách xe máy' : 'danh sách phụ tùng'}.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterBrand, filterStatus, filterStockStatus, filterPromotion, minPrice, maxPrice, sortBy, sortDescending, productType, config.showBrand]);

  const fetchFilters = async () => {
    try {
      const [catRes, brandRes, manuRes] = await Promise.allSettled([
        categoryService.getAll(),
        brandService.getAll(),
        manufacturerService.getAll(),
      ]);
      if (catRes.status === 'fulfilled') {
        const data = catRes.value.data;
        setCategories(Array.isArray(data) ? data : data.items || data.data || []);
      }
      if (brandRes.status === 'fulfilled') {
        const data = brandRes.value.data;
        setBrands(Array.isArray(data) ? data : data.items || data.data || []);
      }
      if (manuRes.status === 'fulfilled') {
        const data = manuRes.value.data;
        setManufacturers(Array.isArray(data) ? data : data.items || data.data || []);
      }
    } catch (err) {
      console.error('Lỗi tải bộ lọc:', err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    setPage(1);
    setFilterCategory('');
    setFilterBrand('');
    setFilterStatus('');
    setFilterStockStatus('');
    setFilterPromotion('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy(DEFAULT_SORT_BY);
    setSortDescending(true);
    setSearch('');
    setEditProduct(null);
    setShowForm(false);
    setShowVariants(null);
    setShowImages(null);
    setShowCompatibility(null);
    setShowPromotions(null);
    setShowRelated(null);
    setShowAging(null);
    setShowBarcodes(null);
  }, [productType]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id, name) => {
    const itemName = productType === 'XeMay' ? 'xe máy' : 'phụ tùng';
    if (!window.confirm(`Bạn có chắc muốn xóa ${itemName} "${name}"?`)) return;
    try {
      await productService.delete(id);
      fetchProducts();
    } catch (err) {
      alert(`Xóa ${itemName} thất bại!`);
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const exportProducts = async () => {
    try {
      const response = await productService.getAll({
        page: 1,
        pageSize: Math.max(totalItems || 0, 500),
        loaiSanPham: productType,
        keyword: search || undefined,
        maDanhMuc: filterCategory || undefined,
        maHangXe: config.showBrand ? filterBrand || undefined : undefined,
        trangThaiSanPham: filterStatus || undefined,
        all: filterStatus ? undefined : true, // không lọc trạng thái -> admin xem tất cả (kể cả Ngừng bán)
        stockStatus: filterStockStatus || undefined,
        hasPromotion: filterPromotion === '' ? undefined : filterPromotion === 'true',
        minPrice: SHOW_PRICE_RANGE_FILTER && minPrice !== '' ? Number(minPrice) : undefined,
        maxPrice: SHOW_PRICE_RANGE_FILTER && maxPrice !== '' ? Number(maxPrice) : undefined,
        sortBy,
        sortDescending,
      });
      const allProducts = response.data.items || response.data.data || response.data || [];
      const rows = allProducts.map((product) => {
        const category = categories.find((item) => String(getCategoryId(item)) === String(product.maDanhMuc ?? product.categoryId));
        const brand = brands.find((item) => String(item.maHangXe || item.id) === String(product.maHangXe ?? product.brandId));
        const manufacturerName = product.tenHangSanXuat
          || manufacturers.find((item) => String(item.id) === String(product.maHangSanXuat ?? product.manufacturerId))?.ten
          || '';
        const statusKey = product.trangThaiSanPham || product.trangThai || product.status;
        const status = PRODUCT_STATUS[statusKey] || { label: statusKey || '' };
        return {
          code: product.maSanPhamKinhDoanh || product.code || product.id,
          name: product.tenSanPham || product.name,
          category: category?.tenDanhMuc || category?.name || '',
          brand: brand?.tenHang || brand?.name || '',
          manufacturer: manufacturerName,
          listPrice: product.giaGoc ?? product.listPrice ?? 0,
          salePrice: getSalePrice(product),
          stock: product.soLuongTon ?? product.stock ?? 0,
          status: status.label,
        };
      });
      await exportWorkbook({
        fileName: `${productType === 'XeMay' ? 'xe-may' : 'phu-tung'}-${createDateStamp()}.xlsx`,
        sheets: [{
          name: productType === 'XeMay' ? 'Xe máy' : 'Phụ tùng',
          columns: [
            { header: 'Mã sản phẩm', key: 'code', width: 18 },
            { header: 'Tên sản phẩm', key: 'name', width: 32 },
            { header: 'Danh mục', key: 'category', width: 24 },
            ...(config.showBrand ? [{ header: 'Hãng xe', key: 'brand', width: 20 }] : []),
            ...(config.showManufacturer ? [{ header: 'Hãng SX', key: 'manufacturer', width: 20 }] : []),
            { header: 'Giá niêm yết', key: 'listPrice', type: 'currency', width: 16 },
            { header: 'Giá khuyến mại', key: 'salePrice', type: 'currency', width: 16 },
            { header: 'Tồn kho', key: 'stock', type: 'number', width: 12 },
            { header: 'Trạng thái', key: 'status', width: 16 },
          ],
          rows,
        }],
      });
    } catch (err) {
      alert('Xuất Excel thất bại.');
      console.error(err);
    }
  };

  const openAdd = () => {
    setEditProduct(null);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const changeSort = (field) => {
    if (!isSortFieldEnabled(field)) return;

    if (sortBy === field) {
      setSortDescending(!sortDescending);
    } else {
      setSortBy(field);
      setSortDescending(false);
    }

    setPage(1);
  };

  const sortIconClass = (field) => {
    if (sortBy !== field) return 'fas fa-sort text-muted ml-1';
    return sortDescending ? 'fas fa-sort-down ml-1' : 'fas fa-sort-up ml-1';
  };

  const renderSortHeader = (field, label, className) => (
    <th className={className}>
      {isSortFieldEnabled(field) ? (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 font-weight-bold text-dark text-decoration-none"
          onClick={() => changeSort(field)}
          title={`Sắp xếp theo ${label}`}
        >
          {label}
          <i className={sortIconClass(field)}></i>
        </button>
      ) : label}
    </th>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <nav>
        <ul className="pagination pagination-sm m-0 float-right">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(page - 1)}>«</button>
          </li>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <li key={pageNumber} className={`page-item ${pageNumber === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setPage(pageNumber)}>{pageNumber}</button>
            </li>
          ))}
          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(page + 1)}>»</button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{config.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
              <div className="card-header">
                <h3 className="card-title">{config.listTitle}</h3>
                <div className="card-tools">
                <Link className="btn btn-outline-success btn-sm mr-2" to="/operational-imports">
                  <i className="fas fa-file-import"></i> Nhập nhanh/XLSX
                </Link>
                <button className="btn btn-outline-primary btn-sm mr-2" onClick={exportProducts}>
                  <i className="fas fa-file-export"></i> Xuất Excel
                </button>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> {config.addLabel}
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearch} className="row mb-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={config.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select className="form-control form-control-sm" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
                    <option value="">{config.categoryPlaceholder}</option>
                    {filteredCategories.map((category) => (
                      <option key={getCategoryId(category)} value={getCategoryId(category)}>{getCategoryName(category)}</option>
                    ))}
                  </select>
                </div>
                {config.showBrand && (
                  <div className="col-md-2">
                    <select className="form-control form-control-sm" value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setPage(1); }}>
                      <option value="">{config.brandPlaceholder}</option>
                      {brands.map((brand) => (
                        <option key={brand.maHangXe || brand.id} value={brand.maHangXe || brand.id}>{brand.tenHang || brand.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-md-2">
                  <select className="form-control form-control-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                    <option value="">-- Trạng thái --</option>
                    {Object.entries(PRODUCT_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-info btn-sm btn-block">
                    <i className="fas fa-search"></i> Tìm
                  </button>
                </div>
                <div className="col-md-12 mt-2">
                  <div className="row">
                    {SHOW_PRICE_RANGE_FILTER && (
                      <>
                    <div className="col-md-2">
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        placeholder="Giá từ"
                        value={minPrice}
                        onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-sm"
                        placeholder="Giá đến"
                        value={maxPrice}
                        onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                      />
                    </div>
                      </>
                    )}
                    <div className="col-md-2">
                      <select className="form-control form-control-sm" value={filterStockStatus} onChange={(e) => { setFilterStockStatus(e.target.value); setPage(1); }}>
                        <option value="">-- Tồn kho --</option>
                        <option value="InStock">Còn hàng</option>
                        <option value="LowStock">Sắp hết hàng</option>
                        <option value="OutOfStock">Hết hàng</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select className="form-control form-control-sm" value={filterPromotion} onChange={(e) => { setFilterPromotion(e.target.value); setPage(1); }}>
                        <option value="">-- Khuyến mại --</option>
                        <option value="true">Có khuyến mại</option>
                        <option value="false">Không có khuyến mại</option>
                      </select>
                    </div>
                    {hasVisibleSortFields && (
                      <>
                        <div className="col-md-2">
                          <select className="form-control form-control-sm" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                            {isSortFieldEnabled('newest') && <option value="newest">Sắp xếp: Mới nhất</option>}
                            {isSortFieldEnabled('code') && <option value="code">Mã sản phẩm</option>}
                            {isSortFieldEnabled('name') && <option value="name">Tên sản phẩm</option>}
                            {isSortFieldEnabled('category') && <option value="category">Danh mục</option>}
                            {config.showBrand && isSortFieldEnabled('brand') && <option value="brand">Hãng xe</option>}
                            {config.showManufacturer && isSortFieldEnabled('manufacturer') && <option value="manufacturer">Hãng SX</option>}
                            {isSortFieldEnabled('listPrice') && <option value="listPrice">Giá gốc</option>}
                            {isSortFieldEnabled('salePrice') && <option value="salePrice">Giá KM</option>}
                            {isSortFieldEnabled('stock') && <option value="stock">Tồn kho</option>}
                            {isSortFieldEnabled('status') && <option value="status">Trạng thái</option>}
                          </select>
                        </div>
                        <div className="col-md-2">
                          <select className="form-control form-control-sm" value={sortDescending ? 'desc' : 'asc'} onChange={(e) => { setSortDescending(e.target.value === 'desc'); setPage(1); }}>
                            <option value="asc">Tăng dần</option>
                            <option value="desc">Giảm dần</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </form>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : displayProducts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-box-open fa-2x mb-2"></i>
                  <p>{config.emptyText}</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          {renderSortHeader('code', config.codeHeader, 'table-col-code')}
                          {renderSortHeader('name', config.nameHeader, 'table-col-text')}
                          {renderSortHeader('category', 'Danh mục', 'table-col-text')}
                          {config.showBrand && renderSortHeader('brand', 'Hãng xe', 'table-col-text')}
                          {config.showManufacturer && renderSortHeader('manufacturer', 'Hãng SX', 'table-col-text')}
                          {renderSortHeader('listPrice', 'Giá gốc', 'table-col-money')}
                          {renderSortHeader('salePrice', 'Giá KM', 'table-col-money')}
                          {renderSortHeader('stock', 'Tồn kho', 'table-col-number')}
                          {renderSortHeader('status', 'Trạng thái', 'table-col-status')}
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayProducts.map((product) => {
                          const statusKey = product.trangThaiSanPham || product.trangThai || product.status;
                          const status = PRODUCT_STATUS[statusKey] || { label: statusKey || 'N/A', color: 'secondary' };
                          const category = categories.find((item) => String(getCategoryId(item)) === String(product.maDanhMuc ?? product.categoryId));
                          const brand = brands.find((item) => String(item.maHangXe || item.id) === String(product.maHangXe ?? product.brandId));
                          const manufacturerName = product.tenHangSanXuat
                            || manufacturers.find((item) => String(item.id) === String(product.maHangSanXuat ?? product.manufacturerId))?.ten
                            || '';
                          return (
                            <tr key={getProductId(product)}>
                              <td className="table-col-code">{product.maSanPhamKinhDoanh || product.maSP || product.sku || product.id}</td>
                              <td className="table-col-text">{product.tenSanPham || product.name}</td>
                              <td className="table-col-text">{category?.tenDanhMuc || category?.name || ''}</td>
                              {config.showBrand && <td className="table-col-text">{brand?.tenHang || brand?.name || ''}</td>}
                              {config.showManufacturer && <td className="table-col-text">{manufacturerName}</td>}
                              <td className="table-col-money">{formatCurrency(product.giaGoc ?? product.basePrice ?? 0)}</td>
                              <td className="table-col-money">{formatSalePrice(product)}</td>
                              <td className="table-col-number">{product.soLuongTon ?? product.stock ?? 0}</td>
                              <td className="table-col-status"><span className={`badge badge-${status.color}`}>{status.label}</span></td>
                              <td className="table-col-actions">
                                <button type="button" className="btn btn-xs btn-info mr-1" title="Sửa" onClick={() => openEdit(product)}>
                                  <i className="fas fa-edit"></i>
                                </button>
                                {config.showVariants && (
                                  <button type="button" className="btn btn-xs btn-warning mr-1" title={productType === 'PhuTung' ? 'SKU / quy cách' : 'Biến thể'} onClick={() => setShowVariants(getProductId(product))}>
                                    <i className="fas fa-layer-group"></i>
                                  </button>
                                )}
                                {config.showCompatibility && (
                                  <button type="button" className="btn btn-xs btn-warning mr-1" title="Tương thích xe" onClick={() => setShowCompatibility(product)}>
                                    <i className="fas fa-link"></i>
                                  </button>
                                )}
                                <button type="button" className="btn btn-xs btn-success mr-1" title="Ảnh" onClick={() => setShowImages(getProductId(product))}>
                                  <i className="fas fa-images"></i>
                                </button>
                                <button type="button" className="btn btn-xs btn-primary mr-1" title="In mã vạch" onClick={() => setShowBarcodes(product)}>
                                  <i className="fas fa-barcode"></i>
                                </button>
                                <button type="button" className="btn btn-xs btn-secondary mr-1" title="Khuyến mại áp dụng" onClick={() => setShowPromotions(product)}>
                                  <i className="fas fa-tags"></i>
                                </button>
                                {SHOW_RELATED_PRODUCTS_ACTION && (
                                  <button type="button" className="btn btn-xs btn-dark mr-1" title="Phụ kiện / sản phẩm bán kèm" onClick={() => setShowRelated(product)}>
                                    <i className="fas fa-project-diagram"></i>
                                  </button>
                                )}
                                {SHOW_INVENTORY_AGING_ACTION && (
                                  <button type="button" className="btn btn-xs btn-outline-danger mr-1" title="Tuổi tồn kho" onClick={() => setShowAging(product)}>
                                    <i className="fas fa-hourglass-half"></i>
                                  </button>
                                )}
                                {isAdmin() && (
                                  <button type="button" className="btn btn-xs btn-danger" title="Xóa" onClick={() => handleDelete(getProductId(product), product.tenSanPham || product.name)}>
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

                  <div className="row mt-3">
                    <div className="col-sm-6">
                      <span className="text-muted">Hiển thị {displayProducts.length} / {totalItems} {productType === 'XeMay' ? 'xe máy' : 'phụ tùng'}</span>
                    </div>
                    <div className="col-sm-6">
                      {renderPagination()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <ProductForm
          show={showForm}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchProducts(); }}
          product={editProduct}
          categories={categories}
          brands={brands}
          manufacturers={manufacturers}
          fixedProductType={productType}
        />
      )}

      {showVariants && (
        <VariantManager
          productId={showVariants}
          productType={productType}
          onClose={() => setShowVariants(null)}
        />
      )}

      {showImages && (
        <ImageManager
          productId={showImages}
          onClose={() => { setShowImages(null); fetchProducts(); }}
        />
      )}

      {showCompatibility && (
        <CompatibilityManager
          product={showCompatibility}
          onClose={() => setShowCompatibility(null)}
        />
      )}

      {showPromotions && (
        <ProductPromotionsModal
          product={showPromotions}
          onClose={() => setShowPromotions(null)}
        />
      )}

      {showRelated && (
        <ProductRelatedManager
          product={showRelated}
          onClose={() => setShowRelated(null)}
        />
      )}

      {showAging && (
        <ProductInventoryAgingModal
          product={showAging}
          onClose={() => setShowAging(null)}
        />
      )}

      {showBarcodes && (
        <ProductBarcodeModal
          product={showBarcodes}
          onClose={() => setShowBarcodes(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
