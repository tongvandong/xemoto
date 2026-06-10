import ProductGrid from '../ProductGrid.jsx';

function RelatedProductSection({ title, products = [], onAddToCart, emptyMessage, isFavorite, onToggleFavorite }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-zinc-950">{title}</h2>
        <div className="mt-2 h-1 w-20 rounded-full bg-[#d71920]" />
      </div>

      <ProductGrid
        products={products}
        onAddToCart={onAddToCart}
        emptyMessage={emptyMessage}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}

export default RelatedProductSection;
