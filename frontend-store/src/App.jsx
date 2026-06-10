import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { FavoriteProvider } from './contexts/FavoriteContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MainLayout from './components/MainLayout.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import ProductListPage from './pages/ProductListPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StoreSystemPage from './pages/StoreSystemPage.jsx';
import VouchersPage from './pages/VouchersPage.jsx';
import InstallmentPage from './pages/InstallmentPage.jsx';

const authPaths = ['/login', '/register'];

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

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/he-thong-cua-hang" element={<StoreSystemPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/vouchers" element={<VouchersPage />} />
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
                {path === '/login' ? <LoginPage /> : <RegisterPage />}
              </PublicRoute>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
