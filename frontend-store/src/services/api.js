// Lớp service gọi backend của storefront (3 lớp: page -> api -> http; chuẩn hóa ở normalizers.js).
// - Gọi axios qua `api` (httpClient.js lo baseURL/token/interceptor).
// - Map dữ liệu qua helper trong normalizers.js (mapOrder/mapVoucher/field/toQuery...), trả shape ổn định cho UI.
// - Adapter này nói chuyện với backend xemoto (MoToSale) qua gateway 5100, contract tiếng Anh.
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
  mapOrder,
  mapVoucher,
  mapFavorite,
  mapReview,
  buildReviewPayload,
  toQuery,
  listOf,
  mapAddressBody,
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
} from './normalizers.js';
import { notifyCartChanged } from '../utils/cartEvents.js';

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
    const order = mapOrder(data);
    return { ...order, order, details: order.items, vouchers: order.vouchers };
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
    const [order, showroomData] = await Promise.all([
      api.get(`/orders/${id}`).then((res) => mapOrder(res.data)).catch(() => null),
      api.get('/showrooms').then(responseData).catch(() => []),
    ]);

    const showrooms = Array.isArray(showroomData) ? showroomData : showroomData?.items || [];
    const showroom = showrooms[0] || {};

    const amountDue = Number(order?.remainingAmount || order?.depositAmount || order?.totalAmount || 0);
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

  // Cửa hàng hiện miễn phí giao hàng toàn bộ đơn online (backend không có API tính phí ship).
  // Giữ tên hàm vì CheckoutPage gọi; trả về cấu trúc quote với phí 0.
  async getShippingQuote() {
    return {
      shippingFee: 0,
      originalShippingFee: 0,
      discountAmount: 0,
    };
  },

  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }).then((res) => mapOrder(res.data)),

  claimTransfer: (id) => api.post(`/orders/${id}/payment-claim`).then(responseData),
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

export const shopApi = {
  async getShowroomProfile() {
    const data = await api.get('/showrooms').then(responseData);
    return (Array.isArray(data) ? data : data?.items || (data ? [data] : []))[0] || {};
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

// ===== Trả góp (đăng ký tư vấn qua đối tác tài chính) =====

export const installmentApi = {
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

export { AUTH_CHANGED_EVENT };
export default api;
