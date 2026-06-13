import { useEffect, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { installmentApi, orderApi, userApi, voucherApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import SectionCard from '../components/common/SectionCard.jsx';
import Field from '../components/forms/Field.jsx';
import RadioPill from '../components/forms/RadioPill.jsx';
import CheckoutAddressSection from '../components/checkout/CheckoutAddressSection.jsx';
import CheckoutSummary from '../components/checkout/CheckoutSummary.jsx';
import InstallmentProfileSection from '../components/checkout/InstallmentProfileSection.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { normalizeAddress } from '../utils/address.js';
import {
  RECEIVING_METHODS,
  ORDER_TYPES,
  INSTALLMENT_TERMS,
  INSTALLMENT_MIN_DOWN_PERCENT,
  DEPOSIT_MIN_PERCENT,
  PAYMENT_METHODS,
  initialCheckoutForm,
  getSubtotal,
  getCartVoucherContext,
  validateCheckoutForm,
  buildOrderPayload,
  buildInstallmentApplication,
} from '../utils/checkout.js';
import { formatCurrency } from '../utils/formatters.js';

function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();
  const { notify } = useNotification();
  const items = cart?.items || [];

  const [form, setForm] = useState(initialCheckoutForm);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  // Trả góp không tạo đơn ngay mà gửi hồ sơ cho cửa hàng thẩm định; true = đã gửi xong.
  const [installmentSubmitted, setInstallmentSubmitted] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [applicableVouchers, setApplicableVouchers] = useState([]);
  const [loadingVouchersList, setLoadingVouchersList] = useState(false);
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login?redirect=/checkout', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && !items.length) refreshCart().catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    async function loadAddresses() {
      setAddressesLoading(true);
      setAddressesError('');
      try {
        const rows = await userApi.getAddresses();
        if (cancelled) return;

        const nextAddresses = (Array.isArray(rows) ? rows : []).map(normalizeAddress);
        setAddresses(nextAddresses);
        const defaultAddress = nextAddresses.find((item) => item.isDefault) || nextAddresses[0];
        setSelectedAddressId(defaultAddress?.id ? String(defaultAddress.id) : '');
      } catch (err) {
        if (cancelled) return;
        setAddresses([]);
        setSelectedAddressId('');
        setAddressesError(err?.response?.data?.message || err?.message || 'Không thể tải địa chỉ nhận hàng.');
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    }

    loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const subtotal = getSubtotal(cart, items);
  const selectedAddress = addresses.find((item) => String(item.id) === String(selectedAddressId));

  // Đổ địa chỉ đã chọn vào form giao hàng; bỏ chọn thì xóa các field tương ứng.
  useEffect(() => {
    if (!selectedAddress) {
      setForm((prev) => ({
        ...prev,
        shippingFullName: '',
        shippingPhoneNumber: '',
        shippingEmail: prev.shippingEmail,
        shippingAddressLine: '',
        shippingWard: '',
        shippingDistrict: '',
        shippingProvince: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      shippingFullName: selectedAddress.fullName,
      shippingAddressId: selectedAddress.id,
      shippingPhoneNumber: selectedAddress.phoneNumber,
      shippingAddressLine: selectedAddress.addressLine,
      shippingWard: selectedAddress.ward,
      shippingDistrict: selectedAddress.district,
      shippingProvince: selectedAddress.province,
      fulfillmentNote: selectedAddress.note || prev.fulfillmentNote,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      shippingFullName: '',
      shippingPhoneNumber: '',
      shippingAddressLine: '',
      shippingProvince: '',
    }));
  }, [selectedAddressId, selectedAddress?.id]);

  // Gợi ý các voucher đang áp dụng được cho giỏ hàng hiện tại.
  useEffect(() => {
    if (items.length > 0 && subtotal > 0) {
      const fetchApplicableVouchers = async () => {
        setLoadingVouchersList(true);
        try {
          const { productIds, categoryIds, brandIds } = getCartVoucherContext(items);

          const res = await voucherApi.getApplicable({ subtotal, productIds, categoryIds, brandIds, orderType: form.orderType });
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

  // Tính phí giao hàng mỗi khi thay đổi nơi nhận / hình thức đơn / voucher.
  useEffect(() => {
    if (!isAuthenticated || !items.length || subtotal <= 0) {
      setShippingQuote(null);
      return;
    }

    if (form.receivingMethod === 'Delivery' && !form.shippingProvince.trim()) {
      setShippingQuote(null);
      setShippingError('');
      return;
    }

    const fetchShippingQuote = async () => {
      setShippingLoading(true);
      setShippingError('');
      try {
        const quote = await orderApi.getShippingQuote({
          receivingMethod: form.receivingMethod,
          shippingProvince: form.shippingProvince,
          voucherCode: appliedVoucher?.code,
          orderType: form.orderType,
        });
        setShippingQuote(quote);
      } catch (err) {
        setShippingQuote(null);
        setShippingError(err?.response?.data?.message || err?.message || 'Không thể tính phí giao hàng.');
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShippingQuote();
  }, [isAuthenticated, items.length, subtotal, form.receivingMethod, form.shippingProvince, form.orderType, appliedVoucher?.code]);

  const shippingFee = Number(shippingQuote?.shippingFee ?? shippingQuote?.ShippingFee ?? 0);
  const originalShippingFee = Number(shippingQuote?.originalShippingFee ?? shippingQuote?.OriginalShippingFee ?? shippingFee);
  const shippingDiscount = Number(shippingQuote?.discountAmount ?? shippingQuote?.DiscountAmount ?? 0);
  const carrierName = shippingQuote?.carrierName ?? shippingQuote?.CarrierName;
  const totalAmount = Math.max(0, subtotal - voucherDiscount + shippingFee);
  const needsDownPayment = form.orderType === 'Deposit' || form.orderType === 'Installment';
  const isInstallment = form.orderType === 'Installment';
  const depositNum = needsDownPayment ? Number(form.depositAmount) || 0 : 0;
  const remainingAmount = needsDownPayment ? Math.max(0, totalAmount - depositNum) : 0;
  const minDownPayment = Math.round((totalAmount * INSTALLMENT_MIN_DOWN_PERCENT) / 100);
  const minDeposit = Math.round((totalAmount * DEPOSIT_MIN_PERCENT) / 100);

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
      const res = await voucherApi.validate({ code: code.trim(), subtotal, productIds, categoryIds, brandIds, orderType: form.orderType, shippingFee: originalShippingFee });
      if (res.valid) {
        setAppliedVoucher(res.voucher);
        setVoucherDiscount(res.voucher?.discountType === 'FreeShipping' ? 0 : res.discountAmount || 0);
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
    const errors = validateCheckoutForm(form, totalAmount);
    if (form.receivingMethod === 'Delivery' && !selectedAddress) {
      errors.shippingAddressLine = 'Vui lòng thêm địa chỉ nhận hàng trước khi đặt hàng';
    }
    setFieldErrors(errors);
    if (errors.shippingAddressLine && !selectedAddress) {
      setError('Bạn chưa có địa chỉ nhận hàng. Vui lòng thêm địa chỉ trong tài khoản trước khi thanh toán.');
    }
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

    if (shippingError) {
      setError(shippingError);
      return;
    }

    setSubmitting(true);

    try {
      // Trả góp: gửi hồ sơ cho cửa hàng thẩm định (admin duyệt mới lập đơn bán),
      // không tạo đơn và không yêu cầu chuyển khoản ngay.
      if (isInstallment) {
        const application = buildInstallmentApplication({ form, items, subtotal, depositNum });
        await installmentApi.submitApplication(application);
        setInstallmentSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const payload = buildOrderPayload({
        form: { ...form, shippingAddressId: selectedAddress?.id },
        appliedVoucher,
        amounts: { needsDownPayment, depositNum, shippingFee },
      });
      const res = await orderApi.create(payload);
      await refreshCart().catch(() => {});
      const order = res.order || res.Order || res;
      const orderId = order.id || order.Id;

      if (form.paymentMethod === 'BankTransfer') {
        // Send the user to the QR payment page; they only reach /checkout/success after the
        // admin marks the order as paid (PaymentPage polls and redirects automatically).
        navigate(`/checkout/payment?orderId=${orderId}`, { replace: true });
      } else {
        // COD: không cần chuyển khoản trước, đưa khách về chi tiết đơn để theo dõi.
        notify('Đặt hàng thành công. Bạn sẽ thanh toán khi nhận hàng.', 'success');
        navigate(`/orders/${orderId}`, { replace: true });
      }
    } catch (err) {
      const data = err?.response?.data;
      const detail = data?.detail && data.detail !== data.message ? ` (${data.detail})` : '';
      setError((data?.message || err?.message || 'Đặt hàng thất bại. Vui lòng thử lại.') + detail);
      // eslint-disable-next-line no-console
      console.error('Create order failed:', err?.response?.status, data || err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) return null;

  // Màn xác nhận sau khi gửi hồ sơ trả góp thành công.
  if (installmentSubmitted) {
    return (
      <>
        <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Trả góp' }]} />
        <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-16">
          <div className="mx-auto max-w-[560px] text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <FiCheck className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mt-6 text-[32px] font-black text-zinc-950">Đã gửi hồ sơ trả góp!</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              Cửa hàng sẽ liên hệ với bạn qua số điện thoại trong hồ sơ để thẩm định và xác nhận đơn trả góp.
              Sau khi hồ sơ được duyệt, đơn hàng sẽ xuất hiện trong mục Đơn hàng của tôi.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/orders" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]">
                Đơn hàng của tôi
              </Link>
              <Link to="/products" className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-zinc-700 transition hover:bg-zinc-50">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Left: Shipping Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5" id="checkout-form">
            <div className="rounded-[30px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Thanh toán</div>
              <h1 className="mt-2 text-[28px] font-black text-zinc-950 sm:text-[34px]">Thông tin giao hàng</h1>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            )}

            {/* Contact Info */}
            <SectionCard title="Thông tin liên hệ">
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Họ và tên *" id="shippingFullName" name="shippingFullName" value={form.shippingFullName} onChange={handleChange} error={fieldErrors.shippingFullName} placeholder="Nguyễn Văn A" />
                <Field label="Số điện thoại *" id="shippingPhoneNumber" name="shippingPhoneNumber" value={form.shippingPhoneNumber} onChange={handleChange} error={fieldErrors.shippingPhoneNumber} placeholder="0912345678" type="tel" />
              </div>
              <div className="mt-4">
                <Field label="Email" id="shippingEmail" name="shippingEmail" value={form.shippingEmail} onChange={handleChange} placeholder="email@example.com" type="email" />
              </div>
            </SectionCard>

            {/* Receiving Method */}
            <SectionCard title="Phương thức nhận hàng">
              <div className="mt-4 flex flex-wrap gap-3">
                {RECEIVING_METHODS.map((m) => (
                  <RadioPill key={m.value} name="receivingMethod" value={m.value} label={m.label} checked={form.receivingMethod === m.value} onChange={handleChange} />
                ))}
              </div>
            </SectionCard>

            {/* Address */}
            {form.receivingMethod === 'Delivery' && (
              <CheckoutAddressSection
                addresses={addresses}
                loading={addressesLoading}
                error={addressesError}
                selectedAddressId={selectedAddressId}
                onSelectAddress={setSelectedAddressId}
              />
            )}

            {/* Pickup */}
            {form.receivingMethod === 'Pickup' && (
              <SectionCard title="Hẹn ngày nhận xe">
                <div className="mt-5"><Field label="Ngày hẹn nhận" id="pickupAppointmentAt" name="pickupAppointmentAt" value={form.pickupAppointmentAt} onChange={handleChange} type="datetime-local" /></div>
                <div className="mt-4"><Field label="Ghi chú giao nhận" id="fulfillmentNote" name="fulfillmentNote" value={form.fulfillmentNote} onChange={handleChange} placeholder="Ghi chú giao nhận..." multiline /></div>
              </SectionCard>
            )}

            {/* Order Type */}
            <SectionCard title="Hình thức thanh toán">
              <div className="mt-4 flex flex-wrap gap-3">
                {ORDER_TYPES.map((t) => (
                  <RadioPill key={t.value} name="orderType" value={t.value} label={t.label} checked={form.orderType === t.value} onChange={handleChange} />
                ))}
              </div>
              {form.orderType === 'Deposit' && (
                <div className="mt-4">
                  <Field
                    label={`Số tiền đặt cọc * (tối thiểu ${DEPOSIT_MIN_PERCENT}% — ${formatCurrency(minDeposit)})`}
                    id="depositAmount"
                    name="depositAmount"
                    value={form.depositAmount}
                    onChange={handleChange}
                    error={fieldErrors.depositAmount}
                    placeholder={String(minDeposit || 5000000)}
                    type="number"
                  />
                  <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs leading-5 text-amber-700">
                    Phần còn lại ({formatCurrency(remainingAmount)}) sẽ thanh toán khi nhận xe.
                  </p>
                </div>
              )}
              {isInstallment && (
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="mb-1.5 block text-sm font-bold text-zinc-700">Kỳ hạn trả góp *</span>
                    <div className="flex flex-wrap gap-3">
                      {INSTALLMENT_TERMS.map((term) => (
                        <RadioPill key={term} name="installmentTerm" value={String(term)} label={`${term} tháng`} checked={Number(form.installmentTerm) === term} onChange={handleChange} />
                      ))}
                    </div>
                    {fieldErrors.installmentTerm && <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.installmentTerm}</p>}
                  </div>
                  <Field
                    label={`Số tiền trả trước * (tối thiểu ${INSTALLMENT_MIN_DOWN_PERCENT}% — ${formatCurrency(minDownPayment)})`}
                    id="depositAmount"
                    name="depositAmount"
                    value={form.depositAmount}
                    onChange={handleChange}
                    error={fieldErrors.depositAmount}
                    placeholder={String(minDownPayment || 5000000)}
                    type="number"
                  />
                </div>
              )}
            </SectionCard>

            {/* Installment application form */}
            {isInstallment && (
              <InstallmentProfileSection form={form} fieldErrors={fieldErrors} onChange={handleChange} />
            )}

            {/* Payment Method */}
            <SectionCard title="Phương thức thanh toán">
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
            </SectionCard>

            {/* Note */}
            <SectionCard title="Ghi chú đơn hàng">
              <div className="mt-4"><Field id="note" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú thêm cho đơn hàng..." multiline /></div>
            </SectionCard>
          </form>

          {/* ── Right: Order Summary ── */}
          <CheckoutSummary
            items={items}
            totals={{
              subtotal,
              shippingFee,
              originalShippingFee,
              shippingDiscount,
              carrierName,
              voucherDiscount,
              totalAmount,
              depositNum,
              remainingAmount,
              needsDownPayment,
              isInstallment,
              installmentTerm: form.installmentTerm,
            }}
            shipping={{ loading: shippingLoading, error: shippingError }}
            voucher={{
              applied: appliedVoucher,
              code: voucherCode,
              loading: voucherLoading,
              error: voucherError,
              suggestions: applicableVouchers,
              loadingSuggestions: loadingVouchersList,
            }}
            onVoucherCodeChange={handleVoucherCodeChange}
            onApplyVoucher={() => handleApplyVoucherCode(voucherCode)}
            onApplySuggestedVoucher={applySuggestedVoucher}
            onRemoveVoucher={handleRemoveVoucher}
            submitting={submitting}
            submitDisabled={submitting || shippingLoading || addressesLoading || !items.length || (form.receivingMethod === 'Delivery' && !selectedAddress)}
          />
        </div>
      </section>
    </>
  );
}

export default CheckoutPage;
