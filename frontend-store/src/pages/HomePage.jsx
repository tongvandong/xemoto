import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { categoryApi, contentApi, orderApi, productApi } from '../services/api.js';
import { brandAssets, homeCategoryReferences, serviceHighlights } from '../assets/siteData.js';
import CategoryMenu from '../components/CategoryMenu.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useFavorite } from '../contexts/FavoriteContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoryKindOf(category) {
  return Number(category?.kind ?? category?.Kind ?? category?.productType ?? category?.ProductType ?? 0);
}

function categoryParentIdOf(category) {
  return category?.parentCategoryId ?? category?.parentId ?? category?.ParentId ?? null;
}

function categoryMatchesReference(category, reference) {
  const candidate = normalizeText(`${category?.name || ''} ${category?.slug || ''}`);
  const sameKind = !reference.kind || categoryKindOf(category) === Number(reference.kind);
  return sameKind && reference.match.some((keyword) => candidate.includes(normalizeText(keyword)));
}

function formatFeaturedCategory(category, reference) {
  return {
    ...category,
    image: category?.image || reference?.image,
    to: category?.id ? `/products?categoryId=${category.id}` : reference?.to,
  };
}

function fillBalancedCategories(categories, selected, limit = 4) {
  const selectedIds = new Set(selected.map((category) => category.id));
  const candidates = categories.filter((category) => {
    if (!category?.id || selectedIds.has(category.id)) {
      return false;
    }

    return categoryParentIdOf(category) != null || selected.length === 0;
  });
  const motorcycles = candidates.filter((category) => categoryKindOf(category) === 1);
  const parts = candidates.filter((category) => categoryKindOf(category) === 2);
  const maxRows = Math.max(motorcycles.length, parts.length);

  for (let index = 0; index < maxRows && selected.length < limit; index += 1) {
    for (const category of [motorcycles[index], parts[index]]) {
      if (category && !selectedIds.has(category.id) && selected.length < limit) {
        selected.push(formatFeaturedCategory(category));
        selectedIds.add(category.id);
      }
    }
  }

  for (const category of candidates) {
    if (selected.length >= limit) {
      break;
    }

    if (!selectedIds.has(category.id)) {
      selected.push(formatFeaturedCategory(category));
      selectedIds.add(category.id);
    }
  }

  return selected;
}

function buildFeaturedCategories(categories) {
  const selected = [];
  const selectedIds = new Set();

  for (const reference of homeCategoryReferences) {
    const category = categories.find((item) => !selectedIds.has(item.id) && categoryMatchesReference(item, reference));
    if (category) {
      selected.push(formatFeaturedCategory(category, reference));
      selectedIds.add(category.id);
    }
  }

  fillBalancedCategories(categories, selected);

  return selected.length ? selected.slice(0, 4) : homeCategoryReferences.map((reference) => ({ ...reference }));
}

function productKindOf(product) {
  return Number(product?.kind ?? product?.Kind ?? product?.productType ?? product?.ProductType ?? 0);
}

function pickBalancedProducts(items, limit = 4) {
  if (!Array.isArray(items) || items.length <= limit) {
    return Array.isArray(items) ? items.slice(0, limit) : [];
  }

  const motorcycles = items.filter((product) => productKindOf(product) === 1);
  const parts = items.filter((product) => productKindOf(product) === 2);
  if (!motorcycles.length || !parts.length) {
    return items.slice(0, limit);
  }

  const selected = [];
  const selectedIds = new Set();
  const maxRows = Math.max(motorcycles.length, parts.length);

  for (let index = 0; index < maxRows && selected.length < limit; index += 1) {
    for (const product of [motorcycles[index], parts[index]]) {
      if (product && !selectedIds.has(product.id) && selected.length < limit) {
        selected.push(product);
        selectedIds.add(product.id);
      }
    }
  }

  for (const product of items) {
    if (selected.length >= limit) break;
    if (!selectedIds.has(product.id)) {
      selected.push(product);
      selectedIds.add(product.id);
    }
  }

  return selected;
}

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeService, setActiveService] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [featuredList, setFeaturedList] = useState([]);
  const [dealList, setDealList] = useState([]);
  const [banners, setBanners] = useState([]);

  async function loadHomeData() {
    setLoading(true);
    setError(null);

    try {
      const tasks = [
        productApi.getProducts({ page: 1, pageSize: 12 }),
        categoryApi.getAll().then((res) => res.data),
        productApi.getProducts({ page: 1, pageSize: 8, IsFeatured: true }).then((res) => res.items).catch(() => []),
        productApi.getProducts({ page: 1, pageSize: 12, IsHotDeal: true }).then((res) => res.items).catch(() => []),
        contentApi.getHomeBanners().catch(() => []),
      ];

      if (isAuthenticated) {
        tasks.push(orderApi.getMyOrders().catch(() => []));
      }

      const results = await Promise.all(tasks);
      const productsResponse = results[0];
      const categoriesResponse = results[1];
      const featuredResponse = results[2];
      const dealResponse = results[3];
      const bannersResponse = results[4];
      const ordersResponse = results.length > 5 ? results[5] : [];

      setProducts(productsResponse.items);
      setCategories(categoriesResponse.filter((category) => category.isActive));
      setFeaturedList(Array.isArray(featuredResponse) ? featuredResponse : []);
      setDealList(Array.isArray(dealResponse) ? dealResponse : []);
      setBanners(Array.isArray(bannersResponse) ? bannersResponse : []);

      if (Array.isArray(ordersResponse)) {
        setPendingOrders(
          ordersResponse.filter(
            (order) =>
              order.orderType === 'Deposit' &&
              ['DepositPaid', 'PartiallyPaid'].includes(order.paymentStatus) &&
              order.remainingAmount > 0 &&
              order.orderStatus !== 'Cancelled',
          ),
        );
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHomeData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector(location.hash);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

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

    const detail = await productApi.getProductById(product.id);
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
      navigate('/login?redirect=/');
      return;
    }

    try {
      const added = await toggleFavorite(product);
      notify(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', 'success');
    } catch (err) {
      notify(err.message || 'Không thể cập nhật yêu thích', 'error');
    }
  }

  function renderProductsBlock(items, emptyMessage) {
    if (loading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState message={error.message} onRetry={loadHomeData} />;
    }

    return (
      <ProductGrid
        products={items}
        onAddToCart={addToCart}
        emptyMessage={emptyMessage}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  const featuredCategories = useMemo(() => buildFeaturedCategories(categories), [categories]);
  const bannerByPosition = useMemo(() => {
    const map = {};
    [...banners]
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .forEach((banner) => {
        if (banner.position && !map[banner.position] && banner.imageUrl) {
          map[banner.position] = banner;
        }
      });
    return map;
  }, [banners]);
  const featuredProducts = useMemo(
    () => (featuredList.length ? featuredList : products).slice(0, 4),
    [featuredList, products],
  );
  const dealProducts = useMemo(() => {
    if (dealList.length) {
      return pickBalancedProducts(dealList, 4);
    }
    const discounted = products.filter((product) => Number(product.salePrice) > 0 && product.salePrice < product.basePrice);
    return pickBalancedProducts(discounted.length ? discounted : products, 4);
  }, [dealList, products]);
  const bestSellerProducts = useMemo(() => {
    const nextProducts = products.slice(4, 8);
    return (nextProducts.length ? nextProducts : products.slice(0, 4)).slice(0, 4);
  }, [products]);
  const activeServiceItem = serviceHighlights[activeService] || serviceHighlights[0];

  return (
    <>
      {pendingOrders.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <FiAlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <span>
                Bạn có {pendingOrders.length} đơn hàng đã đặt cọc và còn số tiền cần thanh toán.
              </span>
            </div>
            <Link
              to={`/orders/${pendingOrders[0].id}`}
              className="whitespace-nowrap rounded-full bg-[#d71920] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
            >
              Thanh toán phần còn lại
            </Link>
          </div>
        </div>
      )}

      <section id="trang-chu" className="scroll-mt-32 bg-[#101010]">
        <Link to={bannerByPosition.Slider?.link || '/products'}>
          <img src={bannerByPosition.Slider?.imageUrl || brandAssets.slider} alt={bannerByPosition.Slider?.title || 'EURO Moto'} className="h-auto max-h-[560px] w-full object-cover" />
        </Link>
      </section>

      <section id="danh-muc-noi-bat" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <SectionTitle title="Danh mục nổi bật" center className="mb-7" />
          {loading ? <LoadingState /> : <CategoryMenu categories={featuredCategories} />}
        </div>
      </section>

      <section id="deal-noi-bat" className="scroll-mt-32 bg-zinc-50 px-4 py-10 sm:py-12">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-3">
            <SectionTitle title="Deal nổi bật" center className="mb-0" />
            <img src={brandAssets.hotIcon} alt="Hot deal" className="h-7 w-7 object-contain" />
          </div>
          <div className="inline-flex min-h-11 items-center gap-3 rounded-full bg-gradient-to-r from-[#d71920] to-[#171717] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white">
            <span><strong className="text-[13px]"> Giá tốt mỗi ngày</strong></span>
          </div>
          <div className="w-full">{renderProductsBlock(dealProducts, 'Chưa có deal nổi bật.')}</div>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-5 md:grid-cols-2">
          <img src={bannerByPosition.BannerLeft?.imageUrl || brandAssets.bannerOne} alt={bannerByPosition.BannerLeft?.title || 'Ưu đãi xe máy'} className="w-full rounded-2xl object-cover" />
          <img src={bannerByPosition.BannerRight?.imageUrl || brandAssets.bannerTwo} alt={bannerByPosition.BannerRight?.title || 'Ưu đãi phụ tùng'} className="w-full rounded-2xl object-cover" />
        </div>
      </section>

      <section id="san-pham-noi-bat" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-7 xl:grid-cols-[33%_1fr]">
          <div>
            <img src={bannerByPosition.ProductBanner?.imageUrl || brandAssets.productBanner} alt={bannerByPosition.ProductBanner?.title || 'Sản phẩm nổi bật'} className="w-full rounded-2xl object-cover" />
          </div>

          <div className="space-y-6">
            <SectionTitle
              kicker="EURO Moto"
              title="Sản phẩm nổi bật"
              action={
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-red-200"
                  to="/products"
                >
                  Xem tất cả
                </Link>
              }
            />
            {renderProductsBlock(featuredProducts, 'Chưa có sản phẩm nổi bật.')}
          </div>
        </div>
      </section>

      <section id="dich-vu-noi-bat" className="scroll-mt-32 bg-gradient-to-b from-[#111111] to-[#1f1f1f] px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-7 xl:grid-cols-[420px_1fr]">
          <div className="text-white">
            <SectionTitle kicker="Hỗ trợ" title="Dịch vụ nổi bật" className="mb-6 [&_h2]:text-white [&_span]:text-rose-200" />
            <p className="mb-6 text-[15px] leading-7 text-white/75">
              EURO Moto đảm bảo rằng mọi khách hàng đều có được trải nghiệm tốt, được tư vấn và chăm sóc xe nhanh để xe luôn ở trạng thái vận hành ổn định.
            </p>

            <div className="grid gap-3">
              {serviceHighlights.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  className={`grid w-full grid-cols-[52px_1fr] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${index === activeService
                    ? 'border-white/35 bg-[rgba(215,25,32,0.22)]'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                    }`}
                  onClick={() => setActiveService(index)}
                >
                  <img src={service.icon} alt={service.title} loading="lazy" className="h-11 w-11 object-contain" />
                  <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">{service.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
            <img src={activeServiceItem.image} alt={activeServiceItem.title} className="h-full min-h-[380px] w-full object-cover" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-gradient-to-b from-black/10 to-black/80 p-5 text-white">
              <h3 className="mb-2 text-[26px] font-black">{activeServiceItem.title}</h3>
              <p className="text-[15px] leading-7 text-white/85">{activeServiceItem.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="san-pham-ban-chay" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] space-y-6">
          <SectionTitle
            kicker="Mua nhiều"
            title="Sản phẩm bán chạy"
            action={
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-red-200"
                to="/products"
              >
                Xem thêm
              </Link>
            }
          />
          {renderProductsBlock(bestSellerProducts, 'Chưa có sản phẩm bán chạy.')}
        </div>
      </section>
    </>
  );
}

export default HomePage;
