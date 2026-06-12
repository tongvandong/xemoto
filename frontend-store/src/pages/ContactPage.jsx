import { useEffect, useState } from 'react';
import {
  FiClock,
  FiFacebook,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhoneCall,
  FiSend,
  FiUser,
} from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { contentApi, shopApi } from '../services/api.js';

const defaultContactProfile = {
  owner: 'Phạm Tiến Dũng',
  phone: '0392757286',
  zalo: '0392757286',
  facebook: 'https://web.facebook.com/pham.dung.224360',
  messenger: 'https://m.me/pham.dung.224360',
  email: 'phamtiendung2k5hc@gmail.com',
  address: '236 Hoàng Quốc Việt, phường Nghĩa Đô, TP Hà Nội',
  hours: '08:00 - 21:00, tất cả các ngày trong tuần',
};

const buildContactCards = (profile) => [
  {
    label: 'Hotline tư vấn',
    value: profile.phone,
    description: 'Gọi trực tiếp để được hỗ trợ chọn xe, phụ tùng và lịch bảo dưỡng.',
    href: `tel:${profile.phone}`,
    icon: FiPhoneCall,
    tone: 'bg-[#d71920] text-white',
  },
  {
    label: 'Zalo',
    value: profile.zalo,
    description: 'Nhắn Zalo để gửi hình xe, nhận báo giá nhanh và trao đổi lịch hẹn.',
    href: `https://zalo.me/${profile.zalo}`,
    icon: FiMessageCircle,
    tone: 'bg-[#0a7cff] text-white',
  },
  {
    label: 'Facebook',
    value: profile.owner,
    description: 'Theo dõi cập nhật sản phẩm, chương trình ưu đãi và phản hồi khách hàng.',
    href: profile.facebook,
    icon: FiFacebook,
    tone: 'bg-[#1877f2] text-white',
  },
  {
    label: 'Email',
    value: profile.email,
    description: 'Gửi yêu cầu chi tiết, báo giá số lượng hoặc thông tin bảo hành.',
    href: `mailto:${profile.email}`,
    icon: FiMail,
    tone: 'bg-zinc-950 text-white',
  },
];

const supportItems = [
  {
    title: 'Tư vấn mua xe',
    text: 'So sánh mẫu xe, đời xe, tình trạng và chi phí lăn bánh phù hợp nhu cầu.',
  },
  {
    title: 'Phụ tùng & bảo dưỡng',
    text: 'Kiểm tra tồn kho, đặt lịch bảo dưỡng, thay thế phụ tùng chính hãng.',
  },
  {
    title: 'Hỗ trợ đơn hàng',
    text: 'Tra cứu thanh toán, lịch nhận xe, vận chuyển và chính sách sau bán.',
  },
];

const initialForm = {
  fullName: '',
  phone: '',
  email: '',
  subject: '',
  message: '',
};

function mapShowroomToContactProfile(showroom) {
  return {
    ...defaultContactProfile,
    owner: showroom.contactName || showroom.name || defaultContactProfile.owner,
    phone: showroom.phoneNumber || defaultContactProfile.phone,
    zalo: showroom.zaloPhone || showroom.phoneNumber || defaultContactProfile.zalo,
    facebook: showroom.facebookUrl || defaultContactProfile.facebook,
    messenger: showroom.messengerUrl || defaultContactProfile.messenger,
    email: showroom.email || defaultContactProfile.email,
    address: showroom.address || defaultContactProfile.address,
    hours: showroom.openingHours || defaultContactProfile.hours,
  };
}

function ContactPage() {
  const { notify } = useNotification();
  const [contactProfile, setContactProfile] = useState(defaultContactProfile);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const contactCards = buildContactCards(contactProfile);

  useEffect(() => {
    let cancelled = false;

    async function loadContactProfile() {
      try {
        const showroom = await shopApi.getShowroomProfile();
        if (!cancelled && showroom?.isActive !== false) {
          setContactProfile(mapShowroomToContactProfile(showroom));
        }
      } catch {
        // Keep static fallback contact information when settings cannot be loaded.
      }
    }

    loadContactProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.phone.trim() || !form.message.trim()) {
      notify('Vui lòng nhập họ tên, số điện thoại và nội dung cần hỗ trợ.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await contentApi.createContactRequest({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        subject: form.subject.trim() || 'Yêu cầu liên hệ từ trang khách hàng',
        message: form.message.trim(),
        inquiryType: 'General',
      });
      notify('Đã gửi thông tin liên hệ. Chúng tôi sẽ phản hồi sớm nhất.', 'success');
      setForm(initialForm);
    } catch (error) {
      notify(error.message || 'Chưa gửi được liên hệ, vui lòng thử lại hoặc gọi hotline.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Liên hệ' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_34%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-stretch">
            <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
              <div className="relative isolate min-h-full px-6 py-7 sm:px-8 lg:px-9 lg:py-9">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#d71920,#f0a327)]" />
                <div className="max-w-[680px]">
                  <h1 className="mt-3 text-[26px] font-black leading-tight text-zinc-950 sm:text-[34px]">
                    Liên hệ trực tiếp với {contactProfile.owner}
                  </h1>
                  <p className="mt-3 max-w-[620px] text-sm leading-7 text-zinc-600 sm:text-[15px]">
                    Cần tư vấn xe, phụ tùng, bảo dưỡng hoặc hỗ trợ đơn hàng, bạn có thể gọi hotline,
                    nhắn Zalo/Facebook hoặc gửi yêu cầu qua biểu mẫu bên dưới.
                  </p>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <a
                    href={`tel:${contactProfile.phone}`}
                    className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:-translate-y-1 hover:border-[#d71920]/30 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d71920] text-xl text-white">
                      <FiPhoneCall />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Hotline</span>
                      <span className="block truncate text-[17px] font-black text-zinc-950">{contactProfile.phone}</span>
                    </span>
                  </a>

                  <a
                    href={`https://zalo.me/${contactProfile.zalo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:-translate-y-1 hover:border-[#0a7cff]/30 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0a7cff] text-xl font-black text-white">
                      Z
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-zinc-500">Zalo</span>
                      <span className="block truncate text-[17px] font-black text-zinc-950">{contactProfile.zalo}</span>
                    </span>
                  </a>
                </div>

                <div className="mt-7 grid gap-4 text-sm leading-6 text-zinc-600 md:grid-cols-2">
                  <div className="flex gap-3">
                    <FiMapPin className="mt-1 h-5 w-5 shrink-0 text-[#d71920]" />
                    <span>{contactProfile.address}</span>
                  </div>
                  <div className="flex gap-3">
                    <FiClock className="mt-1 h-5 w-5 shrink-0 text-[#f0a327]" />
                    <span>{contactProfile.hours}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-7">
              <h2 className="text-[24px] font-black text-zinc-950">Gửi yêu cầu hỗ trợ</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Điền thông tin, đội ngũ sẽ liên hệ lại theo kênh phù hợp.</p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Họ và tên *</label>
                  <div className="relative">
                    <FiUser className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-zinc-700">Số điện thoại *</label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      type="tel"
                      placeholder="0912345678"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-zinc-700">Email</label>
                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      type="email"
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Tiêu đề</label>
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Tư vấn mua xe, bảo dưỡng, đơn hàng..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Nội dung *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Bạn cần hỗ trợ nội dung gì?"
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSend className="h-4 w-4" />
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {contactCards.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#d71920]/30 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${item.tone}`}>
                    <Icon />
                  </span>
                  <span className="mt-4 block text-sm font-bold text-zinc-500">{item.label}</span>
                  <span className="mt-1 block break-words text-lg font-black text-zinc-950 group-hover:text-[#d71920]">{item.value}</span>
                  <span className="mt-3 block text-sm leading-6 text-zinc-500">{item.description}</span>
                </a>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="rounded-[28px] border border-zinc-200 bg-[#fff7ea] p-6 shadow-sm sm:p-7">
              <h2 className="text-[22px] font-black text-zinc-950">Nội dung thường hỗ trợ</h2>
              <div className="mt-5 grid gap-4">
                {supportItems.map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d71920]" />
                    <span>
                      <span className="block text-sm font-black text-zinc-950">{item.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-zinc-600">{item.text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="grid min-h-[280px] place-items-center bg-[linear-gradient(135deg,#f3f4f6,#ffffff)] px-6 py-10 text-center">
              <FiMapPin className="h-10 w-10 text-[#d71920]" />
              <h2 className="mt-4 text-[24px] font-black text-zinc-950">Showroom EURO Moto</h2>
              <p className="mt-2 max-w-[640px] text-sm leading-7 text-zinc-500">{contactProfile.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactProfile.address)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#d71920] px-6 text-sm font-extrabold text-[#d71920] transition hover:bg-[#d71920] hover:text-white"
              >
                Xem bản đồ
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
