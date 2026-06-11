import { useEffect, useState } from 'react';
import { FiChevronDown, FiSend } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { contentApi } from '../services/api.js';

const fallbackFaqCategories = [
  {
    title: 'Tài khoản & Đăng nhập',
    items: [
      {
        question: 'Làm thế nào để đăng ký tài khoản?',
        answer: 'Bạn nhấn vào nút "Đăng ký", điền họ tên, email, số điện thoại và mật khẩu. Sau khi đăng ký thành công, bạn có thể đăng nhập ngay.',
      },
      {
        question: 'Tôi quên mật khẩu, phải làm sao?',
        answer: 'Bạn vào trang "Quên mật khẩu", nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút.',
      },
      {
        question: 'Làm sao để thay đổi thông tin cá nhân?',
        answer: 'Sau khi đăng nhập, bạn vào trang tài khoản để cập nhật họ tên, số điện thoại, địa chỉ nhận hàng hoặc đổi mật khẩu.',
      },
    ],
  },
  {
    title: 'Đặt hàng & Thanh toán',
    items: [
      {
        question: 'Tôi có thể đặt hàng như thế nào?',
        answer: 'Chọn sản phẩm, thêm vào giỏ hàng, vào trang thanh toán, điền thông tin giao nhận, chọn phương thức thanh toán và nhấn "Đặt hàng".',
      },
      {
        question: 'Có những phương thức thanh toán nào?',
        answer: 'Hệ thống hỗ trợ chuyển khoản ngân hàng và các phương thức thanh toán được cấu hình trên cửa hàng.',
      },
      {
        question: 'Tôi có thể đặt cọc trước không?',
        answer: 'Có. Khi thanh toán, bạn có thể chọn hình thức đặt cọc hoặc trả góp nếu sản phẩm và chính sách cửa hàng hỗ trợ.',
      },
      {
        question: 'Đơn hàng của tôi sẽ bị hủy khi nào?',
        answer: 'Đơn có thể bị hủy khi hết thời gian giữ chỗ, khi khách chủ động hủy, hoặc khi cửa hàng không thể xác nhận thanh toán/giao nhận.',
      },
    ],
  },
  {
    title: 'Voucher & Khuyến mãi',
    items: [
      {
        question: 'Làm sao để nhận voucher?',
        answer: 'Vào trang Kho Voucher, xem danh sách voucher khả dụng và nhấn nhận để lưu voucher vào tài khoản.',
      },
      {
        question: 'Tại sao voucher của tôi không áp dụng được?',
        answer: 'Voucher có thể không áp dụng được do chưa đạt giá trị đơn tối thiểu, sai phạm vi sản phẩm/danh mục hoặc đã hết lượt sử dụng.',
      },
    ],
  },
  {
    title: 'Giao hàng & Nhận xe',
    items: [
      {
        question: 'Có những hình thức nhận hàng nào?',
        answer: 'Bạn có thể chọn giao hàng tận nơi hoặc nhận trực tiếp tại showroom.',
      },
      {
        question: 'Phí giao hàng là bao nhiêu?',
        answer: 'Phí giao hàng được tính theo địa chỉ nhận hàng, phương thức nhận hàng và chính sách vận chuyển hiện tại.',
      },
    ],
  },
  {
    title: 'Sản phẩm & Đánh giá',
    items: [
      {
        question: 'Tôi có thể đánh giá sản phẩm không?',
        answer: 'Có. Sau khi mua hàng và đủ điều kiện đánh giá, bạn có thể viết đánh giá tại trang chi tiết sản phẩm.',
      },
      {
        question: 'Sản phẩm có bảo hành không?',
        answer: 'Xe máy và phụ tùng chính hãng được bảo hành theo chính sách của nhà sản xuất và cửa hàng.',
      },
    ],
  },
];

function groupFaqs(items) {
  const grouped = [];
  for (const item of items) {
    const title = item.category || 'Câu hỏi thường gặp';
    let group = grouped.find((g) => g.title === title);
    if (!group) {
      group = { title, items: [] };
      grouped.push(group);
    }
    group.items.push({ question: item.question, answer: item.answer });
  }
  return grouped;
}

function FaqPage() {
  const { notify } = useNotification();
  const [openIndex, setOpenIndex] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', question: '' });
  const [sending, setSending] = useState(false);
  const [apiCategories, setApiCategories] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFaqs() {
      try {
        const response = await contentApi.getFaqs();
        const data = response?.data;
        const rawItems = Array.isArray(data) ? data : data?.items || data?.Items || [];
        const mapped = rawItems
          .map((item) => ({
            question: item.question ?? item.Question ?? item.cauHoi ?? item.CauHoi ?? '',
            answer: item.answer ?? item.Answer ?? item.cauTraLoi ?? item.CauTraLoi ?? '',
            category: item.category ?? item.Category ?? item.danhMuc ?? item.DanhMuc ?? 'Câu hỏi thường gặp',
            sortOrder: Number(item.sortOrder ?? item.SortOrder ?? item.thuTuHienThi ?? item.ThuTuHienThi ?? 0),
          }))
          .filter((item) => item.question && item.answer)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (!cancelled && mapped.length > 0) {
          setApiCategories(groupFaqs(mapped));
        }
      } catch {
        // Keep static FAQ content as fallback.
      }
    }

    loadFaqs();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = apiCategories ?? fallbackFaqCategories;

  function handleContactChange(e) {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.question.trim()) {
      notify('Vui lòng điền họ tên và câu hỏi', 'error');
      return;
    }

    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    notify('Đã gửi câu hỏi thành công! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
    setContactForm({ name: '', phone: '', question: '' });
    setSending(false);
  }

  let globalIndex = 0;

  return (
    <>
      <Breadcrumb items={[{ label: 'Câu hỏi thường gặp' }]} />

      <section className="bg-[linear-gradient(180deg,#f5f6f8_0%,#ffffff_26%)] px-4 py-10">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-10 text-center">
            <h1 className="text-[28px] font-black text-zinc-950 sm:text-[34px]">Câu hỏi thường gặp</h1>
          </div>

          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.title}>
                <h2 className="mb-4 text-lg font-extrabold text-[#d71920]">{category.title}</h2>
                <div className="space-y-2">
                  {category.items.map((item) => {
                    const idx = globalIndex++;
                    const isOpen = openIndex === idx;
                    return (
                      <div key={idx} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => setOpenIndex(isOpen ? null : idx)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-zinc-50"
                        >
                          <span className="text-sm font-bold text-zinc-900">{item.question}</span>
                          <FiChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition duration-300 ${isOpen ? 'rotate-180 text-[#d71920]' : ''}`} />
                        </button>
                        <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden">
                            <div className="border-t border-zinc-100 px-5 py-4 text-sm leading-7 text-zinc-600">
                              {item.answer}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[28px] border border-zinc-200 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <h2 className="text-center text-[22px] font-black text-zinc-950">Bạn có câu hỏi khác?</h2>
            <p className="mt-2 text-center text-sm text-zinc-500">Gửi câu hỏi cho chúng tôi, chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>

            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Họ và tên *</label>
                  <input
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Số điện thoại</label>
                  <input
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleContactChange}
                    placeholder="0912345678"
                    type="tel"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-zinc-700">Câu hỏi của bạn *</label>
                <textarea
                  name="question"
                  value={contactForm.question}
                  onChange={handleContactChange}
                  placeholder="Nhập câu hỏi của bạn tại đây..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d71920] px-8 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSend className="h-4 w-4" />
                  {sending ? 'Đang gửi...' : 'Gửi câu hỏi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqPage;
