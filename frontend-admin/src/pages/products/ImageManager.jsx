import React, { useState, useEffect, useRef } from 'react';
import productService from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';

const imageFallback =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22200%22%20height%3D%22120%22%20viewBox%3D%220%200%20200%20120%22%3E%3Crect%20width%3D%22200%22%20height%3D%22120%22%20fill%3D%22%23f3f4f6%22/%3E%3Cpath%20d%3D%22M55%2085h90l-28-35-20%2024-13-16z%22%20fill%3D%22%239ca3af%22/%3E%3Ccircle%20cx%3D%2270%22%20cy%3D%2242%22%20r%3D%2210%22%20fill%3D%22%23d1d5db%22/%3E%3Ctext%20x%3D%22100%22%20y%3D%22105%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2212%22%20fill%3D%22%236b7280%22%3ENo%20Image%3C/text%3E%3C/svg%3E';

const ImageManager = ({ productId, onClose }) => {
  const { isAdmin } = useAuth();
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'common', or variant id
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [imgRes, varRes] = await Promise.all([
        productService.getImages(productId),
        productService.getVariants(productId),
      ]);
      const imgData = imgRes.data;
      setImages(Array.isArray(imgData) ? imgData : imgData.items || imgData.data || []);
      const varData = varRes.data;
      setVariants(Array.isArray(varData) ? varData : varData.items || varData.data || []);
    } catch (err) {
      setError('Không thể tải dữ liệu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchData();
  }, [productId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (index) => {
    setPreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ảnh!');
      return;
    }
    setUploading(true);
    try {
      for (let i = 0; i < previews.length; i++) {
        const formData = new FormData();
        formData.append('file', previews[i].file);
        formData.append('isMain', images.length === 0 && i === 0 ? 'true' : 'false');
        if (selectedVariant) {
          formData.append('maBienSanPham', selectedVariant);
        }
        await productService.uploadImage(productId, formData);
      }
      previews.forEach(p => URL.revokeObjectURL(p.preview));
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) {
      alert('Upload ảnh thất bại! Vui lòng thử lại.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Xóa ảnh này?')) return;
    try {
      await productService.deleteImage(productId, imageId);
      fetchData();
    } catch (err) {
      alert('Xóa ảnh thất bại!');
    }
  };

  const handleSetMain = async (imageId) => {
    try {
      await productService.setPrimaryImage(productId, imageId);
      fetchData();
    } catch (err) {
      alert('Đặt ảnh chính thất bại!');
    }
  };

  // Group images by variant
  const getVariantName = (maBienSanPham) => {
    if (!maBienSanPham) return null;
    const v = variants.find(vr => vr.id === maBienSanPham || vr.maBienSanPham === maBienSanPham);
    return v ? (v.tenBienThe || v.name || `Biến thể #${maBienSanPham}`) : `Biến thể #${maBienSanPham}`;
  };

  const filteredImages = images.filter(img => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'common') return !img.maBienSanPham;
    return String(img.maBienSanPham) === String(viewFilter);
  });

  const commonImages = images.filter(img => !img.maBienSanPham);
  const variantGroups = variants.map(v => ({
    ...v,
    images: images.filter(img => String(img.maBienSanPham) === String(v.id || v.maBienSanPham)),
  }));

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl image-manager-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-images mr-2"></i>Quản lý ảnh sản phẩm
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body image-manager-body">
            {/* Upload Section */}
            <div className="card card-primary card-outline mb-3">
              <div className="card-header py-2">
                <h6 className="card-title m-0"><i className="fas fa-cloud-upload-alt mr-1"></i> Upload ảnh mới</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-5">
                    <div className="form-group mb-2">
                      <label className="small font-weight-bold">Gắn vào biến thể (màu):</label>
                      <select
                        className="form-control form-control-sm"
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                      >
                        <option value="">— Ảnh chung sản phẩm —</option>
                        {variants.map(v => (
                          <option key={v.id || v.maBienSanPham} value={v.id || v.maBienSanPham}>
                            {v.tenBienThe || v.name} {v.mauSac ? `(${v.mauSac})` : ''} {v.sku ? `[${v.sku}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <div className="form-group mb-2">
                      <label className="small font-weight-bold">Chọn ảnh:</label>
                      <div className="custom-file">
                        <input
                          type="file"
                          className="custom-file-input"
                          id="imgUpload"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          ref={fileInputRef}
                        />
                        <label className="custom-file-label" htmlFor="imgUpload">
                          {previews.length > 0 ? `${previews.length} ảnh đã chọn` : 'Chọn ảnh (JPG, PNG, WebP...)'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="mt-2">
                    <div className="d-flex flex-wrap align-items-end" style={{ gap: 8 }}>
                      {previews.map((p, idx) => (
                        <div key={idx} className="position-relative" style={{ width: 70, height: 70 }}>
                          <img src={p.preview} alt="" className="rounded border" style={{ width: 70, height: 70, objectFit: 'cover' }} />
                          <button
                            type="button"
                            className="btn btn-danger position-absolute"
                            style={{ top: -6, right: -6, borderRadius: '50%', width: 18, height: 18, padding: 0, fontSize: 9, lineHeight: '18px' }}
                            onClick={() => removePreview(idx)}
                          >×</button>
                        </div>
                      ))}
                      <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading}>
                        {uploading ? <><span className="spinner-border spinner-border-sm mr-1"></span>Uploading...</> : <><i className="fas fa-upload mr-1"></i>Upload {previews.length} ảnh</>}
                      </button>
                    </div>
                    <small className="text-muted mt-1 d-block">
                      {selectedVariant ? `→ Gắn vào: ${getVariantName(selectedVariant)}` : '→ Ảnh chung sản phẩm (không gắn biến thể)'}
                    </small>
                  </div>
                )}
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary"></div>
              </div>
            ) : (
              <>
                {/* Filter tabs */}
                <div className="mb-3 image-manager-filter">
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      className={`btn ${viewFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setViewFilter('all')}
                    >
                      Tất cả <span className="badge badge-light ml-1">{images.length}</span>
                    </button>
                    <button
                      className={`btn ${viewFilter === 'common' ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setViewFilter('common')}
                    >
                      Ảnh chung <span className="badge badge-light ml-1">{commonImages.length}</span>
                    </button>
                    {variantGroups.map(vg => (
                      <button
                        key={vg.id || vg.maBienSanPham}
                        className={`btn ${viewFilter === String(vg.id || vg.maBienSanPham) ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setViewFilter(String(vg.id || vg.maBienSanPham))}
                      >
                        {vg.mauSac || vg.tenBienThe || vg.name}
                        <span className="badge badge-light ml-1">{vg.images.length}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Grid */}
                {filteredImages.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="fas fa-image fa-2x mb-2"></i>
                    <p>Chưa có ảnh nào{viewFilter !== 'all' ? ' trong nhóm này' : ''}.</p>
                  </div>
                ) : (
                  <div className="row product-image-grid">
                    {filteredImages.map(img => (
                      <div key={img.id || img.maAnhSanPham} className="col-lg-3 col-md-4 col-sm-6 mb-3">
                        <div className={`card h-100 ${img.laAnhChinh ? 'border-primary' : ''}`} style={{ fontSize: '0.8rem' }}>
                          <img
                            src={img.urlAnh || img.url}
                            alt={img.altText || ''}
                            className="card-img-top"
                            style={{ height: 120, objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = imageFallback; }}
                          />
                          <div className="card-body p-2">
                            {img.laAnhChinh && (
                              <span className="badge badge-primary mb-1 d-block"><i className="fas fa-star mr-1"></i>Ảnh chính</span>
                            )}
                            <span className="badge badge-light d-block mb-1">
                              {img.maBienSanPham ? getVariantName(img.maBienSanPham) : 'Ảnh chung'}
                            </span>
                            <div className="btn-group btn-group-sm w-100">
                              {!img.laAnhChinh && (
                                <button className="btn btn-outline-primary" onClick={() => handleSetMain(img.id || img.maAnhSanPham)} title="Đặt ảnh chính">
                                  <i className="fas fa-star"></i>
                                </button>
                              )}
                              {isAdmin() && (
                                <button className="btn btn-outline-danger" onClick={() => handleDelete(img.id || img.maAnhSanPham)} title="Xóa">
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <small className="text-muted mr-auto">
              <i className="fas fa-info-circle mr-1"></i>
              Chọn biến thể trước khi upload để gắn ảnh vào màu/phiên bản cụ thể.
            </small>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageManager;
