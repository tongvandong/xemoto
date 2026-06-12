function AuthForm({ title, subtitle, fields, submitLabel, footer, loading, error, onSubmit, children }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit(Object.fromEntries(formData.entries()));
  }

  return (
    <section className="bg-zinc-50 px-4 py-10 sm:py-14">
      <form
        className="mx-auto w-full max-w-[520px] rounded-[32px] border border-zinc-200 bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-7 sm:py-8"
        onSubmit={handleSubmit}
      >
        <div className="mb-6 text-center">
          <h1 className="text-[28px] font-black text-zinc-950 sm:text-[32px]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {fields.map((field) => (
            <label key={field.name} className="grid gap-2.5">
              <span className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">{field.label}</span>
              <input
                {...field}
                className="min-h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-[#d71920] focus:bg-white focus:shadow-[0_0_0_4px_rgba(215,25,32,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              />
            </label>
          ))}
        </div>

        {children && <div className="mt-4">{children}</div>}

        <button
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_rgba(215,25,32,0.25)] transition hover:bg-[#b61016] hover:shadow-[0_18px_34px_rgba(215,25,32,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          type="submit"
          disabled={loading}
        >
          {loading && <span className="ui-spinner !h-4 !w-4 !border-2 !border-white/40 !border-t-white" aria-hidden="true" />}
          {loading ? 'Đang xử lý...' : submitLabel}
        </button>

        {footer && <div className="mt-4 text-center text-sm text-zinc-600 [&_a]:font-bold [&_a]:text-[#d71920]">{footer}</div>}
      </form>
    </section>
  );
}

export default AuthForm;
