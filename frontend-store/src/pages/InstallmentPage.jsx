import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { installmentApi, productApi } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { formatCurrency, getProductPrice } from '../utils/formatters.js';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const PARTNERS = ['Home Credit', 'FE Credit', 'HD SAISON', 'Mcredit', 'Shinhan Finance', 'Khác'];
const MONTHS = [6, 9, 12, 18, 24, 36];
const DOWN_PERCENTS = [10, 20, 30, 40, 50, 60, 70, 80];

export default function InstallmentPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useNotification();

  const [form, setForm] = useState({
    productName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    financePartner: 'Home Credit',
    months: 12,
    note: '',
  });
  const [downPercent, setDownPercent] = useState(30);
  const [productPrice, setProductPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const productId = params.get('productId');
  const skuId = params.get('skuId');

  useEffect(() => {
    setForm((f) => ({
      ...f,
      productName: params.get('product') || f.productName,
      customerName: user?.name || f.customerName,
      customerPhone: user?.phone || f.customerPhone,
      customerEmail: user?.email || f.customerEmail,
    }));
  }, [params, user]);

  // Mở từ trang sản phẩm -> lấy giá để quy đổi % trả trước thành số tiền.
  useEffect(() => {
    if (!productId) return undefined;
    let active = true;
    productApi.getById(productId).then((p) => {
      if (!active) return;
      setProductPrice(Number(getProductPrice(p)) || 0);
      setForm((f) => ({ ...f, productName: f.productName || p?.name || '' }));
    }).catch(() => {});
    return () => { active = false; };
  }, [productId]);

  const downAmount = productPrice > 0 ? Math.round((productPrice * downPercent) / 100) : 0;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.productName.trim() || !form.customerName.trim() || !form.customerPhone.trim()) {
      notify('Vui lòng nhập sản phẩm, họ tên và số điện thoại.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const noteWithPct = `${form.note.trim() ? `${form.note.trim()} — ` : ''}Trả trước mong muốn: ${downPercent}%`;
      await installmentApi.register({
        ...form,
        note: noteWithPct,
        downPayment: downAmount,
        productId: productId ? Number(productId) : null,
        skuId: skuId ? Number(skuId) : null,
      });
      setDone(true);
      notify('Đã gửi hồ sơ tư vấn trả góp. Nhân viên sẽ liên hệ bạn sớm.', 'success');
    } catch (err) {
      notify(getErrorMessage(err, 'Không gửi được hồ sơ. Vui lòng thử lại.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Đăng ký tư vấn trả góp</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Mua xe trả góp được hỗ trợ qua <strong>đối tác tài chính</strong> (Home Credit, FE Credit, HD SAISON…).
        Bạn để lại thông tin, nhân viên showroom sẽ liên hệ tư vấn hồ sơ, lãi suất và kỳ hạn. Khoản vay và lịch trả hằng tháng do công ty tài chính quản lý.
      </p>

      {done ? (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-lg font-semibold text-green-700">Đã tiếp nhận hồ sơ trả góp của bạn!</div>
          <p className="mt-2 text-sm text-zinc-600">Nhân viên sẽ liên hệ trong thời gian sớm nhất để tư vấn chi tiết.</p>
          <Link to="/products" className="mt-4 inline-block rounded-lg bg-[#d71920] px-5 py-2 text-sm font-semibold text-white">
            Tiếp tục xem xe
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700">Sản phẩm quan tâm *</label>
            <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.productName} onChange={set('productName')} placeholder="Tên xe muốn mua trả góp" />
            {productPrice > 0 && (
              <p className="mt-1 text-xs text-zinc-500">Giá tham khảo: {formatCurrency(productPrice)}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Họ tên *</label>
            <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.customerName} onChange={set('customerName')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Số điện thoại *</label>
            <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.customerPhone} onChange={set('customerPhone')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
            <input className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.customerEmail} onChange={set('customerEmail')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Đối tác tài chính mong muốn</label>
            <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.financePartner} onChange={set('financePartner')}>
              {PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Tỷ lệ trả trước mong muốn</label>
            <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={downPercent} onChange={(e) => setDownPercent(Number(e.target.value))}>
              {DOWN_PERCENTS.map((p) => <option key={p} value={p}>{p}%</option>)}
            </select>
            {productPrice > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">Trả trước: {formatCurrency(downAmount)}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-400">Mở từ trang sản phẩm để hiển thị số tiền tương ứng.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Kỳ hạn mong muốn (tháng)</label>
            <select className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.months} onChange={set('months')}>
              {MONTHS.map((m) => <option key={m} value={m}>{m} tháng</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700">Ghi chú</label>
            <textarea rows="3" className="w-full rounded-lg border border-zinc-300 px-3 py-2" value={form.note} onChange={set('note')} placeholder="Thời gian tiện liên hệ, yêu cầu khác…" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-[#d71920] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? 'Đang gửi…' : 'Gửi hồ sơ tư vấn'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
