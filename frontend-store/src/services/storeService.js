import api from './api.js';

export const DEFAULT_STORE_MAP_URL = `https://www.google.com/maps?q=${encodeURIComponent('Việt Nam')}&hl=vi&z=6&output=embed`;

const valueOf = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }

  return undefined;
};

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export function normalizePhone(value = '') {
  return String(value || '').replace(/#/g, '').trim();
}

export function getTelHref(value = '') {
  const phone = normalizePhone(value).replace(/[^\d+]/g, '');
  return phone ? `tel:${phone}` : undefined;
}

export function hasCoordinates(store = {}) {
  return store.latitude !== null && store.latitude !== undefined && store.longitude !== null && store.longitude !== undefined;
}

export function buildMapEmbedUrl(store = {}) {
  if (hasCoordinates(store)) {
    return `https://www.google.com/maps?q=${store.latitude},${store.longitude}&hl=vi&z=16&output=embed`;
  }

  const address = String(store.address || store.addressLine || '').trim();
  if (!address) {
    return DEFAULT_STORE_MAP_URL;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&z=16&output=embed`;
}

export function buildDirectionUrl(store = {}) {
  if (hasCoordinates(store)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
  }

  const address = String(store.address || store.addressLine || '').trim();
  if (!address) {
    return '';
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function normalizeStore(rawStore = {}, index = 0) {
  const id = valueOf(rawStore, 'id', 'Id', 'maShowroom', 'MaShowroom') ?? index;
  const address = String(valueOf(rawStore, 'address', 'Address', 'addressLine', 'AddressLine', 'diaChi', 'DiaChi') || '').trim();
  const phoneNumber = normalizePhone(valueOf(rawStore, 'phoneNumber', 'PhoneNumber', 'sdt', 'Sdt', 'phone', 'Phone', 'soDienThoai', 'SoDienThoai') || '');

  return {
    id,
    name: String(valueOf(rawStore, 'name', 'Name', 'tenShowroom', 'TenShowroom') || '').trim(),
    slug: String(valueOf(rawStore, 'slug', 'Slug') || '').trim(),
    address,
    addressLine: address,
    city: String(valueOf(rawStore, 'city', 'City', 'province', 'Province') || '').trim(),
    province: String(valueOf(rawStore, 'province', 'Province', 'city', 'City') || '').trim(),
    district: String(valueOf(rawStore, 'district', 'District') || '').trim(),
    phoneNumber,
    sdt: phoneNumber,
    email: String(valueOf(rawStore, 'email', 'Email') || '').trim(),
    openingHours: String(valueOf(rawStore, 'openingHours', 'OpeningHours', 'gioMoCua', 'GioMoCua') || '').trim(),
    latitude: toNullableNumber(valueOf(rawStore, 'latitude', 'Latitude')),
    longitude: toNullableNumber(valueOf(rawStore, 'longitude', 'Longitude')),
    isActive: valueOf(rawStore, 'isActive', 'IsActive', 'dangHoatDong', 'DangHoatDong') !== false,
  };
}

function hasStoreContent(store) {
  return Boolean(store.name || store.address || store.city || store.phoneNumber);
}

export async function fetchStores() {
  const response = await api.get('/showrooms');
  const data = response.data;
  const items = Array.isArray(data) ? data : data?.items || data?.Items || (data ? [data] : []);

  return items.map(normalizeStore).filter(hasStoreContent);
}
