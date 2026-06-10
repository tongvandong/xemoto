import { FiCheck } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';

function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  return (
    <>
      <Breadcrumb items={[{ label: 'Đặt hàng thành công' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-16">
        <div className="mx-auto max-w-[560px] text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <FiCheck className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="mt-6 text-[32px] font-black text-zinc-950">
            Đặt hàng thành công!
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {orderId && (
              <Link
                to={`/orders/${orderId}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
              >
                Xem đơn hàng
              </Link>
            )}
            <Link
              to="/"
              className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-extrabold uppercase tracking-[0.08em] transition ${
                orderId
                  ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                  : 'bg-[#d71920] text-white hover:bg-[#b61016]'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              to="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-zinc-700 transition hover:bg-zinc-50"
            >
              Tiếp tục mua sắm
            </Link>
            <Link
              to="/orders"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-zinc-700 transition hover:bg-zinc-50"
            >
              Xem tất cả đơn hàng
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default CheckoutSuccessPage;
