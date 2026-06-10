import { useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumb from '../components/Breadcrumb.jsx';
import LoadingState from '../components/LoadingState.jsx';
import StoreFilters from '../components/store/StoreFilters.jsx';
import StoreList from '../components/store/StoreList.jsx';
import StoreMap from '../components/store/StoreMap.jsx';
import StoreStats from '../components/store/StoreStats.jsx';
import useStoreLocations from '../hooks/useStoreLocations.js';
import { buildDirectionUrl, buildMapEmbedUrl, DEFAULT_STORE_MAP_URL } from '../services/storeService.js';

function normalizeSearchText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function StoreSystemPage() {
  const { stores, loading, error, reload } = useStoreLocations();
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStore, setActiveStore] = useState(null);
  const mapRef = useRef(null);

  const cities = useMemo(() => {
    const uniqueCities = new Set(stores.map((store) => store.city).filter(Boolean));
    return Array.from(uniqueCities).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [stores]);

  const districts = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    const uniqueDistricts = new Set(
      stores
        .filter((store) => store.city === selectedCity)
        .map((store) => store.district)
        .filter(Boolean),
    );

    return Array.from(uniqueDistricts).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [selectedCity, stores]);

  const filteredStores = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return stores.filter((store) => {
      const matchesCity = selectedCity ? store.city === selectedCity : true;
      const matchesDistrict = selectedDistrict ? store.district === selectedDistrict : true;
      const searchableText = [store.name, store.address].filter(Boolean).join(' ');
      const matchesSearch = normalizedSearch ? normalizeSearchText(searchableText).includes(normalizedSearch) : true;

      return matchesCity && matchesDistrict && matchesSearch;
    });
  }, [searchTerm, selectedCity, selectedDistrict, stores]);

  function handleSelectStore(store) {
    setActiveStore(store);

    if (window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function handleCityChange(nextCity) {
    setSelectedCity(nextCity);
    setSelectedDistrict('');
  }

  function handleOpenDirections(store) {
    const directionUrl = buildDirectionUrl(store);
    if (directionUrl) {
      window.open(directionUrl, '_blank', 'noopener,noreferrer');
    }
  }

  useEffect(() => {
    if (!stores.length) {
      setActiveStore(null);
      return;
    }

    setActiveStore((currentStore) => {
      if (currentStore && stores.some((store) => store.id === currentStore.id)) {
        return currentStore;
      }

      return stores[0];
    });
  }, [stores]);

  const mapUrl = activeStore ? buildMapEmbedUrl(activeStore) : DEFAULT_STORE_MAP_URL;
  const activeStoreId = activeStore?.id;

  return (
    <>
      <Breadcrumb items={[{ label: 'Hệ thống cửa hàng' }]} />

      <section className="bg-[linear-gradient(180deg,#f7f7f8_0%,#ffffff_30%)] px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-[1200px] space-y-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-[13px] font-extrabold uppercase tracking-[0.18em] text-[#d71920]">EURO Moto</span>
              <h1 className="mt-2 text-[32px] leading-tight font-black text-zinc-950 md:text-[40px]">Hệ thống cửa hàng</h1>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-600 md:text-right">
              Tra cứu cửa hàng EURO Moto gần bạn, chọn tỉnh thành hoặc nhập tên cửa hàng để xem thông tin liên hệ và bản đồ chỉ đường.
            </p>
          </div>

          <StoreStats stores={stores} />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
              Không tải được dữ liệu cửa hàng từ hệ thống. Vui lòng kiểm tra API /api/showrooms.
              <button type="button" className="ml-2 font-extrabold text-[#d71920] hover:underline" onClick={reload}>
                Thử tải lại
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-4 lg:col-span-4">
              <StoreFilters
                city={selectedCity}
                district={selectedDistrict}
                search={searchTerm}
                cities={cities}
                districts={districts}
                onCityChange={handleCityChange}
                onDistrictChange={setSelectedDistrict}
                onSearchChange={setSearchTerm}
              />

              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-zinc-950">Danh sách cửa hàng</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-extrabold text-zinc-600">
                    {filteredStores.length} cửa hàng
                  </span>
                </div>

                {loading ? (
                  <LoadingState message="Đang tải danh sách cửa hàng..." />
                ) : (
                  <StoreList
                    stores={filteredStores}
                    activeStoreId={activeStoreId}
                    onSelectStore={handleSelectStore}
                    onOpenDirections={handleOpenDirections}
                  />
                )}
              </div>
            </aside>

            <section ref={mapRef} className="scroll-mt-28 lg:col-span-8">
              <div className="lg:sticky lg:top-28">
                <StoreMap src={mapUrl} title={activeStore ? `Bản đồ ${activeStore.name}` : 'Bản đồ hệ thống cửa hàng EURO Moto'} />
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

export default StoreSystemPage;
