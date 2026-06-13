// Khung card trắng bo góc dùng chung cho các section của trang (checkout, đơn hàng...).
function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-[28px] border border-zinc-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] ${className}`}>
      {title && <h2 className="text-[18px] font-black text-zinc-950">{title}</h2>}
      {children}
    </div>
  );
}

export default SectionCard;
