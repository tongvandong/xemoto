import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiAward, FiSettings, FiShield, FiTool, FiZap } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { categoryApi, contentApi, orderApi, productApi } from '../services/api.js';
import { brandAssets, homeCategoryReferences, homeHeroSlides, serviceHighlights } from '../assets/siteData.js';
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

function findCategoryReference(category) {
  const candidate = normalizeText(`${category?.name || ''} ${category?.slug || ''}`);
  return homeCategoryReferences.find((reference) => reference.match.some((keyword) => candidate.includes(normalizeText(keyword))));
}

function buildFeaturedCategories(categories) {
  const matches = homeCategoryReferences
    .map((reference) => {
      const category = categories.find((item) => findCategoryReference(item)?.id === reference.id);

      return category
        ? {
          ...category,
          image: reference.image || category.image,
          to: category.id ? `/products?categoryId=${category.id}` : reference.to,
        }
        : null;
    })
    .filter(Boolean);

  return matches.length ? matches : homeCategoryReferences.map((reference) => ({ ...reference }));
}

function normalizeBannerLink(link) {
  if (typeof link !== 'string' || !link.startsWith('/')) {
    return '/products';
  }

  return link === '/motorcycles' || link === '/parts' ? '/products' : link;
}

function mapHomeBanner(banner) {
  return {
    id: `banner-${banner.id}`,
    image: banner.imageUrl,
    alt: banner.title || 'EURO Moto',
    to: normalizeBannerLink(banner.link),
  };
}

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { notify } = useNotification();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [dealProducts, setDealProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeService, setActiveService] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [heroSlides, setHeroSlides] = useState(homeHeroSlides);

  async function loadHomeData() {
    setLoading(true);
    setError(null);

    try {
      const tasks = [
        productApi.getAll({ page: 1, pageSize: 4, isFeatured: true, sortBy: 'newest', sortDescending: true }),
        productApi.getAll({ page: 1, pageSize: 4, isHotDeal: true, sortBy: 'newest', sortDescending: true }),
        productApi.getAll({ page: 1, pageSize: 4, sortBy: 'newest', sortDescending: true }),
        categoryApi.getAll().then((res) => res.data),
        contentApi.getHomeBanners().catch(() => []),
      ];

      if (isAuthenticated) {
        tasks.push(orderApi.getMyOrders().catch(() => []));
      }

      const results = await Promise.all(tasks);
      const featuredProductsResponse = results[0];
      const dealProductsResponse = results[1];
      const latestProductsResponse = results[2];
      const categoriesResponse = results[3];
      const bannersResponse = results[4];
      const ordersResponse = results.length > 5 ? results[5] : [];

      setFeaturedProducts(featuredProductsResponse.items || []);
      setDealProducts(dealProductsResponse.items || []);
      setLatestProducts(latestProductsResponse.items || []);
      setCategories(categoriesResponse.filter((category) => category.isActive));
      const rawBanners = Array.isArray(bannersResponse) ? bannersResponse : bannersResponse?.items || [];
      const apiSlides = rawBanners
        .filter((banner) => banner.status !== 0 && banner.position === 'Slider')
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
        .map(mapHomeBanner)
        .filter((slide) => slide.image);
      setHeroSlides(apiSlides.length ? apiSlides : homeHeroSlides);

      if (Array.isArray(ordersResponse)) {
        setPendingOrders(
          ordersResponse.filter(
            (order) =>
              order.orderType === 'Deposit' &&
              order.paymentStatus === 'PartiallyPaid' &&
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
  const activeServiceItem = serviceHighlights[activeService] || serviceHighlights[0];
  const serviceIcons = [FiTool, FiShield, FiZap, FiSettings];

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

      <section id="trang-chu" className="home-hero-slider scroll-mt-40 bg-white">
        <div className="w-full overflow-hidden bg-black">
          <Swiper
            modules={[Autoplay, Pagination]}
            slidesPerView={1}
            loop={heroSlides.length > 1}
            speed={700}
            autoplay={{
              delay: 3500,
              disableOnInteraction: false,
            }}
            pagination={{ clickable: true }}
          >
            {heroSlides.map((slide) => (
              <SwiperSlide key={slide.id}>
                <Link to={slide.to} aria-label={slide.alt} className="block aspect-[1792/877] w-full">
                  <img src={slide.image} alt={slide.alt} className="h-full w-full object-contain" />
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section id="danh-muc-noi-bat" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <SectionTitle title="Danh mục nổi bật" center className="mb-7" />
          {loading ? <LoadingState /> : <CategoryMenu categories={featuredCategories} />}
        </div>
      </section>

      <section id="deal-noi-bat" className="scroll-mt-32 bg-zinc-50 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              kicker="Hot deal"
              title="Deal nổi bật"
              className="mb-0"
            />
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#d71920] shadow-sm">
              <FiAward className="h-4 w-4" aria-hidden="true" />
              Giá tốt mỗi ngày
            </div>
          </div>
          {renderProductsBlock(dealProducts, 'Chưa có deal nổi bật.')}
        </div>
      </section>

      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-5 md:grid-cols-2">
          <img src={brandAssets.bannerOne} alt="Ưu đãi xe máy" className="w-full rounded-2xl object-cover" />
          <img src={brandAssets.bannerTwo} alt="Ưu đãi phụ tùng" className="w-full rounded-2xl object-cover" />
        </div>
      </section>

      <section id="san-pham-noi-bat" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-7 xl:grid-cols-[33%_1fr]">
          <div>
            <img src={brandAssets.productBanner} alt="Sản phẩm nổi bật" className="w-full rounded-2xl object-cover" />
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
              {serviceHighlights.map((service, index) => {
                const ServiceIcon = serviceIcons[index] || FiTool;

                return (
                  <button
                    key={service.id}
                    type="button"
                    className={`grid w-full grid-cols-[52px_1fr] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${index === activeService
                      ? 'border-white/35 bg-[rgba(215,25,32,0.22)]'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                      }`}
                    onClick={() => setActiveService(index)}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white">
                      <ServiceIcon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">{service.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative aspect-[1792/877] self-center overflow-hidden rounded-3xl bg-black shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
            <img src={activeServiceItem.image} alt={activeServiceItem.title} className="h-full w-full object-contain object-center" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-gradient-to-b from-black/10 to-black/80 p-5 text-white">
              <h3 className="mb-2 text-[26px] font-black">{activeServiceItem.title}</h3>
              <p className="text-[15px] leading-7 text-white/85">{activeServiceItem.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="san-pham-moi-cap-nhat" className="scroll-mt-32 px-4 py-10 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] space-y-6">
          <SectionTitle
            kicker="Mới về"
            title="Sản phẩm mới cập nhật"
            action={
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-red-200"
                to="/products"
              >
                Xem thêm
              </Link>
            }
          />
          {renderProductsBlock(latestProducts, 'Chưa có sản phẩm mới.')}
        </div>
      </section>
    </>
  );
}

export default HomePage;
