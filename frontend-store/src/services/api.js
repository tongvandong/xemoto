import axios from 'axios';
import {
  normalizeCart,
  normalizeCategory,
  normalizeFilters,
  normalizeProduct,
  normalizeProductList,
} from '../utils/productMappers.js';
import { notifyCartChanged } from '../utils/cartEvents.js';
import { normalizeImageUrl } from '../utils/formatters.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AUTH_CHANGED_EVENT = 'basecore:auth-changed';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getStorage = (type) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[type];
  } catch {
    return null;
  }
};

const sessionAuthStorage = {
  getItem(key) {
    return getStorage('sessionStorage')?.getItem(key) ?? null;
  },

  setItem(key, value) {
    getStorage('sessionStorage')?.setItem(key, value);
  },

  removeItem(key) {
    getStorage('sessionStorage')?.removeItem(key);
  },
};

const legacyAuthStorage = {
  getItem(key) {
    return getStorage('localStorage')?.getItem(key) ?? null;
  },

  setItem(key, value) {
    getStorage('localStorage')?.setItem(key, value);
  },

  removeItem(key) {
    getStorage('localStorage')?.removeItem(key);
  },
};

const responseData = (response) => response.data;

const field = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return undefined;
};

const collection = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.$values)) return value.$values;
  return [];
};

const normalizeFulfillmentStatus = (status) => {
  const statusMap = {
    Unallocated: 'NotShipped',
    Allocated: 'Preparing',
    Shipped: 'Shipping',
    Fulfilled: 'Delivered',
  };

  return statusMap[status] || status;
};

const normalizeOrderHistory = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id'),
  eventType: field(raw, 'eventType', 'EventType', 'type', 'Type'),
  oldValue: field(raw, 'oldValue', 'OldValue', 'fromStatus', 'FromStatus'),
  newValue: field(raw, 'newValue', 'NewValue', 'toStatus', 'ToStatus'),
  note: field(raw, 'note', 'Note'),
  actorUserId: field(raw, 'actorUserId', 'ActorUserId', 'changedBy', 'ChangedBy'),
  createdAt: field(raw, 'createdAt', 'CreatedAt', 'createdDate', 'CreatedDate'),
});

const normalizeOrder = (raw = {}) => {
  const items = collection(field(raw, 'items', 'Items', 'lines', 'Lines'));
  const vouchers = collection(field(raw, 'vouchers', 'Vouchers'));
  const payments = collection(field(raw, 'payments', 'Payments'));
  const histories = collection(field(raw, 'histories', 'Histories', 'history', 'History'));
  const fulfillmentStatus = field(raw, 'fulfillmentStatus', 'FulfillmentStatus');

  return {
    ...raw,
    id: field(raw, 'id', 'Id', 'maDonHang', 'MaDonHang'),
    orderCode: field(raw, 'orderCode', 'OrderCode', 'code', 'Code', 'maDonHangKinhDoanh', 'MaDonHangKinhDoanh'),
    userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
    showroomId: field(raw, 'showroomId', 'ShowroomId', 'maShowroom', 'MaShowroom'),
    cartId: field(raw, 'cartId', 'CartId', 'maGioHang', 'MaGioHang'),
    shippingFullName: field(raw, 'shippingFullName', 'ShippingFullName', 'shippingRecipient', 'ShippingRecipient', 'hoTenNhanHang', 'HoTenNhanHang'),
    shippingPhoneNumber: field(raw, 'shippingPhoneNumber', 'ShippingPhoneNumber', 'shippingPhone', 'ShippingPhone', 'soDienThoaiNhanHang', 'SoDienThoaiNhanHang'),
    shippingEmail: field(raw, 'shippingEmail', 'ShippingEmail', 'emailNhanHang', 'EmailNhanHang'),
    shippingAddressLine: field(raw, 'shippingAddressLine', 'ShippingAddressLine', 'shippingAddress', 'ShippingAddress', 'diaChiNhanHang', 'DiaChiNhanHang'),
    subtotal: Number(field(raw, 'subtotal', 'Subtotal', 'tongTienHang', 'TongTienHang') || 0),
    discountAmount: Number(field(raw, 'discountAmount', 'DiscountAmount', 'discountTotal', 'DiscountTotal', 'tienGiam', 'TienGiam') || 0),
    shippingFee: Number(field(raw, 'shippingFee', 'ShippingFee', 'phiVanChuyen', 'PhiVanChuyen') || 0),
    totalAmount: Number(field(raw, 'totalAmount', 'TotalAmount', 'grandTotal', 'GrandTotal', 'tongThanhToan', 'TongThanhToan') || 0),
    orderStatus: field(raw, 'orderStatus', 'OrderStatus', 'trangThaiDonHang', 'TrangThaiDonHang'),
    paymentStatus: field(raw, 'paymentStatus', 'PaymentStatus', 'trangThaiThanhToan', 'TrangThaiThanhToan'),
    fulfillmentStatus,
    shippingStatus: normalizeFulfillmentStatus(field(raw, 'shippingStatus', 'ShippingStatus', 'trangThaiVanChuyen', 'TrangThaiVanChuyen') || fulfillmentStatus),
    receivingMethod: field(raw, 'receivingMethod', 'ReceivingMethod', 'phuongThucNhanHang', 'PhuongThucNhanHang'),
    paymentMethod: field(raw, 'paymentMethod', 'PaymentMethod', 'phuongThucThanhToan', 'PhuongThucThanhToan', 'phuongThuc', 'PhuongThuc'),
    orderType: field(raw, 'orderType', 'OrderType', 'loaiDonHang', 'LoaiDonHang'),
    depositAmount: Number(field(raw, 'depositAmount', 'DepositAmount', 'tienDatCoc', 'TienDatCoc') || 0),
    remainingAmount: Number(field(raw, 'remainingAmount', 'RemainingAmount', 'soTienConLai', 'SoTienConLai') || 0),
    note: field(raw, 'note', 'Note', 'ghiChu', 'GhiChu'),
    fulfillmentNote: field(raw, 'fulfillmentNote', 'FulfillmentNote'),
    pickupAppointmentAt: field(raw, 'pickupAppointmentAt', 'PickupAppointmentAt'),
    createdAt: field(raw, 'createdAt', 'CreatedAt', 'placedAt', 'PlacedAt', 'createdDate', 'CreatedDate', 'ngayTao', 'NgayTao'),
    updatedAt: field(raw, 'updatedAt', 'UpdatedAt', 'ngayCapNhat', 'NgayCapNhat'),
    items: items.map((item) => ({
      ...item,
      id: field(item, 'id', 'Id', 'maChiTietDonHang', 'MaChiTietDonHang'),
      productId: field(item, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      productVariantId: field(item, 'productVariantId', 'ProductVariantId', 'maBienSanPham', 'MaBienSanPham'),
      productNameSnapshot: field(item, 'productNameSnapshot', 'ProductNameSnapshot', 'productName', 'ProductName', 'tenSanPhamSnapshot', 'TenSanPhamSnapshot'),
      skuSnapshot: field(item, 'skuSnapshot', 'SkuSnapshot', 'skuCode', 'SkuCode', 'skuSnapshot', 'SKUSnapshot'),
      unitPrice: Number(field(item, 'unitPrice', 'UnitPrice', 'donGia', 'DonGia') || 0),
      quantity: Number(field(item, 'quantity', 'Quantity', 'qty', 'Qty', 'soLuong', 'SoLuong') || 0),
      lineTotal: Number(field(item, 'lineTotal', 'LineTotal', 'thanhTien', 'ThanhTien') || 0),
    })),
    vouchers: vouchers.map((voucher) => ({
      ...voucher,
      voucherCodeSnapshot: field(voucher, 'voucherCodeSnapshot', 'VoucherCodeSnapshot', 'maVoucherCodeSnapshot', 'MaVoucherCodeSnapshot'),
      discountAmount: Number(field(voucher, 'discountAmount', 'DiscountAmount', 'soTienGiam', 'SoTienGiam') || 0),
      discountTypeSnapshot: field(voucher, 'discountTypeSnapshot', 'DiscountTypeSnapshot', 'loaiGiamGiaSnapshot', 'LoaiGiamGiaSnapshot'),
      discountValueSnapshot: Number(field(voucher, 'discountValueSnapshot', 'DiscountValueSnapshot', 'giaTriGiamSnapshot', 'GiaTriGiamSnapshot') || 0),
    })),
    payments: payments.map(normalizePayment),
    histories: histories.map(normalizeOrderHistory),
  };
};

const normalizePayment = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maThanhToan', 'MaThanhToan'),
  paymentCode: field(raw, 'paymentCode', 'PaymentCode', 'code', 'Code', 'maThanhToanKinhDoanh', 'MaThanhToanKinhDoanh'),
  orderId: field(raw, 'orderId', 'OrderId', 'maDonHang', 'MaDonHang'),
  orderCode: field(raw, 'orderCode', 'OrderCode', 'maDonHangKinhDoanh', 'MaDonHangKinhDoanh'),
  amount: Number(field(raw, 'amount', 'Amount', 'soTien', 'SoTien') || 0),
  paymentMethod: field(raw, 'paymentMethod', 'PaymentMethod', 'method', 'Method', 'phuongThuc', 'PhuongThuc'),
  paymentStatus: field(raw, 'paymentStatus', 'PaymentStatus', 'status', 'Status', 'trangThai', 'TrangThai'),
  transactionRef: field(raw, 'transactionRef', 'TransactionRef', 'maGiaoDich', 'MaGiaoDich'),
  paidAt: field(raw, 'paidAt', 'PaidAt', 'daThanhToanLuc', 'DaThanhToanLuc'),
  createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
});

const normalizeVoucher = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maVoucher', 'MaVoucher'),
  code: field(raw, 'code', 'Code', 'maVoucherCode', 'MaVoucherCode'),
  description: field(raw, 'description', 'Description', 'moTa', 'MoTa'),
  discountType: field(raw, 'discountType', 'DiscountType', 'loaiGiamGia', 'LoaiGiamGia'),
  discountValue: Number(field(raw, 'discountValue', 'DiscountValue', 'giaTriGiam', 'GiaTriGiam') || 0),
  maxDiscountValue: field(raw, 'maxDiscountValue', 'MaxDiscountValue', 'maxDiscount', 'MaxDiscount', 'giaTriGiamToiDa', 'GiaTriGiamToiDa'),
  minOrderValue: Number(field(raw, 'minOrderValue', 'MinOrderValue', 'giaTriDonToiThieu', 'GiaTriDonToiThieu') || 0),
  remainingUses: field(raw, 'remainingUses', 'RemainingUses') ?? null,
  status: field(raw, 'status', 'Status', 'trangThai', 'TrangThai'),
});

const normalizeFavorite = (raw = {}) => {
  const productRaw = field(raw, 'product', 'Product') || raw;
  const product = normalizeProduct(productRaw);

  return {
    ...raw,
    userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
    productId: field(raw, 'productId', 'ProductId', 'maSanPham', 'MaSanPham') || product?.id,
    createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
    product,
  };
};

const normalizeReview = (raw = {}) => ({
  ...raw,
  id: field(raw, 'id', 'Id', 'maDanhGia', 'MaDanhGia'),
  productId: field(raw, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
  userId: field(raw, 'userId', 'UserId', 'maNguoiDung', 'MaNguoiDung'),
  userName: field(raw, 'userName', 'UserName', 'tenNguoiDung', 'TenNguoiDung'),
  orderId: field(raw, 'orderId', 'OrderId', 'maDonHang', 'MaDonHang'),
  rating: Number(field(raw, 'rating', 'Rating', 'diem', 'Diem') || 0),
  title: field(raw, 'title', 'Title', 'tieuDe', 'TieuDe'),
  comment: field(raw, 'comment', 'Comment', 'noiDung', 'NoiDung'),
  imageUrl: normalizeImageUrl(field(raw, 'imageUrl', 'ImageUrl', 'hinhAnhUrl', 'HinhAnhUrl')),
  status: field(raw, 'status', 'Status', 'trangThai', 'TrangThai'),
  createdAt: field(raw, 'createdAt', 'CreatedAt', 'ngayTao', 'NgayTao'),
  updatedAt: field(raw, 'updatedAt', 'UpdatedAt', 'ngayCapNhat', 'NgayCapNhat'),
});

const normalizeReviewPayload = (payload = {}) => {
  const formData = new FormData();
  formData.append('Diem', payload.rating ?? payload.diem);
  formData.append('NoiDung', payload.comment ?? payload.noiDung ?? '');

  if (payload.productId ?? payload.maSanPham) {
    formData.append('MaSanPham', payload.productId ?? payload.maSanPham);
  }

  if (payload.orderId ?? payload.maDonHang) {
    formData.append('MaDonHang', payload.orderId ?? payload.maDonHang);
  }

  if (payload.title ?? payload.tieuDe) {
    formData.append('TieuDe', payload.title ?? payload.tieuDe);
  }

  if (payload.image) {
    formData.append('Image', payload.image);
  }

  return formData;
};

const cleanParams = (params = {}) => {
  const sortMap = {
    'price-asc': { SortBy: 'price', SortDescending: false },
    'price-desc': { SortBy: 'price', SortDescending: true },
    'name-asc': { SortBy: 'name', SortDescending: false },
    'name-desc': { SortBy: 'name', SortDescending: true },
    'year-asc': { SortBy: 'created', SortDescending: false },
    'year-desc': { SortBy: 'created', SortDescending: true },
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

  const sourceParams = { ...params };
  if (sortMap[params.sortBy]) {
    delete sourceParams.sortBy;
    Object.assign(sourceParams, sortMap[params.sortBy]);
  }

  const mappedParams = Object.entries(sourceParams).reduce((acc, [key, value]) => {
    acc[paramMap[key] || key] = value;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(mappedParams).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  );
};

const notifyAuthChanged = (user = null) => {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { user } }));
};

const clearAuthStorage = (notify = true) => {
  sessionAuthStorage.removeItem(TOKEN_KEY);
  sessionAuthStorage.removeItem(USER_KEY);
  legacyAuthStorage.removeItem(TOKEN_KEY);
  legacyAuthStorage.removeItem(USER_KEY);

  if (notify) {
    notifyAuthChanged(null);
  }
};

const getStoredUser = () => {
  const rawUser = sessionAuthStorage.getItem(USER_KEY) || legacyAuthStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const claims = decodeJwtPayload(token);
  const expiresAt = Number(claims?.exp);

  if (!Number.isFinite(expiresAt)) {
    return true;
  }

  return Date.now() >= expiresAt * 1000;
};

const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = decodeURIComponent(
      atob(normalizedPayload)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

const getClaim = (claims, key) => claims?.[key] || claims?.[`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/${key}`];

const normalizeLoginResponse = (data) => {
  const user = data?.user || data?.User || data;
  const roles = user?.roles || user?.Roles || [];
  const role = data?.role || data?.Role || roles[0];

  return {
    token: data?.token || data?.Token,
    userId: data?.userId || data?.UserId || user?.id || user?.Id,
    username: data?.username || data?.Username || user?.email || user?.Email,
    name: data?.name || data?.Name || user?.fullName || user?.FullName || user?.hoTen || user?.HoTen,
    email: data?.email || data?.Email || user?.email || user?.Email,
    phone: data?.phone || data?.Phone || user?.soDienThoai || user?.SoDienThoai,
    role,
    roles,
    userType: data?.userType ?? data?.UserType,
    expiresIn: data?.expiresIn || data?.ExpiresIn,
    expiresAt: data?.expiresAt || data?.ExpiresAt,
    raw: data,
  };
};

const saveAuthUser = (user, rememberMe = false) => {
  if (!user?.token) {
    throw new Error('Không nhận được token đăng nhập từ máy chủ');
  }

  const targetStorage = rememberMe ? legacyAuthStorage : sessionAuthStorage;
  const staleStorage = rememberMe ? sessionAuthStorage : legacyAuthStorage;

  targetStorage.setItem(TOKEN_KEY, user.token);
  targetStorage.setItem(USER_KEY, JSON.stringify(user));
  staleStorage.removeItem(TOKEN_KEY);
  staleStorage.removeItem(USER_KEY);

  notifyAuthChanged(user);
};

const mergeStoredUser = (data = {}) => {
  const currentUser = getStoredUser();
  const token = currentUser?.token || getToken();

  if (!token) {
    return null;
  }

  const nextUser = {
    ...currentUser,
    ...data,
    token,
  };

  const targetStorage = sessionAuthStorage.getItem(TOKEN_KEY) ? sessionAuthStorage : legacyAuthStorage;
  targetStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  notifyAuthChanged(nextUser);
  return nextUser;
};

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.Message;
    if (message) {
      error.message = message;
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  async login({ username, password, rememberMe }) {
    const response = await api.post('/auth/login', { email: username, password });
    const user = normalizeLoginResponse(responseData(response));
    saveAuthUser(user, rememberMe === true || rememberMe === 'true' || rememberMe === 'on');
    return user;
  },

  register: (data) => api.post('/auth/register', {
    fullName: data.name,
    email: data.email,
    phoneNumber: data.phone,
    password: data.password,
  }),

  logout() {
    clearAuthStorage();
  },

  getCurrentUser() {
    const token = getToken();

    if (!token) {
      clearAuthStorage(false);
      return null;
    }

    if (isTokenExpired(token)) {
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

  getToken: () => getToken(),

  updateStoredUser(data) {
    return mergeStoredUser(data);
  },
};

function getToken() {
  const token = sessionAuthStorage.getItem(TOKEN_KEY);

  if (token) {
    return token;
  }

  const legacyToken = legacyAuthStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    return legacyToken;
  }

  return null;
}

export const productApi = {
  async getAll(params) {
    const response = await api.get('/products', { params: cleanParams({ DangHoatDong: true, ...params }) });
    return normalizeProductList(responseData(response));
  },

  async getById(id) {
    const response = await api.get(`/products/${id}`);
    return normalizeProduct(responseData(response));
  },

  async getFilters() {
    // BE v2 chưa có /products/filters → trả bộ lọc rỗng để trang không vỡ.
    try {
      const response = await api.get('/products/filters');
      return normalizeFilters(responseData(response));
    } catch {
      return normalizeFilters({});
    }
  },

  getProducts(params) {
    return productApi.getAll(params);
  },

  getProductById(id) {
    return productApi.getById(id);
  },

};

export const reviewApi = {
  async getByProduct(productId) {
    const response = await api.get(`/products/${productId}/reviews`);
    const data = responseData(response);
    return (Array.isArray(data) ? data : data?.items || data?.Items || []).map(normalizeReview);
  },

  async getSummary(productId) {
    const response = await api.get(`/products/${productId}/reviews/summary`);
    const data = responseData(response);
    return {
      productId: field(data, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      totalReviews: Number(field(data, 'totalReviews', 'TotalReviews', 'tongDanhGia', 'TongDanhGia') || 0),
      averageRating: Number(field(data, 'averageRating', 'AverageRating', 'diemTrungBinh', 'DiemTrungBinh') || 0),
    };
  },

  async getMine(productId) {
    const response = await api.get(`/reviews/product/${productId}/me`);
    const data = responseData(response);
    const myReview = field(data, 'myReview', 'MyReview', 'danhGiaCuaToi', 'DanhGiaCuaToi');

    return {
      productId: field(data, 'productId', 'ProductId', 'maSanPham', 'MaSanPham'),
      isAuthenticated: field(data, 'isAuthenticated', 'IsAuthenticated', 'daDangNhap', 'DaDangNhap') === true,
      hasPurchased: field(data, 'hasPurchased', 'HasPurchased', 'daMua', 'DaMua') === true,
      canReview: field(data, 'canReview', 'CanReview', 'coTheDanhGia', 'CoTheDanhGia') === true,
      eligibleOrderId: field(data, 'eligibleOrderId', 'EligibleOrderId', 'maDonHangDuDieuKien', 'MaDonHangDuDieuKien'),
      reason: field(data, 'reason', 'Reason', 'lyDo', 'LyDo'),
      myReview: myReview ? normalizeReview(myReview) : null,
    };
  },

  async create(productId, payload) {
    const body = {
      rating: payload.rating ?? payload.diem,
      title: payload.title ?? payload.tieuDe ?? null,
      comment: payload.comment ?? payload.noiDung ?? '',
      orderId: payload.orderId ?? payload.maDonHang ?? null,
    };
    const response = await api.post(`/products/${productId}/reviews`, body);
    const data = responseData(response);
    return {
      ...data,
      review: data?.review || data?.Review ? normalizeReview(data.review || data.Review) : null,
    };
  },

  async updateMine(productId, payload) {
    const body = {
      rating: payload.rating ?? payload.diem,
      title: payload.title ?? payload.tieuDe ?? null,
      comment: payload.comment ?? payload.noiDung ?? '',
      orderId: payload.orderId ?? payload.maDonHang ?? null,
    };
    const response = await api.patch(`/products/${productId}/reviews/me`, body);
    const data = responseData(response);
    return {
      ...data,
      review: data?.review || data?.Review ? normalizeReview(data.review || data.Review) : null,
    };
  },
};

export const categoryApi = {
  async getAll() {
    const response = await api.get('/categories');
    const data = responseData(response);
    return {
      ...response,
      data: (Array.isArray(data) ? data : data?.items || data?.Items || []).map(normalizeCategory),
    };
  },
};

const normalizeCartResponse = (response) => {
  const cart = normalizeCart(responseData(response));
  notifyCartChanged(cart);
  return cart;
};

export const cartApi = {
  async getMine() {
    const response = await api.get('/cart');
    return normalizeCartResponse(response);
  },

  getCart() {
    return cartApi.getMine();
  },

  async getCount() {
    // BE v2 không có /cart/count → suy từ giỏ hiện tại.
    try {
      const cart = await cartApi.getMine();
      return Number(cart?.totalItems ?? (cart?.items?.length ?? 0));
    } catch {
      return 0;
    }
  },

  async addItem(data) {
    const response = await api.post('/cart/items', {
      skuId: data.variantId ?? data.skuId ?? data.productVariantId ?? data.productId,
      qty: data.quantity ?? data.soLuong ?? 1,
    });
    return normalizeCartResponse(response);
  },

  async updateItem(id, quantityOrData) {
    const data = typeof quantityOrData === 'object' ? quantityOrData : { quantity: quantityOrData };
    await api.put(`/cart/items/${id}`, {
      qty: data.quantity ?? data.soLuong,
    });
    return cartApi.getMine();
  },

  async removeItem(id) {
    await api.delete(`/cart/items/${id}`);
    return cartApi.getMine();
  },

  async clearCart() {
    // BE v2 không có /cart/clear → xóa lần lượt từng item.
    const cart = await cartApi.getMine();
    const items = cart?.items || [];
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await api.delete(`/cart/items/${item.id}`);
    }
    return cartApi.getMine();
  },
};

export const orderApi = {
  async getAll(params) {
    // Khách hàng: đơn của tôi (BE v2 = /orders/mine; /orders là Admin/Staff)
    const response = await api.get('/orders/mine', { params });
    const data = responseData(response);
    if (Array.isArray(data)) {
      return data.map(normalizeOrder);
    }

    const items = data?.items || data?.Items;
    return items ? items.map(normalizeOrder) : normalizeOrder(data);
  },

  getMyOrders() {
    return orderApi.getAll();
  },

  async getById(id) {
    const response = await api.get(`/orders/${id}`);
    const order = normalizeOrder(responseData(response));
    return {
      ...order,
      order,
      details: order.items,
      vouchers: order.vouchers,
      payments: order.payments,
      histories: order.histories,
    };
  },

  getOrderById(id) {
    return orderApi.getById(id);
  },

  async createOrder(data) {
    // BE v2 CheckoutRequest (English). Đơn lấy item từ giỏ của user; thanh toán COD/tại cửa hàng.
    const response = await api.post('/orders', {
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
    });
    return normalizeOrder(responseData(response));
  },

  async cancelOrder(id, reason) {
    const response = await api.post(`/orders/${id}/cancel`, { reason });
    return normalizeOrder(responseData(response));
  },

  // Khách báo đã chuyển khoản -> tạo phiếu chờ xác nhận
  async claimTransfer(id) {
    const response = await api.post(`/orders/${id}/payment-claim`);
    return responseData(response);
  },
};

// Thông tin cửa hàng + chuyển khoản (cho màn QR thanh toán)
export const shopApi = {
  async getPaymentInfo() {
    try {
      const response = await api.get('/showrooms');
      const list = responseData(response);
      const s = (Array.isArray(list) ? list : list?.items || [])[0] || {};
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

export const paymentApi = {
  async getPaymentsByOrder(orderId) {
    // Thanh toán do nhân viên ghi nhận (Admin/Staff). Khách không truy cập → trả rỗng.
    try {
      const response = await api.get(`/payments/order/${orderId}`);
      const data = responseData(response);
      const items = data?.items || data?.Items || data?.payments || data?.Payments || data;
      return Array.isArray(items) ? items.map(normalizePayment) : items;
    } catch {
      return [];
    }
  },

  async createPayment(data) {
    const response = await api.post('/payments', {
      maDonHang: data.orderId ?? data.maDonHang,
      loaiThanhToan: data.paymentType ?? data.loaiThanhToan ?? 'Full',
      soTien: data.amount ?? data.soTien,
      phuongThuc: data.paymentMethod ?? data.phuongThuc ?? 'BankTransfer',
      maGiaoDich: data.transactionRef ?? data.maGiaoDich,
      noiDungChuyenKhoan: data.transferContent ?? data.noiDungChuyenKhoan,
      maNganHang: data.bankCode ?? data.maNganHang,
      responseRaw: data.responseRaw,
    });
    return normalizePayment(responseData(response));
  },

  async confirmSuccess(paymentId, data = {}) {
    const response = await api.post(`/payments/${paymentId}/confirm-success`, {
      maGiaoDich: data.transactionRef ?? data.maGiaoDich,
      responseRaw: data.responseRaw,
    });
    return responseData(response);
  },
};

export const voucherApi = {
  async getAll(params) {
    // Danh sách voucher là Admin/Staff ở BE v2 → khách không xem được, trả rỗng.
    try {
      const response = await api.get('/vouchers/available', { params: cleanParams(params) });
      const data = responseData(response);
      const items = data?.items || data?.Items || data;
      return Array.isArray(items) ? items.map(normalizeVoucher) : items;
    } catch {
      return [];
    }
  },

  listVouchers(params) {
    return voucherApi.getAll(params);
  },

  async validateVoucher(data) {
    const body = {
      code: data.code ?? data.voucherCode ?? data.maVoucherCode,
      subtotal: Number(data.subtotal ?? data.orderTotal ?? data.total ?? data.tongTien ?? 0),
    };
    const response = await api.post('/vouchers/validate', body);
    const result = responseData(response);
    return {
      ...result,
      valid: field(result, 'valid', 'Valid', 'hopLe', 'HopLe') === true,
      message: field(result, 'message', 'Message', 'lyDoKhongHopLe', 'LyDoKhongHopLe'),
      discountAmount: Number(field(result, 'discountAmount', 'DiscountAmount', 'soTienGiam', 'SoTienGiam') || 0),
      voucher: normalizeVoucher(field(result, 'voucher', 'Voucher') || result),
    };
  },

  // Ví voucher (applicable/save/my) không có ở BE v2 (phạm vi đơn giản hóa) → trả rỗng để FE không vỡ.
  async getApplicableVouchers({ subtotal = 0 } = {}) {
    const all = await voucherApi.getAll();
    return all.filter((voucher) => Number(voucher.minOrderValue || 0) <= Number(subtotal || 0));
  },

  async saveVoucher(code) {
    const voucherCode = String(code || '').trim().toUpperCase();
    if (!voucherCode) {
      return { success: false, saved: false, message: 'Mã voucher không hợp lệ' };
    }

    const all = await voucherApi.getAll();
    const voucher = all.find((item) => String(item.code || '').toUpperCase() === voucherCode);
    if (!voucher) {
      return { success: false, saved: false, message: 'Voucher không còn khả dụng' };
    }

    const storage = getStorage('localStorage');
    const currentUser = getStoredUser();
    const key = `motosale:saved-vouchers:${currentUser?.userId || currentUser?.email || 'guest'}`;
    const savedCodes = new Set(JSON.parse(storage?.getItem(key) || '[]'));
    const existed = savedCodes.has(voucherCode);
    savedCodes.add(voucherCode);
    storage?.setItem(key, JSON.stringify(Array.from(savedCodes)));
    return { success: true, saved: true, existed, voucher };
  },

  async getMyVouchers() {
    const storage = getStorage('localStorage');
    const currentUser = getStoredUser();
    const key = `motosale:saved-vouchers:${currentUser?.userId || currentUser?.email || 'guest'}`;
    const savedCodes = new Set(JSON.parse(storage?.getItem(key) || '[]'));
    if (!savedCodes.size) return [];
    const all = await voucherApi.getAll();
    return all.filter((voucher) => savedCodes.has(String(voucher.code || '').toUpperCase()));
  },

  async getMyVoucherCount() {
    const mine = await voucherApi.getMyVouchers();
    return mine.length;
  },
};

export const userApi = {
  async getProfile() {
    const response = await api.get('/users/me');
    return responseData(response);
  },

  async updateProfile(data) {
    // BE v2 UpdateProfileRequest = { FullName, PhoneNumber } (email không đổi qua endpoint này)
    const response = await api.put('/users/me', {
      fullName: data.name,
      phoneNumber: data.phone,
    });
    return responseData(response);
  },

  async changePassword(data) {
    const response = await api.put('/users/me/password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return responseData(response);
  },

  async getAddress() {
    // BE v2: danh sách địa chỉ → lấy địa chỉ mặc định/đầu tiên
    const response = await api.get('/users/me/addresses');
    const data = responseData(response);
    const items = data?.items || data?.Items || data || [];
    const list = Array.isArray(items) ? items : [];
    return list.find((a) => a.isDefault || a.IsDefault) || list[0] || null;
  },

  async updateAddress(data) {
    // BE v2 AddressRequest = { RecipientName, Phone, Line, Ward, District, Province, IsDefault }
    const response = await api.post('/users/me/addresses', {
      recipientName: data.fullName,
      phone: data.phoneNumber,
      line: data.addressLine,
      ward: data.ward,
      district: data.district,
      province: data.province,
      isDefault: true,
    });
    return responseData(response);
  },

  async getAll(params) {
    const response = await api.get('/users', { params });
    return responseData(response);
  },

  async getById(id) {
    const response = await api.get(`/users/${id}`);
    return responseData(response);
  },

  getUsers(params) {
    return userApi.getAll(params);
  },

  getUserById(id) {
    return userApi.getById(id);
  },
};

export const favoriteApi = {
  async getMine() {
    const response = await api.get('/favorites');
    const data = responseData(response);
    const items = data?.items || data?.Items || data;
    return Array.isArray(items) ? items.map(normalizeFavorite) : [];
  },

  async add(productId) {
    const response = await api.post(`/favorites/${productId}`);
    return normalizeFavorite(responseData(response));
  },

  remove: (productId) => api.delete(`/favorites/${productId}`),
};

export const contentApi = {
  async getHomeBanners() {
    const response = await api.get('/content/home-banners');
    const data = responseData(response);
    const items = data?.items || data?.Items || data || [];
    return (Array.isArray(items) ? items : []).map((raw) => ({
      id: field(raw, 'maBanner', 'MaBanner', 'id', 'Id'),
      position: field(raw, 'viTri', 'ViTri', 'position'),
      title: field(raw, 'tieuDe', 'TieuDe', 'title'),
      imageUrl: normalizeImageUrl(field(raw, 'urlAnh', 'UrlAnh', 'imageUrl')),
      link: field(raw, 'lienKet', 'LienKet', 'link'),
      sortOrder: Number(field(raw, 'thuTu', 'ThuTu', 'sortOrder') || 0),
    }));
  },
  getBlogPosts: (params) => api.get('/content/posts/public', { params }),
  getFaqs: (params) => api.get('/content/faq', { params }),
  createContactRequest: (data) => api.post('/content/contacts', {
    fullName: data.fullName ?? data.name ?? data.hoTen,
    phone: data.phoneNumber ?? data.phone ?? data.soDienThoai,
    email: data.email,
    subject: data.subject ?? data.tieuDe,
    body: data.message ?? data.noiDung ?? data.body,
    type: data.inquiryType ?? data.loaiYeuCau ?? 'Consultation',
    productId: data.productId ?? data.maSanPham,
  }),
  // Xem voucher theo mã: dùng validate (phạm vi đơn giản hóa)
  getVoucher: async (code) => {
    try {
      return (await api.post('/vouchers/validate', { code, subtotal: 0 })).data;
    } catch {
      return null;
    }
  },
};

// Đăng ký tư vấn trả góp (qua đối tác tài chính). Cửa hàng tiếp nhận hồ sơ, không xử lý khoản vay.
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

export default api;
