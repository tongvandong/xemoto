import { FaPhoneAlt, FaFacebookMessenger } from 'react-icons/fa';

function FloatingActions() {
  return (
    <div className="fixed right-4 bottom-4 z-20 grid gap-3" aria-label="Liên hệ nhanh">
      <a
        className="grid h-12 w-12 place-items-center rounded-full bg-[#d71920] text-xl text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-1"
        href="tel:19006750"
        aria-label="Gọi hotline"
      >
        <FaPhoneAlt />
      </a>
      <a
        className="grid h-12 w-12 place-items-center rounded-full bg-[#0a7cff] text-2xl text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-1"
        href="https://m.me/"
        target="_blank"
        rel="noreferrer"
        aria-label="Messenger"
      >
        <FaFacebookMessenger />
      </a>
    </div>
  );
}

export default FloatingActions;
