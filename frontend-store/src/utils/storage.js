function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export const storage = {
  get(key) {
    return canUseStorage() ? window.localStorage.getItem(key) : null;
  },

  set(key, value) {
    if (canUseStorage()) {
      window.localStorage.setItem(key, value);
    }
  },

  remove(key) {
    if (canUseStorage()) {
      window.localStorage.removeItem(key);
    }
  },

  getJson(key, fallback = null) {
    const raw = this.get(key);

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  setJson(key, value) {
    this.set(key, JSON.stringify(value));
  },
};
