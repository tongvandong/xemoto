// Nút radio dạng viên thuốc, dùng cho các lựa chọn 1-trong-n (phương thức nhận hàng, hình thức thanh toán...).
function RadioPill({ name, value, label, checked, onChange }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition ${checked ? 'border-[#d71920] bg-red-50 text-[#d71920]' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${checked ? 'border-[#d71920]' : 'border-zinc-300'}`}>
        {checked && <span className="h-2 w-2 rounded-full bg-[#d71920]" />}
      </span>
      {label}
    </label>
  );
}

export default RadioPill;
