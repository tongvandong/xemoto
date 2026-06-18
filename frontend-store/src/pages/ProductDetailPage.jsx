import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../services/api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ProductCommitmentSidebar from '../components/product/ProductCommitmentSidebar.jsx';
import ProductImageGallery from '../components/product/ProductImageGallery.jsx';
import ProductInfoBox from '../components/product/ProductInfoBox.jsx';
import ProductTabs from '../components/product/ProductTabs.jsx';
import RelatedProductSection from '../components/product/RelatedProductSection.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useFavorite } from '../contexts/FavoriteContext.jsx';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { normalizeProductOptions } from '../utils/productOptions.js';
import { storage } from '../utils/storage.js';
import ProductReviews from '../components/product/ProductReviews.jsx';

const VIEWED_PRODUCTS_KEY = 'frontend_user_recent_products';

function dedupeProducts(products) {
  const seen = new Set();

  return products.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function matchesSelection(variant, version, color) {
  const versionMatches = version ? variant.version === version : true;
  const colorMatches = color ? variant.color === color : true;
  return versionMatches && colorMatches;
}

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [brandProducts, setBrandProducts] = useState([]);
  const [typeProducts, setTypeProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [viewedProducts, setViewedProducts] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { notify } = useNotification();
  const { data: product, loading, error, run } = useAsync(() => productApi.getById(id), [id]);

  const options = useMemo(() => normalizeProductOptions(product), [product]);
  const detailImages = useMemo(() => {
    const hasVariantImages = options.images.some((image) => image.productVariantId);

    return hasVariantImages
      ? options.images.filter((image) => image.productVariantId || !image.isPrimary)
      : options.images;
  }, [options.images]);

  useEffect(() => {
    async function loadCollections() {
      if (!product?.id) {
        setBrandProducts([]);
        setTypeProducts([]);
        setRelatedProducts([]);
        return;
      }

      const requests = [
        product?.brandId ? productApi.getAll({ brandId: product.brandId, page: 1, pageSize: 8 }) : Promise.resolve({ items: [] }),
        product?.categoryId ? productApi.getAll({ categoryId: product.categoryId, page: 1, pageSize: 8 }) : Promise.resolve({ items: [] }),
      ];

      try {
        const [brandResponse, typeResponse] = await Promise.all(requests);
        const sameBrand = (brandResponse?.items || []).filter((item) => String(item.id) !== String(product.id)).slice(0, 4);
        const sameType = (typeResponse?.items || []).filter((item) => String(item.id) !== String(product.id)).slice(0, 4);

        setBrandProducts(sameBrand);
        setTypeProducts(sameType);
        setRelatedProducts(dedupeProducts([...sameBrand, ...sameType]).slice(0, 4));
      } catch {
        setBrandProducts([]);
        setTypeProducts([]);
        setRelatedProducts([]);
      }
    }

    loadCollections();
  }, [product]);

  useEffect(() => {
    if (!product?.id) {
      return;
    }

    const current = storage.getJson(VIEWED_PRODUCTS_KEY, []);
    const next = dedupeProducts([
      {
        id: product.id,
        name: product.name,
        brandName: product.brandName,
        categoryName: product.categoryName,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        discountPercent: product.discountPercent,
        mainImageUrl: product.mainImageUrl,
        images: product.images,
      },
      ...(Array.isArray(current) ? current : []),
    ]).slice(0, 8);

    storage.setJson(VIEWED_PRODUCTS_KEY, next);
    setViewedProducts(next.filter((item) => String(item.id) !== String(product.id)).slice(0, 4));
  }, [product]);

  useEffect(() => {
    if (!product) {
      setSelectedVersion('');
      setSelectedColor('');
      setSelectedImage(null);
      return;
    }

    const firstInStockVariant =
      options.variants.find((variant) => Number(variant.stockQuantity || 0) > 0) ||
      options.variants[0] ||
      null;
    const defaultVersion = firstInStockVariant?.version || options.versions[0] || '';
    const candidateColors = options.variants
      .filter((variant) => matchesSelection(variant, defaultVersion, ''))
      .map((variant) => variant.color)
      .filter(Boolean);
    const defaultColor = candidateColors[0] || options.colors[0] || '';
    const firstImage =
      detailImages.find((image) => {
        const colorMatches = defaultColor ? image.color === defaultColor : true;
        const versionMatches = defaultVersion && image.version ? image.version === defaultVersion : true;
        return colorMatches && versionMatches;
      }) || detailImages[0] || null;

    setSelectedVersion(defaultVersion);
    setSelectedColor(defaultColor);
    setSelectedImage(firstImage);
  }, [product, options, detailImages]);

  const selectedVariant = useMemo(() => {
    if (!options.variants.length) {
      return null;
    }

    return (
      options.variants.find((variant) => matchesSelection(variant, selectedVersion, selectedColor)) ||
      options.variants.find((variant) => matchesSelection(variant, selectedVersion, '')) ||
      options.variants.find((variant) => matchesSelection(variant, '', selectedColor)) ||
      options.variants[0]
    );
  }, [options.variants, selectedColor, selectedVersion]);

  const availableColorOptions = useMemo(() => {
    const colors = options.variants
      .filter((variant) => !selectedVersion || variant.version === selectedVersion)
      .map((variant) => variant.color)
      .filter(Boolean);

    return colors.length ? [...new Set(colors)] : options.colors;
  }, [options.colors, options.variants, selectedVersion]);

  useEffect(() => {
    const stockValue = selectedVariant?.stockQuantity ?? product?.stockQuantity;
    if (stockValue !== undefined && stockValue !== null && Number(stockValue) > 0 && quantity > Number(stockValue)) {
      setQuantity(Math.max(Number(stockValue), 1));
    }
  }, [product?.stockQuantity, quantity, selectedVariant?.stockQuantity]);

  useEffect(() => {
    if (!availableColorOptions.length) {
      if (selectedColor) {
        setSelectedColor('');
      }
      return;
    }

    if (!selectedColor || !availableColorOptions.includes(selectedColor)) {
      setSelectedColor(availableColorOptions[0]);
    }
  }, [availableColorOptions, selectedColor]);

  const visibleImages = useMemo(() => {
    if (!detailImages.length) {
      return [];
    }

    const byColor = selectedColor ? detailImages.filter((image) => image.color === selectedColor) : [];
    const byColorAndVersion =
      selectedColor && selectedVersion
        ? byColor.filter((image) => !image.version || image.version === selectedVersion)
        : byColor;

    if (byColorAndVersion.length) {
      return byColorAndVersion;
    }

    if (byColor.length) {
      return byColor;
    }

    if (selectedVersion) {
      const byVersion = detailImages.filter((image) => image.version === selectedVersion);
      if (byVersion.length) {
        return byVersion;
      }
    }

    return detailImages;
  }, [detailImages, selectedColor, selectedVersion]);

  const galleryImages = useMemo(() => {
    if (!detailImages.length) {
      return [];
    }

    // Giữ nguyên thứ tự ảnh như ban đầu để không bị nhảy vị trí thumbnail khi click (theo yêu cầu user)
    return detailImages;
  }, [detailImages]);

  useEffect(() => {
    if (!visibleImages.length) {
      setSelectedImage(null);
      return;
    }

    if (selectedImage && visibleImages.some((image) => image.imageUrl === selectedImage.imageUrl)) {
      return;
    }

    const preferredImage =
      (selectedVariant?.imageUrl && visibleImages.find((image) => image.imageUrl === selectedVariant.imageUrl)) ||
      visibleImages[0];

    setSelectedImage(preferredImage);
  }, [selectedImage, selectedVariant, visibleImages]);

  function handleSelectVersion(version) {
    setSelectedVersion(version);

    const matchedVariant = options.variants.find((variant) => matchesSelection(variant, version, selectedColor));
    const fallbackVariant = options.variants.find((variant) => matchesSelection(variant, version, ''));

    if (matchedVariant?.color) {
      setSelectedColor(matchedVariant.color);
    } else if (fallbackVariant?.color) {
      setSelectedColor(fallbackVariant.color);
    }

    const nextImage =
      detailImages.find((image) => {
        const versionMatches = image.version ? image.version === version : true;
        const colorTarget = matchedVariant?.color || fallbackVariant?.color || selectedColor;
        const colorMatches = colorTarget ? image.color === colorTarget : true;
        return versionMatches && colorMatches;
      }) ||
      detailImages.find((image) => (image.version ? image.version === version : false)) ||
      null;

    if (nextImage) {
      setSelectedImage(nextImage);
    }
  }

  function handleSelectColor(color) {
    setSelectedColor(color);

    const matchedVariant = options.variants.find((variant) => matchesSelection(variant, selectedVersion, color));
    if (matchedVariant?.version && matchedVariant.version !== selectedVersion) {
      setSelectedVersion(matchedVariant.version);
    }

    // Always jump to the FIRST image of the chosen color for a clean carousel reset
    const colorImages = detailImages.filter((image) => image.color === color);
    const nextImage =
      colorImages.find((image) => {
        const versionMatches = selectedVersion && image.version ? image.version === selectedVersion : true;
        return versionMatches;
      }) ||
      colorImages[0] ||
      (matchedVariant?.imageUrl ? detailImages.find((image) => image.imageUrl === matchedVariant.imageUrl) : null);

    if (nextImage) {
      setSelectedImage(nextImage);
    }
  }

  function handleSelectImage(image) {
    setSelectedImage(image);

    if (image?.color) {
      setSelectedColor(image.color);
    }

    if (image?.version) {
      setSelectedVersion(image.version);
      return;
    }

    const variantByImage = options.variants.find((variant) => variant.imageUrl && variant.imageUrl === image?.imageUrl);
    if (variantByImage?.version) {
      setSelectedVersion(variantByImage.version);
    }
  }

  function requireLogin(redirect = '/cart') {
    if (!isAuthenticated) {
      notify('Vui lòng đăng nhập để tiếp tục', 'error');
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return false;
    }

    return true;
  }

  async function addProductToCart(payload, { showSuccess = true } = {}) {
    try {
      await addItem(payload);
      if (showSuccess) {
        notify('Đã thêm vào giỏ hàng', 'success');
      }
      return true;
    } catch (err) {
      notify(err.message || 'Không thể thêm vào giỏ hàng', 'error');
      return false;
    }
  }

  function buildCartPayload() {
    return {
      productId: product.id,
      variantId: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant.id) : null,
      quantity,
    };
  }

  function canSubmitSelectedProduct() {
    if (!product) {
      return false;
    }

    if (options.hasVariantData && !selectedVariant?.id) {
      notify('Vui lòng chọn phiên bản/màu sắc', 'error');
      return false;
    }

    const stockValue = selectedVariant?.stockQuantity ?? product?.stockQuantity;
    const hasKnownStock = stockValue !== undefined && stockValue !== null;
    if (hasKnownStock && Number(stockValue) <= 0) {
      notify('Sản phẩm đã hết hàng', 'error');
      return false;
    }

    return true;
  }

  async function addToCart() {
    if (!requireLogin('/cart') || !canSubmitSelectedProduct()) {
      return;
    }

    await addProductToCart(buildCartPayload());
  }

  async function buyNow() {
    if (!requireLogin('/checkout') || !canSubmitSelectedProduct()) {
      return;
    }

    const added = await addProductToCart(buildCartPayload(), { showSuccess: false });
    if (added) {
      navigate('/checkout');
    }
  }

  async function quickAdd(item) {
    if (!requireLogin()) {
      return;
    }

    const detail = await productApi.getById(item.id);
    if (detail.variants?.length) {
      notify('Vui lòng chọn phiên bản/màu sắc', 'error');
      navigate(`/products/${item.id}`);
      return;
    }

    await addProductToCart({ productId: item.id, quantity: 1 });
  }

  async function handleToggleFavorite(item) {
    if (!isAuthenticated) {
      notify('Vui lòng đăng nhập để thêm sản phẩm yêu thích', 'error');
      navigate(`/login?redirect=/products/${item?.id || id}`);
      return;
    }

    try {
      const added = await toggleFavorite(item);
      notify(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', 'success');
    } catch (error) {
      notify(error.message || 'Không thể cập nhật yêu thích', 'error');
    }
  }

  const fallbackNotes = options.fallbackNotes;
  const showVersionSelector = options.hasVersionOptions && options.versions.length > 1;
  const showColorSelector = options.hasColorOptions;
  const colorStatusText = showColorSelector ? selectedColor || 'Đang cập nhật' : 'Đang cập nhật';

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Sản phẩm', to: '/products' },
          { label: product?.name || 'Chi tiết sản phẩm' },
        ]}
      />

      <section className="bg-[#f7f7f7] py-8 sm:py-10">
        <div className="mx-auto w-full max-w-[1280px] px-4">
          {loading && <LoadingState />}
          {error && <ErrorState message={error.message} onRetry={run} />}

          {product && (
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_320px]">
                <ProductImageGallery product={product} images={galleryImages} selectedImage={selectedImage} onSelectImage={handleSelectImage} />

                <div className="space-y-5">
                  <ProductInfoBox
                    product={product}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    onAddToCart={addToCart}
                    onBuyNow={buyNow}
                    selectedVersion={selectedVersion}
                    onSelectVersion={handleSelectVersion}
                    selectedColor={selectedColor}
                    onSelectColor={handleSelectColor}
                    selectedVariant={selectedVariant}
                    versionOptions={options.versions}
                    colorOptions={options.colors}
                    availableColorOptions={availableColorOptions}
                    showVersionSelector={showVersionSelector}
                    showColorSelector={showColorSelector}
                    colorStatusText={colorStatusText}
                    fallbackNotes={fallbackNotes}
                    isFavorite={isFavorite(product)}
                    onToggleFavorite={() => handleToggleFavorite(product)}
                  />
                </div>

                <div className="space-y-5 lg:hidden xl:block">
                  <ProductCommitmentSidebar />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  <ProductTabs product={product} />
                  <ProductReviews productId={product.id} />
                </div>
                <div className="hidden lg:block xl:hidden">
                  <ProductCommitmentSidebar />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {product && (
        <div className="bg-white py-10">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4">
            <RelatedProductSection
              title="Cùng thương hiệu"
              products={brandProducts}
              onAddToCart={quickAdd}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage="Chưa có sản phẩm cùng thương hiệu."
            />
            <RelatedProductSection
              title="Cùng loại"
              products={typeProducts}
              onAddToCart={quickAdd}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage="Chưa có sản phẩm cùng loại."
            />
            <RelatedProductSection
              title="Sản phẩm liên quan"
              products={relatedProducts}
              onAddToCart={quickAdd}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              emptyMessage="Chưa có sản phẩm liên quan."
            />
            {viewedProducts.length > 0 && (
              <RelatedProductSection
                title="Sản phẩm đã xem"
                products={viewedProducts}
                onAddToCart={quickAdd}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                emptyMessage="Chưa có sản phẩm đã xem."
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ProductDetailPage;
