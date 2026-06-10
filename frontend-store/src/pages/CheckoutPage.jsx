import { useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi, voucherApi, shopApi, userApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { formatCurrency } from '../utils/formatters.js';

const RECEIVING_METHODS = [
  { value: 'Delivery', label: 'Giao hàng tận nơi' },
  { value: 'Pickup', label: 'Nhận tại showroom' },
];

const ORDER_TYPES = [
  { value: 'FullPayment', label: 'Thanh toán toàn bộ' },
  { value: 'Deposit', label: 'Đặt cọc trước' },
];

const PAYMENT_METHODS = [
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Quét mã QR của cửa hàng để chuyển khoản' },
  { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', icon: '🚚', desc: 'Trả tiền mặt khi nhận hàng / tại cửa hàng' },
];

function buildQrUrl(info, amount, memo) {
  if (!info) return '';
  if (info.bankQrUrl) return info.bankQrUrl;
  if (info.bankCode && info.bankAccountNo) {
    const acc = encodeURIComponent(info.bankAccountName || '');
    return `https://img.vietqr.io/image/${info.bankCode}-${info.bankAccountNo}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(memo)}&accountName=${acc}`;
  }
  return '';
}

const initialForm = {
  shippingFullName: '',
  shippingPhoneNumber: '',
  shippingEmail: '',
  shippingAddressLine: '',
  shippingWard: '',
  shippingDistrict: '',
  shippingProvince: '',
  receivingMethod: 'Delivery',
  orderType: 'FullPayment',
  paymentMethod: 'BankTransfer',
  depositAmount: '',
  note: '',
  fulfillmentNote: '',
  pickupAppointmentAt: '',
};

function getSubtotal(cart, items) {
  return Number(cart?.subtotal ?? items.reduce((sum, item) => {
    const price = item.unitPrice || item.product?.salePrice || item.product?.basePrice || 0;
    return sum + (item.lineTotal ?? price * (item.quantity || 1));
  }, 0));
}

function getCartVoucherContext(items) {
  return {
    productIds: [...new Set(items.map((item) => item.productId || item.product?.id).filter(Boolean))],
    categoryIds: [...new Set(items.map((item) => item.product?.categoryId).filter(Boolean))],
    brandIds: [...new Set(items.map((item) => item.product?.brandId).filter(Boolean))],
  };
}


function validateForm(form, totalAmount) {
  const errors = {};

  if (!form.shippingFullName.trim()) errors.shippingFullName = 'Vui lòng nhập họ tên';
  if (!form.shippingPhoneNumber.trim()) errors.shippingPhoneNumber = 'Vui lòng nhập số điện thoại';
  else if (!/^0\d{9,10}$/.test(form.shippingPhoneNumber.trim())) errors.shippingPhoneNumber = 'Số điện thoại không hợp lệ';

  if (form.receivingMethod === 'Delivery') {
    if (!form.shippingAddressLine.trim()) errors.shippingAddressLine = 'Vui lòng nhập địa chỉ';
    if (!form.shippingProvince.trim()) errors.shippingProvince = 'Vui lòng nhập tỉnh/thành phố';
  }

  if (form.orderType === 'Deposit') {
    const deposit = Number(form.depositAmount);
    if (!deposit || deposit <= 0) errors.depositAmount = 'Số tiền đặt cọc phải lớn hơn 0';
    else if (deposit >= totalAmount) errors.depositAmount = 'Số tiền đặt cọc phải nhỏ hơn tổng tiền';
  }

  return errors;
}

function buildOrderPayload({ form, cart, items, appliedVoucher, voucherDiscount, amounts }) {
  return {
    shippingFullName: form.shippingFullName.trim(),
    shippingPhoneNumber: form.shippingPhoneNumber.trim(),
    shippingEmail: form.shippingEmail.trim() || null,
    shippingAddressLine: form.shippingAddressLine.trim(),
    shippingWard: form.shippingWard.trim() || null,
    shippingDistrict: form.shippingDistrict.trim() || null,
    shippingProvince: form.shippingProvince.trim(),
    receivingMethod: form.receivingMethod,
    orderType: form.orderType,
    depositAmount: amounts.requiresDepositInput ? amounts.depositNum : 0,
    note: form.note.trim() || null,
    fulfillmentNote: form.fulfillmentNote.trim() || null,
    pickupAppointmentAt: form.pickupAppointmentAt || null,
    paymentMethod: form.paymentMethod,
    cartId: cart?.id || null,
    voucherCode: appliedVoucher ? appliedVoucher.code : null,
    discountAmount: appliedVoucher ? voucherDiscount : 0,
    shippingFee: 0,
    holdMinutes: 15,
    items: items.map((item) => ({
      productId: item.productId || item.product?.id,
      productVariantId: item.productVariantId || item.productVariant?.id || null,
      quantity: item.quantity || 1,
    })),
  };
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();
  const items = cart?.items || [];

  const [form, setForm] = useState(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [applicableVouchers, setApplicableVouchers] = useState([]);
  const [loadingVouchersList, setLoadingVouchersList] = useState(false);

  // Thanh toán chuyển khoản (QR)
  const [qrOrder, setQrOrder] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [claiming, setClaiming] = useState(false);

  // Hồ sơ khách (tự điền thông tin giao hàng)
  const [savedProfile, setSavedProfile] = useState(null);
  const [profileFilled, setProfileFilled] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login?redirect=/checkout', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    shopApi.getPaymentInfo().then(setPaymentInfo).catch(() => {});
  }, []);

  // Tải hồ sơ + địa chỉ mặc định để tự điền thông tin giao hàng
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      userApi.getProfile().catch(() => null),
      userApi.getAddress().catch(() => null),
    ]).then(([profile, address]) => setSavedProfile({ profile, address }));
  }, [isAuthenticated]);

  function fillFromProfile() {
    const p = savedProfile?.profile || {};
    const a = savedProfile?.address || {};
    setForm((prev) => ({
      ...prev,
      shippingFullName: a.recipientName || a.RecipientName || p.fullName || p.FullName || prev.shippingFullName,
      shippingPhoneNumber: a.phone || a.Phone || p.phoneNumber || p.PhoneNumber || prev.shippingPhoneNumber,
      shippingEmail: p.email || p.Email || prev.shippingEmail,
      shippingAddressLine: a.line || a.Line || prev.shippingAddressLine,
      shippingWard: a.ward || a.Ward || prev.shippingWard,
      shippingDistrict: a.district || a.District || prev.shippingDistrict,
      shippingProvince: a.province || a.Province || prev.shippingProvince,
    }));
    setFieldErrors({});
  }

  // Tự điền lần đầu nếu khách chưa nhập gì
  useEffect(() => {
    if (savedProfile && !profileFilled && !form.shippingFullName && !form.shippingPhoneNumber) {
      fillFromProfile();
      setProfileFilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProfile]);

  useEffect(() => {
    if (isAuthenticated && !items.length) refreshCart().catch(() => {});
  }, [isAuthenticated]);

  const subtotal = getSubtotal(cart, items);

  useEffect(() => {
    if (items.length > 0 && subtotal > 0) {
      const fetchApplicableVouchers = async () => {
        setLoadingVouchersList(true);
        try {
          const { productIds, categoryIds, brandIds } = getCartVoucherContext(items);

          const res = await voucherApi.getApplicableVouchers({ subtotal, productIds, categoryIds, brandIds, orderType: form.orderType });
          setApplicableVouchers(res || []);
        } catch {
          setApplicableVouchers([]);
        } finally {
          setLoadingVouchersList(false);
        }
      };
      fetchApplicableVouchers();
    } else {
      setApplicableVouchers([]);
    }
  }, [items, subtotal, form.orderType]);

  useEffect(() => {
    if (!appliedVoucher?.code || !items.length || subtotal <= 0) return undefined;

    let active = true;
    const revalidateAppliedVoucher = async () => {
      try {
        const { productIds, categoryIds, brandIds } = getCartVoucherContext(items);
        const res = await voucherApi.validateVoucher({
          code: appliedVoucher.code,
          subtotal,
          productIds,
          categoryIds,
          brandIds,
          orderType: form.orderType,
        });

        if (!active) return;
        if (res.valid) {
          setAppliedVoucher(res.voucher);
          setVoucherDiscount(res.discountAmount || 0);
          setVoucherError('');
        } else {
          setAppliedVoucher(null);
          setVoucherDiscount(0);
          setVoucherError(res.message || 'Voucher không còn phù hợp với giỏ hàng hiện tại');
        }
      } catch {
        if (!active) return;
        setAppliedVoucher(null);
        setVoucherDiscount(0);
        setVoucherError('Không thể kiểm tra lại voucher, vui lòng áp dụng lại');
      }
    };

    revalidateAppliedVoucher();
    return () => { active = false; };
  }, [appliedVoucher?.code, items, subtotal, form.orderType]);

  const shippingFee = 0;
  const totalAmount = Math.max(0, subtotal - voucherDiscount + shippingFee);
  const requiresDepositInput = form.orderType === 'Deposit';
  const depositNum = requiresDepositInput ? Number(form.depositAmount) || 0 : 0;
  const remainingAmount = requiresDepositInput ? Math.max(0, totalAmount - depositNum) : 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'orderType') {
      handleRemoveVoucher();
    }
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  // Voucher handlers
  async function handleApplyVoucherCode(codeToApply) {
    const code = typeof codeToApply === 'string' ? codeToApply : voucherCode;
    if (!code?.trim()) {
      setVoucherError('Vui lòng nhập mã voucher');
      return;
    }

    setVoucherLoading(true);
    setVoucherError('');

    try {
      const { productIds, categoryIds, brandIds } = getCartVoucherContext(items);
      const res = await voucherApi.validateVoucher({ code: code.trim(), subtotal, productIds, categoryIds, brandIds, orderType: form.orderType });
      if (res.valid) {
        setAppliedVoucher(res.voucher);
        setVoucherDiscount(res.discountAmount || 0);
        setVoucherError('');
      } else {
        setVoucherError(res.message || 'Voucher không hợp lệ');
        setAppliedVoucher(null);
        setVoucherDiscount(0);
      }
    } catch (err) {
      setVoucherError(err?.message || 'Lỗi kiểm tra voucher');
      setAppliedVoucher(null);
      setVoucherDiscount(0);
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherCode('');
    setVoucherError('');
  }

  function handleVoucherCodeChange(e) {
    setVoucherCode(e.target.value);
    setVoucherError('');
  }

  function applySuggestedVoucher(voucher) {
    setVoucherCode(voucher.code);
    handleApplyVoucherCode(voucher.code);
  }

  function validate() {
    const errors = validateForm(form, totalAmount);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    if (!items.length) {
      setError('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildOrderPayload({
        form,
        cart,
        items,
        appliedVoucher,
        voucherDiscount,
        amounts: { requiresDepositInput, depositNum },
      });
      const res = await orderApi.createOrder(payload);
      await refreshCart().catch(() => {});
      const orderId = res.id || res.Id || res.order?.id;

      if (form.paymentMethod === 'BankTransfer') {
        // Mở màn QR để khách chuyển khoản
        let ord = { id: orderId, code: '', orderType: form.orderType };
        try { const full = await orderApi.getById(orderId); ord = full.order || full; } catch { /* ignore */ }
        setQrOrder({ ...ord, id: orderId, _amount: requiresDepositInput ? depositNum : totalAmount });
      } else {
        navigate(`/checkout/success?orderId=${orderId}`, { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaimedTransfer() {
    if (!qrOrder) return;
    setClaiming(true);
    try {
      await orderApi.claimTransfer(qrOrder.id);
      navigate(`/checkout/success?orderId=${qrOrder.id}&payment=pending`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không gửi được xác nhận. Vui lòng thử lại.');
    } finally {
      setClaiming(false);
    }
  }

  function handlePayLater() {
    if (!qrOrder) return;
    navigate(`/checkout/success?orderId=${qrOrder.id}`, { replace: true });
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-3 py-10 sm:px-4">
        <div className="mx-auto grid min-w-0 w-full max-w-[1200px] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Left: Shipping Form ── */}
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5" id="checkout-form">
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[30px] sm:px-6 sm:py-6">
              <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Thanh toán</div>
              <h1 className="mt-2 text-[28px] font-black text-zinc-950 sm:text-[34px]">Thông tin giao hàng</h1>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            )}

            {/* Contact Info */}
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[18px] font-black text-zinc-950">Thông tin liên hệ</h2>
                {(savedProfile?.profile || savedProfile?.address) && (
                  <button
                    type="button"
                    onClick={fillFromProfile}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d71920] px-4 py-1.5 text-xs font-bold text-[#d71920] transition hover:bg-red-50"
                  >
                    Điền từ hồ sơ
                  </button>
                )}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Họ và tên *" id="shippingFullName" name="shippingFullName" value={form.shippingFullName} onChange={handleChange} error={fieldErrors.shippingFullName} placeholder="Nguyễn Văn A" />
                <Field label="Số điện thoại *" id="shippingPhoneNumber" name="shippingPhoneNumber" value={form.shippingPhoneNumber} onChange={handleChange} error={fieldErrors.shippingPhoneNumber} placeholder="0912345678" type="tel" />
              </div>
              <div className="mt-4">
                <Field label="Email" id="shippingEmail" name="shippingEmail" value={form.shippingEmail} onChange={handleChange} placeholder="email@example.com" type="email" />
              </div>
            </div>

            {/* Receiving Method */}
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <h2 className="text-[18px] font-black text-zinc-950">Phương thức nhận hàng</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {RECEIVING_METHODS.map((m) => (
                  <RadioPill key={m.value} name="receivingMethod" value={m.value} label={m.label} checked={form.receivingMethod === m.value} onChange={handleChange} />
                ))}
              </div>
            </div>

            {/* Address */}
            {form.receivingMethod === 'Delivery' && (
              <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
                <h2 className="text-[18px] font-black text-zinc-950">Địa chỉ giao hàng</h2>
                <div className="mt-5"><Field label="Địa chỉ *" id="shippingAddressLine" name="shippingAddressLine" value={form.shippingAddressLine} onChange={handleChange} error={fieldErrors.shippingAddressLine} placeholder="Số nhà, tên đường..." /></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Tỉnh / Thành phố *" id="shippingProvince" name="shippingProvince" value={form.shippingProvince} onChange={handleChange} error={fieldErrors.shippingProvince} placeholder="TP. Hồ Chí Minh" />
                  <Field label="Phường / Xã" id="shippingWard" name="shippingWard" value={form.shippingWard} onChange={handleChange} placeholder="Phường Tân Phú" />
                </div>
              </div>
            )}

            {/* Pickup */}
            {form.receivingMethod === 'Pickup' && (
              <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
                <h2 className="text-[18px] font-black text-zinc-950">Hẹn ngày nhận xe</h2>
                <div className="mt-5"><Field label="Ngày hẹn nhận" id="pickupAppointmentAt" name="pickupAppointmentAt" value={form.pickupAppointmentAt} onChange={handleChange} type="datetime-local" /></div>
                <div className="mt-4"><Field label="Ghi chú giao nhận" id="fulfillmentNote" name="fulfillmentNote" value={form.fulfillmentNote} onChange={handleChange} placeholder="Ghi chú cho showroom..." multiline /></div>
              </div>
            )}

            {/* Order Type */}
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <h2 className="text-[18px] font-black text-zinc-950">Hình thức thanh toán</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {ORDER_TYPES.map((t) => (
                  <RadioPill key={t.value} name="orderType" value={t.value} label={t.label} checked={form.orderType === t.value} onChange={handleChange} />
                ))}
              </div>
              {requiresDepositInput && (
                <div className="mt-4"><Field label="Số tiền đặt cọc *" id="depositAmount" name="depositAmount" value={form.depositAmount} onChange={handleChange} error={fieldErrors.depositAmount} placeholder="5000000" type="number" /></div>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <h2 className="text-[18px] font-black text-zinc-950">Phương thức thanh toán</h2>
              <div className="mt-4 space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.value} className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${form.paymentMethod === m.value ? 'border-[#d71920] bg-red-50/50 shadow-sm' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}>
                    <input type="radio" name="paymentMethod" value={m.value} checked={form.paymentMethod === m.value} onChange={handleChange} className="sr-only" />
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${form.paymentMethod === m.value ? 'border-[#d71920]' : 'border-zinc-300'}`}>
                      {form.paymentMethod === m.value && <span className="h-2.5 w-2.5 rounded-full bg-[#d71920]" />}
                    </span>
                    <span className="text-2xl leading-none">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${form.paymentMethod === m.value ? 'text-[#d71920]' : 'text-zinc-900'}`}>{m.label}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:rounded-[28px] sm:px-6 sm:py-6">
              <h2 className="text-[18px] font-black text-zinc-950">Ghi chú đơn hàng</h2>
              <div className="mt-4"><Field id="note" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú thêm cho đơn hàng..." multiline /></div>
            </div>
          </form>

          {/* ── Right: Order Summary ── */}
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6">
              <h2 className="text-[22px] font-black text-zinc-950">Đơn hàng của bạn</h2>

              <div className="mt-5 max-h-[340px] space-y-3 overflow-y-auto pr-1">
                {items.map((item) => {
                  const name = item.product?.name || item.productName || 'Sản phẩm';
                  const variant = item.productVariant || {};
                  const variantName = variant.variantName || [variant.version, variant.color].filter(Boolean).join(' / ') || item.variantName || '';
                  const price = item.unitPrice || item.product?.salePrice || item.product?.basePrice || 0;
                  const qty = item.quantity || 1;
                  const lineTotal = item.lineTotal ?? price * qty;
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-bold text-zinc-900">{name}</div>
                        {variantName && <div className="mt-0.5 truncate text-xs text-zinc-500">{variantName}</div>}
                        <div className="mt-1 text-xs text-zinc-500">SL: {qty}</div>
                      </div>
                      <div className="whitespace-nowrap text-sm font-bold text-zinc-900">{formatCurrency(lineTotal)}</div>
                    </div>
                  );
                })}
                {!items.length && <div className="py-6 text-center text-sm text-zinc-400">Giỏ hàng trống</div>}
              </div>

              {/* Voucher Section */}
              <div className="mt-5 border-t border-zinc-200 pt-4">
                <h3 className="text-sm font-bold text-zinc-700">Mã giảm giá</h3>
                {appliedVoucher ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                    <span className="text-lg">🎫</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-green-700">{appliedVoucher.code}</div>
                      <div className="text-xs text-green-600">Giảm {formatCurrency(voucherDiscount)}</div>
                    </div>
                    <button type="button" onClick={handleRemoveVoucher} className="text-xs font-bold text-red-500 hover:text-red-700 transition">Xóa</button>
                  </div>
                ) : (
                  <>
                    {loadingVouchersList ? (
                      <div className="mt-2 text-sm text-zinc-500">Đang tải mã giảm giá...</div>
                    ) : applicableVouchers.length > 0 ? (
                      <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {applicableVouchers.map(v => (
                          <div key={v.id} className="flex items-center gap-3 rounded-xl border border-[#d71920]/20 bg-red-50/30 p-3">
                            <span className="text-2xl">🎫</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#d71920]">{v.code}</div>
                              <div className="text-xs text-zinc-600">{v.description || `Giảm ${v.discountType === 'Percent' ? v.discountValue + '%' : formatCurrency(v.discountValue)}`}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => applySuggestedVoucher(v)}
                              disabled={voucherLoading}
                              className="shrink-0 rounded-lg bg-[#d71920] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#b61016] disabled:bg-zinc-300 disabled:cursor-not-allowed"
                            >
                              Áp dụng
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-zinc-500">Không có mã giảm giá nào phù hợp cho đơn hàng này</div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={handleVoucherCodeChange}
                        placeholder="Nhập mã voucher"
                        className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyVoucherCode(voucherCode)}
                        disabled={voucherLoading || !voucherCode.trim()}
                        className="shrink-0 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-900 disabled:bg-zinc-300 disabled:cursor-not-allowed"
                      >
                        {voucherLoading ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mt-5 space-y-3 border-t border-zinc-200 pt-4">
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>Tạm tính ({items.length} sản phẩm)</span>
                  <strong className="font-bold text-zinc-950">{formatCurrency(subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>Phí giao hàng</span>
                  <strong className="font-bold text-zinc-950">{formatCurrency(shippingFee)}</strong>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Giảm voucher</span>
                    <strong className="font-bold">-{formatCurrency(voucherDiscount)}</strong>
                  </div>
                )}
                {requiresDepositInput && (
                  <>
                    <div className="flex items-center justify-between text-sm text-amber-600">
                      <span>Đặt cọc</span>
                      <strong className="font-bold">{formatCurrency(depositNum)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      <span>Còn lại cần thanh toán</span>
                      <strong className="font-bold">{formatCurrency(remainingAmount > 0 ? remainingAmount : 0)}</strong>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-2 text-[#d71920]">
                  <span className="text-sm font-extrabold uppercase tracking-[0.08em]">Tổng cộng</span>
                  <strong className="text-[24px] font-black">{formatCurrency(totalAmount)}</strong>
                </div>
              </div>

              <button
                type="submit" form="checkout-form" disabled={submitting || !items.length}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {submitting ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : 'Đặt hàng'}
              </button>
              <Link to="/cart" className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-zinc-500 transition hover:text-zinc-900">← Quay lại giỏ hàng</Link>
            </div>
          </aside>
        </div>
      </section>

      {qrOrder && (() => {
        const amount = Number(qrOrder._amount || 0);
        const memo = qrOrder.code || `DH${qrOrder.id}`;
        const qrUrl = buildQrUrl(paymentInfo, amount, memo);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
              <div className="border-b border-zinc-100 px-6 py-4">
                <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Thanh toán chuyển khoản</div>
                <h3 className="mt-1 text-[20px] font-black text-zinc-950">Quét mã QR để chuyển khoản</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex justify-center">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR chuyển khoản" className="h-56 w-56 rounded-2xl border border-zinc-200 object-contain" />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-xs text-zinc-500">
                      Cửa hàng chưa cấu hình mã QR. Vui lòng chuyển khoản theo thông tin bên dưới.
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 rounded-2xl bg-zinc-50 p-4 text-sm">
                  {paymentInfo?.bankName && <Row k="Ngân hàng" v={paymentInfo.bankName} />}
                  {paymentInfo?.bankAccountNo && <Row k="Số tài khoản" v={paymentInfo.bankAccountNo} />}
                  {paymentInfo?.bankAccountName && <Row k="Chủ tài khoản" v={paymentInfo.bankAccountName} />}
                  <Row k="Số tiền" v={formatCurrency(amount)} strong />
                  <Row k="Nội dung CK" v={memo} strong />
                </div>
                <p className="mt-3 text-center text-xs text-zinc-500">
                  Sau khi chuyển khoản, bấm <b>“Tôi đã chuyển khoản”</b>. Đơn sẽ ở trạng thái <b>chờ xác nhận</b> cho đến khi cửa hàng xác nhận.
                </p>
                {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div>}
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button" onClick={handleClaimedTransfer} disabled={claiming}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:bg-zinc-300"
                  >
                    {claiming ? <><FiLoader className="h-4 w-4 animate-spin" /> Đang gửi...</> : 'Tôi đã chuyển khoản'}
                  </button>
                  <button type="button" onClick={handlePayLater} disabled={claiming} className="text-sm font-bold text-zinc-500 transition hover:text-zinc-900">
                    Thanh toán sau
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function Row({ k, v, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{k}</span>
      <span className={`text-right ${strong ? 'font-black text-[#d71920]' : 'font-bold text-zinc-900'}`}>{v}</span>
    </div>
  );
}

/* ── Reusable Radio Pill ── */
function RadioPill({ name, value, label, checked, onChange }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition ${checked ? 'border-[#d71920] bg-red-50 text-[#d71920]' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${checked ? 'border-[#d71920]' : 'border-zinc-300'}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-[#d71920]" />}
      </span>
      {label}
    </label>
  );
}

/* ── Reusable Field Component ── */
function Field({ label, id, name, value, onChange, error, placeholder, type = 'text', multiline }) {
  const baseClass = 'w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20';
  const errorClass = error ? 'border-red-300' : 'border-zinc-200';
  return (
    <div>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-zinc-700">{label}</label>}
      {multiline ? (
        <textarea id={id} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3} className={`${baseClass} ${errorClass} resize-none`} />
      ) : (
        <input id={id} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${baseClass} ${errorClass}`} />
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

export default CheckoutPage;
