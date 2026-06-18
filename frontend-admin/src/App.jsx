import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Code-splitting: tách các route ngoài Dashboard ra khỏi bundle khởi động.
const ProductList = lazy(() => import('./pages/products/ProductList'));
const CategoryList = lazy(() => import('./pages/categories/CategoryList'));
const BrandList = lazy(() => import('./pages/brands/BrandList'));
const ManufacturerList = lazy(() => import('./pages/manufacturers/ManufacturerList'));
const OrderList = lazy(() => import('./pages/orders/OrderList'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const PosOrder = lazy(() => import('./pages/orders/PosOrder'));
const VoucherList = lazy(() => import('./pages/vouchers/VoucherList'));
const InventoryView = lazy(() => import('./pages/inventory/InventoryView'));
const StockDocumentList = lazy(() => import('./pages/inventory/StockDocumentList'));
const UserList = lazy(() => import('./pages/users/UserList'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const HomeBannerList = lazy(() => import('./pages/content/HomeBannerList'));
const FaqList = lazy(() => import('./pages/faq/FaqList'));
const ContactList = lazy(() => import('./pages/contacts/ContactList'));
const ReviewList = lazy(() => import('./pages/reviews/ReviewList'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AuditLogList = lazy(() => import('./pages/audit/AuditLogList'));
const WarrantyList = lazy(() => import('./pages/warranties/WarrantyList'));
const OperationsSettings = lazy(() => import('./pages/settings/OperationsSettings'));
const ReturnsRefunds = lazy(() => import('./pages/operations/ReturnsRefunds'));
const BusinessOperations = lazy(() => import('./pages/operations/BusinessOperations'));
const InstallmentApplications = lazy(() => import('./pages/installments/InstallmentApplications'));

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" role="status">
      <span className="sr-only absolute h-px w-px overflow-hidden whitespace-nowrap">Đang tải...</span>
    </div>
  </div>
);

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" role="status">
          <span className="sr-only absolute h-px w-px overflow-hidden whitespace-nowrap">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Dashboard */}
      <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />

      {/* Catalog */}
      <Route path="/products" element={<Navigate to="/motorcycles" replace />} />
      <Route path="/motorcycles" element={<ProtectedRoute><MainLayout><ProductList productType="XeMay" /></MainLayout></ProtectedRoute>} />
      <Route path="/parts" element={<ProtectedRoute><MainLayout><ProductList productType="PhuTung" /></MainLayout></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><MainLayout><CategoryList /></MainLayout></ProtectedRoute>} />
      <Route path="/brands" element={<ProtectedRoute><MainLayout><BrandList /></MainLayout></ProtectedRoute>} />
      <Route path="/manufacturers" element={<ProtectedRoute><MainLayout><ManufacturerList /></MainLayout></ProtectedRoute>} />

      {/* Orders & Payments */}
      <Route path="/orders" element={<ProtectedRoute><MainLayout><OrderList /></MainLayout></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><MainLayout><PosOrder /></MainLayout></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><MainLayout><OrderDetail /></MainLayout></ProtectedRoute>} />
      <Route path="/vouchers" element={<ProtectedRoute><MainLayout><VoucherList /></MainLayout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><MainLayout><InventoryView /></MainLayout></ProtectedRoute>} />
      <Route path="/stock-documents" element={<ProtectedRoute><MainLayout><StockDocumentList /></MainLayout></ProtectedRoute>} />

      {/* Users & Customers */}
      <Route path="/users" element={<ProtectedRoute roles={['Admin']}><MainLayout><UserList /></MainLayout></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><MainLayout><CustomerList /></MainLayout></ProtectedRoute>} />
      <Route path="/warranties" element={<ProtectedRoute><MainLayout><WarrantyList /></MainLayout></ProtectedRoute>} />

      {/* Content & Customer Care */}
      <Route path="/home-banners" element={<ProtectedRoute><MainLayout><HomeBannerList /></MainLayout></ProtectedRoute>} />
      <Route path="/faq" element={<ProtectedRoute><MainLayout><FaqList /></MainLayout></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><MainLayout><ContactList /></MainLayout></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><MainLayout><ReviewList /></MainLayout></ProtectedRoute>} />
      <Route path="/posts" element={<Navigate to="/" replace />} />

      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><MainLayout><ReportsPage /></MainLayout></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute roles={['Admin']}><MainLayout><AuditLogList /></MainLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><MainLayout><OperationsSettings /></MainLayout></ProtectedRoute>} />
      <Route path="/returns" element={<ProtectedRoute><MainLayout><ReturnsRefunds /></MainLayout></ProtectedRoute>} />
      <Route path="/advanced-operations" element={<Navigate to="/returns" replace />} />
      <Route path="/supply" element={<ProtectedRoute><MainLayout><BusinessOperations section="supply" /></MainLayout></ProtectedRoute>} />
      <Route path="/installments" element={<ProtectedRoute><MainLayout><InstallmentApplications /></MainLayout></ProtectedRoute>} />
      <Route path="/service-crm" element={<Navigate to="/customers" replace />} />
      <Route path="/finance" element={<ProtectedRoute roles={['Admin']}><MainLayout><BusinessOperations section="finance" /></MainLayout></ProtectedRoute>} />
      <Route path="/business-operations" element={<Navigate to="/supply" replace />} />
      <Route path="/operational-imports" element={<Navigate to="/" replace />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
