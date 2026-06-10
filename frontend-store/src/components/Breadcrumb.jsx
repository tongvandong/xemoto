import { Link } from 'react-router-dom';

function Breadcrumb({ items = [] }) {
  return (
    <div className="border-y border-zinc-200 bg-zinc-50/80 backdrop-blur">
      <div className="mx-auto flex min-h-[52px] w-full max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm text-zinc-500">
        <Link className="font-semibold text-zinc-900 transition hover:text-[#d71920]" to="/">
          Trang chủ
        </Link>

        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-3">
            <span className="text-zinc-300">/</span>
            {item.to ? (
              <Link className="font-medium text-zinc-700 transition hover:text-[#d71920]" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <strong className="font-bold text-zinc-900">{item.label}</strong>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Breadcrumb;
