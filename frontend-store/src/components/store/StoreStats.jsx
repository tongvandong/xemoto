import { CDN } from '../../assets/siteData.js';

function buildStats(stores = []) {
  const cityCount = new Set(stores.map((store) => store.city).filter(Boolean)).size;

  return [
    {
      label: 'Cửa hàng',
      value: String(stores.length),
      icon: `${CDN}/themes/954445/assets/icon_hethong1.png?1758009468922`,
    },
    {
      label: 'Tỉnh thành',
      value: String(cityCount),
      icon: `${CDN}/themes/954445/assets/icon_hethong2.png?1758009468922`,
    },
    {
      label: 'Văn phòng đại diện',
      value: '3',
      icon: `${CDN}/themes/954445/assets/icon_hethong3.png?1758009468922`,
    },
    {
      label: 'Nhân sự',
      value: '500+',
      icon: `${CDN}/themes/954445/assets/icon_hethong4.png?1758009468922`,
    },
  ];
}

function StoreStats({ stores = [] }) {
  // TODO: move representative office and staff totals to backend/config when the database has official management fields.
  const stats = buildStats(stores);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff4f4]">
            <img src={item.icon} alt={item.label} className="h-9 w-9 object-contain" loading="lazy" />
          </span>
          <span className="text-[15px] font-bold text-zinc-700">
            {item.label}
            <strong className="mt-1 block text-[28px] leading-none font-black text-[#d71920]">{item.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

export default StoreStats;
