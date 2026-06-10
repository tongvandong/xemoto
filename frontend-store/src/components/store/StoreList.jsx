import { FaLocationArrow, FaMapMarkerAlt, FaPhoneAlt, FaStore } from 'react-icons/fa';
import { buildDirectionUrl, getTelHref } from '../../services/storeService.js';

function StoreList({ stores = [], activeStoreId, onSelectStore, onOpenDirections }) {
  if (!stores.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm font-semibold text-zinc-500">
        Không tìm thấy cửa hàng phù hợp.
      </div>
    );
  }

  return (
    <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1 lg:max-h-[690px]">
      {stores.map((store) => {
        const isActive = store.id === activeStoreId;
        const telHref = getTelHref(store.sdt);
        const directionUrl = buildDirectionUrl(store);

        return (
          <article
            key={store.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
              isActive ? 'border-[#d71920] bg-red-50 shadow-[0_16px_35px_rgba(215,25,32,0.12)]' : 'border-zinc-100 hover:border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-[#d71920]">
                <FaStore aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] leading-6 font-black text-zinc-950">{store.name}</h3>
                {(store.city || store.district) && (
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">
                    {[store.district, store.city].filter(Boolean).join(' - ')}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm leading-6 text-zinc-600">
              {store.address && (
                <div className="grid grid-cols-[22px_1fr] gap-2">
                  <FaMapMarkerAlt className="mt-1 text-zinc-400" aria-hidden="true" />
                  <span>{store.address}</span>
                </div>
              )}

              {store.sdt && (
                <div className="grid grid-cols-[22px_1fr] gap-2">
                  <FaPhoneAlt className="mt-1 text-zinc-400" aria-hidden="true" />
                  {telHref ? (
                    <a href={telHref} className="font-bold text-zinc-800 transition hover:text-[#d71920]">
                      {store.sdt}
                    </a>
                  ) : (
                    <span>{store.sdt}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectStore(store)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d71920] bg-white px-4 text-sm font-extrabold text-[#d71920] transition hover:bg-red-50"
              >
                <FaMapMarkerAlt aria-hidden="true" />
                Xem bản đồ
              </button>
              <button
                type="button"
                disabled={!directionUrl}
                onClick={() => onOpenDirections(store)}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition ${
                  directionUrl
                    ? 'bg-[#d71920] text-white hover:bg-[#b61016]'
                    : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                }`}
              >
                <FaLocationArrow aria-hidden="true" />
                Chỉ đường
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default StoreList;
