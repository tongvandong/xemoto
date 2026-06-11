import { useEffect, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { orderApi } from '../services/api.js';

function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    orderApi.getById(orderId).then((res) => setOrder(res.order || res)).catch(() => {});
  }, [orderId]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Thanh toán thành công' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-16">
        <div className="mx-auto max-w-[560px] text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <FiCheck className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="mt-6 text-[32px] font-black text-zinc-950">Thanh toán thành công!</h1>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            Cảm ơn bạn đã thanh toán. Đơn hàng đã được xác nhận và sẽ được cửa hàng chuẩn bị trong thời gian sớm nhất.
          </p>

          {order && (
            <div className="mt-4 inline-flex rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-bold text-zinc-700">
              Mã đơn: {order.orderCode || orderId}
            </div>
          )}

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
