import { FiChevronRight, FiHome } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-y border-zinc-200 bg-zinc-50/80 backdrop-blur">
      <div className="mx-auto flex min-h-[52px] w-full max-w-[1200px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 text-sm text-zinc-500">
        <Link className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 transition hover:text-[#d71920]" to="/">
          <FiHome className="h-4 w-4" aria-hidden="true" />
          Trang chủ
        </Link>

        {items.map((item) => (
          <span key={item.label} className="inline-flex min-w-0 items-center gap-2">
            <FiChevronRight className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden="true" />
            {item.to ? (
              <Link className="truncate font-medium text-zinc-700 transition hover:text-[#d71920]" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <strong className="max-w-[60vw] truncate font-bold text-zinc-900 sm:max-w-md" aria-current="page">{item.label}</strong>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}

export default Breadcrumb;
