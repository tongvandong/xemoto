import { useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi, userApi, voucherApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { formatCurrency } from '../utils/formatters.js';

const RECEIVING_METHODS = [
  { value: 'Delivery', label: 'Giao hàng tận nơi' },
  { value: 'Pickup', label: 'Nháº­n trá»±c tiáº¿p' },
];

const ORDER_TYPES = [
  { value: 'FullPayment', label: 'Thanh toán toàn bộ' },
  { value: 'Deposit', label: 'Đặt cọc trước' },
  { value: 'Installment', label: 'Trả góp' },
];

const INSTALLMENT_TERMS = [6, 9, 12];
const INSTALLMENT_MIN_DOWN_PERCENT = 30;
const DEPOSIT_MIN_PERCENT = 20;

const PAYMENT_METHODS = [
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Chuyển khoản qua tài khoản ngân hàng' },
  { value: 'Momo', label: 'Ví MoMo', icon: '📱', desc: 'Thanh toán qua ví điện tử MoMo' },
  { value: 'VNPay', label: 'VNPay', icon: '💳', desc: 'Thanh toán qua cổng VNPay' },
];

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
  installmentTerm: 6,
  installmentBorrowerName: '',
  installmentIdNumber: '',
  installmentIdIssueDate: '',
  installmentIdIssuePlace: '',
  installmentBirthDate: '',
  installmentPhone: '',
  installmentResidence: '',
  installmentOccupation: '',
  installmentCompany: '',
  installmentWorkMonths: '',
  installmentMonthlyIncome: '',
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

function normalizeAddress(data = {}) {
  return {
    id: data.id ?? data.Id ?? data.maDiaChi ?? data.MaDiaChi,
    fullName: data.fullName ?? data.FullName ?? data.hoTenNhanHang ?? data.HoTenNhanHang ?? '',
    phoneNumber: data.phoneNumber ?? data.PhoneNumber ?? data.soDienThoaiNhanHang ?? data.SoDienThoaiNhanHang ?? '',
    addressLine: data.addressLine ?? data.AddressLine ?? data.diaChiNhanHang ?? data.DiaChiNhanHang ?? '',
    ward: data.ward ?? data.Ward ?? data.phuongXa ?? data.PhuongXa ?? '',
    district: data.district ?? data.District ?? data.quanHuyen ?? data.QuanHuyen ?? '',
    province: data.province ?? data.Province ?? data.tinhThanh ?? data.TinhThanh ?? '',
    note: data.note ?? data.Note ?? data.ghiChu ?? data.GhiChu ?? '',
    isDefault: Boolean(data.isDefault ?? data.IsDefault ?? data.laMacDinh ?? data.LaMacDinh),
  };
}

function formatAddress(address) {
  return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ');
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
    const minDeposit = Math.round((totalAmount * DEPOSIT_MIN_PERCENT) / 100);
    if (!deposit || deposit <= 0) errors.depositAmount = 'Vui lòng nhập số tiền đặt cọc';
    else if (deposit < minDeposit) errors.depositAmount = `Đặt cọc tối thiểu ${DEPOSIT_MIN_PERCENT}% (${formatCurrency(minDeposit)})`;
    else if (deposit >= totalAmount) errors.depositAmount = 'Số tiền đặt cọc phải nhỏ hơn tổng tiền';
  }

  if (form.orderType === 'Installment') {
    const down = Number(form.depositAmount);
    const minDown = Math.round((totalAmount * INSTALLMENT_MIN_DOWN_PERCENT) / 100);
    if (!down || down < minDown) errors.depositAmount = `Tráº£ trÆ°á»›c tá»‘i thiá»ƒu ${INSTALLMENT_MIN_DOWN_PERCENT}% (${formatCurrency(minDown)})`;
    else if (down >= totalAmount) errors.depositAmount = 'Tiá»n tráº£ trÆ°á»›c pháº£i nhá» hÆ¡n tá»•ng tiá»n';
    if (!INSTALLMENT_TERMS.includes(Number(form.installmentTerm))) errors.installmentTerm = 'Vui lòng chọn kỳ hạn trả góp';
    if (!form.installmentBorrowerName.trim()) errors.installmentBorrowerName = 'Vui lòng nhập họ tên người vay';
    if (!/^[0-9]{9,15}$/.test(form.installmentIdNumber.trim())) errors.installmentIdNumber = 'Số CCCD/CMND không hợp lệ';
    if (!form.installmentIdIssueDate) errors.installmentIdIssueDate = 'Vui lòng nhập ngày cấp CCCD';
    if (!form.installmentIdIssuePlace.trim()) errors.installmentIdIssuePlace = 'Vui lòng nhập nơi cấp CCCD';
    if (!/^[0-9+]{9,15}$/.test(form.installmentPhone.trim())) errors.installmentPhone = 'Số điện thoại người vay không hợp lệ';
    if (!form.installmentResidence.trim()) errors.installmentResidence = 'Vui lòng nhập địa chỉ thường trú';
  }

  return errors;
}

function buildOrderPayload({ form, cart, items, appliedVoucher, voucherDiscount, amounts }) {
  return {
    shippingAddressId: form.shippingAddressId || null,
    shippingFullName: form.shippingFullName.trim(),
    shippingPhoneNumber: form.shippingPhoneNumber.trim(),
    shippingEmail: form.shippingEmail.trim() || null,
    shippingAddressLine: form.shippingAddressLine.trim(),
    shippingWard: form.shippingWard.trim() || null,
    shippingDistrict: form.shippingDistrict.trim() || null,
    shippingProvince: form.shippingProvince.trim(),
    receivingMethod: form.receivingMethod,
    orderType: form.orderType,
    depositAmount: amounts.needsDownPayment ? amounts.depositNum : 0,
    soKyTraGop: form.orderType === 'Installment' ? Number(form.installmentTerm) : null,
    installmentApplication: form.orderType === 'Installment' ? {
      hoTenNguoiVay: form.installmentBorrowerName.trim(),
      soCCCD: form.installmentIdNumber.trim(),
      ngayCapCCCD: form.installmentIdIssueDate || null,
      noiCapCCCD: form.installmentIdIssuePlace.trim(),
      ngaySinh: form.installmentBirthDate || null,
      soDienThoai: form.installmentPhone.trim(),
      diaChiThuongTru: form.installmentResidence.trim(),
      ngheNghiep: form.installmentOccupation.trim() || null,
      tenCongTy: form.installmentCompany.trim() || null,
      thoiGianLamViecThang: form.installmentWorkMonths ? Number(form.installmentWorkMonths) : null,
      thuNhapHangThang: form.installmentMonthlyIncome ? Number(form.installmentMonthlyIncome) : null,
    } : null,
    note: form.note.trim() || null,
    fulfillmentNote: form.fulfillmentNote.trim() || null,
    pickupAppointmentAt: form.pickupAppointmentAt || null,
    paymentMethod: form.paymentMethod,
    cartId: cart?.id || null,
    voucherCode: appliedVoucher ? appliedVoucher.code : null,
    discountAmount: appliedVoucher ? voucherDiscount : 0,
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
      setVoucherError(err?.message || 'Lá»—i kiá»ƒm tra voucher');
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
      const payload = buildOrderPayload({
        form: { ...form, shippingAddressId: selectedAddress?.id },
        cart,
        items,
        appliedVoucher,
        voucherDiscount,
        amounts: { needsDownPayment, depositNum },
      });
      const res = await orderApi.create(payload);
      await refreshCart().catch(() => {});
      const order = res.order || res.Order || res;
      // Send the user to the QR payment page; they only reach /checkout/success after the
      // admin marks the order as paid (PaymentPage polls and redirects automatically).
      navigate(`/checkout/payment?orderId=${order.id || order.Id}`, { replace: true });
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

  return (
    <>
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* â”€â”€ Left: Shipping Form â”€â”€ */}
          <form onSubmit={handleSubmit} className="space-y-5" id="checkout-form">
            <div className="rounded-[30px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Thanh toán</div>
              <h1 className="mt-2 text-[28px] font-black text-zinc-950 sm:text-[34px]">Thông tin giao hàng</h1>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            )}

            {/* Contact Info */}
            <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <h2 className="text-[18px] font-black text-zinc-950">Thông tin liên hệ</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Họ và tên *" id="shippingFullName" name="shippingFullName" value={form.shippingFullName} onChange={handleChange} error={fieldErrors.shippingFullName} placeholder="Nguyễn Văn A" />
                <Field label="Số điện thoại *" id="shippingPhoneNumber" name="shippingPhoneNumber" value={form.shippingPhoneNumber} onChange={handleChange} error={fieldErrors.shippingPhoneNumber} placeholder="0912345678" type="tel" />
              </div>
              <div className="mt-4">
                <Field label="Email" id="shippingEmail" name="shippingEmail" value={form.shippingEmail} onChange={handleChange} placeholder="email@example.com" type="email" />
              </div>
            </div>

            {/* Receiving Method */}
            <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <h2 className="text-[18px] font-black text-zinc-950">Phương thức nhận hàng</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {RECEIVING_METHODS.map((m) => (
                  <RadioPill key={m.value} name="receivingMethod" value={m.value} label={m.label} checked={form.receivingMethod === m.value} onChange={handleChange} />
                ))}
              </div>
            </div>

            {/* Address */}
            {form.receivingMethod === 'Delivery' && (
              <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-[18px] font-black text-zinc-950">Địa chỉ giao hàng</h2>
                    <p className="mt-1 text-sm text-zinc-500">Chọn địa chỉ đã lưu trong tài khoản để giao hàng.</p>
                  </div>
                  <Link to="/account?tab=address" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d71920] px-4 text-sm font-extrabold text-[#d71920] transition hover:bg-red-50">
                    Thêm địa chỉ
                  </Link>
                </div>

                {addressesLoading && (
                  <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-500">Đang tải địa chỉ nhận hàng...</div>
                )}

                {!addressesLoading && addressesError && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">{addressesError}</div>
                )}

                {!addressesLoading && !addressesError && addresses.length === 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <div className="text-sm font-extrabold text-amber-800">Bạn chưa có địa chỉ nhận hàng</div>
                    <p className="mt-1 text-sm leading-6 text-amber-700">Vui lòng thêm địa chỉ nhận hàng trong tài khoản trước khi đặt đơn giao tận nơi.</p>
                    <Link to="/account?tab=address" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-[#d71920] px-4 text-sm font-extrabold text-white transition hover:bg-[#b61016]">
                      Thêm địa chỉ nhận hàng
                    </Link>
                  </div>
                )}

                {!addressesLoading && !addressesError && addresses.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                          String(selectedAddressId) === String(address.id)
                            ? 'border-[#d71920] bg-red-50/50'
                            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedAddressId"
                          value={address.id}
                          checked={String(selectedAddressId) === String(address.id)}
                          onChange={(event) => setSelectedAddressId(event.target.value)}
                          className="mt-1 h-4 w-4 accent-[#d71920]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-black text-zinc-950">
                            {address.fullName}
                            <span className="font-bold text-zinc-400">|</span>
                            <span>{address.phoneNumber}</span>
                            {address.isDefault && <span className="rounded-full bg-[#d71920] px-2 py-0.5 text-[11px] font-extrabold text-white">Mặc định</span>}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-zinc-600">{formatAddress(address)}</span>
                          {address.note && <span className="mt-1 block text-xs text-zinc-400">{address.note}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pickup */}
            {form.receivingMethod === 'Pickup' && (
              <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <h2 className="text-[18px] font-black text-zinc-950">Hẹn ngày nhận xe</h2>
                <div className="mt-5"><Field label="Ngày hẹn nhận" id="pickupAppointmentAt" name="pickupAppointmentAt" value={form.pickupAppointmentAt} onChange={handleChange} type="datetime-local" /></div>
                <div className="mt-4"><Field label="Ghi chú giao nhận" id="fulfillmentNote" name="fulfillmentNote" value={form.fulfillmentNote} onChange={handleChange} placeholder="Ghi chú giao nhận..." multiline /></div>
              </div>
            )}

            {/* Order Type */}
            <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <h2 className="text-[18px] font-black text-zinc-950">Hình thức thanh toán</h2>
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
            </div>

            {/* Installment application form */}
            {isInstallment && (
              <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <h2 className="text-[18px] font-black text-zinc-950">Hồ sơ trả góp</h2>
                <p className="mt-1 text-sm text-zinc-500">Vui lòng cung cấp thông tin chính xác để cửa hàng thẩm định hồ sơ.</p>

                <div className="mt-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Thông tin cá nhân</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Họ và tên người vay *" id="installmentBorrowerName" name="installmentBorrowerName" value={form.installmentBorrowerName} onChange={handleChange} error={fieldErrors.installmentBorrowerName} placeholder="Nguyễn Văn A" />
                    <Field label="Sá»‘ CCCD/CMND *" id="installmentIdNumber" name="installmentIdNumber" value={form.installmentIdNumber} onChange={handleChange} error={fieldErrors.installmentIdNumber} placeholder="0123456789" />
                    <Field label="Ngày cấp CCCD *" id="installmentIdIssueDate" name="installmentIdIssueDate" value={form.installmentIdIssueDate} onChange={handleChange} error={fieldErrors.installmentIdIssueDate} type="date" />
                    <Field label="NÆ¡i cáº¥p CCCD *" id="installmentIdIssuePlace" name="installmentIdIssuePlace" value={form.installmentIdIssuePlace} onChange={handleChange} error={fieldErrors.installmentIdIssuePlace} placeholder="VD: Cá»¥c CS QLHC vá» TTXH" />
                    <Field label="Ngày sinh" id="installmentBirthDate" name="installmentBirthDate" value={form.installmentBirthDate} onChange={handleChange} type="date" />
                    <Field label="Số điện thoại người vay *" id="installmentPhone" name="installmentPhone" value={form.installmentPhone} onChange={handleChange} error={fieldErrors.installmentPhone} placeholder="0912345678" type="tel" />
                  </div>
                  <div className="mt-4">
                    <Field label="Địa chỉ thường trú *" id="installmentResidence" name="installmentResidence" value={form.installmentResidence} onChange={handleChange} error={fieldErrors.installmentResidence} placeholder="Số nhà, đường, phường, quận, tỉnh/thành" />
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Công việc &amp; thu nhập</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Nghề nghiệp" id="installmentOccupation" name="installmentOccupation" value={form.installmentOccupation} onChange={handleChange} placeholder="VD: Nhân viên văn phòng" />
                    <Field label="Công ty đang làm" id="installmentCompany" name="installmentCompany" value={form.installmentCompany} onChange={handleChange} placeholder="Tên công ty/cửa hàng" />
                    <Field label="Thời gian làm việc (tháng)" id="installmentWorkMonths" name="installmentWorkMonths" value={form.installmentWorkMonths} onChange={handleChange} placeholder="24" type="number" />
                    <Field label="Thu nhập hàng tháng (VND)" id="installmentMonthlyIncome" name="installmentMonthlyIncome" value={form.installmentMonthlyIncome} onChange={handleChange} placeholder="15000000" type="number" />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
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
            <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <h2 className="text-[18px] font-black text-zinc-950">Ghi chú đơn hàng</h2>
              <div className="mt-4"><Field id="note" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú thêm cho đơn hàng..." multiline /></div>
            </div>
          </form>

          {/* â”€â”€ Right: Order Summary â”€â”€ */}
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <h2 className="text-[22px] font-black text-zinc-950">Đơn hàng của bạn</h2>

              <div className="mt-5 max-h-[340px] space-y-3 overflow-y-auto pr-1">
                {items.map((item) => {
                  const name = item.product?.name || item.productName || 'Sáº£n pháº©m';
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
                      <div className="text-xs text-green-600">
                        {appliedVoucher.discountType === 'FreeShipping' ? 'Áp dụng voucher miễn phí vận chuyển' : `Giảm ${formatCurrency(voucherDiscount)}`}
                      </div>
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
                              <div className="text-xs text-zinc-600">{v.description || `Giáº£m ${v.discountType === 'Percent' ? v.discountValue + '%' : formatCurrency(v.discountValue)}`}</div>
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
                  <span>Phí giao hàng{carrierName ? ` (${carrierName})` : ''}</span>
                  <strong className="font-bold text-zinc-950">{shippingLoading ? 'Đang tính...' : formatCurrency(shippingFee)}</strong>
                </div>
                {shippingError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{shippingError}</div>
                )}
                {shippingDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Voucher miễn phí vận chuyển</span>
                    <strong className="font-bold">-{formatCurrency(shippingDiscount)}</strong>
                  </div>
                )}
                {shippingDiscount > 0 && originalShippingFee > shippingFee && (
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Phí vận chuyển gốc</span>
                    <span>{formatCurrency(originalShippingFee)}</span>
                  </div>
                )}
                {voucherDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Giáº£m voucher</span>
                    <strong className="font-bold">-{formatCurrency(voucherDiscount)}</strong>
                  </div>
                )}
                {needsDownPayment && (
                  <>
                    <div className="flex items-center justify-between text-sm text-amber-600">
                      <span>{isInstallment ? 'Trả trước' : 'Đặt cọc'}</span>
                      <strong className="font-bold">{formatCurrency(depositNum)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      <span>{isInstallment ? `Còn lại (góp ${form.installmentTerm} kỳ, chưa gồm lãi)` : 'Còn lại cần thanh toán'}</span>
                      <strong className="font-bold">{formatCurrency(remainingAmount > 0 ? remainingAmount : 0)}</strong>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-2 text-[#d71920]">
                  <span className="text-sm font-extrabold uppercase tracking-[0.08em]">Tá»•ng cá»™ng</span>
                  <strong className="text-[24px] font-black">{formatCurrency(totalAmount)}</strong>
                </div>
              </div>

              <button
                type="submit" form="checkout-form" disabled={submitting || shippingLoading || addressesLoading || !items.length || (form.receivingMethod === 'Delivery' && !selectedAddress)}
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
    </>
  );
}

/* â”€â”€ Reusable Radio Pill â”€â”€ */
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

/* â”€â”€ Reusable Field Component â”€â”€ */
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
