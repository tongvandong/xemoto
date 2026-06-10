export const CART_CHANGED_EVENT = 'basecore:cart-changed';

export function notifyCartChanged(cart = null) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { cart } }));
}
