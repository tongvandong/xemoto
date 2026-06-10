import React, { useCallback, useEffect, useState } from 'react';
import postService from '../../services/postService';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../contexts/AuthContext';

function generateSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const POST_STATUS = {
  Published: { label: 'Đã xuất bản', color: 'success' },
  Draft: { label: 'Bản nháp', color: 'secondary' },
};

const defaultForm = {
  tieuDe: '',
  slug: '',
  tomTat: '',
  noiDung: '',
  anhDaiDienUrl: '',
  anhDaiDienFile: null,
  danhMuc: '',
  trangThai: 'Draft',
};

const getPostId = (post) => post.id || post.maBaiViet;
const getTitle = (post) => post.tieuDe || post.title || '';
const getSummary = (post) => post.tomTat || post.summary || '';
const getContent = (post) => post.noiDung || post.content || '';
const getImageUrl = (post) => post.anhDaiDienUrl || post.anhDaiDien || post.thumbnail || '';
const getCategory = (post) => post.danhMuc || post.category || '';
const getStatus = (post) => post.trangThai || post.status || 'Draft';
const getPublishedAt = (post) => post.xuatBanLuc || post.ngayXuatBan || post.publishedAt || post.createdAt || post.ngayTao;

const PostList = () => {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({ ...defaultForm });
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const resetImagePreview = useCallback((nextUrl = '') => {
    setImagePreviewUrl((currentUrl) => {
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await postService.getAll({ page, pageSize });
      const data = res.data;
      if (Array.isArray(data)) {
        setPosts(data);
        setTotalPages(1);
      } else {
        setPosts(data.items || data.data || []);
        setTotalPages(data.totalPages || Math.ceil(((data.totalItems ?? data.total) || 0) / pageSize) || 1);
      }
    } catch (err) {
      setError('Không thể tải danh sách bài viết.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...defaultForm });
    resetImagePreview('');
    setShowModal(true);
  };

  const setFormFromPost = (post) => {
    setForm({
      tieuDe: getTitle(post),
      slug: post.slug || '',
      tomTat: getSummary(post),
      noiDung: getContent(post),
      anhDaiDienUrl: getImageUrl(post),
      anhDaiDienFile: null,
      danhMuc: getCategory(post),
      trangThai: getStatus(post),
    });
    resetImagePreview(getImageUrl(post));
  };

  const openEdit = async (item) => {
    const postId = getPostId(item);
    setEditItem(item);
    setFormFromPost(item);
    setShowModal(true);

    // List data does not include full content, so load the detail before editing.
    setLoadingDetail(true);
    try {
      const res = await postService.getById(postId);
      const detail = res.data;
      setEditItem(detail);
      setFormFromPost(detail);
    } catch (err) {
      alert('Không thể tải chi tiết bài viết. Form đang hiển thị dữ liệu tóm tắt.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'tieuDe') {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, anhDaiDienFile: file }));
    resetImagePreview(file ? URL.createObjectURL(file) : form.anhDaiDienUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tieuDe.trim()) {
      alert('Tiêu đề là bắt buộc!');
      return;
    }

    const payload = {
      tieuDe: form.tieuDe.trim(),
      slug: form.slug.trim() || generateSlug(form.tieuDe),
      tomTat: form.tomTat,
      noiDung: form.noiDung,
      anhDaiDienUrl: form.anhDaiDienUrl,
      danhMuc: form.danhMuc,
      trangThai: form.trangThai,
      xuatBanLuc: form.trangThai === 'Published' ? new Date().toISOString() : null,
    };

    setSaving(true);
    try {
      let savedId = editItem ? getPostId(editItem) : null;
      if (editItem) {
        await postService.update(savedId, payload);
      } else {
        const res = await postService.create(payload);
        savedId = res.data?.id || res.data?.maBaiViet;
      }

      if (form.anhDaiDienFile && savedId) {
        const imageData = new FormData();
        imageData.append('file', form.anhDaiDienFile);
        await postService.uploadImage(savedId, imageData);
      }
      setShowModal(false);
      fetchPosts();
    } catch (err) {
      alert('Lưu bài viết thất bại!');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;
    try {
      await postService.delete(id);
      fetchPosts();
    } catch (err) {
      alert('Xóa bài viết thất bại!');
    }
  };

  const getStatusBadge = (status) => {
    const info = POST_STATUS[status];
    if (info) return <span className={`badge badge-${info.color}`}>{info.label}</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Bài viết</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Danh sách bài viết</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                  <i className="fas fa-plus"></i> Thêm bài viết
                </button>
              </div>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="fas fa-newspaper fa-2x mb-2"></i>
                  <p>Chưa có bài viết nào.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped table-sm">
                      <thead>
                        <tr>
                          <th className="table-col-text">Tiêu đề</th>
                          <th className="table-col-text">Danh mục</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Ngày xuất bản</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr key={getPostId(post)}>
                            <td className="table-col-text">{getTitle(post)}</td>
                            <td className="table-col-text">{getCategory(post) || '-'}</td>
                            <td className="table-col-status">{getStatusBadge(getStatus(post))}</td>
                            <td className="table-col-date">{formatDate(getPublishedAt(post))}</td>
                            <td className="table-col-actions">
                              <button className="btn btn-xs btn-info mr-1" onClick={() => openEdit(post)} title="Sửa">
                                <i className="fas fa-edit"></i>
                              </button>
                              {isAdmin() && (
                                <button className="btn btn-xs btn-danger" onClick={() => handleDelete(getPostId(post), getTitle(post))} title="Xóa">
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((value) => value - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <li key={pageNumber} className={`page-item ${pageNumber === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage((value) => value + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
            <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h5 className="modal-title">{editItem ? 'Sửa bài viết' : 'Thêm bài viết mới'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
                <div className="modal-body" style={{ overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                  {loadingDetail && (
                    <div className="alert alert-info py-2">Đang tải nội dung chi tiết...</div>
                  )}

                  <div className="form-group">
                    <label>Tiêu đề <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="tieuDe" value={form.tieuDe} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Slug</label>
                    <input type="text" className="form-control" name="slug" value={form.slug} onChange={handleChange} />
                    <small className="form-text text-muted">Tự động tạo từ tiêu đề</small>
                  </div>
                  <div className="form-group">
                    <label>Tóm tắt</label>
                    <textarea className="form-control" name="tomTat" value={form.tomTat} onChange={handleChange} rows="2" />
                  </div>
                  <div className="form-group">
                    <label>Nội dung</label>
                    <textarea className="form-control" name="noiDung" value={form.noiDung} onChange={handleChange} rows="8" />
                  </div>
                  <div className="form-group">
                    <label>Ảnh đại diện</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {imagePreviewUrl && (
                      <img
                        src={imagePreviewUrl}
                        alt="Ảnh đại diện"
                        className="mt-2 rounded border"
                        style={{ maxHeight: 120, maxWidth: '100%', width: 200, objectFit: 'cover' }}
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Danh mục</label>
                        <input type="text" className="form-control" name="danhMuc" value={form.danhMuc} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Trạng thái</label>
                        <select className="form-control" name="trangThai" value={form.trangThai} onChange={handleChange}>
                          <option value="Draft">Bản nháp</option>
                          <option value="Published">Đã xuất bản</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || loadingDetail}>
                    {saving ? 'Đang lưu...' : (editItem ? 'Cập nhật' : 'Thêm mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostList;
