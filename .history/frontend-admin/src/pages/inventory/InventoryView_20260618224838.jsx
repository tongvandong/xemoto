import React, { useEffect, useMemo, useState } from 'react';
import inventoryService from '../../services/inventoryService';
import { formatDate } from '../../utils/formatDate';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';

const PAGE_SIZE = 15;

// Bật/tắt HIỂN THỊ các control của danh sách tồn kho.
// Lưu ý: fetchInventory LUÔN gửi đủ params (keyword, stockStatus, hasHold, lowStockOnly, sortBy,
// sortDirection, page, pageSize) lên BE theo state hiện tại — các cờ dưới CHỈ ẩn/hiện giao diện,
// KHÔNG dùng để cắt bớt query gửi xuống backend.
const LIST_CONTROLS = {
  showSearch: true,          // Đổi thành false để ẩn ô tìm kiếm.
  showStockStatus: true,     // Đổi thành false để ẩn bộ lọc trạng thái tồn.
  showSort: true,            // Đổi thành false để ẩn phần sắp xếp (theo trường + chiều).
  showHoldFilter: true,      // Đổi thành false để ẩn lọc "chỉ sản phẩm đang giữ chỗ".
  showLowStockFilter: true,  // Đổi thành false để ẩn lọc "chỉ tồn thấp/hết hàng".
  showReload: false,          // Đổi thành false để ẩn nút Tải lại.
};

const STOCK_STATUS = {
  InStock: { label: 'Còn hàng', color: 'success' },
  LowStock: { label: 'Sắp hết', color: 'warning' },
  OutOfStock: { label: 'Hết hàng', color: 'danger' },
};

const ADJUSTMENT_TYPES = {
  Import: 'Nhập kho',
  Export: 'Xuất kho',
  Adjust: 'Điều chỉnh',
};

const STOCK_MOVEMENT_TYPES = {
  1: 'Nhập kho',
  2: 'Xuất kho',
  3: 'Điều chỉnh tăng',
  4: 'Điều chỉnh giảm',
  5: 'Chuyển kho ra',
  6: 'Chuyển kho vào',
  7: 'Giữ chỗ',
  8: 'Nhả giữ chỗ',
  Import: 'Nhập kho',
  Export: 'Xuất kho',
  Adjust: 'Điều chỉnh',
};

const getId = (item) => item.skuId ?? item.maSanPham ?? item.MaSanPham;
const getVariantId = (item) => item.skuId ?? item.maBienSanPham ?? item.MaBienSanPham ?? null;
const getProductCode = (item) => item.skuCode ?? item.maSanPhamKinhDoanh ?? item.MaSanPhamKinhDoanh ?? item.maSP ?? '';
const getSku = (item) => item.skuCode ?? item.sku ?? item.SKU ?? '';
const getProductName = (item) => item.tenSanPham ?? item.TenSanPham ?? item.productName ?? '—';
const getVariantName = (item) => item.tenBienThe ?? item.TenBienThe ?? item.variantName ?? item.skuCode ?? '—';
const getActualStock = (item) => item.onHand ?? item.tonKhoThucTe ?? item.TonKhoThucTe ?? item.actualStock ?? 0;
const getReservedStock = (item) => item.reserved ?? item.soLuongDangGiu ?? item.SoLuongDangGiu ?? item.dangGiuCho ?? 0;
const getAvailableStock = (item) => item.available ?? item.tonKhoKhaDung ?? item.TonKhoKhaDung ?? item.availableStock ?? 0;
const getLowStockThreshold = (item) => item.reorderPoint ?? item.mucCanhBaoTonThap ?? item.MucCanhBaoTonThap ?? 5;
const getStockStatus = (item) => item.trangThaiTon ?? item.TrangThaiTon ?? (getAvailableStock(item) <= 0 ? 'OutOfStock' : getAvailableStock(item) <= getLowStockThreshold(item) ? 'LowStock' : 'InStock');
const getUpdatedAt = (item) => item.ngayCapNhat ?? item.NgayCapNhat ?? item.updatedAt;
const getMovementType = (item) => item.loaiGiaoDich ?? item.LoaiGiaoDich ?? item.type ?? item.Type;
const getMovementDelta = (item) => item.qtyDelta ?? item.soLuongThayDoi ?? item.SoLuongThayDoi ?? 0;
const getMovementAfter = (item) => item.balanceAfter ?? item.tonSau ?? item.TonSau ?? 0;
const getMovementBefore = (item) => item.balanceBefore ?? item.tonTruoc ?? item.TonTruoc ?? (getMovementAfter(item) - getMovementDelta(item));
const getMovementDate = (item) => item.occurredAt ?? item.ngayTao ?? item.NgayTao;
const getMovementReason = (item) => item.reason ?? item.lyDo ?? item.LyDo ?? '';

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;

const InventoryView = () => {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [hasHold, setHasHold] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItem, setSelectedItem] = useState(null);
  const [holds, setHolds] = useState([]);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [showHoldsModal, setShowHoldsModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ loaiGiaoDich: 'Import', soLuong: 1, lyDo: '' });
  const [thresholdValue, setThresholdValue] = useState(5);

  const params = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    keyword: search || undefined,
    stockStatus: stockStatus || undefined,
    hasHold: hasHold || undefined,
    lowStockOnly: lowStockOnly || undefined,
    sortBy: sortBy === 'name' ? 'product' : sortBy,
    sortDirection,
  }), [page, search, stockStatus, hasHold, lowStockOnly, sortBy, sortDirection]);

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inventoryService.getAll(params);
      const data = res.data;
      setInventory(data.items || data.data || data || []);
      setSummary(data.summary || null);
      setLastSyncAt(data.lastSyncAt || null);
      setTotalPages(data.totalPages || Math.ceil((data.totalItems || data.total || 0) / PAGE_SIZE) || 1);
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải dữ liệu tồn kho. Vui lòng thử lại.'));
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    setAdjustmentsLoading(true);
    try {
      const res = await inventoryService.getAdjustments({});
      setAdjustments(res.data.items || []);
    } catch (err) {
      setAdjustments([]);
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [params]);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStockStatus('');
    setHasHold(false);
    setLowStockOnly(false);
    setSortBy('name');
    setSortDirection('asc');
    setPage(1);
  };

  const handleSync = async () => {
    if (!window.confirm('Bạn có chắc muốn đồng bộ tồn kho? Quá trình này có thể mất vài giây.')) return;
    setSyncing(true);
    try {
      await inventoryService.sync();
      await fetchInventory();
      alert('Đồng bộ tồn kho thành công!');
    } catch (err) {
      alert(getApiMessage(err, 'Đồng bộ tồn kho thất bại. Vui lòng thử lại.'));
    } finally {
      setSyncing(false);
    }
  };

  const openHoldsModal = async (item) => {
    setSelectedItem(item);
    setShowHoldsModal(true);
    setHoldsLoading(true);
    try {
      const res = await inventoryService.getHolds({
        productId: getId(item),
        variantId: getVariantId(item) || undefined,
      });
      setHolds((res.data.items || []).filter((hold) => hold.skuId === getVariantId(item)));
    } catch (err) {
      setHolds([]);
    } finally {
      setHoldsLoading(false);
    }
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustForm({ loaiGiaoDich: 'Import', soLuong: 1, lyDo: '' });
    setShowAdjustModal(true);
  };

  const openThresholdModal = (item) => {
    setSelectedItem(item);
    setThresholdValue(getLowStockThreshold(item));
    setShowThresholdModal(true);
  };

  const handleSaveThreshold = async () => {
    const value = Number(thresholdValue);
    if (!Number.isInteger(value) || value < 0) {
      alert('Ngưỡng cảnh báo phải là số nguyên lớn hơn hoặc bằng 0.');
      return;
    }

    setSaving(true);
    try {
      await inventoryService.updateThreshold({
        skuId: getVariantId(selectedItem),
        reorderPoint: value,
      });
      setShowThresholdModal(false);
      await fetchInventory();
    } catch (err) {
      alert(getApiMessage(err, 'Cập nhật ngưỡng tồn thấp thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const calculateStockAfter = () => {
    const current = getActualStock(selectedItem || {});
    const quantity = Number(adjustForm.soLuong) || 0;
    if (adjustForm.loaiGiaoDich === 'Import') return current + quantity;
    if (adjustForm.loaiGiaoDich === 'Export') return current - quantity;
    return quantity;
  };

  const handleAdjustStock = async () => {
    const quantity = Number(adjustForm.soLuong);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert('Số lượng phải là số nguyên lớn hơn 0.');
      return;
    }

    if (!adjustForm.lyDo.trim()) {
      alert('Lý do điều chỉnh là bắt buộc.');
      return;
    }

    const after = calculateStockAfter();
    if (after < 0) {
      alert('Tồn kho sau điều chỉnh không được âm.');
      return;
    }

    if (!window.confirm(`Xác nhận ${ADJUSTMENT_TYPES[adjustForm.loaiGiaoDich].toLowerCase()}? Tồn sau thay đổi: ${after}`)) return;

    setSaving(true);
    try {
      await inventoryService.adjustStock({
        skuId: getVariantId(selectedItem),
        transactionType: adjustForm.loaiGiaoDich,
        qty: quantity,
        reason: adjustForm.lyDo,
      });
      setShowAdjustModal(false);
      await fetchInventory();
      await fetchAdjustments();
    } catch (err) {
      alert(getApiMessage(err, 'Điều chỉnh tồn kho thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [inventoryRes, adjustmentsRes, holdsRes] = await Promise.allSettled([
        inventoryService.getAll({ ...params, page: 1, pageSize: 10000 }),
        inventoryService.getAdjustments({ page: 1, pageSize: 10000 }),
        inventoryService.getHolds({ page: 1, pageSize: 10000 }),
      ]);

      const inventoryData = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data : {};
      const adjustmentData = adjustmentsRes.status === 'fulfilled' ? adjustmentsRes.value.data : {};
      const holdsData = holdsRes.status === 'fulfilled' ? holdsRes.value.data : {};
      const inventoryRows = inventoryData.items || inventoryData.data || inventoryData || [];
      const adjustmentRows = adjustmentData.items || adjustmentData.data || adjustmentData || [];
      const holdRows = holdsData.items || holdsData.data || holdsData || [];

      await exportWorkbook({
        fileName: `ton-kho-${createDateStamp()}.xlsx`,
        sheets: [
          {
            name: 'HuongDan',
            columns: [
              { header: 'Mục', key: 'label', width: 30 },
              { header: 'Nội dung', key: 'value', width: 90 },
            ],
            rows: [
              { label: 'Tên báo cáo', value: 'Báo cáo tồn kho và đối soát giữ chỗ' },
              { label: 'Mục đích', value: 'Dùng để kiểm kê tồn thực tế, tồn khả dụng, hàng đang giữ chỗ và lịch sử điều chỉnh kho.' },
              { label: 'Từ khóa', value: search || 'Không lọc' },
              { label: 'Trạng thái tồn', value: stockStatus ? STOCK_STATUS[stockStatus]?.label || stockStatus : 'Tất cả' },
              { label: 'Chỉ đang giữ chỗ', value: hasHold ? 'Có' : 'Không' },
              { label: 'Chỉ tồn thấp/hết hàng', value: lowStockOnly ? 'Có' : 'Không' },
              { label: 'Tồn thực tế', value: 'Số lượng vật lý đang có trong kho.' },
              { label: 'Đang giữ chỗ', value: 'Số lượng đã bị giữ cho đơn hàng nhưng chưa xuất kho/hoàn tất.' },
              { label: 'Tồn khả dụng', value: 'Tồn thực tế trừ số lượng đang giữ chỗ.' },
              { label: 'Sheet TonKho', value: 'Dùng kiểm kê và rà mặt hàng cần nhập thêm.' },
              { label: 'Sheet GiuCho', value: 'Dùng kiểm tra hàng đang giữ thuộc đơn nào, số lượng bao nhiêu, hết hạn lúc nào.' },
              { label: 'Sheet LichSuDieuChinh', value: 'Dùng audit các lần nhập kho, xuất kho hoặc điều chỉnh tồn.' },
            ],
          },
          {
            name: 'TonKho',
            columns: [
              { header: 'Mã sản phẩm', key: 'productCode', width: 18 },
              { header: 'Mã biến thể/SKU', key: 'sku', width: 20 },
              { header: 'Tên sản phẩm', key: 'productName', width: 34 },
              { header: 'Tên biến thể', key: 'variantName', width: 30 },
              { header: 'Tồn thực tế', key: 'actualStock', type: 'number', width: 14 },
              { header: 'Đang giữ chỗ', key: 'reservedStock', type: 'number', width: 16 },
              { header: 'Tồn khả dụng', key: 'availableStock', type: 'number', width: 16 },
              { header: 'Ngưỡng cảnh báo', key: 'threshold', type: 'number', width: 18 },
              { header: 'Trạng thái tồn', key: 'status', width: 18 },
              { header: 'Ngày cập nhật', key: 'updatedAt', type: 'date', width: 20 },
            ],
            rows: inventoryRows.map((item) => ({
              productCode: getProductCode(item) || getId(item),
              sku: getSku(item),
              productName: getProductName(item),
              variantName: getVariantName(item),
              actualStock: getActualStock(item),
              reservedStock: getReservedStock(item),
              availableStock: getAvailableStock(item),
              threshold: getLowStockThreshold(item),
              status: STOCK_STATUS[getStockStatus(item)]?.label || getStockStatus(item),
              updatedAt: getUpdatedAt(item),
            })),
          },
          {
            name: 'GiuCho',
            columns: [
              { header: 'Mã đơn', key: 'orderCode', width: 18 },
              { header: 'Sản phẩm', key: 'productName', width: 34 },
              { header: 'Biến thể/SKU', key: 'variantName', width: 28 },
              { header: 'Số lượng giữ', key: 'quantity', type: 'number', width: 16 },
              { header: 'Trạng thái', key: 'status', width: 16 },
              { header: 'Hết hạn lúc', key: 'expiresAt', type: 'date', width: 20 },
              { header: 'Ngày tạo', key: 'createdAt', type: 'date', width: 20 },
              { header: 'Ghi chú', key: 'note', width: 32 },
            ],
            rows: holdRows.map((item) => ({
              orderCode: item.orderCode ?? item.maDonHangKinhDoanh ?? item.MaDonHangKinhDoanh ?? item.maDonHang ?? item.MaDonHang,
              productName: item.productName ?? item.tenSanPham ?? item.TenSanPham ?? '',
              variantName: item.skuCode ?? item.tenBienThe ?? item.TenBienThe ?? item.sku ?? item.SKU ?? '',
              quantity: item.qty ?? item.soLuong ?? item.SoLuong ?? 0,
              status: item.status ?? item.trangThai ?? item.TrangThai ?? '',
              expiresAt: item.expiresAt ?? item.hetHanLuc ?? item.HetHanLuc,
              createdAt: item.ngayTao ?? item.NgayTao,
              note: item.ghiChu ?? item.GhiChu ?? '',
            })),
          },
          {
            name: 'LichSuDieuChinh',
            columns: [
              { header: 'Mã sản phẩm', key: 'productCode', width: 18 },
              { header: 'SKU', key: 'sku', width: 18 },
              { header: 'Sản phẩm', key: 'productName', width: 34 },
              { header: 'Loại giao dịch', key: 'type', width: 18 },
              { header: 'Thay đổi', key: 'change', type: 'number', width: 14 },
              { header: 'Tồn trước', key: 'before', type: 'number', width: 14 },
              { header: 'Tồn sau', key: 'after', type: 'number', width: 14 },
              { header: 'Lý do', key: 'reason', width: 32 },
              { header: 'Ngày tạo', key: 'createdAt', type: 'date', width: 20 },
            ],
            rows: adjustmentRows.map((item) => ({
              productCode: item.productCode ?? item.maSanPhamKinhDoanh ?? item.MaSanPhamKinhDoanh,
              sku: item.skuCode ?? item.sku ?? item.SKU ?? item.skuId,
              productName: getProductName(item),
              type: STOCK_MOVEMENT_TYPES[getMovementType(item)] || getMovementType(item),
              change: getMovementDelta(item),
              before: getMovementBefore(item),
              after: getMovementAfter(item),
              reason: getMovementReason(item),
              createdAt: getMovementDate(item),
            })),
          },
        ],
      });
    } catch (err) {
      alert(getApiMessage(err, 'Xuất Excel tồn kho thất bại.'));
    } finally {
      setExporting(false);
    }
  };

  const renderStockBadge = (item) => {
    const meta = STOCK_STATUS[getStockStatus(item)] || STOCK_STATUS.InStock;
    return <span className={`badge badge-${meta.color}`}>{meta.label}</span>;
  };

  const summaryCards = [
    { label: 'Tổng SKU', value: summary?.totalSkus ?? 0, color: 'info', icon: 'fa-barcode' },
    { label: 'Hết hàng', value: summary?.outOfStock ?? 0, color: 'danger', icon: 'fa-exclamation-circle' },
    { label: 'Sắp hết', value: summary?.lowStock ?? 0, color: 'warning', icon: 'fa-exclamation-triangle' },
    { label: 'Đang giữ chỗ', value: summary?.holding ?? 0, color: 'primary', icon: 'fa-clock' },
  ];

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý Tồn kho</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            {summaryCards.map((card) => (
              <div className="col-lg-3 col-6" key={card.label}>
                <div className={`small-box bg-${card.color}`}>
                  <div className="inner">
                    <h3>{card.value}</h3>
                    <p>{card.label}</p>
                  </div>
                  <div className="icon">
                    <i className={`fas ${card.icon}`}></i>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tồn kho sản phẩm</h3>
              <div className="card-tools d-flex align-items-center" style={{ gap: 8 }}>
                <small className="text-muted">
                  Lần đồng bộ: {lastSyncAt ? formatDate(lastSyncAt) : 'Chưa có'}
                </small>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleExport}
                  disabled={exporting}
                  title="Xuất tồn kho, giữ chỗ và lịch sử điều chỉnh để kiểm kê/đối soát"
                >
                  <i className="fas fa-file-excel"></i>{exporting ? ' Đang xuất...' : ' Xuất báo cáo tồn kho'}
                </button>
                <button className="btn btn-success btn-sm" onClick={handleSync} disabled={syncing}>
                  <i className={`fas fa-sync-alt ${syncing ? 'fa-spin' : ''}`}></i>
                  {syncing ? ' Đang đồng bộ...' : ' Đồng bộ tồn kho'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSearch} className="row mb-3">
                {LIST_CONTROLS.showSearch && (
                <div className="col-lg-3 col-md-6 mb-2">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm sản phẩm, mã SP, SKU..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <div className="input-group-append">
                      <button className="btn btn-default" type="submit">
                        <i className="fas fa-search"></i>
                      </button>
                    </div>
                  </div>
                </div>
                )}
                {LIST_CONTROLS.showStockStatus && (
                <div className="col-lg-2 col-md-6 mb-2">
                  <select className="form-control" value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}>
                    <option value="">-- Trạng thái tồn --</option>
                    <option value="InStock">Còn hàng</option>
                    <option value="LowStock">Sắp hết</option>
                    <option value="OutOfStock">Hết hàng</option>
                  </select>
                </div>
                )}
                {LIST_CONTROLS.showSort && (
                <>
                <div className="col-lg-2 col-md-6 mb-2">
                  <select className="form-control" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                    <option value="name">Sắp xếp theo tên</option>
                    <option value="available">Tồn khả dụng</option>
                    <option value="onHand">Tồn thực tế</option>
                    <option value="reserved">Đang giữ</option>
                    <option value="updated">Ngày cập nhật</option>
                  </select>
                </div>
                <div className="col-lg-1 col-md-6 mb-2">
                  <select className="form-control" value={sortDirection} onChange={(e) => { setSortDirection(e.target.value); setPage(1); }}>
                    <option value="asc">Tăng dần</option>
                    <option value="desc">Giảm dần</option>
                  </select>
                </div>
                </>
                )}
                <div className="col-lg-1 col-md-6 mb-2">
                  <button type="button" className="btn btn-outline-secondary btn-block" onClick={handleResetFilters}>
                    <i className="fas fa-times"></i> Xóa lọc
                  </button>
                </div>
                {LIST_CONTROLS.showReload && (
                <div className="col-lg-1 col-md-6 mb-2">
                  <button type="button" className="btn btn-outline-primary btn-block" onClick={fetchInventory} disabled={loading} title="Tải lại danh sách với bộ lọc hiện tại">
                    <i className={`fas fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Tải lại
                  </button>
                </div>
                )}
                <div className="col-md-12 inventory-filter-checks">
                  {LIST_CONTROLS.showHoldFilter && (
                  <div className="form-check inventory-filter-check">
                    <input className="form-check-input" id="hasHold" type="checkbox" checked={hasHold} onChange={(e) => { setHasHold(e.target.checked); setPage(1); }} />
                    <label className="form-check-label" htmlFor="hasHold">Chỉ sản phẩm đang giữ chỗ</label>
                  </div>
                  )}
                  {LIST_CONTROLS.showLowStockFilter && (
                  <div className="form-check inventory-filter-check">
                    <input className="form-check-input" id="lowStockOnly" type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} />
                    <label className="form-check-label" htmlFor="lowStockOnly">Chỉ tồn thấp/hết hàng</label>
                  </div>
                  )}
                </div>
              </form>

              {error && <div className="alert alert-danger">{error}</div>}

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-boxes fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Không có dữ liệu tồn kho phù hợp với bộ lọc hiện tại.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th className="table-col-code">Mã SP</th>
                          <th className="table-col-code">SKU</th>
                          <th className="table-col-text">Sản phẩm</th>
                          <th className="table-col-text">Biến thể</th>
                          <th className="table-col-number">Tồn thực tế</th>
                          <th className="table-col-number">Đang giữ chỗ</th>
                          <th className="table-col-number">Tồn khả dụng</th>
                          <th className="table-col-number">Ngưỡng thấp</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Cập nhật</th>
                          <th className="table-col-actions">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.map((item, idx) => {
                          const reserved = getReservedStock(item);
                          return (
                            <tr key={`${getId(item)}-${getVariantId(item) || 'base'}-${idx}`}>
                              <td className="table-col-code"><strong>{getProductCode(item) || getId(item)}</strong></td>
                              <td className="table-col-code">{getSku(item) || '—'}</td>
                              <td className="table-col-text">{getProductName(item)}</td>
                              <td className="table-col-text">{getVariantName(item)}</td>
                              <td className="table-col-number"><span className="font-weight-bold">{getActualStock(item)}</span></td>
                              <td className="table-col-number">
                                <button
                                  type="button"
                                  className={`btn btn-link btn-sm p-0 font-weight-bold ${reserved > 0 ? 'text-warning' : 'text-muted'}`}
                                  onClick={() => openHoldsModal(item)}
                                  title="Xem chi tiết giữ chỗ"
                                >
                                  {reserved}
                                </button>
                              </td>
                              <td className="table-col-number">
                                <span className={`font-weight-bold ${getAvailableStock(item) <= 0 ? 'text-danger' : 'text-success'}`}>
                                  {getAvailableStock(item)}
                                </span>
                              </td>
                              <td className="table-col-number">{getLowStockThreshold(item)}</td>
                              <td className="table-col-status">{renderStockBadge(item)}</td>
                              <td className="table-col-date">{formatDate(getUpdatedAt(item))}</td>
                              <td className="table-col-actions">
                                <button className="btn btn-xs btn-info mr-1" onClick={() => openHoldsModal(item)} title="Giữ chỗ">
                                  <i className="fas fa-clock"></i>
                                </button>
                                <button className="btn btn-xs btn-warning mr-1" onClick={() => openThresholdModal(item)} title="Ngưỡng">
                                  <i className="fas fa-bell"></i>
                                </button>
                                <button className="btn btn-xs btn-primary" onClick={() => openAdjustModal(item)} title="Điều chỉnh">
                                  <i className="fas fa-edit"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page - 1)}>«</button>
                        </li>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                          <li key={pageNumber} className={`page-item ${pageNumber === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                          </li>
                        ))}
                        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => setPage(page + 1)}>»</button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Lịch sử điều chỉnh tồn kho</h3>
              <div className="card-tools">
                <button className="btn btn-default btn-sm" onClick={fetchAdjustments}>
                  <i className="fas fa-sync-alt"></i> Tải lại
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {adjustmentsLoading ? (
                <div className="text-center py-4">Đang tải lịch sử...</div>
              ) : adjustments.length === 0 ? (
                <div className="text-center py-4 text-muted">Chưa có lịch sử điều chỉnh tồn kho.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th className="table-col-code">Mã SP</th>
                        <th className="table-col-code">SKU</th>
                        <th className="table-col-text">Sản phẩm</th>
                        <th className="table-col-status">Loại</th>
                        <th className="table-col-number">Thay đổi</th>
                        <th className="table-col-number">Trước</th>
                        <th className="table-col-number">Sau</th>
                        <th className="table-col-text">Lý do</th>
                        <th className="table-col-date">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((item) => (
                        <tr key={item.id ?? item.Id}>
                          <td className="table-col-code">{item.productCode ?? item.maSanPhamKinhDoanh ?? item.MaSanPhamKinhDoanh ?? '—'}</td>
                          <td className="table-col-code">{item.skuCode ?? item.sku ?? item.SKU ?? item.skuId ?? '—'}</td>
                          <td className="table-col-text">{getProductName(item)}</td>
                          <td className="table-col-status">{STOCK_MOVEMENT_TYPES[getMovementType(item)] || getMovementType(item) || '—'}</td>
                          <td className="table-col-number">{getMovementDelta(item)}</td>
                          <td className="table-col-number">{getMovementBefore(item)}</td>
                          <td className="table-col-number">{getMovementAfter(item)}</td>
                          <td className="table-col-text">{getMovementReason(item) || '—'}</td>
                          <td className="table-col-date">{formatDate(getMovementDate(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showHoldsModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết giữ chỗ</h5>
                <button type="button" className="close" onClick={() => setShowHoldsModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <p className="mb-2"><strong>{getProductName(selectedItem || {})}</strong> {getVariantName(selectedItem || {}) !== '—' ? `- ${getVariantName(selectedItem || {})}` : ''}</p>
                {holdsLoading ? (
                  <div className="text-center py-3">Đang tải...</div>
                ) : holds.length === 0 ? (
                  <div className="text-muted">Không có bản ghi giữ chỗ.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm mb-0">
                      <thead>
                        <tr>
                          <th className="table-col-code">Mã đơn</th>
                          <th className="table-col-number">Số lượng</th>
                          <th className="table-col-status">Trạng thái</th>
                          <th className="table-col-date">Hết hạn</th>
                          <th className="table-col-date">Ngày tạo</th>
                          <th className="table-col-text">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holds.map((hold, index) => (
                          <tr key={hold.maGiuCho ?? hold.MaGiuCho ?? hold.id ?? hold.Id ?? `${hold.orderId ?? hold.OrderId ?? 'order'}-${hold.skuId ?? hold.SkuId ?? 'sku'}-${index}`}>
                            <td className="table-col-code">{hold.maDonHangKinhDoanh ?? hold.MaDonHangKinhDoanh ?? hold.maDonHang ?? hold.MaDonHang}</td>
                            <td className="table-col-number">{hold.soLuong ?? hold.SoLuong}</td>
                            <td className="table-col-status">{hold.trangThai ?? hold.TrangThai}</td>
                            <td className="table-col-date">{formatDate(hold.hetHanLuc ?? hold.HetHanLuc)}</td>
                            <td className="table-col-date">{formatDate(hold.ngayTao ?? hold.NgayTao)}</td>
                            <td className="table-col-text">{hold.ghiChu ?? hold.GhiChu ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHoldsModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showThresholdModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cập nhật ngưỡng tồn thấp</h5>
                <button type="button" className="close" onClick={() => setShowThresholdModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Ngưỡng cảnh báo</label>
                  <input type="number" className="form-control" min="0" value={thresholdValue} onChange={(e) => setThresholdValue(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowThresholdModal(false)} disabled={saving}>Hủy</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveThreshold} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nhập/Xuất/Điều chỉnh tồn</h5>
                <button type="button" className="close" onClick={() => setShowAdjustModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <p className="mb-2"><strong>{getProductName(selectedItem || {})}</strong> {getVariantName(selectedItem || {}) !== '—' ? `- ${getVariantName(selectedItem || {})}` : ''}</p>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Loại giao dịch</label>
                      <select className="form-control" value={adjustForm.loaiGiaoDich} onChange={(e) => setAdjustForm((prev) => ({ ...prev, loaiGiaoDich: e.target.value }))}>
                        <option value="Import">Nhập kho</option>
                        <option value="Export">Xuất kho</option>
                        <option value="Adjust">Điều chỉnh về số lượng</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Số lượng</label>
                      <input type="number" className="form-control" min="1" value={adjustForm.soLuong} onChange={(e) => setAdjustForm((prev) => ({ ...prev, soLuong: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="alert alert-info">
                  Tồn hiện tại: <strong>{getActualStock(selectedItem || {})}</strong> | Tồn sau thay đổi: <strong>{calculateStockAfter()}</strong>
                </div>
                <div className="form-group">
                  <label>Lý do <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows="3" value={adjustForm.lyDo} onChange={(e) => setAdjustForm((prev) => ({ ...prev, lyDo: e.target.value }))}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)} disabled={saving}>Hủy</button>
                <button type="button" className="btn btn-primary" onClick={handleAdjustStock} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
