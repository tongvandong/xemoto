import { FiCheckCircle, FiShield } from 'react-icons/fi';

const commitments = [
  'Sản phẩm chính hãng',
  'Giá tốt trực tiếp',
  'Combo quà chất lượng',
  'Bảo hành 3 - 5 năm',
  'Giao hàng tận nhà',
];

function ProductCommitmentSidebar() {
  return (
    <aside className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="border-b border-zinc-100 pb-3 text-lg font-bold text-zinc-950">Cam kết bán hàng</h3>

      <ul className="mt-4 space-y-3">
        {commitments.map((item, index) => (
          <li key={item} className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1f2] text-[#d71920]">
              {index % 2 === 0 ? <FiShield className="h-5 w-5" /> : <FiCheckCircle className="h-5 w-5" />}
            </span>
            <span className="text-sm font-medium text-zinc-700">{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default ProductCommitmentSidebar;
