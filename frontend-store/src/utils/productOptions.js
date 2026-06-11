function valueOf(source, ...keys) {
  for (const key of keys) {
    const pascalKey = key ? key[0].toUpperCase() + key.slice(1) : key;
    const value = source?.[key] ?? source?.[pascalKey];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function uniqueBy(items, getKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toTitleColor(tokens) {
  const labels = {
    bac: 'Bạc',
    den: 'Đen',
    do: 'Đỏ',
    xam: 'Xám',
    ghi: 'Ghi',
    xanh: 'Xanh',
    dam: 'Đậm',
    gp: 'GP',
    la: 'Lá',
    tim: 'Tím',
    vang: 'Vàng',
    trang: 'Trắng',
    ngoc: 'Ngọc',
    trai: 'Trai',
    cam: 'Cam',
    nau: 'Nâu',
    bong: 'Bóng',
    nham: 'Nhám',
    tuoi: 'Tươi',
    xanhla: 'Xanh Lá',
    xanhreu: 'Xanh Rêu',
    xanhduong: 'Xanh Dương',
  };

  return tokens.map((token) => labels[token] || token).join(' ');
}

function extractColorTokens(text) {
  const search = normalizeText(text)
    .replace(/[_/\\]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-');
  const parts = search.split('-').filter(Boolean);
  const aliasMap = {
    bac: 'bac',
    silver: 'bac',
    den: 'den',
    black: 'den',
    do: 'do',
    red: 'do',
    xam: 'xam',
    gray: 'xam',
    grey: 'xam',
    ghi: 'ghi',
    xanh: 'xanh',
    blue: 'xanh',
    dam: 'dam',
    gp: 'gp',
    la: 'la',
    tim: 'tim',
    purple: 'tim',
    vang: 'vang',
    yellow: 'vang',
    gold: 'vang',
    trang: 'trang',
    white: 'trang',
    ngoc: 'ngoc',
    trai: 'trai',
    cam: 'cam',
    orange: 'cam',
    nau: 'nau',
    brown: 'nau',
    bong: 'bong',
    nham: 'nham',
    matte: 'nham',
    tuoi: 'tuoi',
  };

  const tokens = [];

  for (const part of parts) {
    const mapped = aliasMap[part];
    if (!mapped) {
      continue;
    }

    if (!tokens.includes(mapped)) {
      tokens.push(mapped);
    }
  }

  return tokens;
}

function buildColorKey(value) {
  return extractColorTokens(value).join('-') || normalizeText(value);
}

function colorMatchScore(left, right) {
  const leftTokens = extractColorTokens(left);
  const rightTokens = extractColorTokens(right);

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
  const exact = buildColorKey(left) === buildColorKey(right) ? 10 : 0;
  return exact + overlap;
}

function findBestColorMatch(candidate, colors) {
  let bestColor = '';
  let bestScore = 0;

  for (const color of colors) {
    const score = colorMatchScore(candidate, color);
    if (score > bestScore) {
      bestScore = score;
      bestColor = color;
    }
  }

  return bestScore > 0 ? bestColor : '';
}

function inferColorName(...candidates) {
  for (const candidate of candidates) {
    const tokens = extractColorTokens(candidate);
    if (tokens.length > 0) {
      return toTitleColor(tokens);
    }
  }

  return '';
}

function inferVersionAndColor(variant, product) {
  const name = valueOf(variant, 'variantName', 'tenBienThe', 'title', 'name') || '';
  const slashParts = name.split('/').map((part) => part.trim()).filter(Boolean);
  const explicitVersion = valueOf(variant, 'version', 'phienBan', 'option1');
  const explicitColor = valueOf(variant, 'exteriorColor', 'color', 'mauSac', 'colorName', 'option2');
  const version = explicitVersion || slashParts[0] || name || product?.name || '';
  const color = explicitColor || slashParts[1] || inferColorName(name, valueOf(variant, 'sku'));

  return {
    version,
    color,
    versionSource: explicitVersion ? 'api' : slashParts[0] ? 'variantName' : 'fallback',
    colorSource: explicitColor ? 'api' : color ? 'inferred' : 'none',
  };
}

function normalizeVariant(variant, product) {
  const raw = variant?.raw || variant;
  const inferred = inferVersionAndColor({ ...raw, ...variant }, product);
  const imageValue = valueOf(variant, 'imageUrl', 'image', 'imageSrc', 'image_url') || valueOf(raw, 'imageUrl', 'image', 'imageSrc', 'image_url', 'urlAnh');

  return {
    id: valueOf(variant, 'id', 'maBienSanPham') ?? valueOf(raw, 'id', 'maBienSanPham'),
    productId: valueOf(variant, 'productId', 'maSanPham') ?? valueOf(raw, 'productId', 'maSanPham'),
    variantName: valueOf(variant, 'variantName', 'tenBienThe', 'title', 'name') || valueOf(raw, 'variantName', 'tenBienThe', 'title', 'name') || inferred.version,
    version: inferred.version,
    color: inferred.color,
    colorSource: inferred.colorSource,
    versionSource: inferred.versionSource,
    exteriorColor: valueOf(variant, 'exteriorColor', 'mauSac') || valueOf(raw, 'exteriorColor', 'mauSac') || inferred.color,
    sku: valueOf(variant, 'sku', 'SKU') || valueOf(raw, 'sku', 'SKU'),
    // Giá thật nằm ở biến thể (BIENSANPHAM): GiaGoc (gốc) + GiaKhuyenMai (KM) + GiaBan (giá bán hiệu lực).
    basePrice: Number(valueOf(variant, 'basePrice', 'giaGoc', 'GiaGoc') ?? valueOf(raw, 'basePrice', 'giaGoc', 'GiaGoc') ?? 0),
    salePrice: (valueOf(variant, 'salePrice', 'giaKhuyenMai', 'GiaKhuyenMai') ?? valueOf(raw, 'salePrice', 'giaKhuyenMai', 'GiaKhuyenMai')) == null
      ? null
      : Number(valueOf(variant, 'salePrice', 'giaKhuyenMai', 'GiaKhuyenMai') ?? valueOf(raw, 'salePrice', 'giaKhuyenMai', 'GiaKhuyenMai')),
    sellPrice: Number(valueOf(variant, 'sellPrice', 'giaBan', 'GiaBan') ?? valueOf(raw, 'sellPrice', 'giaBan', 'GiaBan') ?? 0),
    discountPercent: (valueOf(variant, 'discountPercent', 'tyLeGiam', 'TyLeGiam') ?? valueOf(raw, 'discountPercent', 'tyLeGiam', 'TyLeGiam')) == null
      ? null
      : Number(valueOf(variant, 'discountPercent', 'tyLeGiam', 'TyLeGiam') ?? valueOf(raw, 'discountPercent', 'tyLeGiam', 'TyLeGiam')),
    stockQuantity: valueOf(variant, 'stockQuantity', 'soLuongTon') ?? valueOf(raw, 'stockQuantity', 'soLuongTon'),
    status: valueOf(variant, 'status', 'trangThai') || valueOf(raw, 'status', 'trangThai'),
    imageUrl: typeof imageValue === 'string' ? imageValue : imageValue?.src || imageValue?.url || '',
    raw,
  };
}

function normalizeImage(image, variants = []) {
  const raw = image?.raw || image;
  const url = valueOf(image, 'imageUrl', 'url', 'src') || valueOf(raw, 'imageUrl', 'url', 'src') || '';
  const altText = valueOf(image, 'altText', 'name', 'title') || '';
  const productVariantId = valueOf(image, 'productVariantId', 'maBienSanPham') ?? valueOf(raw, 'productVariantId', 'maBienSanPham');
  const linkedVariant = productVariantId
    ? variants.find((variant) => String(variant.id) === String(productVariantId))
    : null;
  const explicitColor = valueOf(raw, 'color', 'colorName', 'colour') || linkedVariant?.color;
  const explicitVersion = valueOf(raw, 'version') || linkedVariant?.version;
  const inferredColor = explicitColor || inferColorName(altText, url);

  return {
    id: valueOf(image, 'id', 'Id') || url,
    productVariantId,
    imageUrl: url,
    altText,
    isPrimary: valueOf(image, 'isPrimary', 'laAnhChinh') === true,
    sortOrder: valueOf(image, 'sortOrder') || 0,
    color: inferredColor,
    colorSource: explicitColor ? 'api' : inferredColor ? 'inferred' : 'none',
    version: explicitVersion || '',
    versionSource: explicitVersion ? 'api' : 'none',
    raw,
  };
}

export function normalizeProductOptions(product) {
  const raw = product?.raw || {};
  const rawVariants = product?.variants || raw?.variants || raw?.productVariants || [];
  const productImages = product?.images || raw?.images || raw?.productImages || [];
  const rawColors = raw?.colors || raw?.options || raw?.attributes || [];

  const variants = uniqueBy(
    rawVariants.map((variant) => normalizeVariant(variant, product)).filter((variant) => variant.id || variant.variantName),
    (variant) => String(variant.id || `${variant.version}-${variant.color}-${variant.sku || ''}`),
  );

  const nestedVariantImages = rawVariants.flatMap((variant) => {
    const parentVariant = normalizeVariant(variant, product);
    const variantImages = valueOf(variant, 'images') || [];

    return variantImages.map((image) => ({
      ...(image?.raw || image),
      productVariantId: valueOf(image, 'productVariantId') ?? parentVariant?.id,
      color: valueOf(image, 'color', 'colorName') || parentVariant?.color,
      version: valueOf(image, 'version') || parentVariant?.version,
    }));
  });

  const rawImages = [
    ...productImages,
    ...nestedVariantImages,
  ];

  const images = uniqueBy(
    rawImages
      .map((image) => normalizeImage(image, variants))
      .filter((image) => image.imageUrl)
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)),
    (image) => image.imageUrl,
  );

  const variantImages = variants
    .filter((variant) => variant.imageUrl)
    .map((variant) => ({
      id: `variant-image-${variant.id || variant.imageUrl}`,
      imageUrl: variant.imageUrl,
      altText: variant.variantName || product?.name || '',
      isPrimary: false,
      sortOrder: -1,
      color: variant.color,
      colorSource: variant.color ? variant.colorSource : 'none',
      version: variant.version,
      versionSource: variant.version ? variant.versionSource : 'none',
      raw: variant.raw,
    }));

  const mergedImages = uniqueBy([...variantImages, ...images], (image) => image.imageUrl);
  const schemaColors = Array.isArray(rawColors)
    ? rawColors
        .map((item) => {
          if (typeof item === 'string') {
            return item.trim();
          }

          return valueOf(item, 'name', 'value', 'label', 'title');
        })
        .filter(Boolean)
    : [];
  const variantColors = variants.map((variant) => variant.color).filter(Boolean);
  const imageColors = mergedImages.map((image) => image.color).filter(Boolean);
  const colors = uniqueBy([...variantColors, ...schemaColors, ...imageColors], (color) => buildColorKey(color));
  const canonicalImages = mergedImages.map((image) => {
    const canonicalColor =
      (image.color && colors.find((color) => buildColorKey(color) === buildColorKey(image.color))) ||
      findBestColorMatch(`${image.color || ''} ${image.altText || ''} ${image.imageUrl || ''}`, colors) ||
      image.color;

    return canonicalColor ? { ...image, color: canonicalColor, colorSource: image.colorSource === 'api' ? 'api' : 'mapped' } : image;
  });
  const canonicalVariants = variants.map((variant) => {
    const canonicalColor =
      (variant.color && colors.find((color) => buildColorKey(color) === buildColorKey(variant.color))) ||
      findBestColorMatch(`${variant.color || ''} ${variant.variantName || ''} ${variant.sku || ''}`, colors) ||
      variant.color;
    const mappedImage =
      variant.imageUrl ||
      canonicalImages.find((image) => String(image.productVariantId || '') === String(variant.id || ''))?.imageUrl ||
      canonicalImages.find((image) => {
        const colorScore = canonicalColor ? colorMatchScore(image.color || '', canonicalColor) : 0;
        const versionMatches = variant.version && image.version ? normalizeText(image.version) === normalizeText(variant.version) : true;
        return colorScore > 0 && versionMatches;
      })?.imageUrl ||
      '';

    return {
      ...variant,
      color: canonicalColor,
      exteriorColor: canonicalColor || variant.exteriorColor,
      imageUrl: mappedImage,
    };
  });
  const versions = uniqueBy(
    canonicalVariants.map((variant) => variant.version).filter(Boolean),
    (version) => normalizeText(version),
  );

  const fallbackNotes = [];
  const hasExplicitVariantColor = variants.some((variant) => variant.colorSource === 'api');
  const usesImageNameFallback = canonicalImages.some((image) => image.colorSource === 'mapped');

  if (!hasExplicitVariantColor && canonicalVariants.some((variant) => variant.color)) {
    fallbackNotes.push('Màu sắc đang được suy luận từ tên biến thể hoặc dữ liệu ảnh vì API chưa trả mapping màu rõ ràng cho frontend.');
  }

  if (!colors.length && canonicalImages.length > 1) {
    fallbackNotes.push('API có nhiều ảnh nhưng chưa có mapping ảnh theo màu. Gallery vẫn hiển thị toàn bộ ảnh, phần màu sắc ở trạng thái cập nhật.');
  } else if (usesImageNameFallback && !hasExplicitVariantColor) {
    fallbackNotes.push('Ảnh đang được ghép với màu dựa trên tên file hoặc alt text. Backend nên bổ sung colorName/variantId cho ảnh.');
  }

  return {
    versions,
    colors,
    variants: canonicalVariants,
    images: canonicalImages,
    hasVersionOptions: versions.length > 0,
    hasColorOptions: colors.length > 0,
    hasColorMapping: colors.length > 0,
    hasVariantData: canonicalVariants.length > 0,
    fallbackNotes,
    rawCapabilities: {
      hasImages: rawImages.length > 0,
      hasVariants: rawVariants.length > 0,
      hasSchemaColors: schemaColors.length > 0,
      hasOptions: Array.isArray(raw?.options) && raw.options.length > 0,
      hasAttributes: Array.isArray(raw?.attributes) && raw.attributes.length > 0,
      hasProductVariants: Array.isArray(raw?.productVariants) && raw.productVariants.length > 0,
    },
  };
}
