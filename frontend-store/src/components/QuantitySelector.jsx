function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  function setNextValue(nextValue) {
    const numericValue = Number(nextValue);

    if (Number.isNaN(numericValue)) {
      return;
    }

    onChange(Math.max(min, Math.min(max, numericValue)));
  }

  return (
    <div className="inline-grid h-[52px] grid-cols-[48px_72px_48px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        className="bg-zinc-100 text-lg font-black text-zinc-900 transition hover:bg-zinc-200"
        onClick={() => setNextValue((value || min) - 1)}
      >
        -
      </button>
      <input
        type="number"
        min={min}
        max={max}
        className="w-full bg-white text-center text-base font-bold text-zinc-900 outline-none"
        value={value}
        onChange={(event) => setNextValue(event.target.value)}
      />
      <button
        type="button"
        className="bg-zinc-100 text-lg font-black text-zinc-900 transition hover:bg-zinc-200"
        onClick={() => setNextValue((value || min) + 1)}
      >
        +
      </button>
    </div>
  );
}

export default QuantitySelector;
