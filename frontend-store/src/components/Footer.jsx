import { Link } from 'react-router-dom';
import { brandAssets } from '../assets/siteData.js';
import { FaFacebookF, FaYoutube, FaInstagram, FaTiktok } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="bg-[#151515] text-white">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1.4fr]">
        <div>
          <Link className="inline-block" to="/">
            {brandAssets.footerLogo ? (
              <img src={brandAssets.footerLogo} alt="EURO Moto" className="w-[210px]" />
            ) : (
              <span className="inline-flex items-center gap-3 text-[30px] font-black tracking-tight text-white">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d71920]">€</span>
                <span>Moto</span>
              </span>
            )}
          </Link>

          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Hệ thống mua bán xe máy, phụ tùng và dịch vụ bảo dưỡng dành cho khách hàng EURO Moto.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>Địa chỉ: 236 Hoàng Quốc Việt, phường Nghĩa Đô, TP Hà Nội</li>
            <li>Email: phamtiendung2k5hc@gmail.com</li>
            <li>Liên hệ: Phạm Tiến Dũng</li>
            <li>Hotline/Zalo: 0392757286</li>
          </ul>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Chính sách</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/">
              Hướng dẫn mua hàng
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/">
              Hướng dẫn thanh toán
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/">
              Chính sách vận chuyển
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/">
              Bảo mật thông tin
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Danh mục</h3>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/products?categorySlug=xe-tay-ga">
              Xe tay ga
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/products?categorySlug=xe-so">
              Xe số
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/products?categorySlug=xe-con-tay">
              Xe côn tay
            </Link>
            <Link className="block transition hover:translate-x-1 hover:text-white" to="/products?categorySlug=phu-tung">
              Phụ tùng
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-white">Nhận tin khuyến mãi</h3>
          <form className="mt-4 flex gap-2" onSubmit={(event) => event.preventDefault()}>
            <input
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:shadow-[0_0_0_4px_rgba(215,25,32,0.18)]"
              type="email"
              placeholder="Nhập email nhận tin khuyến mãi"
            />
            <button
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#d71920] px-4 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] active:scale-[0.98]"
              type="submit"
            >
              Đăng ký
            </button>
          </form>

          <div className="mt-5 flex gap-2" aria-label="Mạng xã hội">
            {[
              { id: 'f', icon: <FaFacebookF />, href: 'https://web.facebook.com/pham.dung.224360' },
              { id: 'yt', icon: <FaYoutube />, href: 'https://www.youtube.com/' },
              { id: 'ig', icon: <FaInstagram />, href: 'mailto:phamtiendung2k5hc@gmail.com' },
              { id: 'tk', icon: <FaTiktok />, href: 'https://zalo.me/0392757286' },
            ].map((item) => (
              <a
                href={item.href}
                key={item.id}
                className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-800 text-[15px] text-white transition hover:-translate-y-0.5 hover:bg-[#d71920]"
                aria-label={`Mạng xã hội ${item.id}`}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
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
