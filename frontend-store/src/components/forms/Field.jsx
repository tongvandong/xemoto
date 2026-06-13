// Ô nhập liệu chuẩn của form checkout: label + input/textarea + thông báo lỗi.
function Field({ label, id, name, value, onChange, error, placeholder, type = 'text', multiline }) {
  const baseClass = 'w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20';
  const errorClass = error ? 'border-red-300' : 'border-zinc-200';
  return (
    <div>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-zinc-700">{label}</label>}
      {multiline ? (
        <textarea id={id} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3} className={`${baseClass} ${errorClass} resize-none`} />
      ) : (
        <input id={id} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${baseClass} ${errorClass}`} />
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

export default Field;
