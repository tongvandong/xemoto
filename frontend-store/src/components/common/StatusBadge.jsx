// Huy hiệu trạng thái dùng chung (đơn hàng, thanh toán, vận chuyển).
// colorClass lấy từ utils/statusMappings.js để màu nhất quán toàn storefront.
function StatusBadge({ label, colorClass, className = 'px-2.5 py-0.5' }) {
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-bold ${className} ${colorClass}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
