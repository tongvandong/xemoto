function SectionTitle({ kicker, title, action, center = false, className = '' }) {
  const layoutClass = center
    ? 'flex flex-col items-center justify-center text-center'
    : 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between';

  return (
    <div className={`${layoutClass} ${className}`.trim()}>
      <div>
        {kicker && (
          <span className={`mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#d71920] ${center ? 'justify-center' : ''}`}>
            <span className="h-[3px] w-7 rounded-full bg-[#d71920]" aria-hidden="true" />
            {kicker}
            {center && <span className="h-[3px] w-7 rounded-full bg-[#d71920]" aria-hidden="true" />}
          </span>
        )}
        <h2 className="text-[28px] leading-[1.15] font-black text-[#171717] sm:text-[32px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default SectionTitle;
