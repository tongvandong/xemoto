import { useEffect, useState } from 'react';
import { FiChevronDown, FiSend } from 'react-icons/fi';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { contentApi } from '../services/api.js';

const faqCategories = [
  {
    title: 'Tài khoản & Đăng nhập',
    items: [
      {
        question: 'Làm thế nào để đăng ký tài khoản?',
        answer: 'Bạn nhấn vào nút "Đăng ký" ở góc trên bên phải trang web, điền đầy đủ thông tin (họ tên, email, số điện thoại, mật khẩu) rồi nhấn "Đăng ký". Sau khi đăng ký thành công, bạn có thể đăng nhập ngay.',
      },
      {
        question: 'Tôi quên mật khẩu, phải làm sao?',
        answer: 'Bạn vào trang "Quên mật khẩu" ở màn hình đăng nhập, nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu. Liên kết chỉ có hiệu lực trong 30 phút; sau khi đặt lại thành công, hãy đăng nhập bằng mật khẩu mới.',
      },
      {
        question: 'Làm sao để thay đổi thông tin cá nhân?',
        answer: 'Sau khi đăng nhập, bạn nhấn vào tên tài khoản ở góc trên → chọn "Tài khoản cá nhân". Tại đây bạn có thể cập nhật họ tên, email, số điện thoại và đổi mật khẩu.',
      },
    ],
  },
  {
    title: 'Đặt hàng & Thanh toán',
    items: [
      {
        question: 'Tôi có thể đặt hàng như thế nào?',
        answer: 'Chọn sản phẩm → Thêm vào giỏ hàng → Vào giỏ hàng → Nhấn "Thanh toán" → Điền thông tin giao hàng → Chọn phương thức thanh toán → Nhấn "Đặt hàng". Đơn hàng sẽ được tạo và bạn cần thanh toán trong thời gian quy định.',
      },
      {
        question: 'Có những phương thức thanh toán nào?',
        answer: 'Chúng tôi hỗ trợ: Chuyển khoản ngân hàng, Ví MoMo, và VNPay. Sau khi đặt hàng, bạn sẽ nhận được thông tin thanh toán chi tiết.',
      },
      {
        question: 'Tôi có thể đặt cọc trước không?',
        answer: 'Có. Khi thanh toán, bạn chọn hình thức "Đặt cọc trước" và nhập số tiền muốn đặt cọc. Số tiền còn lại sẽ thanh toán khi nhận xe.',
      },
      {
        question: 'Đơn hàng của tôi sẽ bị hủy khi nào?',
        answer: 'Đơn hàng sẽ tự động hủy nếu bạn không thanh toán trong thời gian giữ chỗ (thường là 15 phút). Bạn cũng có thể tự hủy đơn khi đơn đang ở trạng thái "Chờ thanh toán".',
      },
    ],
  },
  {
    title: 'Voucher & Khuyến mãi',
    items: [
      {
        question: 'Làm sao để nhận voucher?',
        answer: 'Vào trang "Kho Voucher" (biểu tượng giảm giá trên thanh menu), xem danh sách voucher khả dụng và nhấn "Nhận" để lưu voucher vào tài khoản. Voucher đã nhận sẽ tự động hiển thị khi bạn thanh toán.',
      },
      {
        question: 'Tại sao voucher của tôi không áp dụng được?',
        answer: 'Voucher có thể không áp dụng được vì: giá trị đơn hàng chưa đạt mức tối thiểu, voucher chỉ áp dụng cho sản phẩm/danh mục/hãng xe cụ thể, hoặc voucher đã hết lượt sử dụng.',
      },
      {
        question: 'Mỗi voucher được dùng bao nhiêu lần?',
        answer: 'Mỗi voucher có giới hạn số lần sử dụng khác nhau. Thông tin này được hiển thị trên thẻ voucher. Sau khi dùng hết lượt, voucher sẽ không còn xuất hiện trong danh sách của bạn.',
      },
    ],
  },
  {
    title: 'Giao hàng & Nhận xe',
    items: [
      {
        question: 'Có những hình thức nhận hàng nào?',
        answer: 'Có 2 hình thức: "Giao hàng tận nơi" và "Nhận trực tiếp". Khi chọn nhận trực tiếp, bạn có thể hẹn ngày nhận xe.',
      },
      {
        question: 'Phí giao hàng là bao nhiêu?',
        answer: 'Phí giao hàng được hệ thống tính theo đơn vị vận chuyển phù hợp và địa chỉ nhận hàng tại bước thanh toán. Phí có thể được miễn hoặc giảm khi bạn áp dụng voucher miễn phí vận chuyển.',
      },
    ],
  },
  {
    title: 'Sản phẩm & Đánh giá',
    items: [
      {
        question: 'Tôi có thể đánh giá sản phẩm không?',
        answer: 'Có. Sau khi mua hàng và nhận sản phẩm thành công, bạn có thể vào trang chi tiết sản phẩm để viết đánh giá. Mỗi sản phẩm chỉ được đánh giá 1 lần.',
      },
      {
        question: 'Sản phẩm có bảo hành không?',
        answer: 'Tất cả xe máy đều được bảo hành theo chính sách của hãng. Phụ tùng chính hãng được bảo hành theo quy định.',
      },
      {
        question: 'Làm sao để thêm sản phẩm vào yêu thích?',
        answer: 'Tại trang danh sách sản phẩm hoặc trang chi tiết, nhấn vào biểu tượng trái tim (❤️) để thêm vào danh sách yêu thích. Bạn có thể xem lại tất cả sản phẩm yêu thích bằng cách nhấn icon trái tim trên thanh menu.',
      },
    ],
  },
];

// Gom FAQ từ API (đã sort theo sortOrder) thành các nhóm theo danh mục,
// giữ nguyên shape { title, items: [{ question, answer }] } của dữ liệu cứng.
function groupFaqs(items) {
  const grouped = [];
  for (const item of items) {
    const title = item.category;
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
        const rawItems = Array.isArray(data) ? data : data?.items || [];
        const mapped = rawItems
          .map((item) => ({
            question: item.question ?? '',
            answer: item.answer ?? '',
            category: item.category ?? 'Câu hỏi thường gặp',
            sortOrder: Number(item.sortOrder ?? 0),
          }))
          .filter((item) => item.question && item.answer)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (!cancelled && mapped.length > 0) {
          setApiCategories(groupFaqs(mapped));
        }
      } catch {
        // Lỗi hoặc API trống -> giữ danh sách FAQ cứng làm fallback.
      }
    }

    loadFaqs();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = apiCategories ?? faqCategories;

  function toggleItem(index) {
    setOpenIndex(openIndex === index ? null : index);
  }

  function handleContactChange(e) {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.question.trim()) {
      notify('Vui lòng điền họ tên, số điện thoại và câu hỏi', 'error');
      return;
    }
    setSending(true);
    try {
      await contentApi.createContactRequest({
        fullName: contactForm.name.trim(),
        phone: contactForm.phone.trim(),
        subject: 'Cau hoi tu trang FAQ',
        message: contactForm.question.trim(),
        inquiryType: 'General',
      });
      notify('Đã gửi câu hỏi thành công! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
      setContactForm({ name: '', phone: '', question: '' });
    } catch (err) {
      notify(err.message || 'Không thể gửi câu hỏi', 'error');
    } finally {
      setSending(false);
    }
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

          {/* FAQ Accordion */}
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
                          onClick={() => toggleItem(idx)}
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

          {/* Contact Form */}
          <div className="mt-12 rounded-[28px] border border-zinc-200 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <h2 className="text-center text-[22px] font-black text-zinc-950">Bạn có câu hỏi khác?</h2>
            <p className="mt-2 text-center text-sm text-zinc-500">Gửi câu hỏi cho chúng tôi, chúng tôi sẽ phản hồi trong thời gian sớm nhất</p>

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
                  <label className="mb-1.5 block text-sm font-bold text-zinc-700">Số điện thoại *</label>
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
