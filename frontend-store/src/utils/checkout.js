// Hằng số + logic thuần của trang thanh toán (validate, dựng payload).
// Tách khỏi CheckoutPage.jsx để trang chỉ còn lo state và bố cục.
// LƯU Ý: tên field trong payload là contract với backend — không đổi.
import { formatCurrency } from './formatters.js';

export const RECEIVING_METHODS = [
  { value: 'Delivery', label: 'Giao hàng tận nơi' },
  { value: 'Pickup', label: 'Nhận trực tiếp' },
];

export const ORDER_TYPES = [
  { value: 'FullPayment', label: 'Thanh toán toàn bộ' },
  { value: 'Deposit', label: 'Đặt cọc trước' },
  { value: 'Installment', label: 'Trả góp' },
];

export const INSTALLMENT_TERMS = [6, 9, 12];
export const INSTALLMENT_MIN_DOWN_PERCENT = 30;
export const DEPOSIT_MIN_PERCENT = 20;

// Backend chỉ hỗ trợ 2 phương thức cho đơn online: BankTransfer (quét QR) và COD.
export const PAYMENT_METHODS = [
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', icon: '🏦', desc: 'Quét mã QR chuyển khoản, cửa hàng xác nhận khi nhận được tiền' },
  { value: 'COD', label: 'Thanh toán khi nhận hàng', icon: '🚚', desc: 'Trả tiền mặt khi nhận xe/hàng tại nhà hoặc cửa hàng' },
];

export const initialCheckoutForm = {
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

export function getSubtotal(cart, items) {
  return Number(cart?.subtotal ?? items.reduce((sum, item) => {
    const price = item.unitPrice || item.product?.salePrice || item.product?.basePrice || 0;
    return sum + (item.lineTotal ?? price * (item.quantity || 1));
  }, 0));
}

// Gom productIds/categoryIds/brandIds của giỏ hàng để backend xét điều kiện voucher.
export function getCartVoucherContext(items) {
  return {
    productIds: [...new Set(items.map((item) => item.productId || item.product?.id).filter(Boolean))],
    categoryIds: [...new Set(items.map((item) => item.product?.categoryId).filter(Boolean))],
    brandIds: [...new Set(items.map((item) => item.product?.brandId).filter(Boolean))],
  };
}

export function validateCheckoutForm(form, totalAmount) {
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
    if (!down || down < minDown) errors.depositAmount = `Trả trước tối thiểu ${INSTALLMENT_MIN_DOWN_PERCENT}% (${formatCurrency(minDown)})`;
    else if (down >= totalAmount) errors.depositAmount = 'Tiền trả trước phải nhỏ hơn tổng tiền';
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

// Đơn trả góp KHÔNG tạo order ngay: gửi hồ sơ cho admin thẩm định (trang "Hồ sơ trả góp"),
// duyệt xong cửa hàng mới lập đơn bán. Map form checkout -> CreateInstallmentApplicationRequest.
export function buildInstallmentApplication({ form, items, subtotal, depositNum }) {
  const firstItem = items[0] || {};
  const productNames = items
    .map((item) => {
      const name = item.product?.name || item.productName || 'Sản phẩm';
      return `${name} x${item.quantity || 1}`;
    })
    .join(', ');

  const deliveryAddress = [form.shippingAddressLine, form.shippingWard, form.shippingDistrict, form.shippingProvince]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  const noteLines = [
    `Hồ sơ trả góp gửi từ website — tạm tính ${formatCurrency(subtotal)}, trả trước ${formatCurrency(depositNum)}, kỳ hạn ${form.installmentTerm} tháng.`,
    `Người liên hệ: ${form.shippingFullName.trim()} — ${form.shippingPhoneNumber.trim()}`,
    form.receivingMethod === 'Delivery'
      ? `Nhận hàng: giao tận nơi — ${deliveryAddress}`
      : 'Nhận hàng: trực tiếp tại cửa hàng',
    `CCCD/CMND: ${form.installmentIdNumber.trim()}${form.installmentIdIssueDate ? ` (cấp ${form.installmentIdIssueDate}` : ''}${form.installmentIdIssuePlace.trim() ? ` tại ${form.installmentIdIssuePlace.trim()})` : form.installmentIdIssueDate ? ')' : ''}`,
    form.installmentBirthDate ? `Ngày sinh: ${form.installmentBirthDate}` : '',
    `Địa chỉ thường trú: ${form.installmentResidence.trim()}`,
    form.installmentOccupation.trim() ? `Nghề nghiệp: ${form.installmentOccupation.trim()}` : '',
    form.installmentCompany.trim() ? `Công ty: ${form.installmentCompany.trim()}` : '',
    form.installmentWorkMonths ? `Thâm niên: ${form.installmentWorkMonths} tháng` : '',
    form.installmentMonthlyIncome ? `Thu nhập: ${formatCurrency(Number(form.installmentMonthlyIncome))}/tháng` : '',
    form.note.trim() ? `Ghi chú của khách: ${form.note.trim()}` : '',
  ];

  return {
    productId: firstItem.productId || firstItem.product?.id || null,
    skuId: firstItem.productVariantId || firstItem.productVariant?.id || null,
    productName: productNames || 'Sản phẩm trong giỏ hàng',
    customerName: form.installmentBorrowerName.trim(),
    customerPhone: form.installmentPhone.trim(),
    customerEmail: form.shippingEmail.trim() || null,
    financePartner: null,
    downPayment: depositNum,
    months: Number(form.installmentTerm),
    note: noteLines.filter(Boolean).join('\n'),
  };
}

export function buildOrderPayload({ form, cart, items, appliedVoucher, voucherDiscount, amounts }) {
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
    shippingFee: amounts.shippingFee ?? 0,
    depositAmount: amounts.needsDownPayment ? amounts.depositNum : 0,
    note: form.note.trim() || null,
    fulfillmentNote: form.fulfillmentNote.trim() || null,
    pickupAppointmentAt: form.pickupAppointmentAt || null,
    paymentMethod: form.paymentMethod,
    // Backend tự lấy sản phẩm từ giỏ hàng server-side và tự tính giảm giá từ voucherCode,
    // nên payload không cần gửi danh sách items hay số tiền giảm.
    voucherCode: appliedVoucher ? appliedVoucher.code : null,
  };
}
