import { useEffect } from 'react';
import { FiHeart } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useFavorite } from '../contexts/FavoriteContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { productApi } from '../services/api.js';

function FavoritesPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { notify } = useNotification();
  const { favoriteProducts, count, loading, isFavorite, loadFavorites, toggleFavorite } = useFavorite();

  useEffect(() => {
    loadFavorites().catch(() => {
      notify('Không thể tải danh sách yêu thích', 'error');
    });
  }, [loadFavorites, notify]);

  async function addToCart(product) {
    try {
      const detail = await productApi.getById(product.id);
      if (detail.variants?.length) {
        notify('Vui lòng chọn phiên bản/màu sắc', 'error');
        navigate(`/products/${product.id}`);
        return;
      }

      await addItem({ productId: product.id, quantity: 1 });
      notify('Đã thêm vào giỏ hàng', 'success');
    } catch (error) {
      notify(error.message || 'Không thể thêm vào giỏ hàng', 'error');
    }
  }

  async function handleToggleFavorite(product) {
    try {
      const added = await toggleFavorite(product);
      notify(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', 'success');
    } catch (error) {
      notify(error.message || 'Không thể cập nhật yêu thích', 'error');
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Yêu thích' }]} />

      <section className="bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_30%)] py-10">
        <div className="mx-auto w-full max-w-[1200px] px-4">
          {loading && <LoadingState />}

          {!loading && count === 0 && (
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white px-6 py-14 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#d71920]">
                <FiHeart className="h-7 w-7 fill-current" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-zinc-950">Chưa có sản phẩm yêu thích</h2>
              <Link
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d71920] px-6 text-sm font-bold text-white transition hover:bg-[#b9161c]"
                to="/products"
              >
                Khám phá sản phẩm
              </Link>
            </div>
          )}

          {!loading && count > 0 && (
            <ProductGrid
              products={favoriteProducts}
              onAddToCart={addToCart}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage="Chưa có sản phẩm yêu thích."
            />
          )}

          {!loading && !Array.isArray(favoriteProducts) && (
            <ErrorState message="Không thể hiển thị danh sách yêu thích." onRetry={loadFavorites} />
          )}
        </div>
      </section>
    </>
  );
}

export default FavoritesPage;
