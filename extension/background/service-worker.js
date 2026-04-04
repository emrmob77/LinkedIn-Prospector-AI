// ============================================
// LinkedIn Prospector AI - Background Service Worker
// Manifest V3 - IIFE Pattern
// ============================================

(function () {
  'use strict';

  // ---- Sabitler ----
  var DEFAULT_BASE_URL = 'https://linked-in-prospector-ai.vercel.app';
  var REQUEST_TIMEOUT = 30000; // 30 saniye
  var RETRY_MAX = 2; // Maksimum tekrar deneme sayisi
  var RETRY_DELAY = 1000; // Tekrar deneme bekleme suresi (ms)

  // LinkedIn sayfa tipi tespiti icin URL desenleri
  var PAGE_TYPE_PATTERNS = [
    { pattern: /\/search\/results\//, type: 'search_results', badge: 'S' },
    { pattern: /\/company\/[^/]+/, type: 'company_posts', badge: 'C' },
    { pattern: /\/in\/[^/]+/, type: 'user_activity', badge: 'U' },
    { pattern: /\/feed/, type: 'feed', badge: 'F' },
  ];

  // ============================================
  // STORAGE YARDIMCILARI
  // Service worker'da utils/storage.js erisimi yok,
  // bu yuzden gerekli storage islemlerini burada tanimliyoruz
  // ============================================

  // Storage'dan deger oku
  async function storageGet(key) {
    try {
      var data = await chrome.storage.local.get(key);
      return data[key] || null;
    } catch (err) {
      console.warn('[ServiceWorker] Storage okuma hatasi:', key, err.message);
      return null;
    }
  }

  // Storage'a deger yaz
  async function storageSet(key, value) {
    try {
      var obj = {};
      obj[key] = value;
      await chrome.storage.local.set(obj);
      return true;
    } catch (err) {
      console.warn('[ServiceWorker] Storage yazma hatasi:', key, err.message);
      return false;
    }
  }

  // ============================================
  // API ILETISIM KATMANI
  // Retry logic, timeout ve hata yonetimi
  // ============================================

  // API base URL'i storage'dan al, yoksa varsayilani kullan
  async function getBaseUrl() {
    var url = await storageGet('apiBaseUrl');
    return url || DEFAULT_BASE_URL;
  }

  // Auth token'i storage'dan al
  async function getAuthToken() {
    return await storageGet('authToken');
  }

  // Supabase Auth sabitleri (token refresh icin)
  var SUPABASE_URL = 'https://fmsqbgktiavuvvstevqt.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc3FiZ2t0aWF2dXZ2c3RldnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTE3NDAsImV4cCI6MjA5MDQ2Nzc0MH0.hCpjrdGtwQX-OfOb1Q4k-cWJAbOt3nEoyflXxUvwDbA';

  // Token yenileme fonksiyonu
  async function refreshAuthToken() {
    try {
      var data = await storageGet('refreshToken');
      if (!data) return false;

      var response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: data }),
      });

      if (!response.ok) return false;

      var result = await response.json();
      await storageSet('authToken', result.access_token);
      await storageSet('refreshToken', result.refresh_token);
      return true;
    } catch (err) {
      console.warn('[ServiceWorker] Token yenileme hatasi:', err.message);
      return false;
    }
  }

  // Tek bir HTTP istegi gonder (retry yok)
  async function fetchOnce(method, path, body, token) {
    var baseUrl = await getBaseUrl();
    var url = baseUrl + path;

    var headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    var options = {
      method: method,
      headers: headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    var response = await fetch(url, options);
    return response;
  }

  // HTTP istegi gonder - retry destekli
  // Sadece network hatalari ve 5xx durum kodlarinda tekrar dener
  async function apiRequest(method, path, body) {
    var token = await getAuthToken();
    var lastError = null;

    for (var attempt = 0; attempt <= RETRY_MAX; attempt++) {
      try {
        var response = await fetchOnce(method, path, body, token);

        // 401 hatasi: token refresh dene, basariliysa istegi tekrar dene
        if (response.status === 401 && attempt === 0) {
          var refreshed = await refreshAuthToken();
          if (refreshed) {
            // Yeni token ile tekrar dene
            token = await getAuthToken();
            continue;
          }
          // Refresh basarisizsa popup'a AUTH_REQUIRED mesaji gonder
          try {
            chrome.runtime.sendMessage({ action: 'AUTH_REQUIRED' });
          } catch (e) { /* popup kapali olabilir */ }
          return await handleErrorResponse(response);
        }

        // 4xx hatalari retry yapmadan direkt dondur (kullanici hatasi)
        if (response.status >= 400 && response.status < 500) {
          return await handleErrorResponse(response);
        }

        // 5xx hatalari: retry yapilabilir
        if (response.status >= 500) {
          var errorText = '';
          try { errorText = await response.text(); } catch (e) { /* bos */ }
          lastError = new Error('Sunucu hatasi (' + response.status + '): ' + errorText);

          // Son deneme degilse bekle ve tekrar dene
          if (attempt < RETRY_MAX) {
            await sleep(RETRY_DELAY);
            continue;
          }
          // Son denemede de basarisizsa hatay dondur
          return { success: false, error: lastError.message, statusCode: response.status };
        }

        // Basarili yanit (2xx)
        if (response.status === 204) {
          return { success: true, data: {} };
        }
        var data = await response.json();
        return { success: true, data: data };

      } catch (err) {
        lastError = err;

        // Timeout veya network hatasi - retry yapilabilir
        if (attempt < RETRY_MAX) {
          await sleep(RETRY_DELAY);
          continue;
        }
      }
    }

    // Tum denemeler basarisiz
    return {
      success: false,
      error: lastError ? lastError.message : 'Bilinmeyen hata',
    };
  }

  // 4xx hatalarini ozel olarak isle
  async function handleErrorResponse(response) {
    var errorBody = '';
    try { errorBody = await response.text(); } catch (e) { /* bos */ }

    var errorMessages = {
      401: 'Oturum suresi dolmus. Lutfen tekrar giris yapin.',
      403: 'Bu islemi yapmaya yetkiniz yok.',
      404: 'Istenen kaynak bulunamadi.',
      429: 'Cok fazla istek gonderildi. Lutfen biraz bekleyin.',
      422: 'Gonderilen veriler gecersiz.',
    };

    var message = errorMessages[response.status] || 'API hatasi (' + response.status + '): ' + errorBody;

    return {
      success: false,
      error: message,
      statusCode: response.status,
    };
  }

  // Belirtilen sure kadar bekle
  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  // ============================================
  // SAYFA TIPI TESPIT
  // ============================================

  // URL'den LinkedIn sayfa tipini belirle
  function detectPageType(url) {
    if (!url || !url.includes('linkedin.com')) {
      return { type: 'unsupported', badge: '' };
    }

    for (var i = 0; i < PAGE_TYPE_PATTERNS.length; i++) {
      if (PAGE_TYPE_PATTERNS[i].pattern.test(url)) {
        return {
          type: PAGE_TYPE_PATTERNS[i].type,
          badge: PAGE_TYPE_PATTERNS[i].badge,
        };
      }
    }

    // LinkedIn sayfasi ama desteklenen turlerden degil
    return { type: 'unsupported', badge: '' };
  }

  // ============================================
  // MESAJ HANDLER'LARI
  // Her mesaj tipi icin ayri fonksiyon
  // ============================================

  // SCAN_POSTS: Aktif tab'daki content script'e mesaj gonder, postlari al
  async function handleScanPosts(message) {
    try {
      var tab = await getActiveLinkedInTab();
      if (!tab) {
        return { success: false, error: 'Aktif bir LinkedIn sekmesi bulunamadi.' };
      }

      // Content script'e mesaj gonder
      var response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_POSTS' });

      if (!response || !response.success) {
        var err = (response && response.error) || 'Content script yanitlamadi.';
        return { success: false, error: err };
      }

      var posts = response.posts || [];

      // Son tarama bilgisini kaydet
      await storageSet('lastScan', {
        pageUrl: tab.url,
        postCount: posts.length,
        timestamp: Date.now(),
      });

      return {
        success: true,
        posts: posts,
        pageUrl: tab.url,
        pageType: detectPageType(tab.url).type,
        postCount: posts.length,
      };

    } catch (err) {
      // Content script yuklenmemis olabilir
      if (err.message && err.message.includes('Receiving end does not exist')) {
        return {
          success: false,
          error: 'LinkedIn sayfasi henuz hazir degil. Sayfayi yenileyip tekrar deneyin.',
        };
      }
      return { success: false, error: err.message };
    }
  }

  // IMPORT_POSTS: Postlari API'ye gonder
  async function handleImportPosts(message) {
    var posts = message.posts;
    var pageUrl = message.pageUrl;
    var source = message.source;

    // Parametre dogrulama
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return { success: false, error: 'Gonderilecek post bulunamadi.' };
    }

    // Auth token kontrolu
    var token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Giris yapmaniz gerekiyor. Lutfen ayarlardan token girin.' };
    }

    // API'ye gonder
    var result = await apiRequest('POST', '/api/extension/import', {
      posts: posts,
      source: source || 'chrome_extension',
      pageUrl: pageUrl || '',
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        statusCode: result.statusCode || null,
      };
    }

    // Basarili import sonucu
    var data = result.data;
    return {
      success: true,
      importedCount: data.importedCount || posts.length,
      duplicateCount: data.duplicateCount || 0,
      leadCount: data.leadCount || 0,
      message: data.message || (data.importedCount || posts.length) + ' post basariyla aktarildi.',
    };
  }

  // GET_AUTH_TOKEN: Storage'dan auth token dondur
  async function handleGetAuthToken() {
    try {
      var token = await getAuthToken();
      var userInfo = await storageGet('userInfo');
      return {
        success: true,
        token: token,
        user: userInfo,
        isAuthenticated: !!token,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // SET_AUTH_TOKEN: Token'i kaydet ve baglantiyi test et
  async function handleSetAuthToken(message) {
    var token = message.token;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { success: false, error: 'Gecerli bir token girmelisiniz.' };
    }

    token = token.trim();

    // Token'i kaydet
    await storageSet('authToken', token);

    // Baglantiyi test et - token gecerli mi kontrol et
    var connectionResult = await handleCheckConnection();

    if (!connectionResult.success || !connectionResult.connected) {
      // Token gecersizse sil
      await storageSet('authToken', null);
      return {
        success: false,
        error: connectionResult.error || 'Token gecersiz veya sunucuya ulasilamiyor.',
      };
    }

    // Kullanici bilgisini kaydet (varsa)
    if (connectionResult.user) {
      await storageSet('userInfo', connectionResult.user);
    }

    return {
      success: true,
      message: 'Baglanti basarili.',
      user: connectionResult.user || null,
    };
  }

  // CHECK_CONNECTION: API saglik kontrolu ve token dogrulama
  async function handleCheckConnection() {
    var token = await getAuthToken();

    if (!token) {
      return {
        success: true,
        connected: false,
        error: 'Token ayarlanmamis.',
      };
    }

    try {
      // API health check - token ile kullanici bilgisini de al
      var result = await apiRequest('GET', '/api/extension/me');

      if (result.success) {
        return {
          success: true,
          connected: true,
          user: result.data.user || result.data.email || null,
        };
      }

      // /api/extension/me yoksa basit health check dene
      if (result.statusCode === 404) {
        var healthResult = await apiRequest('GET', '/api/health');
        return {
          success: true,
          connected: healthResult.success,
          user: null,
          error: healthResult.success ? null : 'Sunucuya ulasilamiyor.',
        };
      }

      return {
        success: true,
        connected: false,
        error: result.error,
      };

    } catch (err) {
      return {
        success: true,
        connected: false,
        error: 'Sunucuya ulasilamiyor: ' + err.message,
      };
    }
  }

  // GET_PAGE_TYPE: Aktif tab URL'sinden sayfa tipini belirle
  async function handleGetPageType() {
    try {
      var tab = await getActiveLinkedInTab();
      if (!tab) {
        return { success: true, pageType: 'unsupported', isLinkedIn: false };
      }

      var result = detectPageType(tab.url);
      return {
        success: true,
        pageType: result.type,
        badge: result.badge,
        url: tab.url,
        isLinkedIn: true,
        isSupported: result.type !== 'unsupported',
      };

    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ============================================
  // HANDLER MAP - Switch-case yerine obje map
  // ============================================

  var messageHandlers = {
    'SCAN_POSTS': handleScanPosts,
    'IMPORT_POSTS': handleImportPosts,
    'GET_AUTH_TOKEN': handleGetAuthToken,
    'SET_AUTH_TOKEN': handleSetAuthToken,
    'CHECK_CONNECTION': handleCheckConnection,
    'GET_PAGE_TYPE': handleGetPageType,
  };

  // ============================================
  // MESAJ DINLEYICISI
  // ============================================

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var action = message && message.action;

    if (!action) {
      sendResponse({ success: false, error: 'Mesajda action alani eksik.' });
      return false;
    }

    var handler = messageHandlers[action];

    if (!handler) {
      sendResponse({ success: false, error: 'Bilinmeyen aksiyon: ' + action });
      return false;
    }

    // Handler'i calistir ve sonucu gonder
    handler(message, sender)
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (err) {
        console.error('[ServiceWorker] Handler hatasi (' + action + '):', err);
        sendResponse({ success: false, error: 'Beklenmeyen hata: ' + err.message });
      });

    // Async yanit icin true dondur
    return true;
  });

  // ============================================
  // YARDIMCI FONKSIYONLAR
  // ============================================

  // Aktif LinkedIn tab'ini bul
  async function getActiveLinkedInTab() {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      return null;
    }
    var tab = tabs[0];
    if (!tab.url || !tab.url.includes('linkedin.com')) {
      return null;
    }
    return tab;
  }

  // ============================================
  // BADGE YONETIMI
  // Tab degistiginde veya LinkedIn sayfasi yuklendiginde
  // extension ikonunda sayfa tipi badge'i goster
  // ============================================

  // Badge'i guncelle
  function updateBadge(tabId, url) {
    if (!url) {
      clearBadge(tabId);
      return;
    }

    var pageInfo = detectPageType(url);

    if (pageInfo.type === 'unsupported' || !pageInfo.badge) {
      clearBadge(tabId);
      return;
    }

    // Badge metnini ve rengini ayarla
    chrome.action.setBadgeText({ text: pageInfo.badge, tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#0a66c2', tabId: tabId }); // LinkedIn mavisi
    chrome.action.setBadgeTextColor({ color: '#ffffff', tabId: tabId });
  }

  // Badge'i temizle
  function clearBadge(tabId) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }

  // Tab guncelleme dinleyicisi
  // Sayfa yuklendikten sonra badge'i guncelle
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Sadece URL degistiginde veya sayfa yukleme tamamlandiginda guncelle
    if (changeInfo.status === 'complete' && tab.url) {
      updateBadge(tabId, tab.url);
    }
  });

  // Aktif tab degistiginde badge'i guncelle
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
      if (chrome.runtime.lastError) {
        // Tab bilgisi alinamazsa sessizce atla
        return;
      }
      updateBadge(activeInfo.tabId, tab.url);
    });
  });

  // ============================================
  // EXTENSION YASAM DONGUSU
  // ============================================

  // Extension kurulum veya guncelleme
  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
      console.log('[LinkedIn Prospector AI] Extension yuklendi.');
      // Varsayilan ayarlari olustur
      storageSet('settings', {
        autoScan: false,
        notificationsEnabled: true,
      });
    } else if (details.reason === 'update') {
      var version = chrome.runtime.getManifest().version;
      console.log('[LinkedIn Prospector AI] Extension guncellendi: v' + version);
    }
  });

  console.log('[LinkedIn Prospector AI] Service worker baslatildi.');

})();
