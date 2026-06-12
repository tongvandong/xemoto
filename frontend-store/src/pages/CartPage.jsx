import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import CartItemRow from '../components/CartItemRow.jsx';
import CartSummary from '../components/CartSummary.jsx';
import EmptyCart from '../components/EmptyCart.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';

function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { notify } = useNotification();
  const { cart, loading, refreshCart, updateItem, removeItem: removeCartItem } = useCart();
  const [error, setError] = useState(null);

  async function loadCart() {
    if (!isAuthenticated) {
      return;
    }

    setError(null);

    try {
      await refreshCart();
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    loadCart();
  }, [isAuthenticated]);

  async function updateQuantity(itemId, quantity) {
    try {
      await updateItem(itemId, quantity);
    } catch (err) {
      notify(err.message || 'Không thể cập nhật số lượng trong giỏ hàng.', 'error');
    }
  }

  async function removeItem(itemId) {
    try {
      await removeCartItem(itemId);
    } catch (err) {
      notify(err.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.', 'error');
    }
  }

  function checkout() {
    if (!items.length) {
      notify('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.', 'error');
      return;
    }

    navigate('/checkout');
  }

  const items = cart?.items || [];

  return (
    <>
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {!isAuthenticated && (
              <div className="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
                <h2 className="text-[24px] font-black text-zinc-950">Bạn cần đăng nhập để xem giỏ hàng</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  Giỏ hàng hiện được lưu và xử lý qua backend theo tài khoản người dùng.
                </p>
                <Link
                  className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
                  to="/login?redirect=/cart"
                >
                  Đăng nhập
                </Link>
              </div>
            )}

            {isAuthenticated && loading && <LoadingState />}
            {isAuthenticated && error && <ErrorState message={error.message} onRetry={loadCart} />}
            {isAuthenticated && !loading && !error && !items.length && <EmptyCart />}
            {isAuthenticated &&
              !loading &&
              !error &&
              items.map((item) => (
                <CartItemRow key={item.id} item={item} onQuantityChange={updateQuantity} onRemove={removeItem} />
              ))}
          </div>

          {isAuthenticated && <CartSummary items={items} subtotal={cart?.subtotal} onCheckout={checkout} />}
        </div>
      </section>
    </>
  );
}

export default CartPage;
