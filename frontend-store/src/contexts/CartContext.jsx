import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { CART_CHANGED_EVENT } from '../utils/cartEvents.js';

const emptyCart = { items: [], totalItems: 0, subtotal: 0 };
const CartContext = createContext(null);

function getCartCount(cart) {
  return Number(cart?.totalItems ?? cart?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0);
}

function getItemStock(item) {
  const stock = item?.productVariant?.stockQuantity ?? item?.product?.stockQuantity;
  return stock === undefined || stock === null ? null : Number(stock);
}

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  function applyCart(nextCart) {
    const resolvedCart = nextCart || emptyCart;
    setCart(resolvedCart);
    setCount(getCartCount(resolvedCart));
    return resolvedCart;
  }

  function resetCart() {
    applyCart(emptyCart);
  }

  async function refreshCart() {
    if (!isAuthenticated) {
      resetCart();
      return emptyCart;
    }

    setLoading(true);
    try {
      const nextCart = await cartApi.getCart();
      return applyCart(nextCart);
    } catch (error) {
      if (error.response?.status === 401) {
        resetCart();
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function addItem(payload) {
    const nextCart = await cartApi.addItem(payload);
    return applyCart(nextCart);
  }

  async function updateItem(itemId, quantity) {
    const currentItem = cart?.items?.find((item) => String(item.id) === String(itemId));
    const stock = getItemStock(currentItem);

    if (stock !== null && Number(quantity) > stock) {
      throw new Error(`Số lượng vượt quá tồn kho hiện có (${stock})`);
    }

    const nextCart = await cartApi.updateItem(itemId, quantity);
    return applyCart(nextCart);
  }

  async function removeItem(itemId) {
    const nextCart = await cartApi.removeItem(itemId);
    return applyCart(nextCart);
  }

  async function clearCart() {
    const nextCart = await cartApi.clearCart();
    return applyCart(nextCart);
  }

  useEffect(() => {
    refreshCart().catch(() => resetCart());
  }, [isAuthenticated]);

  useEffect(() => {
    function handleCartChanged(event) {
      if (event.detail?.cart) {
        applyCart(event.detail.cart);
      }
    }

    function handleStorage(event) {
      if (!event.key || event.key === 'token' || event.key === 'user') {
        refreshCart().catch(() => resetCart());
      }
    }

    window.addEventListener(CART_CHANGED_EVENT, handleCartChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, handleCartChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      cart,
      count,
      loading,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      resetCart,
    }),
    [cart, count, loading],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}
