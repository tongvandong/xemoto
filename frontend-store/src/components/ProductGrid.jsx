import ProductCard from './ProductCard.jsx';

function ProductGrid({
  products = [],
  onAddToCart,
  emptyMessage = 'Chưa có sản phẩm phù hợp.',
  isFavorite,
  onToggleFavorite,
}) {
  if (!products.length) {
    return <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-zinc-500">{emptyMessage}</div>;
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
