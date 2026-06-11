// Lớp service gọi backend của storefront (3 lớp: page -> api -> http; chuẩn hóa ở normalizers.js).
// - Gọi axios qua `api` (httpClient.js lo baseURL/token/interceptor).
// - Map dữ liệu qua helper trong normalizers.js (mapOrder/mapVoucher/field/toQuery...), trả shape ổn định cho UI.
// Tên hàm rút gọn theo nhóm: get/getById/create/update/remove + tên nghiệp vụ rõ.
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
  field,
  mapOrder,
  mapPayment,
  mapVoucher,
  mapFavorite,
  mapReview,
  buildReviewForm,
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
  getAll: (params) => api.get('/products', { params: toQuery({ DangHoatDong: true, ...params }) }).then((res) => normalizeProductList(res.data)),
  getById: (id) => api.get(`/products/${id}`).then((res) => normalizeProduct(res.data)),
  getFilters: () => api.get('/products/filters').then((res) => normalizeFilters(res.data)),
};

// ===== Đánh giá =====

export const reviewApi = {
  getByProduct: (productId) => api.get(`/products/${productId}/reviews`).then((res) => listOf(res.data).map(mapReview)),

  async getSummary(productId) {
    const { data } = await api.get(`/products/${productId}/reviews/summary`);
    return {
      productId: field(data, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      totalReviews: Number(field(data, 'totalReviews', 'TotalReviews', 'tongDanhGia', 'TongDanhGia') || 0),
      averageRating: Number(field(data, 'averageRating', 'AverageRating', 'diemTrungBinh', 'DiemTrungBinh') || 0),
    };
  },

  async getMine(productId) {
    const { data } = await api.get(`/reviews/product/${productId}/me`);
    const myReview = field(data, 'myReview', 'MyReview', 'danhGiaCuaToi', 'DanhGiaCuaToi');
    return {
      productId: field(data, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      isAuthenticated: field(data, 'isAuthenticated', 'IsAuthenticated', 'daDangNhap', 'DaDangNhap') === true,
      hasPurchased: field(data, 'hasPurchased', 'HasPurchased', 'daMua', 'DaMua') === true,
      canReview: field(data, 'canReview', 'CanReview', 'coTheDanhGia', 'CoTheDanhGia') === true,
      eligibleOrderId: field(data, 'eligibleOrderId', 'EligibleOrderId', 'maDonHangDuDieuKien', 'MaDonHangDuDieuKien'),
      reason: field(data, 'reason', 'Reason', 'lyDo', 'LyDo'),
      myReview: myReview ? mapReview(myReview) : null,
    };
  },

  async create(productId, payload) {
    const { data } = await api.post(`/products/${productId}/reviews`, buildReviewForm({ ...payload, productId }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ...data, review: data?.review || data?.Review ? mapReview(data.review || data.Review) : null };
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
    qty: data.quantity ?? data.soLuong ?? 1,
  }).then(handleCart),

  async updateItem(id, quantityOrData) {
    const data = typeof quantityOrData === 'object' ? quantityOrData : { quantity: quantityOrData };
    await api.put(`/cart/items/${id}`, { qty: data.quantity ?? data.soLuong });
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
    const items = data?.items || data?.Items;
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

  async getPaymentInfo(id) {
    try {
      return await api.get(`/orders/${id}/payment-info`).then(responseData);
    } catch (error) {
      if (error?.response?.status && error.response.status !== 404) throw error;
      const [orderRes, showroomRes] = await Promise.all([
        api.get(`/orders/${id}`).then((res) => mapOrder(res.data)).catch(() => null),
        api.get('/showrooms').then(responseData).catch(() => []),
      ]);
      const showroom = (Array.isArray(showroomRes) ? showroomRes : showroomRes?.items || showroomRes?.Items || (showroomRes ? [showroomRes] : []))[0] || {};
      const amountDue = Number(orderRes?.remainingAmount || orderRes?.depositAmount || orderRes?.totalAmount || 0);
      const orderCode = orderRes?.orderCode || id;
      const bankCode = showroom.bankCode || showroom.BankCode || '';
      const accountNo = showroom.bankAccountNo || showroom.BankAccountNo || '';
      const accountName = showroom.bankAccountName || showroom.BankAccountName || showroom.name || showroom.Name || '';
      const memo = `Thanh toan don ${orderCode}`;
      const qrImageUrl = showroom.bankQrUrl || showroom.BankQrUrl || (
        bankCode && accountNo
          ? `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${encodeURIComponent(amountDue)}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`
          : ''
      );
      return {
        daCauHinhNganHang: Boolean(accountNo || qrImageUrl),
        qrImageUrl,
        tenNganHang: showroom.bankName || showroom.BankName || bankCode,
        soTaiKhoan: accountNo,
        chuTaiKhoan: accountName,
        noiDungChuyenKhoan: memo,
        soTienCanThanhToan: amountDue,
        maDonHangKinhDoanh: orderCode,
      };
    }
  },

  getShippingQuote: (data) => api.post('/orders/shipping-quote', {
    receivingMethod: data.receivingMethod,
    shippingProvince: data.shippingProvince,
    voucherCode: data.voucherCode,
    orderType: data.orderType,
  }).then(responseData).catch(() => ({
    shippingFee: data.receivingMethod === 'Pickup' ? 0 : 0,
    originalShippingFee: data.receivingMethod === 'Pickup' ? 0 : 0,
    discountAmount: 0,
  })),

  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }).then((res) => mapOrder(res.data)),

  claimTransfer: (id) => api.post(`/orders/${id}/payment-claim`).then(responseData),

  requestRefund: (id, data) => api.post(`/orders/${id}/request-refund`, {
    tenNganHang: data.bankName,
    soTaiKhoan: data.accountNo,
    chuTaiKhoan: data.accountName,
    lyDo: data.reason,
  }).then((res) => mapOrder(res.data)),
};

// ===== Thanh toán =====

export const paymentApi = {
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`).then((res) => {
    const data = res.data;
    const items = data?.items || data?.Items || data?.payments || data?.Payments || data;
    return Array.isArray(items) ? items.map(mapPayment) : items;
  }),
};

// ===== Voucher =====

export const voucherApi = {
  getAll: (params) => api.get('/vouchers/available', { params: toQuery(params) }).then((res) => {
    const items = res.data?.items || res.data?.Items || res.data;
    return Array.isArray(items) ? items.map(mapVoucher) : items;
  }),

  async validate(data) {
    const { data: result } = await api.post('/vouchers/validate', data);
    return {
      ...result,
      valid: field(result, 'valid', 'Valid', 'hopLe', 'HopLe') === true,
      message: field(result, 'message', 'Message', 'lyDoKhongHopLe', 'LyDoKhongHopLe'),
      discountAmount: Number(field(result, 'discountAmount', 'DiscountAmount', 'soTienGiam', 'SoTienGiam') || 0),
      voucher: mapVoucher(field(result, 'voucher', 'Voucher') || result),
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

  getAddress: () => api.get('/users/me/address').then(responseData),

  async getAddresses() {
    try {
      const { data } = await api.get('/users/me/addresses');
      return data?.items || data?.Items || [];
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
      const fallback = await userApi.getAddress();
      return fallback && Object.keys(fallback).length ? [fallback] : [];
    }
  },

  updateAddress: (data) => api.post('/users/me/addresses', { ...mapAddressBody(data), isDefault: true }).then(responseData),

  async createAddress(data) {
    try {
      const { data: result } = await api.post('/users/me/addresses', { ...mapAddressBody(data), isDefault: Boolean(data.isDefault) });
      return result;
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
      return userApi.updateAddress(data);
    }
  },

  async updateAddressById(id, data) {
    try {
      const { data: result } = await api.post('/users/me/addresses', { ...mapAddressBody(data), isDefault: Boolean(data.isDefault), id });
      return result;
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
      return userApi.updateAddress(data);
    }
  },

  setDefaultAddress: (id) => api.put(`/users/me/addresses/${id}/default`).then(responseData).catch(() => ({ id, isDefault: true })),

  deleteAddress: (id) => api.delete(`/users/me/addresses/${id}`).then(responseData).catch(() => ({ id })),
};

// ===== Yêu thích =====

export const favoriteApi = {
  getMine: () => api.get('/favorites').then((res) => {
    const items = res.data?.items || res.data?.Items || res.data;
    return Array.isArray(items) ? items.map(mapFavorite) : [];
  }),

  add: (productId) => api.post(`/favorites/${productId}`).then((res) => mapFavorite(res.data)),

  remove: (productId) => api.delete(`/favorites/${productId}`),
};

// ===== Nội dung (blog, FAQ, liên hệ, voucher công khai) =====

export const contentApi = {
  getFaqs: (params) => api.get('/content/faq', { params }),
  createContactRequest: (data) => api.post('/content/contacts', {
    fullName: data.fullName ?? data.name ?? data.hoTen,
    phone: data.phoneNumber ?? data.phone ?? data.soDienThoai,
    email: data.email,
    subject: data.subject ?? data.tieuDe,
    body: data.message ?? data.noiDung,
    type: data.inquiryType ?? data.loaiYeuCau ?? 'Consultation',
    productId: data.productId ?? data.maSanPham,
  }),
  getHomeBanners: () => api.get('/content/home-banners').then(responseData),
  getBlogPosts: (params) => api.get('/content/posts/public', { params }),
};

export const shopApi = {
  async getPaymentInfo() {
    try {
      const data = await api.get('/showrooms').then(responseData);
      const s = (Array.isArray(data) ? data : data?.items || data?.Items || (data ? [data] : []))[0] || {};
      return {
        storeName: s.name || s.Name,
        bankName: s.bankName || s.BankName || '',
        bankCode: s.bankCode || s.BankCode || '',
        bankAccountNo: s.bankAccountNo || s.BankAccountNo || '',
        bankAccountName: s.bankAccountName || s.BankAccountName || s.name || s.Name || '',
        bankQrUrl: s.bankQrUrl || s.BankQrUrl || '',
      };
    } catch {
      return { bankName: '', bankCode: '', bankAccountNo: '', bankAccountName: '', bankQrUrl: '' };
    }
  },
};

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
