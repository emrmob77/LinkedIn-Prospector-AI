// ============================================
// LinkedIn Prospector AI - Chrome Storage Yardimcilari
// ============================================

var ProspectorStorage = (function () {
  'use strict';

  // Storage key sabitleri
  var KEYS = {
    AUTH_TOKEN: 'authToken',
    API_BASE_URL: 'apiBaseUrl',
    USER_INFO: 'userInfo',
    SETTINGS: 'settings',
    LAST_SCAN: 'lastScan',
  };

  // ---- Genel Okuma ----
  async function get(key) {
    try {
      var data = await chrome.storage.local.get(key);
      return data[key] || null;
    } catch (err) {
      console.warn('[ProspectorStorage] Okuma hatasi:', key, err.message);
      return null;
    }
  }

  // ---- Genel Yazma ----
  async function set(key, value) {
    try {
      var obj = {};
      obj[key] = value;
      await chrome.storage.local.set(obj);
      return true;
    } catch (err) {
      console.warn('[ProspectorStorage] Yazma hatasi:', key, err.message);
      return false;
    }
  }

  // ---- Genel Silme ----
  async function remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (err) {
      console.warn('[ProspectorStorage] Silme hatasi:', key, err.message);
      return false;
    }
  }

  // ---- Auth Token Islemleri ----
  function getToken() {
    return get(KEYS.AUTH_TOKEN);
  }

  function setToken(token) {
    return set(KEYS.AUTH_TOKEN, token);
  }

  function removeToken() {
    return remove(KEYS.AUTH_TOKEN);
  }

  // ---- Kullanici Oturumu Kontrolu ----
  async function isAuthenticated() {
    var token = await getToken();
    return !!token;
  }

  // ---- Kullanici Bilgisi ----
  function getUserInfo() {
    return get(KEYS.USER_INFO);
  }

  function setUserInfo(info) {
    return set(KEYS.USER_INFO, info);
  }

  // ---- Ayarlar ----
  async function getSettings() {
    var settings = await get(KEYS.SETTINGS);
    // Varsayilan ayarlarla birlestir
    return Object.assign(
      {
        autoScan: false,
        notificationsEnabled: true,
      },
      settings || {}
    );
  }

  function setSettings(settings) {
    return set(KEYS.SETTINGS, settings);
  }

  // ---- Son Tarama Bilgisi ----
  function getLastScan() {
    return get(KEYS.LAST_SCAN);
  }

  function setLastScan(scanInfo) {
    return set(KEYS.LAST_SCAN, Object.assign({}, scanInfo, { timestamp: Date.now() }));
  }

  // ---- Tum Verileri Temizle ----
  async function clearAll() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (err) {
      console.warn('[ProspectorStorage] Temizleme hatasi:', err.message);
      return false;
    }
  }

  // ---- Public API ----
  return {
    KEYS: KEYS,
    get: get,
    set: set,
    remove: remove,
    getToken: getToken,
    setToken: setToken,
    removeToken: removeToken,
    isAuthenticated: isAuthenticated,
    getUserInfo: getUserInfo,
    setUserInfo: setUserInfo,
    getSettings: getSettings,
    setSettings: setSettings,
    getLastScan: getLastScan,
    setLastScan: setLastScan,
    clearAll: clearAll,
  };
})();
