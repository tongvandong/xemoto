import { useEffect, useMemo, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getProductImage } from '../../utils/formatters.js';

function getGalleryImages(product, images) {
  if (images.length) {
    return images;
  }

  const fallbackImage = getProductImage(product);
  return fallbackImage ? [{ imageUrl: fallbackImage, altText: product?.name || 'Product' }] : [];
}

function ProductImageGallery({ product, images = [], selectedImage, onSelectImage }) {
  const thumbStripRef = useRef(null);
  const galleryImages = useMemo(() => getGalleryImages(product, images), [images, product]);
  const selectedUrl = selectedImage?.imageUrl || galleryImages[0]?.imageUrl;
  const activeIndex = galleryImages.findIndex((image) => image.imageUrl === selectedUrl);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const currentImage = galleryImages[currentIndex];
  const hasMultipleImages = galleryImages.length > 1;

  useEffect(() => {
    const activeThumb = thumbStripRef.current?.children[currentIndex];
    activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentIndex]);

  function selectImage(index) {
    const nextImage = galleryImages[index];
    if (nextImage) {
      onSelectImage?.(nextImage);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" role="region" aria-label="Bộ sưu tập ảnh sản phẩm">
      <div className="relative border-b border-zinc-100 bg-[radial-gradient(circle_at_top,rgba(215,25,32,0.08),transparent_48%),linear-gradient(180deg,#ffffff,#f7f7f7)] p-4 sm:p-6">
        <div className="absolute left-4 top-4 z-10 rounded-full bg-[#d71920] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          EURO Moto
        </div>

        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="gallery-nav-btn gallery-nav-prev"
              onClick={() => selectImage(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Ảnh trước"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="gallery-nav-btn gallery-nav-next"
              onClick={() => selectImage(currentIndex + 1)}
              disabled={currentIndex === galleryImages.length - 1}
              aria-label="Ảnh tiếp"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white p-4 sm:p-8">
          {currentImage ? (
            <img
              src={currentImage.imageUrl}
              alt={currentImage.altText || product?.name}
              className="gallery-main-image"
              draggable={false}
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-2xl bg-zinc-100 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
              No Image
            </div>
          )}

          {hasMultipleImages && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {currentIndex + 1} / {galleryImages.length}
            </div>
          )}
        </div>
      </div>

      <div className="gallery-thumb-strip-container overflow-x-auto px-4 py-4 sm:px-6">
        <div ref={thumbStripRef} className="flex min-w-max gap-3">
          {galleryImages.map((image, index) => {
            const active = index === currentIndex;

            return (
              <button
                key={`${image.imageUrl}-${index}`}
                type="button"
                className={`gallery-thumb ${active ? 'gallery-thumb--active' : ''}`}
                onClick={() => selectImage(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={active ? 'true' : undefined}
              >
                <img
                  src={image.imageUrl}
                  alt={image.altText || `${product?.name || 'Product'} ${index + 1}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      </div>

      {hasMultipleImages && galleryImages.length <= 10 && (
        <div className="flex items-center justify-center gap-2 pb-4 sm:hidden">
          {galleryImages.map((image, index) => (
            <button
              key={`dot-${image.imageUrl}-${index}`}
              type="button"
              className={`gallery-dot ${index === currentIndex ? 'gallery-dot--active' : ''}`}
              onClick={() => selectImage(index)}
              aria-label={`Đến ảnh ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductImageGallery;
