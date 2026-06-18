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
// Đối tác tài chính liên kết — khách chọn 1 đối tác để thẩm định & giải ngân (giống các sàn lớn).
export const FINANCE_PARTNERS = [
  { name: 'HD SAISON', tagline: 'Thủ tục nhanh, chỉ cần CCCD + GPLX' },
  { name: 'Home Credit', tagline: 'Nhiều gói trả góp ưu đãi 0% lãi suất' },
  { name: 'FE Credit', tagline: 'Hạn mức cao, kỳ hạn linh hoạt' },
  { name: 'Mirae Asset', tagline: 'Lãi suất tốt cho khách thu nhập ổn định' },
];
export const FINANCE_PARTNER_NAMES = FINANCE_PARTNERS.map((partner) => partner.name);
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
  installmentFinancePartner: FINANCE_PARTNERS[0].name,
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
    // Hồ sơ trả góp không thu trước bất kỳ khoản nào — đối tác tài chính xử lý toàn bộ.
    if (!form.installmentFinancePartner?.trim()) errors.installmentFinancePartner = 'Vui lòng chọn đối tác tài chính';
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
export function buildInstallmentApplication({ form, items, subtotal }) {
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
    `Hồ sơ trả góp gửi từ website — tạm tính ${formatCurrency(subtotal)}, kỳ hạn ${form.installmentTerm} tháng.`,
    `Đối tác tài chính khách chọn: ${form.installmentFinancePartner?.trim() || ''}`,
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
    financePartner: form.installmentFinancePartner?.trim() || null,
    downPayment: 0,
    months: Number(form.installmentTerm),
    note: noteLines.filter(Boolean).join('\n'),
  };
}

// Tách hồ sơ trả góp đã lưu (field DTO + note có cấu trúc) để prefill form sửa.
export function parseInstallmentApplication(app = {}) {
  const note = String(app.note || '');
  const pick = (prefix) => {
    const line = note.split(/\r?\n/).map((s) => s.trim()).find((s) => s.toLowerCase().startsWith(prefix.toLowerCase()));
    return line ? line.slice(prefix.length).trim() : '';
  };
  const idLine = pick('CCCD/CMND:');
  const idMatch = idLine.match(/^([0-9]{9,15})(?:\s+\(cấp\s+([^)]*?)(?:\s+tại\s+([^)]*))?\))?/i);
  return {
    borrowerName: app.customerName || '',
    phone: app.customerPhone || '',
    email: app.customerEmail || '',
    financePartner: app.financePartner || FINANCE_PARTNERS[0].name,
    downPayment: Number(app.downPayment) || 0,
    months: Number(app.months) || INSTALLMENT_TERMS[0],
    idNumber: idMatch?.[1] || '',
    idIssueDate: idMatch?.[2] || '',
    idIssuePlace: idMatch?.[3] || '',
    birthDate: pick('Ngày sinh:'),
    residence: pick('Địa chỉ thường trú:'),
    occupation: pick('Nghề nghiệp:'),
    company: pick('Công ty:'),
    workMonths: pick('Thâm niên:').replace(/[^\d]/g, ''),
    monthlyIncome: pick('Thu nhập:').replace(/[^\d]/g, ''),
    receiving: pick('Nhận hàng:'),
    customerNote: pick('Ghi chú của khách:'),
  };
}

// Dựng lại note có cấu trúc khi khách sửa hồ sơ (đúng prefix để parser hợp đồng/admin đọc được).
export function buildInstallmentNote(p) {
  const lines = [
    `Hồ sơ trả góp (cập nhật) — kỳ hạn ${p.months} tháng.`,
    `Đối tác tài chính khách chọn: ${p.financePartner || ''}`,
    `Người liên hệ: ${(p.borrowerName || '').trim()} — ${(p.phone || '').trim()}`,
    p.receiving ? `Nhận hàng: ${p.receiving}` : '',
    `CCCD/CMND: ${(p.idNumber || '').trim()}${p.idIssueDate ? ` (cấp ${p.idIssueDate}` : ''}${(p.idIssuePlace || '').trim() ? ` tại ${p.idIssuePlace.trim()})` : (p.idIssueDate ? ')' : '')}`,
    p.birthDate ? `Ngày sinh: ${p.birthDate}` : '',
    (p.residence || '').trim() ? `Địa chỉ thường trú: ${p.residence.trim()}` : '',
    (p.occupation || '').trim() ? `Nghề nghiệp: ${p.occupation.trim()}` : '',
    (p.company || '').trim() ? `Công ty: ${p.company.trim()}` : '',
    p.workMonths ? `Thâm niên: ${p.workMonths} tháng` : '',
    p.monthlyIncome ? `Thu nhập: ${formatCurrency(Number(p.monthlyIncome))}/tháng` : '',
    (p.customerNote || '').trim() ? `Ghi chú của khách: ${p.customerNote.trim()}` : '',
  ];
  return lines.filter(Boolean).join('\n');
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
