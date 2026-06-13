// Helper địa chỉ nhận hàng dùng chung cho CheckoutPage và AccountPage.
// Backend AddressDto: id, recipientName, phone, line, ward, district, province, isDefault.
// Form phía store dùng tên fullName/phoneNumber/addressLine nên map 1-1 ở đây.

export function normalizeAddress(address = {}) {
  return {
    id: address.id ?? null,
    fullName: address.recipientName ?? '',
    phoneNumber: address.phone ?? '',
    addressLine: address.line ?? '',
    ward: address.ward ?? '',
    district: address.district ?? '',
    province: address.province ?? '',
    note: '',
    isDefault: Boolean(address.isDefault),
  };
}

export function normalizeAddresses(data = []) {
  const rows = Array.isArray(data) ? data : data.items || [];
  return rows.map(normalizeAddress);
}

export function formatAddress(address) {
  return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ');
}
