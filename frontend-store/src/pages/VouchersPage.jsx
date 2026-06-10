import { useEffect, useState } from 'react';
import { FiCheck, FiDollarSign, FiGift, FiPercent, FiTruck } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { voucherApi } from '../services/api.js';
import { formatCurrency } from '../utils/formatters.js';

function VouchersPage() {
  const { isAuthenticated } = useAuth();
  const { notify } = useNotification();
  const [allVouchers, setAllVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState(null);

  async function loadVouchers() {
    setLoading(true);
    try {
      const all = await voucherApi.getAll();
      setAllVouchers(Array.isArray(all) ? all : []);
    } catch {
      setAllVouchers([]);
    }
    try {
      if (isAuthenticated) {
        const mine = await voucherApi.getMyVouchers();
        setMyVouchers(Array.isArray(mine) ? mine : []);
      }
    } catch {
      setMyVouchers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadVouchers();
  }, [isAuthenticated]);

  const savedCodes = new Set(myVouchers.map((v) => String(v.code || '').toUpperCase()));

  async function handleSave(voucher) {
    if (!isAuthenticated) {
      notify('Vui lòng đăng nhập để nhận voucher', 'error');
      return;
    }

    setSavingCode(voucher.code);
    try {
      const result = await voucherApi.saveVoucher(voucher.code);
      if (result.success) {
        notify('Đã nhận voucher thành công!', 'success');
        setMyVouchers((prev) => (
          prev.some((item) => String(item.code || '').toUpperCase() === String(voucher.code || '').toUpperCase())
            ? prev
            : [...prev, voucher]
        ));
      } else {
        notify(result.message || 'Không thể nhận voucher', 'error');
      }
    } catch (err) {
      notify(err?.message || 'Lỗi khi nhận voucher', 'error');
    } finally {
      setSavingCode(null);
    }
  }

  function getDiscountLabel(voucher) {
    if (voucher.discountType === 'Percent') {
      const max = voucher.maxDiscountValue ? ` (tối đa ${formatCurrency(voucher.maxDiscountValue)})` : '';
      return `Giảm ${voucher.discountValue}%${max}`;
    }
    if (voucher.discountType === 'Amount') {
      return `Giảm ${formatCurrency(voucher.discountValue)}`;
    }
    if (voucher.discountType === 'FreeShipping') {
      return 'Miễn phí vận chuyển';
    }
    return `Giảm ${voucher.discountValue}`;
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Voucher của tôi' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-8 text-center">
            <h1 className="text-[28px] font-black text-zinc-950 sm:text-[34px]">
              <FiGift className="mr-3 inline-block text-[#f0a327]" />
              Kho Voucher
            </h1>
            <p className="mt-2 text-sm text-zinc-500">Nhận voucher và sử dụng khi thanh toán để được giảm giá</p>
          </div>

          {/* My saved vouchers */}
          {isAuthenticated && myVouchers.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-lg font-extrabold text-zinc-900">Voucher đã nhận ({myVouchers.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myVouchers.map((voucher) => (
                  <VoucherCard key={voucher.id} voucher={voucher} saved getDiscountLabel={getDiscountLabel} />
                ))}
              </div>
            </div>
          )}

          {/* All available vouchers */}
          <div>
            <h2 className="mb-4 text-lg font-extrabold text-zinc-900">Voucher khả dụng</h2>
            {loading ? (
              <LoadingState />
            ) : allVouchers.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
                <FiGift className="mx-auto h-12 w-12 text-zinc-300" />
                <p className="mt-4 text-sm font-medium text-zinc-500">Hiện chưa có voucher nào</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allVouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    saved={savedCodes.has(String(voucher.code || '').toUpperCase())}
                    saving={savingCode === voucher.code}
                    onSave={() => handleSave(voucher)}
                    getDiscountLabel={getDiscountLabel}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function getVoucherIcon(discountType) {
  if (discountType === 'Percent') return FiPercent;
  if (discountType === 'FreeShipping') return FiTruck;
  return FiDollarSign;
}

function getVoucherIconColor() {
  return 'bg-[#d71920]/10 text-[#d71920]';
}

function VoucherCard({ voucher, saved, saving, onSave, getDiscountLabel }) {
  const Icon = getVoucherIcon(voucher.discountType);
  const iconColor = getVoucherIconColor(voucher.discountType);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-3 border-b border-dashed border-zinc-200 bg-gradient-to-r from-[#fff8ee] to-white px-5 py-4">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-zinc-900">{getDiscountLabel(voucher)}</div>
          <div className="mt-0.5 truncate text-xs font-bold text-[#d71920]">{voucher.code}</div>
        </div>
      </div>

      <div className="px-5 py-4">
        {voucher.description && (
          <p className="mb-2 text-xs leading-5 text-zinc-600">{voucher.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          {voucher.minOrderValue > 0 && (
            <span>Đơn tối thiểu: {formatCurrency(voucher.minOrderValue)}</span>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-100 px-5 py-3">
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
            <FiCheck className="h-4 w-4" />
            Đã nhận
          </span>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#d71920] px-4 text-xs font-extrabold text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Đang nhận...' : 'Nhận'}
          </button>
        )}
      </div>
    </div>
  );
}

export default VouchersPage;
