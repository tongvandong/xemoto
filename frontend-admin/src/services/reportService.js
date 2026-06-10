import api from './api';
import { getOrderStatusMeta } from '../utils/constants';

const getOrderStatus = (order) =>
  order?.trangThaiDonHang || order?.TrangThaiDonHang || order?.trangThai || order?.status || order?.orderStatus || '';

// Báo cáo lấy hoàn toàn từ backend (/reports*). Backend tổng hợp doanh thu, lãi gộp,
// mua hàng, thu chi, công nợ, dịch vụ, tồn kho... nên FE không tự quét/khử trùng dữ liệu.
const normalizeRemoteReport = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const stats = data.stats || data.Stats || {};
  const orders = data.orders || data.Orders || [];

  return {
    products: data.products || data.Products || [],
    orders,
    payments: data.payments || data.Payments || [],
    users: data.users || data.Users || [],
    stats: {
      productCount: stats.productCount ?? stats.ProductCount ?? 0,
      orderCount: stats.orderCount ?? stats.OrderCount ?? orders.length,
      monthRevenue: stats.monthRevenue ?? stats.MonthRevenue ?? 0,
      revenueOrderCount: stats.revenueOrderCount ?? stats.RevenueOrderCount ?? 0,
      userCount: stats.userCount ?? stats.UserCount ?? 0,
      cogs: stats.cogs ?? stats.Cogs ?? 0,
      grossProfit: stats.grossProfit ?? stats.GrossProfit ?? 0,
    },
    revenueSeries: data.revenueSeries || data.RevenueSeries || [],
    orderStatusSeries: data.orderStatusSeries || data.OrderStatusSeries || [],
    topProducts: data.topProducts || data.TopProducts || [],
    recentOrders: data.recentOrders || data.RecentOrders || [],
    operations: data.operations || data.Operations || {},
    inventoryWarnings: data.inventoryWarnings || data.InventoryWarnings || [],
    purchaseReports: data.purchaseReports || data.PurchaseReports || [],
    cashReports: data.cashReports || data.CashReports || [],
    serviceReports: data.serviceReports || data.ServiceReports || { repairs: [], warranties: [] },
    receivableReports: data.receivableReports || data.ReceivableReports || [],
    crmTasks: data.crmTasks || data.CrmTasks || [],
  };
};

const reportService = {
  getSummary: async () => normalizeRemoteReport(await api.get('/reports/summary')),
  getDashboard: async () => normalizeRemoteReport(await api.get('/reports/dashboard')),
  getReports: async ({ startDate, endDate }) =>
    normalizeRemoteReport(await api.get('/reports', { params: { startDate, endDate, top: 10 } })),
  getOrderStatusLabel: (order) => getOrderStatusMeta(getOrderStatus(order)).label,
};

export default reportService;
