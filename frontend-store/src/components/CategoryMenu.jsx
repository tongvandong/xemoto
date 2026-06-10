import { Link } from 'react-router-dom';

function CategoryMenu({ categories = [] }) {
  if (!categories.length) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-zinc-500">
        Chưa có danh mục đang hoạt động.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {categories.map((category) => {
        const target = category.to || (category.id ? `/products?categoryId=${category.id}` : '/products');

        return (
          <Link
            key={category.id || category.slug || category.name}
            className="group relative isolate min-h-[220px] overflow-hidden rounded-[28px] bg-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_28px_56px_rgba(0,0,0,0.22)]"
            to={target}
          >
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                className="h-full min-h-[220px] w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-[0.8deg]"
              />
            ) : (
              <div className="grid min-h-[220px] place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%),linear-gradient(135deg,#151515,#d71920)] text-xl font-black text-white">
                EURO Moto
              </div>
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.28)_52%,rgba(10,10,10,0.88)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_30%)] opacity-70 transition duration-500 group-hover:opacity-100" />

            <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur-md transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:bg-[#d71920]">
              <span className="text-lg font-black">↗</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="translate-y-2 transition duration-500 group-hover:translate-y-0">
                <span className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                  Danh mục nổi bật
                </span>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[22px] leading-tight font-black text-white drop-shadow-md">{category.name}</h3>
                    <p className="mt-2 max-w-[18rem] text-[13px] leading-6 text-white/72 opacity-0 transition duration-500 group-hover:opacity-100">
                      Khám phá bộ sưu tập được chọn lọc theo phong cách và nhu cầu sử dụng.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-900 transition duration-500 group-hover:bg-[#ffd25d]">
                    Xem ngay
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default CategoryMenu;
