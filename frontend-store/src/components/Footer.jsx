import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brandAssets } from '../assets/siteData.js';
import { FaFacebookF, FaYoutube, FaInstagram, FaTiktok } from 'react-icons/fa';

function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  function handleNewsletterSubmit(event) {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMessage('Vui lòng nhập email hợp lệ.');
      return;
    }

    setNewsletterMessage('Cảm ơn bạn, EURO Moto sẽ gửi ưu đãi mới qua email này.');
    setNewsletterEmail('');
  }

  return (
    <footer className="bg-[#151515] text-white">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1.4fr]">
        <div>
          <Link className="inline-block" to="/">
            <img src={brandAssets.footerLogo} alt="EURO Moto" className="w-[210px]" />
          </Link>

          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Hệ thống mua bán xe máy, phụ tùng và dịch vụ bảo dưỡng dành cho khách hàng EURO Moto.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>Địa chỉ: 236 Hoàng Quốc Việt, phường Nghĩa Đô, TP Hà Nội</li>
            <li>Email: phamtiendung2k5hc@gmail.com</li>
            <li>Hotline: 1900 6750</li>
          </ul>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Chính sách</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <Link className="block transition hover:text-white" to="/">
              Hướng dẫn mua hàng
            </Link>
            <Link className="block transition hover:text-white" to="/">
              Hướng dẫn thanh toán
            </Link>
            <Link className="block transition hover:text-white" to="/">
              Chính sách vận chuyển
            </Link>
            <Link className="block transition hover:text-white" to="/">
              Bảo mật thông tin
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Danh mục</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <Link className="block transition hover:text-white" to="/products?categorySlug=xe-tay-ga">
              Xe tay ga
            </Link>
            <Link className="block transition hover:text-white" to="/products?categorySlug=xe-so">
              Xe số
            </Link>
            <Link className="block transition hover:text-white" to="/products?categorySlug=xe-con-tay">
              Xe côn tay
            </Link>
            <Link className="block transition hover:text-white" to="/products?categorySlug=phu-tung">
              Phụ tùng
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Nhận tin khuyến mãi</h3>
          <form className="mt-4 flex gap-2" onSubmit={handleNewsletterSubmit}>
            <input
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-white px-4 text-sm text-zinc-900 outline-none"
              type="email"
              placeholder="Nhập email nhận tin khuyến mãi"
              value={newsletterEmail}
              required
              onChange={(event) => {
                setNewsletterEmail(event.target.value);
                setNewsletterMessage('');
              }}
            />
            <button
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#d71920] px-4 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
              type="submit"
            >
              Đăng ký
            </button>
          </form>
          {newsletterMessage && <p className="mt-2 text-xs font-semibold text-zinc-300">{newsletterMessage}</p>}

          <div className="mt-5 flex gap-2" aria-label="Mạng xã hội">
            {[
              { id: 'f', icon: <FaFacebookF /> },
              { id: 'yt', icon: <FaYoutube /> },
              { id: 'ig', icon: <FaInstagram /> },
              { id: 'tk', icon: <FaTiktok /> },
            ].map((item) => (
              <a
                href="#"
                key={item.id}
                className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-800 text-[15px] text-white transition hover:bg-[#d71920]"
                aria-label={`Mạng xã hội ${item.id}`}
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-zinc-400">2026 EURO Moto.</div>
    </footer>
  );
}

export default Footer;
