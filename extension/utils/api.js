// ============================================
// LinkedIn Prospector AI - API Iletisim Yardimcilari
// ============================================

var ProspectorAPI = (function () {
  'use strict';

  // Varsayilan API ayarlari
  var DEFAULT_BASE_URL = 'https://linked-in-prospector-ai.vercel.app';
  var REQUEST_TIMEOUT = 30000; // 30 saniye

  // ---- API Base URL'i Al ----
  async function getBaseUrl() {
    try {
      var data = await chrome.storage.local.get('apiBaseUrl');
      return data.apiBaseUrl || DEFAULT_BASE_URL;
    } catch (e) {
      return DEFAULT_BASE_URL;
    }
  }

  // ---- Auth Header Olustur ----
  async function getAuthHeaders() {
    var headers = {
      'Content-Type': 'application/json',
    };

    try {
      var data = await chrome.storage.local.get('authToken');
      if (data.authToken) {
        headers['Authorization'] = 'Bearer ' + data.authToken;
      }
    } catch (e) {
      // Token alinamazsa headersiz devam et
    }

    return headers;
  }

  // ---- Genel Fetch Wrapper ----
  // Timeout, hata yonetimi ve auth header ekler
  async function request(method, path, body) {
    var baseUrl = await getBaseUrl();
    var headers = await getAuthHeaders();
    var url = baseUrl + path;

    var options = {
      method: method,
      headers: headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    var response = await fetch(url, options);

    if (!response.ok) {
      var errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        // Yanit okunamazsa sessizce atla
      }
      throw new Error('API Hatasi (' + response.status + '): ' + errorBody);
    }

    // 204 No Content icin bos obje donder
    if (response.status === 204) {
      return {};
    }

    return await response.json();
  }

  // ---- Kisayol Metodlari ----
  function get(path) {
    return request('GET', path);
  }

  function post(path, body) {
    return request('POST', path, body);
  }

  function put(path, body) {
    return request('PUT', path, body);
  }

  function del(path) {
    return request('DELETE', path);
  }

  // ---- Spesifik API Cagrilari ----

  // Postlari iceri aktar
  function importPosts(posts, searchRunId) {
    return post('/api/extension/import', {
      posts: posts,
      searchRunId: searchRunId || null,
    });
  }

  // Sunucu baglanti kontrolu
  async function healthCheck() {
    try {
      await get('/api/health');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---- Public API ----
  return {
    getBaseUrl: getBaseUrl,
    getAuthHeaders: getAuthHeaders,
    request: request,
    get: get,
    post: post,
    put: put,
    del: del,
    importPosts: importPosts,
    healthCheck: healthCheck,
  };
})();
