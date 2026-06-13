import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { FavoriteProvider } from './contexts/FavoriteContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MainLayout from './components/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';

// Tách mã theo route: trang chủ nạp ngay (trang đích), các trang còn lại nạp khi điều hướng tới
// để giảm kích thước bundle tải lần đầu. Tất cả page đều export default nên dùng React.lazy trực tiếp.
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const ProductListPage = lazy(() => import('./pages/ProductListPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const FaqPage = lazy(() => import('./pages/FaqPage.jsx'));
const VouchersPage = lazy(() => import('./pages/VouchersPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const InstallmentPage = lazy(() => import('./pages/InstallmentPage.jsx'));

const authPaths = ['/login', '/register', '/forgot-password'];

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[#d71920]" />
    </div>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AuthPage({ path }) {
  if (path === '/login') return <LoginPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  return <RegisterPage />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/vouchers" element={<VouchersPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/tra-gop" element={<InstallmentPage />} />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/success"
          element={
            <ProtectedRoute>
              <CheckoutSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        {authPaths.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <PublicRoute>
                <AuthPage path={path} />
              </PublicRoute>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <NotificationProvider>
          <FavoriteProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </FavoriteProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
