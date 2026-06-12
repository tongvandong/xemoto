import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ProductFilters from '../components/ProductFilters.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useFavorite } from '../contexts/FavoriteContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null));
}

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeSlug(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function resolveCategoryAliases(value = '') {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return [];
  }

  const aliasGroups = [
    ['xe ga', 'xe tay ga', 'tay ga', 'scooter'],
    ['xe con tay', 'con tay', 'xe the thao', 'sport'],
    ['xe so', 'underbone'],
    ['xe phan khoi lon', 'phan khoi lon', 'pkl'],
    ['phu tung', 'phu kien', 'accessory', 'accessories'],
  ];

  const matchedGroup = aliasGroups.find((group) => group.some((item) => item === normalizedValue || item.includes(normalizedValue) || normalizedValue.includes(item)));
  return matchedGroup || [normalizedValue];
}

function findCategoryByValue(categories = [], value = '') {
  const aliases = resolveCategoryAliases(value);

  if (!aliases.length) {
    return null;
  }

  return categories.find((category) => {
    const candidates = [
      normalizeText(category?.name || ''),
      normalizeText(category?.slug || ''),
      normalizeSlug(category?.name || ''),
      normalizeSlug(category?.slug || ''),
    ].filter(Boolean);

    return aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      const slugAlias = normalizeSlug(alias);
      return candidates.some((candidate) => candidate === normalizedAlias || candidate === slugAlias || candidate.includes(normalizedAlias));
    });
  }) || null;
}

function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { notify } = useNotification();
  const [filters, setFilters] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryValues = useMemo(
    () => ({
      keyword: searchParams.get('keyword') || '',
      categoryId: searchParams.get('categoryId') || '',
      categorySlug: searchParams.get('categorySlug') || '',
      vehicleTypeCategoryId: searchParams.get('vehicleTypeCategoryId') || '',
      carModelId: searchParams.get('carModelId') || '',
      compatibleCarModelId: searchParams.get('compatibleCarModelId') || '',
      productType: searchParams.get('productType') || '',
      brandId: searchParams.get('brandId') || '',
      brandSlug: searchParams.get('brandSlug') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sortBy: searchParams.get('sortBy') || '',
      page: Number(searchParams.get('page') || 1),
      pageSize: 12,
    }),
    [searchParams],
  );

  const resolvedCategoryId = useMemo(() => {
    if (queryValues.categoryId) {
      return queryValues.categoryId;
    }

    if (!filters?.categories?.length) {
      return '';
    }

    if (queryValues.categorySlug) {
      return findCategoryByValue(filters.categories, queryValues.categorySlug)?.id || '';
    }

    if (queryValues.productType) {
      return findCategoryByValue(filters.categories, queryValues.productType)?.id || '';
    }

    return '';
  }, [filters?.categories, queryValues.categoryId, queryValues.categorySlug, queryValues.productType]);

  const resolvedBrandId = useMemo(() => {
    if (queryValues.brandId) {
      return queryValues.brandId;
    }

    if (!queryValues.brandSlug || !filters?.brands?.length) {
      return '';
    }

    const normalizedBrandSlug = normalizeSlug(queryValues.brandSlug);
    const matchedBrand = filters.brands.find((brand) => normalizeSlug(brand.name || '') === normalizedBrandSlug);

    return matchedBrand?.id || '';
  }, [filters?.brands, queryValues.brandId, queryValues.brandSlug]);

  const apiQueryValues = useMemo(() => {
    const nextValues = {
      ...queryValues,
      categoryId: queryValues.vehicleTypeCategoryId || resolvedCategoryId,
      brandId: resolvedBrandId,
      categorySlug: undefined,
      productType: undefined,
      brandSlug: undefined,
      vehicleTypeCategoryId: undefined,
    };

    return cleanParams(nextValues);
  }, [queryValues, resolvedCategoryId, resolvedBrandId]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [filtersResponse, productsResponse] = await Promise.all([
        productApi.getFilters(),
        productApi.getAll(apiQueryValues),
      ]);

      setFilters(filtersResponse);
      setProductsData(productsResponse);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiQueryValues]);

  function requireLogin() {
    if (!isAuthenticated) {
      notify('Vui lòng đăng nhập để thêm vào giỏ hàng', 'error');
      navigate('/login?redirect=/cart');
      return false;
    }

    return true;
  }

  async function addToCart(product) {
    if (!requireLogin()) {
      return;
    }

    const detail = await productApi.getById(product.id);
    if (detail.variants?.length) {
      notify('Vui lòng chọn phiên bản/màu sắc', 'error');
      navigate(`/products/${product.id}`);
      return;
    }

    try {
      await addItem({ productId: product.id, quantity: 1 });
      notify('Đã thêm vào giỏ hàng', 'success');
    } catch (err) {
      notify(err.message || 'Không thể thêm vào giỏ hàng', 'error');
    }
  }

  async function handleToggleFavorite(product) {
    if (!isAuthenticated) {
      notify('Vui lòng đăng nhập để thêm sản phẩm yêu thích', 'error');
      navigate('/login?redirect=/products');
      return;
    }

    try {
      const added = await toggleFavorite(product);
      notify(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', 'success');
    } catch (err) {
      notify(err.message || 'Không thể cập nhật yêu thích', 'error');
    }
  }

  function updateFilters(values) {
    setSearchParams(cleanParams(values));
  }

  const products = productsData?.items || [];
  const activeCategory = filters?.categories?.find((category) => String(category.id) === String(resolvedCategoryId));
  const activeVehicleType = filters?.categories?.find((category) => String(category.id) === String(queryValues.vehicleTypeCategoryId));
  const activeCarModel = filters?.carModels?.find((item) => String(item.id || item.Id || item.maDongXe || item.MaDongXe) === String(queryValues.carModelId));
  const activeCompatibleType = filters?.partCompatibleTypes?.find((item) => String(item.id) === String(queryValues.compatibleCarModelId));
  const activeBrand = filters?.brands?.find((brand) => String(brand.id) === String(resolvedBrandId));
  const pageTitle =
    activeVehicleType?.name ||
    (activeCarModel ? [activeBrand?.name || activeCarModel.brandName, activeCarModel.name || activeCarModel.tenDongXe || activeCarModel.TenDongXe].filter(Boolean).join(' - ') : '') ||
    (activeCompatibleType ? `Phụ tùng cho ${[activeCompatibleType.brandName, activeCompatibleType.name].filter(Boolean).join(' - ')}` : '') ||
    activeCategory?.name ||
    queryValues.productType ||
    activeBrand?.name ||
    'Tất cả sản phẩm';
  const breadcrumbItems = pageTitle === 'Tất cả sản phẩm'
    ? [{ label: 'Sản phẩm' }]
    : [{ label: 'Sản phẩm', to: '/products' }, { label: pageTitle }];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] py-10">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <ProductFilters
            filters={filters}
            values={{
              ...queryValues,
              categoryId: resolvedCategoryId || queryValues.categoryId,
              vehicleTypeCategoryId: queryValues.vehicleTypeCategoryId,
              carModelId: queryValues.carModelId,
              compatibleCarModelId: queryValues.compatibleCarModelId,
              brandId: resolvedBrandId || queryValues.brandId,
            }}
            onChange={updateFilters}
          />

          <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 rounded-[30px] border border-zinc-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:flex-row md:items-center md:justify-between md:px-7">
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Danh sách sản phẩm</div>
                <h2 className="mt-2 text-[28px] leading-tight font-black text-zinc-950">{pageTitle}</h2>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-4 py-2 font-semibold text-zinc-700">
                  {productsData?.totalCount || 0} sản phẩm
                </span>
                {queryValues.sortBy && (
                  <span className="inline-flex items-center rounded-full bg-[#d71920]/8 px-4 py-2 font-semibold text-[#d71920]">
                    Sắp xếp: {queryValues.sortBy}
                  </span>
                )}
              </div>
            </div>

            {loading && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="ui-skeleton aspect-square w-full" />
                    <div className="ui-skeleton mt-4 h-3 w-1/3" />
                    <div className="ui-skeleton mt-3 h-4 w-5/6" />
                    <div className="ui-skeleton mt-3 h-5 w-1/2" />
                    <div className="ui-skeleton mt-4 h-10 w-full !rounded-xl" />
                  </div>
                ))}
              </div>
            )}
            {error && <ErrorState message={error.message} onRetry={load} />}

            {!loading && !error && (
              <>
                <ProductGrid products={products} onAddToCart={addToCart} isFavorite={isFavorite} onToggleFavorite={handleToggleFavorite} />

                {productsData?.totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {Array.from({ length: productsData.totalPages }).map((_, index) => {
                      const page = index + 1;
                      const isActive = page === queryValues.page;

                      return (
                        <button
                          key={page}
                          type="button"
                          aria-current={isActive ? 'page' : undefined}
                          className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-4 text-sm font-bold transition active:scale-95 ${
                            isActive
                              ? 'bg-[#111111] text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]'
                              : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950 hover:bg-zinc-50 hover:text-zinc-950'
                          }`}
                          onClick={() => updateFilters({ ...queryValues, page })}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default ProductListPage;
