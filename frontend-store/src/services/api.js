// Lớp service gọi backend của storefront.
// - Gọi axios qua `api` (httpClient.js lo baseURL/token/interceptor).
// - Đọc đúng tên field camelCase backend; chỉ map những shape UI hiện còn dùng chung.
// - Adapter này nói chuyện với backend xemoto (MoToSale) qua gateway 5100.
import api, {
  responseData,
  getToken,
  decodeJwtPayload,
  getClaim,
  isTokenExpired,
  clearAuthStorage,
  getStoredUser,
  normalizeLoginResponse,
  saveAuthUser,
  mergeStoredUser,
  AUTH_CHANGED_EVENT,
} from './httpClient.js';
import {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
} from '../utils/productMappers.js';
import { notifyCartChanged } from '../utils/cartEvents.js';
import { normalizeImageUrl } from '../utils/formatters.js';

const toNumber = (value) => Number(value || 0);
const listOf = (data) => (Array.isArray(data) ? data : data?.items || []);

const mapShippingStatus = (status) => {
  if (status === 'Unallocated' || status === 'Allocated' || status === 'Preparing' || status === 'Pending') {
    return 'Preparing';
  }
  if (status === 'Shipped' || status === 'Shipping') {
    return 'Shipping';
  }
  if (status === 'Fulfilled' || status === 'Delivered' || status === 'Completed') {
    return 'Delivered';
  }
  return status;
};

const mapPayment = (raw = {}) => ({
  id: raw.id,
  paymentCode: raw.code,
  orderId: raw.orderId,
  paymentType: raw.paymentType,
  amount: toNumber(raw.amount),
  paymentMethod: raw.method,
  paymentStatus: raw.status,
  transactionRef: raw.transactionRef,
  paidAt: raw.paidAt,
  createdAt: raw.paidAt,
});

const mapOrderLine = (line) => ({
  id: line.id,
  productId: line.productId,
  productVariantId: line.skuId,
  productNameSnapshot: line.productName,
  skuSnapshot: line.skuCode,
  unitPrice: toNumber(line.unitPrice),
  quantity: toNumber(line.qty),
  lineTotal: toNumber(line.lineTotal),
});

const mapOrder = (raw = {}) => ({
  id: raw.id,
  orderCode: raw.code,
  userId: raw.userId,
  customerName: raw.customerName,
  shippingFullName: raw.shippingRecipient,
  shippingPhoneNumber: raw.shippingPhone,
  shippingEmail: raw.shippingEmail,
  shippingAddressLine: raw.shippingAddress,
  receivingMethod: raw.receivingMethod,
  paymentMethod: raw.paymentMethod,
  orderType: raw.orderType,
  subtotal: toNumber(raw.subtotal),
  discountAmount: toNumber(raw.discountTotal),
  shippingFee: toNumber(raw.shippingFee),
  totalAmount: toNumber(raw.grandTotal),
  depositAmount: toNumber(raw.depositAmount),
  remainingAmount: toNumber(raw.remainingAmount),
  orderStatus: raw.orderStatus,
  paymentStatus: raw.paymentStatus,
  shippingStatus: mapShippingStatus(raw.fulfillmentStatus || raw.orderStatus),
  note: raw.note,
  fulfillmentNote: raw.fulfillmentNote,
  pickupAppointmentAt: raw.pickupAppointmentAt,
  createdAt: raw.placedAt,
  items: (raw.lines || []).map(mapOrderLine),
  payments: (raw.payments || []).map(mapPayment),
  histories: raw.histories || [],
  vouchers: [],
});

const mapVoucher = (raw = {}) => ({
  id: raw.id,
  code: raw.code,
  description: raw.description,
  discountType: raw.discountType,
  discountValue: toNumber(raw.discountValue),
  maxDiscountValue: raw.maxDiscount,
  minOrderValue: toNumber(raw.minOrderValue),
  usageLimit: raw.usageLimit,
  perUserLimit: raw.perUserLimit,
  usedCount: raw.usedCount,
  startAt: raw.startAt,
  endAt: raw.endAt,
  status: raw.status,
});

const mapFavorite = (raw = {}) => ({
  id: raw.id,
  userId: raw.userId,
  productId: raw.productId,
  createdAt: raw.createdDate,
  product: raw.product ? normalizeProduct(raw.product) : null,
});

const mapReview = (raw = {}) => ({
  id: raw.id,
  rating: toNumber(raw.rating),
  title: raw.title,
  comment: raw.comment,
  userName: raw.userName,
  status: raw.reviewStatus,
  imageUrl: normalizeImageUrl(raw.imageUrl),
  createdAt: raw.createdDate,
});

const buildReviewPayload = (payload = {}) => ({
  rating: payload.rating,
  title: payload.title ?? null,
  comment: payload.comment ?? '',
  orderId: payload.orderId ?? null,
});

const mapAddressBody = (data) => ({
  recipientName: data.fullName,
  phone: data.phoneNumber,
  line: data.addressLine,
  ward: data.ward,
  district: data.district,
  province: data.province,
  note: data.note,
});

const toQuery = (params = {}) => {
  const sortMap = {
    price_asc: { SortBy: 'price', SortDescending: false },
    price_desc: { SortBy: 'price', SortDescending: true },
    name_asc: { SortBy: 'name', SortDescending: false },
    name_desc: { SortBy: 'name', SortDescending: true },
    year_asc: { SortBy: 'created', SortDescending: false },
    year_desc: { SortBy: 'created', SortDescending: true },
  };

  const paramMap = {
    categoryId: 'CategoryId',
    brandId: 'BrandId',
    carModelId: 'VehicleModelId',
    compatibleCarModelId: 'CompatibleVehicleModelId',
    showroomId: 'ShowroomId',
    productType: 'Kind',
    status: 'Status',
    minPrice: 'MinPrice',
    maxPrice: 'MaxPrice',
  };

  const source = { ...params };
  if (sortMap[params.sortBy]) {
    delete source.sortBy;
    Object.assign(source, sortMap[params.sortBy]);
  }

  const mapped = Object.entries(source).reduce((acc, [key, value]) => {
    acc[paramMap[key] || key] = value;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(mapped).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  );
};

// ===== Auth =====

export const authApi = {
  async login({ username, password, rememberMe }) {
    const { data } = await api.post('/auth/login', { email: username, password });
    const user = normalizeLoginResponse(data);
    saveAuthUser(user, rememberMe === true || rememberMe === 'true' || rememberMe === 'on');
    return user;
  },

  register: (data) => api.post('/auth/register', {
    fullName: data.name,
    email: data.email,
    phoneNumber: data.phone,
    password: data.password,
  }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(responseData),

  resetPassword: (data) => api.post('/auth/reset-password', {
    email: data.email,
    token: data.token,
    newPassword: data.password,
  }).then(responseData),

  logout() {
    clearAuthStorage();
  },

  getCurrentUser() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearAuthStorage(false);
      return null;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      return storedUser;
    }

    const claims = decodeJwtPayload(token);
    return {
      token,
      userId: getClaim(claims, 'nameidentifier') || claims?.sub,
      username: getClaim(claims, 'name'),
      name: getClaim(claims, 'name'),
      email: getClaim(claims, 'email') || getClaim(claims, 'name'),
      role: getClaim(claims, 'role'),
      raw: claims,
    };
  },

  async validateCurrentUser() {
    const currentUser = authApi.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      const { data } = await api.get('/users/me');
      return mergeStoredUser({
        userId: data.id ?? currentUser.userId,
        name: data.fullName ?? currentUser.name,
        username: data.email ?? currentUser.username,
        email: data.email ?? currentUser.email,
        phone: data.phoneNumber ?? currentUser.phone,
        status: data.status,
      });
    } catch (error) {
      clearAuthStorage();
      throw error;
    }
  },

  updateStoredUser: (data) => mergeStoredUser(data),
};

// ===== Sản phẩm =====

export const productApi = {
  getAll: (params) => api.get('/products', { params: toQuery(params) }).then((res) => normalizeProductList(res.data)),
  getById: (id) => api.get(`/products/${id}`).then((res) => normalizeProduct(res.data)),
  getFilters: () => api.get('/products/filters').then((res) => normalizeFilters(res.data)),
};

// ===== Đánh giá =====

export const reviewApi = {
  getByProduct: (productId) => api.get(`/products/${productId}/reviews`).then((res) => listOf(res.data).map(mapReview)),

  async getSummary(productId) {
    const { data } = await api.get(`/products/${productId}/reviews/summary`);
    return {
      productId: data.productId,
      totalReviews: Number(data.totalReviews || 0),
      averageRating: Number(data.averageRating || 0),
    };
  },

  async getMine(productId) {
    const { data } = await api.get(`/reviews/product/${productId}/me`);
    return {
      productId: data.productId,
      isAuthenticated: data.isAuthenticated === true,
      hasPurchased: data.hasPurchased === true,
      canReview: data.canReview === true,
      eligibleOrderId: data.eligibleOrderId,
      reason: data.reason,
      myReview: data.myReview ? mapReview(data.myReview) : null,
    };
  },

  async create(productId, payload) {
    const { data } = await api.post(`/products/${productId}/reviews`, buildReviewPayload(payload));
    return { ...data, review: data?.review ? mapReview(data.review) : null };
  },
};

// ===== Danh mục =====

export const categoryApi = {
  async getAll() {
    const response = await api.get('/categories');
    return { ...response, data: listOf(response.data).map(normalizeCategory) };
  },
};

// ===== Giỏ hàng =====

const handleCart = (response) => {
  const cart = normalizeCart(response.data);
  notifyCartChanged(cart);
  return cart;
};

export const cartApi = {
  getMine: () => api.get('/cart').then(handleCart),

  addItem: (data) => api.post('/cart/items', {
    skuId: data.variantId ?? data.skuId ?? data.productVariantId ?? data.productId,
    qty: data.quantity ?? 1,
  }).then(handleCart),

  async updateItem(id, quantityOrData) {
    const data = typeof quantityOrData === 'object' ? quantityOrData : { quantity: quantityOrData };
    await api.put(`/cart/items/${id}`, { qty: data.quantity });
    return cartApi.getMine();
  },

  async removeItem(id) {
    await api.delete(`/cart/items/${id}`);
    return cartApi.getMine();
  },

  async clear() {
    const cart = await cartApi.getMine();
    const items = cart?.items || [];
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await api.delete(`/cart/items/${item.id}`);
    }
    return cartApi.getMine();
  },
};

// ===== Đơn hàng =====

export const orderApi = {
  async getAll(params) {
    const { data } = await api.get('/orders/mine', { params });
    if (Array.isArray(data)) return data.map(mapOrder);
    const items = data?.items;
    return items ? items.map(mapOrder) : mapOrder(data);
  },

  getMyOrders: () => orderApi.getAll(),

  async getById(id) {
    const { data } = await api.get(`/orders/${id}`);
    return mapOrder(data);
  },

  create: (data) => api.post('/orders', {
    shippingRecipient: data.shippingFullName,
    shippingPhone: data.shippingPhoneNumber,
    shippingEmail: data.shippingEmail,
    shippingAddress: [data.shippingAddressLine, data.shippingWard, data.shippingDistrict, data.shippingProvince].filter(Boolean).join(', '),
    receivingMethod: data.receivingMethod || 'Delivery',
    orderType: data.orderType || 'FullPayment',
    shippingFee: data.shippingFee ?? 0,
    depositAmount: data.depositAmount ?? 0,
    note: data.note,
    fulfillmentNote: data.fulfillmentNote,
    pickupAppointmentAt: data.pickupAppointmentAt,
    paymentMethod: data.paymentMethod,
    voucherCode: data.voucherCode,
  }).then((res) => mapOrder(res.data)),

  // Backend không có endpoint payment-info riêng: ghép thông tin chuyển khoản
  // từ chi tiết đơn (số tiền cần trả) + showroom (tài khoản ngân hàng), dựng QR VietQR.
  async getPaymentInfo(id) {
    const [order, showroom] = await Promise.all([
      api.get(`/orders/${id}`).then((res) => mapOrder(res.data)).catch(() => null),
      shopApi.getShowroomProfile().catch(() => ({})),
    ]);

    // Khớp PaymentService.CalculateClaimAmount của backend: đơn đặt cọc chưa thu đồng nào
    // thì khách chuyển TIỀN CỌC trước; các trường hợp khác chuyển phần còn lại / tổng đơn.
    // (Sau khi cọc được xác nhận, backend trả paymentStatus về Unpaid nên phải tra thêm payments[].)
    const hasPaidRecord = (order?.payments || []).some((p) => p.paymentStatus === 'Paid');
    const isFirstDepositPayment = order?.orderType === 'Deposit'
      && order?.paymentStatus === 'Unpaid'
      && !hasPaidRecord
      && Number(order?.depositAmount || 0) > 0;
    // Làm tròn về đồng chẵn (VND không có hào): số tiền cần chuyển phải khớp đúng số khách đã nhập đặt cọc,
    // tránh lệch vài đồng do số thập phân khi tính giảm giá / phần còn lại.
    const amountDue = Math.round(
      isFirstDepositPayment
        ? Number(order.depositAmount)
        : Number(order?.remainingAmount || order?.totalAmount || 0),
    );
    const orderCode = order?.orderCode || id;
    const bankCode = showroom.bankCode || '';
    const accountNo = showroom.bankAccountNo || '';
    const accountName = showroom.bankAccountName || showroom.name || '';
    const memo = `Thanh toan don ${orderCode}`;
    const qrImageUrl = showroom.bankQrUrl || (
      bankCode && accountNo
        ? `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${encodeURIComponent(amountDue)}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`
        : ''
    );

    return {
      daCauHinhNganHang: Boolean(accountNo || qrImageUrl),
      qrImageUrl,
      tenNganHang: showroom.bankName || bankCode,
      soTaiKhoan: accountNo,
      chuTaiKhoan: accountName,
      noiDungChuyenKhoan: memo,
      soTienCanThanhToan: amountDue,
      maDonHangKinhDoanh: orderCode,
    };
  },

  // Phí giao hàng đồng giá lấy từ cấu hình vận hành của admin (Setting "DefaultShippingFee",
  // backend trả về qua /showrooms). Nhận trực tiếp tại cửa hàng thì không tính phí.
  // Backend cộng shippingFee gửi lên vào tổng đơn khi checkout (CheckoutRequest.ShippingFee).
  async getShippingQuote({ receivingMethod } = {}) {
    if (receivingMethod === 'Pickup') {
      return { shippingFee: 0, originalShippingFee: 0, discountAmount: 0 };
    }

    const showroom = await shopApi.getShowroomProfile();
    const fee = Math.max(0, Number(showroom.defaultShippingFee || 0));
    return { shippingFee: fee, originalShippingFee: fee, discountAmount: 0 };
  },

  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }).then((res) => mapOrder(res.data)),

  claimTransfer: (id) => api.post(`/orders/${id}/payment-claim`).then(responseData),
};

// ===== Trả góp (đăng ký tư vấn qua đối tác tài chính) =====

export const installmentApi = {
  // Gửi hồ sơ tư vấn trả góp từ trang thanh toán; admin thẩm định trong trang "Hồ sơ trả góp" rồi duyệt thành đơn bán.
  submitApplication: (data) => api.post('/installment-applications', data).then(responseData),
  // Hồ sơ trả góp của chính khách (đăng nhập) — hiển thị trong "Đơn hàng của tôi".
  getMine: () => api.get('/installment-applications/mine').then((res) => {
    const items = res.data?.items || res.data || [];
    return Array.isArray(items) ? items : [];
  }),
  getById: (id) => api.get(`/installment-applications/${id}`).then((res) => res.data),
  update: (id, data) => api.put(`/installment-applications/${id}`, data).then(responseData),
  cancel: (id) => api.post(`/installment-applications/${id}/cancel`).then(responseData),
  // Đăng ký tư vấn trả góp từ trang /tra-gop (map field tường minh để khớp contract backend).
  register: (data) => api.post('/installment-applications', {
    productId: data.productId ?? null,
    skuId: data.skuId ?? null,
    productName: data.productName,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail ?? null,
    financePartner: data.financePartner ?? null,
    downPayment: Number(data.downPayment) || 0,
    months: Number(data.months) || 0,
    note: data.note ?? null,
  }),
};

// ===== Voucher =====

export const voucherApi = {
  getAll: (params) => api.get('/vouchers/available', { params: toQuery(params) }).then((res) => {
    const items = res.data?.items || res.data;
    return Array.isArray(items) ? items.map(mapVoucher) : items;
  }),

  async validate(data) {
    const { data: result } = await api.post('/vouchers/validate', data);
    return {
      valid: result.valid === true,
      message: result.message,
      discountAmount: Number(result.discountAmount || 0),
      voucher: result.voucher ? mapVoucher(result.voucher) : null,
    };
  },

  async getApplicable({ subtotal = 0 } = {}) {
    const all = await voucherApi.getAll();
    return all.filter((voucher) => Number(voucher.minOrderValue || 0) <= Number(subtotal || 0));
  },

  async save(code) {
    const voucherCode = String(code || '').trim().toUpperCase();
    if (!voucherCode) return { success: false, saved: false, message: 'Ma voucher khong hop le' };
    const all = await voucherApi.getAll();
    const voucher = all.find((item) => String(item.code || '').toUpperCase() === voucherCode);
    if (!voucher) return { success: false, saved: false, message: 'Voucher khong con kha dung' };
    const key = `motosale:saved-vouchers:${getStoredUser()?.userId || getStoredUser()?.email || 'guest'}`;
    const savedCodes = new Set(JSON.parse(window.localStorage?.getItem(key) || '[]'));
    const existed = savedCodes.has(voucherCode);
    savedCodes.add(voucherCode);
    window.localStorage?.setItem(key, JSON.stringify(Array.from(savedCodes)));
    return { success: true, saved: true, existed, voucher };
  },

  async getMine() {
    const key = `motosale:saved-vouchers:${getStoredUser()?.userId || getStoredUser()?.email || 'guest'}`;
    const savedCodes = new Set(JSON.parse(window.localStorage?.getItem(key) || '[]'));
    if (!savedCodes.size) return [];
    const all = await voucherApi.getAll();
    return all.filter((voucher) => savedCodes.has(String(voucher.code || '').toUpperCase()));
  },

  async getMineCount() {
    return (await voucherApi.getMine()).length;
  },
};

// ===== Người dùng & địa chỉ =====

export const userApi = {
  getProfile: () => api.get('/users/me').then(responseData),

  updateProfile: (data) => api.put('/users/me', {
    fullName: data.name,
    phoneNumber: data.phone,
  }).then(responseData),

  changePassword: (data) => api.put('/users/me/password', {
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
  }).then(responseData),

  getAddresses: () => api.get('/users/me/addresses').then((res) => res.data?.items || []),

  createAddress: (data) => api.post('/users/me/addresses', { ...mapAddressBody(data), isDefault: Boolean(data.isDefault) }).then(responseData),

  updateAddressById: (id, data) => api.put(`/users/me/addresses/${id}`, { ...mapAddressBody(data), isDefault: Boolean(data.isDefault) }).then(responseData),

  setDefaultAddress: (id) => api.put(`/users/me/addresses/${id}/default`).then(responseData),

  deleteAddress: (id) => api.delete(`/users/me/addresses/${id}`).then(responseData),
};

// ===== Yêu thích =====

export const favoriteApi = {
  getMine: () => api.get('/favorites').then((res) => {
    const items = res.data?.items || res.data;
    return Array.isArray(items) ? items.map(mapFavorite) : [];
  }),

  add: (productId) => api.post(`/favorites/${productId}`).then((res) => mapFavorite(res.data)),

  remove: (productId) => api.delete(`/favorites/${productId}`),
};

// ===== Nội dung (blog, FAQ, liên hệ, voucher công khai) =====

export const contentApi = {
  getFaqs: (params) => api.get('/content/faq', { params }),
  createContactRequest: (data) => api.post('/content/contacts', {
    fullName: data.fullName ?? data.name,
    phone: data.phoneNumber ?? data.phone,
    email: data.email,
    subject: data.subject,
    body: data.message,
    type: data.inquiryType ?? 'Consultation',
    productId: data.productId,
  }),
  getHomeBanners: () => api.get('/content/home-banners').then(responseData),
  getBlogPosts: (params) => api.get('/content/posts/public', { params }),
};

// Hồ sơ cửa hàng (thông tin liên hệ + tài khoản ngân hàng) gần như không đổi trong một phiên,
// nhưng được nhiều nơi cần (Header, Footer, trang liên hệ, dựng QR, tính phí ship). Cache lại
// 1 promise để toàn app chỉ gọi /showrooms một lần thay vì 4-6 lần mỗi lượt tải trang.
let showroomProfilePromise = null;

export const shopApi = {
  getShowroomProfile() {
    if (!showroomProfilePromise) {
      showroomProfilePromise = api.get('/showrooms')
        .then(responseData)
        .then((data) => (Array.isArray(data) ? data : data?.items || (data ? [data] : []))[0] || {})
        .catch((err) => {
          showroomProfilePromise = null; // cho phép thử lại ở lần gọi sau khi lỗi mạng
          throw err;
        });
    }

    return showroomProfilePromise;
  },

  async getPaymentInfo() {
    try {
      const s = await shopApi.getShowroomProfile();
      return {
        storeName: s.name,
        bankName: s.bankName || '',
        bankCode: s.bankCode || '',
        bankAccountNo: s.bankAccountNo || '',
        bankAccountName: s.bankAccountName || s.name || '',
        bankQrUrl: s.bankQrUrl || '',
      };
    } catch {
      return { bankName: '', bankCode: '', bankAccountNo: '', bankAccountName: '', bankQrUrl: '' };
    }
  },
};

export { AUTH_CHANGED_EVENT };
export default api;
