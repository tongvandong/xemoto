import { FaSearch } from 'react-icons/fa';

function StoreFilters({
  city,
  district,
  search,
  cities = [],
  districts = [],
  onCityChange,
  onDistrictChange,
  onSearchChange,
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#d71920]">Tìm cửa hàng</div>
          <h2 className="mt-1 text-xl font-black text-zinc-950">Hệ thống cửa hàng</h2>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#d71920] text-white">
          <FaSearch aria-hidden="true" />
        </span>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-zinc-800">
          <span>Tỉnh / Thành</span>
          <select
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none transition focus:border-[#d71920] focus:ring-4 focus:ring-[#d71920]/10"
          >
            <option value="">Chọn tỉnh thành</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {districts.length > 0 && (
          <label className="grid gap-2 text-sm font-bold text-zinc-800">
            <span>Quận / Huyện</span>
            <select
              value={district}
              onChange={(event) => onDistrictChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none transition focus:border-[#d71920] focus:ring-4 focus:ring-[#d71920]/10"
            >
              <option value="">Tất cả quận huyện</option>
              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="grid gap-2 text-sm font-bold text-zinc-800">
          <span>Tìm tên cửa hàng hoặc địa chỉ</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nhập tên cửa hàng hoặc địa chỉ"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-4 focus:ring-[#d71920]/10"
          />
        </label>
      </div>
    </div>
  );
}

export default StoreFilters;
