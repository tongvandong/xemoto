import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/charts/RevenueChart';
import OrderStatusChart from '../components/charts/OrderStatusChart';
import reportService from '../services/reportService';
import inventoryService from '../services/inventoryService';
import contactService from '../services/contactService';
import voucherService from '../services/voucherService';
import warrantyService from '../services/warrantyService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { cn } from '../utils/cn';

const cardClass = 'relative mb-4 flex min-w-0 flex-col rounded border border-black/10 bg-white shadow-[0_0_1px_rgba(0,0,0,0.125),0_1px_3px_rgba(0,0,0,0.2)]';
const cardHeaderClass = 'flex min-h-12 items-center justify-between gap-4 border-b border-black/10 px-5 py-3';
const cardTitleClass = 'm-0 text-lg font-normal';
const cardBodyClass = 'min-h-px flex-auto p-5';
const tableClass = 'mb-0 w-full border-collapse bg-white text-[#212529]';
const thClass = 'whitespace-nowrap border border-[#dee2e6] border-b-2 px-3 py-2 align-bottom';
const tdClass = 'border border-[#dee2e6] px-3 py-2 align-middle';
const emptyCellClass = cn(tdClass, 'py-4 text-center text-[#6c757d]');
const badgeClass = (variant = 'info') => cn(
  'inline-block rounded px-1.5 py-1 text-[75%] font-bold leading-none',
  {
    info: 'bg-info text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-[#1f2933]',
  }[variant] || 'bg-secondary text-white',
);

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState({
    stats: {
      productCount: 0,
      orderCount: 0,
      monthRevenue: 0,
      userCount: 0,
    },
    revenueSeries: [],
    orderStatusSeries: [],
    recentOrders: [],
    topProducts: [],
    inventoryWarnings: [],
    crmTasks: [],
    operations: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operations, setOperations] = useState({
    awaitingOrders: 0,
    unpaidOrders: 0,
    shippingOrders: 0,
    outOfStock: 0,
    lowStock: 0,
    newContacts: 0,
    expiringVouchers: 0,
    activeWarranties: 0,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const dashboard = await reportService.getDashboard();
        setData(dashboard);
        const [inventoryRes, contactsRes, vouchersRes, warrantiesRes] = await Promise.allSettled([
          inventoryService.getAll({ page: 1, pageSize: 1 }),
          contactService.getAll({ status: 'New', page: 1, pageSize: 1 }),
          voucherService.getAll({ page: 1, pageSize: 100 }),
          warrantyService.getAll({ page: 1, pageSize: 100 }),
        ]);

        const orders = dashboard.orders || dashboard.recentOrders || [];
        const vouchers = vouchersRes.status === 'fulfilled' ? (vouchersRes.value.data.items || []) : [];
        const warranties = warrantiesRes.status === 'fulfilled' ? (warrantiesRes.value.data.items || []) : [];
        const now = new Date();
        const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const remoteOps = dashboard.operations || {};
        setOperations({
          awaitingOrders: remoteOps.pendingOrders ?? orders.filter((o) => ['AwaitingPayment', 'Pending', 'Checkout', 'Confirmed'].includes(o.trangThaiDonHang || o.status || o.orderStatus)).length,
          unpaidOrders: orders.filter((o) => ['Unpaid', 'Pending'].includes(o.trangThaiThanhToan || o.paymentStatus)).length,
          shippingOrders: remoteOps.shippingOrders ?? orders.filter((o) => ['Allocated', 'Shipped'].includes(o.trangThaiVanChuyen || o.shippingStatus || o.fulfillmentStatus)).length,
          outOfStock: remoteOps.outOfStock ?? (inventoryRes.status === 'fulfilled' ? (inventoryRes.value.data.summary?.outOfStock || 0) : 0),
          lowStock: remoteOps.lowStock ?? (inventoryRes.status === 'fulfilled' ? (inventoryRes.value.data.summary?.lowStock || 0) : 0),
          newContacts: contactsRes.status === 'fulfilled' ? (contactsRes.value.data.totalItems || contactsRes.value.data.items?.length || 0) : 0,
          expiringVouchers: vouchers.filter((v) => {
            const end = new Date(v.endsAt || v.endAt || v.ngayKetThuc);
            return !Number.isNaN(end.getTime()) && end >= now && end <= nextSevenDays;
          }).length,
          activeWarranties: remoteOps.openWarranties ?? warranties.filter((w) => ['Received', 'Processing', 'WaitingParts'].includes(w.trangThai || w.TrangThai || w.warrantyStatus)).length,
          pendingPurchases: remoteOps.pendingPurchases ?? 0,
          openRepairs: remoteOps.openRepairs ?? 0,
          openCrmTasks: remoteOps.openCrmTasks ?? 0,
          customerReceivable: remoteOps.customerReceivable ?? 0,
          supplierPayable: remoteOps.supplierPayable ?? 0,
          todayRevenue: remoteOps.todayRevenue ?? 0,
          paidTotal: remoteOps.paidTotal ?? 0,
          refundedTotal: remoteOps.refundedTotal ?? 0,
        });
      } catch (err) {
        setError('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const getOrderCode = (order) => order.maDonHangKinhDoanh || order.maDonHang || order.orderCode || order.code || order.id || 'N/A';
  const getOrderId = (order) => order.maDonHang || order.id;
  const getCustomerName = (order) => order.hoTenNhanHang || order.tenKhachHang || order.customerName || order.userName || 'Khách hàng';
  const getOrderAmount = (order) => order.tongThanhToan ?? order.tongTien ?? order.totalAmount ?? order.grandTotal ?? order.amount ?? 0;
  const getOrderStatus = (order) => reportService.getOrderStatusLabel(order);

  return (
    <div className="min-h-[calc(100vh-57px-38px)] bg-[#f4f6f9]">
      <div className="px-2 py-[15px]">
        <h1 className="m-0 text-3xl font-normal">Tổng quan</h1>
      </div>

      <section className="px-2 pb-4">
        <div className="w-full">
          {error && <div className="mb-4 rounded border border-[#f5c6cb] bg-[#f8d7da] px-5 py-3 text-[#721c24]">{error}</div>}

          {loading ? (
            <div className="py-5 text-center text-primary">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" role="status">
                <span className="sr-only absolute h-px w-px overflow-hidden whitespace-nowrap">Đang tải...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="-mx-[7.5px] flex flex-wrap">
                <StatCard
                  color="info"
                  icon="fas fa-motorcycle"
                  label="Tổng sản phẩm"
                  value={data.stats.productCount}
                  to="/motorcycles"
                />
                <StatCard
                  color="success"
                  icon="fas fa-shopping-cart"
                  label="Tổng đơn hàng"
                  value={data.stats.orderCount}
                  to="/orders"
                />
                {isAdmin() && (
                <StatCard
                  color="warning"
                  icon="fas fa-users"
                  label="Tài khoản"
                  value={data.stats.userCount}
                  to="/users"
                />
                )}
                <StatCard
                  color="danger"
                  icon="fas fa-chart-line"
                  label="Doanh thu tháng"
                  value={formatCurrency(data.stats.monthRevenue)}
                  to="/reports"
                />
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <StatCard color="primary" icon="fas fa-clipboard-check" label="Đơn cần xử lý" value={operations.awaitingOrders} to="/orders" />
                <StatCard color="warning" icon="fas fa-money-bill-wave" label="Chưa thanh toán" value={operations.unpaidOrders} to="/orders" />
                <StatCard color="info" icon="fas fa-truck" label="Đang giao/chuẩn bị" value={operations.shippingOrders} to="/orders" />
                <StatCard color="danger" icon="fas fa-box-open" label="Hết hàng" value={operations.outOfStock} to="/inventory" />
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <StatCard color="warning" icon="fas fa-exclamation-triangle" label="Sắp hết hàng" value={operations.lowStock} to="/inventory" />
                <StatCard color="secondary" icon="fas fa-truck-loading" label="Đơn mua đang xử lý" value={operations.pendingPurchases} to="/supply" />
                <StatCard color="success" icon="fas fa-ticket-alt" label="Voucher sắp hết hạn" value={operations.expiringVouchers} to="/vouchers" />
                <StatCard color="info" icon="fas fa-tools" label="Bảo hành đang xử lý" value={operations.activeWarranties} to="/warranties" />
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <StatCard color="success" icon="fas fa-calendar-day" label="Doanh thu hôm nay" value={formatCurrency(operations.todayRevenue || 0)} to="/reports" />
                <StatCard color="danger" icon="fas fa-hand-holding-usd" label="Còn phải thu" value={formatCurrency(operations.customerReceivable || 0)} to="/reports" />
                <StatCard color="warning" icon="fas fa-file-invoice-dollar" label="Cần trả NCC" value={formatCurrency(operations.supplierPayable || 0)} to="/supply" />
                <StatCard color="primary" icon="fas fa-phone-volume" label="CSKH cần xử lý" value={operations.openCrmTasks || 0} to="/service-crm" />
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <div className="w-full px-[7.5px] lg:w-2/3">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>Doanh thu 7 ngày gần nhất</h3>
                    </div>
                    <div className={cardBodyClass}>
                      <RevenueChart data={data.revenueSeries} />
                    </div>
                  </div>
                </div>

                <div className="w-full px-[7.5px] lg:w-1/3">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>Đơn hàng theo trạng thái</h3>
                    </div>
                    <div className={cardBodyClass}>
                      {data.orderStatusSeries.length > 0 ? (
                        <OrderStatusChart data={data.orderStatusSeries} />
                      ) : (
                        <div className="py-5 text-center text-[#6c757d]">
                          <i className="fas fa-chart-pie fa-3x mb-3"></i>
                          <p>Chưa có dữ liệu đơn hàng.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <div className="w-full px-[7.5px] lg:w-7/12">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>Đơn hàng mới nhất</h3>
                      <div className="ml-auto">
                        <Link to="/orders" className="inline-flex items-center justify-center rounded border border-transparent px-3 py-1.5 text-primary hover:text-[#0056b3]" title="Xem tất cả">
                          <i className="fas fa-external-link-alt"></i>
                        </Link>
                      </div>
                    </div>
                    <div className="block w-full overflow-x-auto">
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={cn(thClass, 'text-center')}>Mã đơn</th>
                            <th className={cn(thClass, 'text-left')}>Khách hàng</th>
                            <th className={cn(thClass, 'text-right')}>Tổng tiền</th>
                            <th className={cn(thClass, 'text-center')}>Trạng thái</th>
                            <th className={cn(thClass, 'text-center')}>Ngày tạo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentOrders.length === 0 ? (
                            <tr>
                              <td colSpan="5" className={emptyCellClass}>
                                Chưa có đơn hàng mới.
                              </td>
                            </tr>
                          ) : (
                            data.recentOrders.map((order) => (
                              <tr key={getOrderCode(order)} className="odd:bg-black/[0.025] hover:bg-black/[0.055]">
                                <td className={cn(tdClass, 'text-center')}>
                                  <Link to={`/orders/${getOrderId(order)}`}>
                                    <strong>{getOrderCode(order)}</strong>
                                  </Link>
                                </td>
                                <td className={tdClass}>{getCustomerName(order)}</td>
                                <td className={cn(tdClass, 'text-right')}>{formatCurrency(getOrderAmount(order))}</td>
                                <td className={cn(tdClass, 'text-center')}><span className={badgeClass('info')}>{getOrderStatus(order)}</span></td>
                                <td className={cn(tdClass, 'text-center')}>{formatDate(order.ngayTao || order.createdAt || order.placedAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="w-full px-[7.5px] lg:w-5/12">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>Top sản phẩm bán chạy</h3>
                    </div>
                    <div className="block w-full overflow-x-auto">
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={cn(thClass, 'text-left')}>Sản phẩm</th>
                            <th className={cn(thClass, 'text-right')}>Đã bán</th>
                            <th className={cn(thClass, 'text-right')}>Doanh thu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topProducts.length === 0 ? (
                            <tr>
                              <td colSpan="3" className={emptyCellClass}>
                                Chưa có dữ liệu bán chạy.
                              </td>
                            </tr>
                          ) : (
                            data.topProducts.map((product) => (
                              <tr key={product.id || product.name} className="odd:bg-black/[0.025] hover:bg-black/[0.055]">
                                <td className={tdClass}>{product.name}</td>
                                <td className={cn(tdClass, 'text-right')}>{product.sold}</td>
                                <td className={cn(tdClass, 'text-right')}>{formatCurrency(product.revenue)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="-mx-[7.5px] flex flex-wrap">
                <div className="w-full px-[7.5px] lg:w-7/12">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>Cảnh báo tồn kho</h3>
                      <div className="ml-auto">
                        <Link to="/inventory" className="inline-flex items-center justify-center rounded border border-transparent px-3 py-1.5 text-primary hover:text-[#0056b3]" title="Xem tồn kho"><i className="fas fa-external-link-alt"></i></Link>
                      </div>
                    </div>
                    <div className="block w-full overflow-x-auto">
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={thClass}>SKU</th>
                            <th className={thClass}>Sản phẩm</th>
                            <th className={cn(thClass, 'text-right')}>Khả dụng</th>
                            <th className={cn(thClass, 'text-center')}>Cảnh báo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.inventoryWarnings || []).length === 0 ? (
                            <tr><td colSpan="4" className={emptyCellClass}>Không có cảnh báo tồn kho.</td></tr>
                          ) : data.inventoryWarnings.map((item) => (
                            <tr key={item.skuId} className="odd:bg-black/[0.025] hover:bg-black/[0.055]">
                              <td className={tdClass}>{item.skuCode}</td>
                              <td className={tdClass}>{item.productName}</td>
                              <td className={cn(tdClass, 'text-right')}>{item.available}</td>
                              <td className={cn(tdClass, 'text-center')}><span className={badgeClass(item.available <= 0 ? 'danger' : 'warning')}>{item.warningStatus}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="w-full px-[7.5px] lg:w-5/12">
                  <div className={cardClass}>
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>CSKH cần xử lý</h3>
                      <div className="ml-auto">
                        <Link to="/service-crm" className="inline-flex items-center justify-center rounded border border-transparent px-3 py-1.5 text-primary hover:text-[#0056b3]" title="Xem CSKH"><i className="fas fa-external-link-alt"></i></Link>
                      </div>
                    </div>
                    <div className="block w-full overflow-x-auto">
                      <table className={tableClass}>
                        <thead>
                          <tr>
                            <th className={thClass}>Khách hàng</th>
                            <th className={thClass}>Nội dung</th>
                            <th className={thClass}>Hẹn xử lý</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.crmTasks || []).length === 0 ? (
                            <tr><td colSpan="3" className={emptyCellClass}>Không có lịch CSKH mở.</td></tr>
                          ) : data.crmTasks.slice(0, 8).map((task) => (
                            <tr key={task.id} className="odd:bg-black/[0.025] hover:bg-black/[0.055]">
                              <td className={tdClass}>{task.customerName}</td>
                              <td className={tdClass}>{task.subject}</td>
                              <td className={tdClass}><span className={task.isOverdue ? 'font-bold text-danger' : ''}>{formatDate(task.followUpAt)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
