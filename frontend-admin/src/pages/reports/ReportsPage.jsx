import React, { useState, useEffect } from 'react';
import RevenueChart from '../../components/charts/RevenueChart';
import OrderStatusChart from '../../components/charts/OrderStatusChart';
import TopProductChart from '../../components/charts/TopProductChart';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { createDateStamp, exportWorkbook } from '../../utils/exportExcel';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
};

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [range, setRange] = useState(getDefaultRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    revenueSeries: [],
    orderStatusSeries: [],
    topProducts: [],
    payments: [],
    orders: [],
    purchaseReports: [],
    cashReports: [],
    receivableReports: [],
    serviceReports: { repairs: [], warranties: [] },
    inventoryWarnings: [],
    crmTasks: [],
    stats: { productCount: 0, orderCount: 0, monthRevenue: 0, userCount: 0 },
  });

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await reportService.getReports(range);
      setData(result);
    } catch (err) {
      setError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const totalRevenue = data.stats.monthRevenue || 0;
  const totalOrders = data.orders.length;
  const revenueOrderCount = data.stats.revenueOrderCount || 0;
  const avgOrderValue = revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0;
  const cogs = data.stats.cogs || 0;
  const grossProfit = data.stats.grossProfit || 0;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const handleExportExcel = async () => {
    try {
      await exportWorkbook({
        fileName: `bao-cao-admin-${range.startDate}-${range.endDate}-${createDateStamp()}.xlsx`,
        sheets: [
          {
            name: 'HuongDan',
            columns: [
              { header: 'Mục', key: 'label', width: 30 },
              { header: 'Nội dung', key: 'value', width: 90 },
            ],
            rows: [
              { label: 'Tên báo cáo', value: 'Báo cáo doanh thu và hiệu quả bán hàng' },
              { label: 'Mục đích', value: 'Dùng để đối soát doanh thu, số đơn, trạng thái đơn và sản phẩm bán chạy trong kỳ.' },
              { label: 'Khoảng thời gian', value: `${range.startDate} đến ${range.endDate}` },
              { label: 'Tiêu chí doanh thu', value: 'Chỉ tính đơn đã thanh toán đầy đủ và đã giao/hoàn tất.' },
              { label: 'Tổng đơn hàng', value: 'Tính theo ngày tạo đơn trong khoảng thời gian đã chọn.' },
              { label: 'SKU bán chạy', value: 'Tổng hợp theo từng SKU/biến thể từ chi tiết đơn có doanh thu hợp lệ.' },
              { label: 'Sheet TongQuan', value: 'Các chỉ số chính để quản lý nhìn nhanh hiệu quả kinh doanh.' },
              { label: 'Sheet DoanhThuTheoNgay', value: 'Dùng kiểm tra doanh thu từng ngày và so với biểu đồ.' },
              { label: 'Sheet TrangThaiDonHang', value: 'Dùng xem phân bổ đơn theo nhóm trạng thái nghiệp vụ.' },
              { label: 'Sheet SanPhamBanChay', value: 'Dùng quyết định nhập hàng, khuyến mãi hoặc theo dõi SKU bán tốt.' },
              { label: 'Sheet MuaHang', value: 'Theo dõi đơn mua, đã trả và còn phải trả nhà cung cấp.' },
              { label: 'Sheet ThuChi', value: 'Theo dõi phiếu thu/chi trong kỳ.' },
              { label: 'Sheet CongNo', value: 'Theo dõi các đơn còn phải thu từ khách.' },
              { label: 'Sheet DichVuSuaChua', value: 'Theo dõi phiếu sửa chữa trong kỳ.' },
              { label: 'Sheet BaoHanh', value: 'Theo dõi phiếu bảo hành trong kỳ.' },
              { label: 'Sheet CanhBaoTonKho', value: 'Theo dõi SKU hết hàng/sắp hết hàng.' },
            ],
          },
          {
            name: 'TongQuan',
            columns: [
              { header: 'Chỉ tiêu', key: 'label', width: 28 },
              { header: 'Giá trị', key: 'value', width: 24 },
            ],
            rows: [
              { label: 'Từ ngày', value: range.startDate },
              { label: 'Đến ngày', value: range.endDate },
              { label: 'Tổng doanh thu', value: formatCurrency(totalRevenue) },
              { label: 'Tổng đơn hàng', value: totalOrders },
              { label: 'Số đơn có doanh thu', value: revenueOrderCount },
              { label: 'Giá trị đơn trung bình', value: formatCurrency(avgOrderValue) },
              { label: 'Giá vốn ước tính', value: formatCurrency(cogs) },
              { label: 'Lãi gộp ước tính', value: formatCurrency(grossProfit) },
              { label: 'Biên lợi nhuận gộp', value: `${grossMargin.toFixed(1)}%` },
            ],
          },
          {
            name: 'DoanhThuTheoNgay',
            columns: [
              { header: 'Ngày', key: 'label', width: 16 },
              { header: 'Doanh thu', key: 'value', type: 'currency', width: 18 },
            ],
            rows: data.revenueSeries,
          },
          {
            name: 'TrangThaiDonHang',
            columns: [
              { header: 'Nhóm trạng thái', key: 'label', width: 24 },
              { header: 'Số lượng', key: 'value', type: 'number', width: 14 },
            ],
            rows: data.orderStatusSeries,
          },
          {
            name: 'SanPhamBanChay',
            columns: [
              { header: 'STT', key: 'index', type: 'number', width: 8 },
              { header: 'Mã sản phẩm/SKU', key: 'id', width: 18 },
              { header: 'SKU/Sản phẩm', key: 'name', width: 36 },
              { header: 'Số lượng bán', key: 'sold', type: 'number', width: 16 },
              { header: 'Doanh thu', key: 'revenue', type: 'currency', width: 18 },
              { header: 'Giá vốn', key: 'cost', type: 'currency', width: 18 },
              { header: 'Lãi gộp', key: 'profit', type: 'currency', width: 18 },
            ],
            rows: data.topProducts.map((product, index) => ({ index: index + 1, ...product })),
          },
          {
            name: 'MuaHang',
            columns: [
              { header: 'Mã đơn mua', key: 'code', width: 18 },
              { header: 'Nhà cung cấp', key: 'supplierName', width: 28 },
              { header: 'Trạng thái', key: 'status', width: 18 },
              { header: 'Tổng tiền', key: 'totalAmount', type: 'currency', width: 18 },
              { header: 'Đã trả', key: 'paidAmount', type: 'currency', width: 18 },
              { header: 'Còn phải trả', key: 'outstanding', type: 'currency', width: 18 },
              { header: 'Ngày tạo', key: 'createdDate', type: 'date', width: 20 },
            ],
            rows: data.purchaseReports || [],
          },
          {
            name: 'ThuChi',
            columns: [
              { header: 'Mã phiếu', key: 'code', width: 18 },
              { header: 'Loại', key: 'transactionType', width: 14 },
              { header: 'Nhóm', key: 'category', width: 18 },
              { header: 'Số tiền', key: 'amount', type: 'currency', width: 18 },
              { header: 'Hình thức', key: 'method', width: 16 },
              { header: 'Ngày ghi nhận', key: 'occurredAt', type: 'date', width: 20 },
              { header: 'Ghi chú', key: 'note', width: 36 },
            ],
            rows: data.cashReports || [],
          },
          {
            name: 'CongNo',
            columns: [
              { header: 'Mã đơn', key: 'orderCode', width: 18 },
              { header: 'Khách hàng', key: 'customerName', width: 28 },
              { header: 'Tổng đơn', key: 'grandTotal', type: 'currency', width: 18 },
              { header: 'Đã thu', key: 'paidAmount', type: 'currency', width: 18 },
              { header: 'Đã hoàn', key: 'refundedAmount', type: 'currency', width: 18 },
              { header: 'Còn phải thu', key: 'outstanding', type: 'currency', width: 18 },
              { header: 'Trạng thái thanh toán', key: 'paymentStatus', width: 22 },
            ],
            rows: data.receivableReports || [],
          },
          {
            name: 'DichVuSuaChua',
            columns: [
              { header: 'Mã phiếu', key: 'code', width: 18 },
              { header: 'Xe', key: 'vehicleDescription', width: 28 },
              { header: 'Lỗi ghi nhận', key: 'reportedIssue', width: 36 },
              { header: 'Trạng thái', key: 'status', width: 18 },
              { header: 'Tổng phí', key: 'total', type: 'currency', width: 18 },
              { header: 'Ngày nhận', key: 'receivedAt', type: 'date', width: 20 },
              { header: 'Ngày xong', key: 'completedAt', type: 'date', width: 20 },
            ],
            rows: data.serviceReports?.repairs || [],
          },
          {
            name: 'BaoHanh',
            columns: [
              { header: 'Mã phiếu', key: 'code', width: 18 },
              { header: 'Sản phẩm', key: 'productSnapshot', width: 32 },
              { header: 'Khách hàng', key: 'customerName', width: 28 },
              { header: 'Trạng thái', key: 'status', width: 18 },
              { header: 'Bắt đầu', key: 'startAt', type: 'date', width: 20 },
              { header: 'Kết thúc', key: 'endAt', type: 'date', width: 20 },
            ],
            rows: data.serviceReports?.warranties || [],
          },
          {
            name: 'CanhBaoTonKho',
            columns: [
              { header: 'SKU', key: 'skuCode', width: 18 },
              { header: 'Sản phẩm', key: 'productName', width: 34 },
              { header: 'Tồn thực', key: 'onHand', type: 'number', width: 12 },
              { header: 'Đang giữ', key: 'reserved', type: 'number', width: 12 },
              { header: 'Khả dụng', key: 'available', type: 'number', width: 12 },
              { header: 'Ngưỡng thấp', key: 'reorderPoint', type: 'number', width: 12 },
              { header: 'Cảnh báo', key: 'warningStatus', width: 18 },
            ],
            rows: data.inventoryWarnings || [],
          },
        ],
      });
    } catch (err) {
      alert('Xuất Excel thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Báo cáo & Thống kê</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {/* Date Range Picker */}
          <div className="card">
            <div className="card-body">
              <form className="form-inline" onSubmit={handleApply}>
                <label className="mr-2 font-weight-bold">Khoảng thời gian:</label>
                <input
                  type="date"
                  className="form-control form-control-sm mr-2"
                  value={range.startDate}
                  onChange={(e) => setRange((prev) => ({ ...prev, startDate: e.target.value }))}
                />
                <span className="mr-2">đến</span>
                <input
                  type="date"
                  className="form-control form-control-sm mr-2"
                  value={range.endDate}
                  onChange={(e) => setRange((prev) => ({ ...prev, endDate: e.target.value }))}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  <i className="fas fa-filter"></i> Áp dụng
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm ml-2"
                  onClick={handleExportExcel}
                  disabled={loading}
                  title="Xuất báo cáo doanh thu, trạng thái đơn và sản phẩm bán chạy theo khoảng thời gian đang chọn"
                >
                  <i className="fas fa-file-excel"></i> Xuất báo cáo doanh thu
                </button>
              </form>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="card-header p-2">
                  <div className="nav nav-pills">
                    {[
                      ['sales', 'Bán hàng'],
                      ['purchase', 'Mua hàng'],
                      ['cash', 'Thu chi/Công nợ'],
                      ['service', 'Dịch vụ'],
                      ['inventory', 'Kho'],
                    ].map(([key, label]) => (
                      <button key={key} type="button" className={`nav-link ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              {activeTab === 'sales' && <><div className="row">
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-success"><i className="fas fa-money-bill-wave"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Tổng doanh thu</span>
                      <span className="info-box-number">{formatCurrency(totalRevenue)}</span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-info"><i className="fas fa-receipt"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Tổng đơn hàng</span>
                      <span className="info-box-number">{totalOrders}</span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-warning"><i className="fas fa-calculator"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Giá trị đơn trung bình</span>
                      <span className="info-box-number">{formatCurrency(avgOrderValue)}</span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-secondary"><i className="fas fa-coins"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Giá vốn ước tính</span>
                      <span className="info-box-number">{formatCurrency(cogs)}</span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-primary"><i className="fas fa-hand-holding-usd"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Lãi gộp ước tính</span>
                      <span className="info-box-number">{formatCurrency(grossProfit)}</span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6">
                  <div className="info-box">
                    <span className="info-box-icon bg-danger"><i className="fas fa-percentage"></i></span>
                    <div className="info-box-content">
                      <span className="info-box-text">Biên lợi nhuận gộp</span>
                      <span className="info-box-number">{grossMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-line mr-1"></i> Doanh thu theo ngày
                  </h3>
                </div>
                <div className="card-body">
                  {data.revenueSeries.length > 0 ? (
                    <RevenueChart data={data.revenueSeries} label="Doanh thu" />
                  ) : (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-chart-line fa-3x mb-3"></i>
                      <p>Không có dữ liệu doanh thu trong khoảng thời gian này.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Status + Top Products */}
              <div className="row">
                <div className="col-lg-5">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <i className="fas fa-chart-pie mr-1"></i> Đơn hàng theo trạng thái
                      </h3>
                    </div>
                    <div className="card-body">
                      {data.orderStatusSeries.length > 0 ? (
                        <OrderStatusChart data={data.orderStatusSeries} />
                      ) : (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-chart-pie fa-3x mb-3"></i>
                          <p>Không có dữ liệu đơn hàng.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-lg-7">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                      <i className="fas fa-trophy mr-1"></i> Top 10 SKU bán chạy
                      </h3>
                    </div>
                    <div className="card-body">
                      {data.topProducts.length > 0 ? (
                        <TopProductChart data={data.topProducts} />
                      ) : (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-trophy fa-3x mb-3"></i>
                          <p>Không có dữ liệu sản phẩm bán chạy.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Products Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-list-ol mr-1"></i> Chi tiết sản phẩm bán chạy
                  </h3>
                </div>
                <div className="card-body p-0 table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th className="table-col-code">#</th>
                        <th className="table-col-text">SKU/Sản phẩm</th>
                        <th className="table-col-number">Số lượng bán</th>
                        <th className="table-col-money">Doanh thu ước tính</th>
                        <th className="table-col-money">Giá vốn ước tính</th>
                        <th className="table-col-money">Lãi gộp ước tính</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            Không có dữ liệu.
                          </td>
                        </tr>
                      ) : (
                        data.topProducts.map((product, idx) => (
                          <tr key={product.id || idx}>
                            <td className="table-col-code">{idx + 1}</td>
                            <td className="table-col-text">{product.name}</td>
                            <td className="table-col-number">{product.sold}</td>
                            <td className="table-col-money">{formatCurrency(product.revenue)}</td>
                            <td className="table-col-money">{formatCurrency(product.cost || 0)}</td>
                            <td className={`table-col-money ${(product.profit || 0) < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(product.profit || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </>}

              {activeTab === 'purchase' && <ReportTable title="Báo cáo mua hàng" description="Theo dõi đơn mua, trạng thái nhận hàng và công nợ nhà cung cấp." headers={['Mã đơn mua', 'Nhà cung cấp', 'Trạng thái', 'Tổng tiền', 'Đã trả', 'Còn phải trả', 'Ngày tạo']}>
                {(data.purchaseReports || []).map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.supplierName}</td><td>{row.status}</td><td className="text-right">{formatCurrency(row.totalAmount)}</td><td className="text-right">{formatCurrency(row.paidAmount)}</td><td className="text-right">{formatCurrency(row.outstanding)}</td><td>{formatDate(row.createdDate)}</td></tr>)}
              </ReportTable>}

              {activeTab === 'cash' && <>
                <ReportTable title="Báo cáo thu chi" description="Theo dõi các phiếu thu/chi và nguồn phát sinh trong kỳ." headers={['Mã phiếu', 'Loại', 'Nhóm', 'Số tiền', 'Hình thức', 'Ngày ghi nhận', 'Ghi chú']}>
                  {(data.cashReports || []).map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.transactionType === 'Receipt' ? 'Thu' : 'Chi'}</td><td>{row.category}</td><td className="text-right">{formatCurrency(row.amount)}</td><td>{row.method}</td><td>{formatDate(row.occurredAt)}</td><td>{row.note || '-'}</td></tr>)}
                </ReportTable>
                <ReportTable title="Công nợ khách hàng" description="Các đơn còn phải thu sau khi trừ thanh toán và hoàn tiền." headers={['Mã đơn', 'Khách hàng', 'Tổng đơn', 'Đã thu', 'Đã hoàn', 'Còn phải thu', 'Trạng thái']}>
                  {(data.receivableReports || []).map((row) => <tr key={row.orderId}><td>{row.orderCode}</td><td>{row.customerName}</td><td className="text-right">{formatCurrency(row.grandTotal)}</td><td className="text-right">{formatCurrency(row.paidAmount)}</td><td className="text-right">{formatCurrency(row.refundedAmount)}</td><td className="text-right font-weight-bold">{formatCurrency(row.outstanding)}</td><td>{row.paymentStatus}</td></tr>)}
                </ReportTable>
              </>}

              {activeTab === 'service' && <>
                <ReportTable title="Dịch vụ sửa chữa" description="Theo dõi phiếu sửa chữa, trạng thái và tổng phí." headers={['Mã phiếu', 'Xe', 'Lỗi ghi nhận', 'Trạng thái', 'Tổng phí', 'Ngày nhận', 'Ngày xong']}>
                  {(data.serviceReports?.repairs || []).map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.vehicleDescription}</td><td>{row.reportedIssue}</td><td>{row.status}</td><td className="text-right">{formatCurrency(row.total)}</td><td>{formatDate(row.receivedAt)}</td><td>{formatDate(row.completedAt)}</td></tr>)}
                </ReportTable>
                <ReportTable title="Bảo hành" description="Theo dõi phiếu bảo hành và thời hạn xử lý." headers={['Mã phiếu', 'Sản phẩm', 'Khách hàng', 'Trạng thái', 'Bắt đầu', 'Kết thúc']}>
                  {(data.serviceReports?.warranties || []).map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.productSnapshot}</td><td>{row.customerName || '-'}</td><td>{row.status}</td><td>{formatDate(row.startAt)}</td><td>{formatDate(row.endAt)}</td></tr>)}
                </ReportTable>
              </>}

              {activeTab === 'inventory' && <ReportTable title="Cảnh báo tồn kho" description="Danh sách SKU hết hàng hoặc sắp hết hàng theo ngưỡng cảnh báo." headers={['SKU', 'Sản phẩm', 'Tồn thực', 'Đang giữ', 'Khả dụng', 'Ngưỡng', 'Cảnh báo']}>
                {(data.inventoryWarnings || []).map((row) => <tr key={row.skuId}><td>{row.skuCode}</td><td>{row.productName}</td><td className="text-right">{row.onHand}</td><td className="text-right">{row.reserved}</td><td className="text-right">{row.available}</td><td className="text-right">{row.reorderPoint}</td><td className="text-center"><span className={`badge badge-${row.available <= 0 ? 'danger' : 'warning'}`}>{row.warningStatus}</span></td></tr>)}
              </ReportTable>}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const ReportTable = ({ title, description, headers, children }) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
    </div>
    <div className="card-body">
      <p className="text-muted">{description}</p>
      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{React.Children.count(children) ? children : <tr><td colSpan={headers.length} className="text-center text-muted py-4">Chưa có dữ liệu.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  </div>
);

export default ReportsPage;
