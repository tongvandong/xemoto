import { Link } from 'react-router-dom';
import SectionCard from '../common/SectionCard.jsx';
import { formatAddress } from '../../utils/address.js';

// Khối chọn địa chỉ giao hàng đã lưu trong tài khoản (chỉ hiện khi nhận hàng tận nơi).
function CheckoutAddressSection({ addresses, loading, error, selectedAddressId, onSelectAddress }) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[18px] font-black text-zinc-950">Địa chỉ giao hàng</h2>
          <p className="mt-1 text-sm text-zinc-500">Chọn địa chỉ đã lưu trong tài khoản để giao hàng.</p>
        </div>
        <Link to="/account?tab=address" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d71920] px-4 text-sm font-extrabold text-[#d71920] transition hover:bg-red-50">
          Thêm địa chỉ
        </Link>
      </div>

      {loading && (
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-500">Đang tải địa chỉ nhận hàng...</div>
      )}

      {!loading && error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">{error}</div>
      )}

      {!loading && !error && addresses.length === 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="text-sm font-extrabold text-amber-800">Bạn chưa có địa chỉ nhận hàng</div>
          <p className="mt-1 text-sm leading-6 text-amber-700">Vui lòng thêm địa chỉ nhận hàng trong tài khoản trước khi đặt đơn giao tận nơi.</p>
          <Link to="/account?tab=address" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-[#d71920] px-4 text-sm font-extrabold text-white transition hover:bg-[#b61016]">
            Thêm địa chỉ nhận hàng
          </Link>
        </div>
      )}

      {!loading && !error && addresses.length > 0 && (
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
                onChange={(event) => onSelectAddress(event.target.value)}
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
    </SectionCard>
  );
}

export default CheckoutAddressSection;
