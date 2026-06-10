import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiHome,
  FiLock,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSave,
  FiUser,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { userApi } from '../services/api.js';

const tabs = [
  { id: 'profile', label: 'Thông tin tài khoản', icon: FiUser },
  { id: 'password', label: 'Đổi mật khẩu', icon: FiLock },
  { id: 'address', label: 'Địa chỉ nhận hàng', icon: FiMapPin },
];

const emptyProfile = {
  name: '',
  email: '',
  phone: '',
};

const emptyAddress = {
  fullName: '',
  phoneNumber: '',
  addressLine: '',
  ward: '',
  province: '',
  note: '',
};

const emptyPassword = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function normalizeProfile(data = {}) {
  return {
    id: data.id ?? data.userId ?? data.UserId,
    username: data.username ?? data.Username ?? data.email ?? data.Email ?? '',
    name: data.name ?? data.Name ?? data.fullName ?? data.FullName ?? '',
    email: data.email ?? data.Email ?? '',
    phone: data.phone ?? data.Phone ?? data.phoneNumber ?? data.PhoneNumber ?? '',
    created: data.created ?? data.Created ?? '',
  };
}

function normalizeAddress(data = {}) {
  const address = data.address || data.Address || data;

  return {
    fullName: address.fullName ?? address.FullName ?? address.recipientName ?? address.RecipientName ?? '',
    phoneNumber: address.phoneNumber ?? address.PhoneNumber ?? address.phone ?? address.Phone ?? '',
    addressLine: address.addressLine ?? address.AddressLine ?? address.line ?? address.Line ?? '',
    ward: address.ward ?? address.Ward ?? '',
    district: address.district ?? address.District ?? '',
    province: address.province ?? address.Province ?? '',
    note: address.note ?? address.Note ?? '',
  };
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function validateProfile(form) {
  const errors = {};

  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ tên';
  if (!form.email.trim()) errors.email = 'Vui lòng nhập email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email không hợp lệ';
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!/^0\d{9}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại phải đúng 10 số và bắt đầu bằng 0';

  return errors;
}

function validatePassword(form) {
  const errors = {};

  if (!form.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  if (!form.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  else if (form.newPassword.length < 6) errors.newPassword = 'Mật khẩu mới tối thiểu 6 ký tự';
  if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Xác nhận mật khẩu chưa khớp';

  return errors;
}

function validateAddress(form) {
  const errors = {};

  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập tên người nhận';
  if (!form.phoneNumber.trim()) errors.phoneNumber = 'Vui lòng nhập số điện thoại';
  else if (!/^0\d{9}$/.test(form.phoneNumber.trim())) errors.phoneNumber = 'Số điện thoại phải đúng 10 số và bắt đầu bằng 0';
  if (!form.addressLine.trim()) errors.addressLine = 'Vui lòng nhập địa chỉ';
  if (!form.province.trim()) errors.province = 'Vui lòng nhập tỉnh/thành phố';

  return errors;
}

function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const { resetCart } = useCart();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(emptyProfile);
  const [address, setAddress] = useState(emptyAddress);
  const [password, setPassword] = useState(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [profileErrors, setProfileErrors] = useState({});
  const [addressErrors, setAddressErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const displayName = profile.name || user?.name || user?.username || 'Tài khoản';
  const addressText = useMemo(
    () => [address.addressLine, address.ward, address.province].filter(Boolean).join(', '),
    [address],
  );

  async function loadAccount() {
    setLoading(true);
    setError('');

    try {
      const [profileData, addressData] = await Promise.all([
        userApi.getProfile(),
        userApi.getAddress().catch(() => null),
      ]);
      const nextProfile = normalizeProfile(profileData);
      const nextAddress = normalizeAddress(addressData || {});

      setProfile({
        ...emptyProfile,
        ...nextProfile,
      });
      setAddress({
        fullName: nextAddress.fullName || nextProfile.name || user?.name || '',
        phoneNumber: nextAddress.phoneNumber || nextProfile.phone || '',
        addressLine: nextAddress.addressLine,
        ward: nextAddress.ward,
        province: nextAddress.province,
        note: nextAddress.note,
      });
      updateUser(nextProfile);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải thông tin tài khoản'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setProfileErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handleAddressChange(event) {
    const { name, value } = event.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
    setAddressErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const errors = validateProfile(profile);
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingProfile(true);
    try {
      const updatedProfile = normalizeProfile(await userApi.updateProfile(profile));
      setProfile((prev) => ({ ...prev, ...updatedProfile }));
      updateUser(updatedProfile);
      notify('Đã cập nhật thông tin tài khoản', 'success');
    } catch (err) {
      notify(getErrorMessage(err, 'Không thể cập nhật thông tin tài khoản'), 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const errors = validatePassword(password);
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setChangingPassword(true);
    try {
      await userApi.changePassword(password);
      setPassword(emptyPassword);
      notify('Đã đổi mật khẩu', 'success');
    } catch (err) {
      notify(getErrorMessage(err, 'Không thể đổi mật khẩu'), 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    const errors = validateAddress(address);
    setAddressErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingAddress(true);
    try {
      const updatedAddress = normalizeAddress(await userApi.updateAddress(address));
      setAddress((prev) => ({ ...prev, ...updatedAddress }));
      notify('Đã cập nhật địa chỉ nhận hàng', 'success');
    } catch (err) {
      notify(getErrorMessage(err, 'Không thể cập nhật địa chỉ'), 'error');
    } finally {
      setSavingAddress(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Tài khoản cá nhân' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="rounded-[30px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Tài khoản</div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-[28px] font-black text-zinc-950 sm:text-[34px]">{displayName}</h1>
                <div className="mt-2 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-zinc-500">
                  <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><FiMail className="shrink-0" />{profile.email || 'Chưa có email'}</span>
                  <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><FiPhone className="shrink-0" />{profile.phone || 'Chưa có số điện thoại'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={loadAccount}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-extrabold text-zinc-800 transition hover:border-[#d71920] hover:text-[#d71920] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                Tải lại
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-6">
              <LoadingState />
            </div>
          )}

          {!loading && error && (
            <div className="mt-6">
              <ErrorState message={error} onRetry={loadAccount} />
            </div>
          )}

          {!loading && !error && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="h-fit rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="grid gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const selected = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold transition ${
                          selected
                            ? 'bg-[#d71920] text-white shadow-[0_12px_24px_rgba(215,25,32,0.22)]'
                            : 'bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-[#d71920]'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                  <div className="font-extrabold text-zinc-950">Địa chỉ hiện tại</div>
                  <p className="mt-2 leading-6">{addressText || 'Chưa lưu địa chỉ nhận hàng.'}</p>
                </div>

                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      resetCart();
                      navigate('/');
                    }}
                    className="flex w-full min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold text-red-600 transition hover:bg-red-50"
                  >
                    <FiLogOut className="h-5 w-5 shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </aside>

              <div className="min-w-0">
                {activeTab === 'profile' && (
                  <Panel
                    eyebrow="Thông tin"
                    title="Cập nhật tài khoản"
                    description="Thông tin này dùng để liên hệ khi đặt hàng và nhận thông báo từ hệ thống."
                  >
                    <form onSubmit={handleProfileSubmit} className="grid gap-4">
                      <Field label="Họ và tên" name="name" value={profile.name} onChange={handleProfileChange} error={profileErrors.name} icon={FiUser} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Email" name="email" type="email" value={profile.email} onChange={handleProfileChange} error={profileErrors.email} icon={FiMail} readOnly />
                        <Field label="Số điện thoại" name="phone" type="tel" value={profile.phone} onChange={handleProfileChange} error={profileErrors.phone} icon={FiPhone} placeholder="0123456789" />
                      </div>
                      <Actions saving={savingProfile} label="Lưu thông tin" />
                    </form>
                  </Panel>
                )}

                {activeTab === 'password' && (
                  <Panel
                    eyebrow="Bảo mật"
                    title="Đổi mật khẩu"
                    description="Sau khi đổi mật khẩu, bạn tiếp tục đăng nhập bằng mật khẩu mới ở các lần sau."
                  >
                    <form onSubmit={handlePasswordSubmit} className="grid gap-4">
                      <Field label="Mật khẩu hiện tại" name="currentPassword" type="password" value={password.currentPassword} onChange={handlePasswordChange} error={passwordErrors.currentPassword} icon={FiLock} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Mật khẩu mới" name="newPassword" type="password" value={password.newPassword} onChange={handlePasswordChange} error={passwordErrors.newPassword} icon={FiLock} />
                        <Field label="Nhập lại mật khẩu mới" name="confirmPassword" type="password" value={password.confirmPassword} onChange={handlePasswordChange} error={passwordErrors.confirmPassword} icon={FiCheck} />
                      </div>
                      <Actions saving={changingPassword} label="Đổi mật khẩu" />
                    </form>
                  </Panel>
                )}

                {activeTab === 'address' && (
                  <Panel
                    eyebrow="Nhận hàng"
                    title="Địa chỉ mặc định"
                    description="Địa chỉ này được dùng làm gợi ý khi bạn thanh toán đơn hàng mới."
                  >
                    <form onSubmit={handleAddressSubmit} className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tên người nhận" name="fullName" value={address.fullName} onChange={handleAddressChange} error={addressErrors.fullName} icon={FiUser} />
                        <Field label="Số điện thoại nhận hàng" name="phoneNumber" type="tel" value={address.phoneNumber} onChange={handleAddressChange} error={addressErrors.phoneNumber} icon={FiPhone} placeholder="0123456789" />
                      </div>
                      <Field label="Địa chỉ" name="addressLine" value={address.addressLine} onChange={handleAddressChange} error={addressErrors.addressLine} icon={FiHome} placeholder="Số nhà, tên đường..." />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Phường / Xã" name="ward" value={address.ward} onChange={handleAddressChange} />
                        <Field label="Tỉnh / Thành phố" name="province" value={address.province} onChange={handleAddressChange} error={addressErrors.province} />
                      </div>
                      <Field label="Ghi chú giao hàng" name="note" value={address.note} onChange={handleAddressChange} multiline placeholder="Ví dụ: gọi trước khi giao..." />
                      <Actions saving={savingAddress} label="Lưu địa chỉ" />
                    </form>
                  </Panel>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Panel({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:px-6">
      <div className="mb-6">
        <div className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">{eyebrow}</div>
        <h2 className="mt-2 text-[24px] font-black text-zinc-950">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, name, value, onChange, error, type = 'text', icon: Icon, placeholder, multiline, readOnly = false }) {
  const inputClass = `min-h-12 w-full rounded-2xl border bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:bg-white focus:ring-2 focus:ring-[#d71920]/10 ${
    Icon ? 'pl-11' : ''
  } ${error ? 'border-red-300' : 'border-zinc-200'}`;

  return (
    <label className="grid gap-2">
      <span className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
        {multiline ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            rows={4}
            placeholder={placeholder}
            className={`${inputClass} resize-none py-3 ${Icon ? 'pl-11' : ''}`}
          />
        ) : (
          <input
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`${inputClass} ${readOnly ? 'cursor-not-allowed text-zinc-500' : ''}`}
          />
        )}
      </span>
      {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
    </label>
  );
}

function Actions({ saving, label }) {
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
        {saving ? 'Đang lưu...' : label}
      </button>
    </div>
  );
}

export default AccountPage;
