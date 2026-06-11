import { FaPhoneAlt } from 'react-icons/fa';
import { SiMessenger, SiZalo } from 'react-icons/si';

const quickActions = [
  {
    label: 'Gọi hotline',
    href: 'tel:0392757286',
    icon: FaPhoneAlt,
    color: '#d71920',
    iconClassName: 'text-xl',
  },
  {
    label: 'Messenger',
    href: 'https://m.me/pham.dung.224360',
    icon: SiMessenger,
    color: '#0084ff',
    iconClassName: 'text-[23px]',
    external: true,
  },
  {
    label: 'Zalo',
    href: 'https://zalo.me/0392757286',
    icon: SiZalo,
    color: '#0068ff',
    iconClassName: 'text-[24px]',
    external: true,
  },
];

function FloatingActions() {
  return (
    <div className="fixed right-4 bottom-4 z-20 grid gap-3" aria-label="Liên hệ nhanh">
      {quickActions.map((item, index) => {
        const Icon = item.icon;

        return (
          <a
            key={item.label}
            className="group relative isolate grid h-12 w-12 place-items-center rounded-full text-white transition hover:-translate-y-1"
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noreferrer' : undefined}
            aria-label={item.label}
            style={{ backgroundColor: item.color }}
          >
            <span
              className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-35 animate-ping [animation-duration:2.2s]"
              style={{ backgroundColor: item.color, animationDelay: `${index * 0.28}s` }}
            />
            <span
              className="pointer-events-none absolute inset-[-5px] -z-10 rounded-full opacity-20 animate-ping [animation-duration:2.8s]"
              style={{ backgroundColor: item.color, animationDelay: `${0.18 + index * 0.28}s` }}
            />
            <span
              className="absolute inset-0 rounded-full shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition group-hover:shadow-[0_18px_38px_rgba(15,23,42,0.28)]"
              aria-hidden="true"
            />
            <Icon className={`relative ${item.iconClassName}`} />
          </a>
        );
      })}
    </div>
  );
}

export default FloatingActions;
