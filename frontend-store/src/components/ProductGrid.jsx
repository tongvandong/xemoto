import ProductCard from './ProductCard.jsx';

function ProductGrid({
  products = [],
  onAddToCart,
  emptyMessage = 'Chưa có sản phẩm phù hợp.',
  isFavorite,
  onToggleFavorite,
}) {
  if (!products.length) {
    return (
      <div className="ui-fade-in flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-sm" aria-hidden="true">🔍</span>
        <p className="mt-4 text-sm font-semibold text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id || product.slug || product.name}
          product={product}
          onAddToCart={onAddToCart}
          isFavorite={Boolean(isFavorite?.(product))}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

export default ProductGrid;
