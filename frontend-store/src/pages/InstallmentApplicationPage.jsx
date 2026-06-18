import { useEffect, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { installmentApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import SectionCard from '../components/common/SectionCard.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Field from '../components/forms/Field.jsx';
import RadioPill from '../components/forms/RadioPill.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import {
  FINANCE_PARTNERS,
  INSTALLMENT_TERMS,
  parseInstallmentApplication,
  buildInstallmentNote,
} from '../utils/checkout.js';

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700' },
  Approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
  Cancelled: { label: 'Đã hủy', color: 'bg-zinc-200 text-zinc-600' },
};

const pickNoteLine = (note, prefix) => {
  const line = String(note || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
  return line ? line.slice(prefix.length).trim() : '';
};

function InstallmentApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { notify } = useNotification();

  const [app, setApp] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/installments/' + id, { replace: true });
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await installmentApi.getById(id);
        if (!active) return;
        setApp(data);
        setForm(parseInstallmentApplication(data));
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err?.message || 'Không thể tải hồ sơ trả góp.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, isAuthenticated, navigate]);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.borrowerName?.trim()) { notify('Vui lòng nhập họ tên người vay.', 'error'); return; }
    if (!/^0\d{9,10}$/.test(String(form.phone).trim())) { notify('Số điện thoại không hợp lệ.', 'error'); return; }
    if (!form.financePartner?.trim()) { notify('Vui lòng chọn đối tác tài chính.', 'error'); return; }
    if (!INSTALLMENT_TERMS.includes(Number(form.months))) { notify('Vui lòng chọn kỳ hạn trả góp.', 'error'); return; }
    if (!/^[0-9]{9,15}$/.test(String(form.idNumber).trim())) { notify('Số CCCD/CMND không hợp lệ.', 'error'); return; }
    if (!form.idIssueDate) { notify('Vui lòng nhập ngày cấp CCCD.', 'error'); return; }
    if (!form.idIssuePlace?.trim()) { notify('Vui lòng nhập nơi cấp CCCD.', 'error'); return; }
    if (!form.residence?.trim()) { notify('Vui lòng nhập địa chỉ thường trú.', 'error'); return; }

    setSaving(true);
    try {
      await installmentApi.update(id, {
        customerName: form.borrowerName.trim(),
        customerPhone: String(form.phone).trim(),
        customerEmail: form.email?.trim() || null,
        financePartner: form.financePartner,
        downPayment: 0,
        months: Number(form.months) || 0,
        note: buildInstallmentNote(form),
      });
      notify('Đã cập nhật hồ sơ trả góp.', 'success');
      const data = await installmentApi.getById(id);
      setApp(data);
      setForm(parseInstallmentApplication(data));
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || 'Cập nhật hồ sơ thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Bạn chắc chắn muốn hủy hồ sơ trả góp này?')) return;
    setCancelling(true);
    try {
      await installmentApi.cancel(id);
      notify('Đã hủy hồ sơ trả góp.', 'success');
      const data = await installmentApi.getById(id);
      setApp(data);
    } catch (err) {
      notify(err?.response?.data?.message || err?.message || 'Hủy hồ sơ thất bại.', 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-16">
        <LoadingState message="Đang tải hồ sơ trả góp..." />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="mx-auto max-w-[820px] px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Không tìm thấy hồ sơ.'}
          <Link to="/orders" className="ml-2 font-bold text-[#d71920] hover:underline">Về đơn hàng của tôi</Link>
        </div>
      </div>
    );
  }

  const status = app.applicationStatus;
  const meta = STATUS_META[status] || { label: status, color: 'bg-zinc-100 text-zinc-700' };
  const editable = status === 'Pending';

  return (
    <>
      <Breadcrumb items={[{ label: 'Đơn hàng', to: '/orders' }, { label: `Hồ sơ trả góp ${app.code}` }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[820px] space-y-6">

          {/* Header */}
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Hồ sơ trả góp</div>
                <h1 className="mt-1 text-[24px] font-black text-zinc-950 sm:text-[28px]">{app.code}</h1>
                <p className="mt-1 text-sm text-zinc-500">Gửi ngày {formatDate(app.createdDate)}</p>
              </div>
              <StatusBadge label={meta.label} colorClass={meta.color} className="px-3 py-1" />
            </div>

            {status === 'Approved' && app.orderId && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50/70 p-4">
                <p className="text-sm text-zinc-700">Hồ sơ đã được duyệt và lập thành đơn hàng. Bạn có thể xem chi tiết và <strong>in hợp đồng trả góp</strong> trong trang đơn hàng.</p>
                <Link to={`/orders/${app.orderId}`} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold text-white transition hover:bg-[#b61016]">
                  Xem đơn hàng {app.orderCode || `#${app.orderId}`}
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            {status === 'Rejected' && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700">
                Hồ sơ đã bị từ chối. {pickNoteLine(app.note, 'Lý do từ chối:') ? `Lý do: ${pickNoteLine(app.note, 'Lý do từ chối:')}` : 'Vui lòng liên hệ cửa hàng để biết thêm chi tiết.'}
              </div>
            )}
            {status === 'Cancelled' && (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Hồ sơ này đã được hủy.</div>
            )}
          </div>

          {/* Product */}
          <SectionCard title="Sản phẩm đăng ký trả góp">
            <p className="mt-2 text-sm font-semibold text-zinc-800">{app.productSnapshot || 'Sản phẩm trong giỏ hàng'}</p>
          </SectionCard>

          {/* Installment terms */}
          <SectionCard title="Phương án trả góp">
            <div className="mt-4 space-y-4">
              <div>
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Đối tác tài chính</span>
                {editable ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FINANCE_PARTNERS.map((partner) => {
                      const selected = form.financePartner === partner.name;
                      return (
                        <button
                          type="button"
                          key={partner.name}
                          onClick={() => update('financePartner', partner.name)}
                          className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-[#d71920] bg-red-50/50 shadow-sm' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}
                        >
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[#d71920]' : 'border-zinc-300'}`}>
                            {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#d71920]" />}
                          </span>
                          <span className="min-w-0">
                            <span className={`block text-sm font-bold ${selected ? 'text-[#d71920]' : 'text-zinc-900'}`}>{partner.name}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{partner.tagline}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-800">{form.financePartner}</p>
                )}
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Kỳ hạn</span>
                {editable ? (
                  <div className="flex flex-wrap gap-3">
                    {INSTALLMENT_TERMS.map((term) => (
                      <RadioPill key={term} name="months" value={String(term)} label={`${term} tháng`} checked={Number(form.months) === term} onChange={(e) => update('months', Number(e.target.value))} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-800">{form.months} tháng</p>
                )}
              </div>

              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                Hồ sơ không thu trước khoản nào. Đối tác tài chính sẽ liên hệ thẩm định và xử lý toàn bộ khoản vay.
              </p>
            </div>
          </SectionCard>

          {/* Borrower profile */}
          <SectionCard title="Hồ sơ người vay">
            {editable ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ và tên *" id="borrowerName" name="borrowerName" value={form.borrowerName} onChange={(e) => update('borrowerName', e.target.value)} />
                  <Field label="Số điện thoại *" id="phone" name="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  <Field label="Email" id="email" name="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  <Field label="Số CCCD/CMND" id="idNumber" name="idNumber" value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} />
                  <Field label="Ngày cấp" id="idIssueDate" name="idIssueDate" type="date" value={form.idIssueDate} onChange={(e) => update('idIssueDate', e.target.value)} />
                  <Field label="Nơi cấp" id="idIssuePlace" name="idIssuePlace" value={form.idIssuePlace} onChange={(e) => update('idIssuePlace', e.target.value)} />
                  <Field label="Ngày sinh" id="birthDate" name="birthDate" type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} />
                </div>
                <Field label="Địa chỉ thường trú" id="residence" name="residence" value={form.residence} onChange={(e) => update('residence', e.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nghề nghiệp" id="occupation" name="occupation" value={form.occupation} onChange={(e) => update('occupation', e.target.value)} />
                  <Field label="Công ty đang làm" id="company" name="company" value={form.company} onChange={(e) => update('company', e.target.value)} />
                  <Field label="Thâm niên (tháng)" id="workMonths" name="workMonths" type="number" value={form.workMonths} onChange={(e) => update('workMonths', e.target.value)} />
                  <Field label="Thu nhập hàng tháng (VND)" id="monthlyIncome" name="monthlyIncome" type="number" value={form.monthlyIncome} onChange={(e) => update('monthlyIncome', e.target.value)} />
                </div>
                <Field label="Ghi chú" id="customerNote" name="customerNote" value={form.customerNote} onChange={(e) => update('customerNote', e.target.value)} multiline />
              </div>
            ) : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <Info label="Họ và tên" value={form.borrowerName} />
                <Info label="Số điện thoại" value={form.phone} />
                <Info label="Email" value={form.email} />
                <Info label="Số CCCD/CMND" value={form.idNumber} />
                <Info label="Ngày cấp" value={form.idIssueDate} />
                <Info label="Nơi cấp" value={form.idIssuePlace} />
                <Info label="Ngày sinh" value={form.birthDate} />
                <Info label="Địa chỉ thường trú" value={form.residence} className="sm:col-span-2" />
                <Info label="Nghề nghiệp" value={form.occupation} />
                <Info label="Công ty" value={form.company} />
                <Info label="Thâm niên" value={form.workMonths ? `${form.workMonths} tháng` : ''} />
                <Info label="Thu nhập" value={form.monthlyIncome ? formatCurrency(Number(form.monthlyIncome)) : ''} />
                {form.customerNote && <Info label="Ghi chú" value={form.customerNote} className="sm:col-span-2" />}
              </dl>
            )}
          </SectionCard>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/orders" className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100">← Đơn hàng của tôi</Link>
            {editable && (
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleCancel} disabled={cancelling} className="rounded-full border border-red-200 px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                  {cancelling ? 'Đang hủy...' : 'Hủy hồ sơ'}
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-[#d71920] px-8 py-3 text-sm font-extrabold text-white transition hover:bg-[#b61016] disabled:bg-zinc-300">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Info({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-800">{value || '—'}</dd>
    </div>
  );
}

export default InstallmentApplicationPage;
