function StoreMap({ src, title = 'Bản đồ hệ thống cửa hàng EURO Moto' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <iframe
        src={src}
        title={title}
        className="h-[360px] w-full border-0 md:h-[420px] lg:h-[450px]"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default StoreMap;
