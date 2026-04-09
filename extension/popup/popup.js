// ============================================
// LinkedIn Prospector AI - Popup Ana Modulu
// Tam is mantigi: auth, tarama, ice aktarma,
// baglanti kontrolu, bildirim, sayfa tipi
// ============================================

(function () {
  'use strict';

  // ---- Sabitler ----
  var ENVIRONMENTS = {
    production: 'https://linked-in-prospector-ai.vercel.app',
    local: 'http://localhost:3000'
  };
  var APP_URL = ENVIRONMENTS.production; // varsayilan, init'te guncellenir
  var TOAST_DURATION = 4000;

  // Supabase Auth sabitleri
  var SUPABASE_URL = 'https://fmsqbgktiavuvvstevqt.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc3FiZ2t0aWF2dXZ2c3RldnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTE3NDAsImV4cCI6MjA5MDQ2Nzc0MH0.hCpjrdGtwQX-OfOb1Q4k-cWJAbOt3nEoyflXxUvwDbA';

  // Sayfa tipi eslemeleri: { regex/test, label, badgeClass }
  var PAGE_TYPES = [
    { test: function (u) { return u.includes('/search/results/'); }, label: 'Arama Sonuclari', badge: 'badge-search' },
    { test: function (u) { return /\/company\/[^/]+/.test(u); }, label: 'Sirket Gonderileri', badge: 'badge-company' },
    { test: function (u) { return /\/in\/[^/]+/.test(u); }, label: 'Kullanici Profili', badge: 'badge-profile' },
    { test: function (u) { return u.includes('/feed'); }, label: 'Ana Sayfa Feed', badge: 'badge-feed' },
  ];

  // ---- DOM Referanslari ----
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    // Header
    connectionDot: $('connection-dot'),
    connectionText: $('connection-text'),
    // Auth
    authSection: $('auth-section'),
    loginEmail: $('login-email'),
    loginPassword: $('login-password'),
    loginError: $('login-error'),
    btnLogin: $('btn-login'),
    btnLoginText: $('btn-login-text'),
    loginSpinner: $('login-spinner'),
    // Ana bolum
    mainSection: $('main-section'),
    pageTypeBadge: $('page-type-badge'),
    btnLogout: $('btn-logout'),
    // Tarama
    btnScan: $('btn-scan'),
    btnScanText: $('btn-scan-text'),
    scanSpinner: $('scan-spinner'),
    // Postlar
    postsCard: $('posts-card'),
    postCount: $('post-count'),
    postList: $('post-list'),
    emptyState: $('empty-state'),
    // Ice aktarma
    btnImport: $('btn-import'),
    btnImportText: $('btn-import-text'),
    importSpinner: $('import-spinner'),
    progressContainer: $('progress-container'),
    progressFill: $('progress-fill'),
    progressText: $('progress-text'),
    // Footer
    lastScanTime: $('last-scan-time'),
    // Scan metrikleri
    scanMetrics: $('scan-metrics'),
    metricTotal: $('metric-total'),
    metricParsed: $('metric-parsed'),
    metricFailed: $('metric-failed'),
    metricConfidence: $('metric-confidence'),
    failDetails: $('fail-details'),
    btnToggleFails: $('btn-toggle-fails'),
    btnToggleFailsText: $('btn-toggle-fails-text'),
    failReasonsList: $('fail-reasons-list'),
    // Toast
    toast: $('toast'),
    toastIcon: $('toast-icon'),
    toastMessage: $('toast-message'),
  };

  // ---- Durum ----
  var state = {
    scannedPosts: [],
    isScanning: false,
    isImporting: false,
    isLoggingIn: false,
    currentPageUrl: '',
    currentPageType: null,
    toastTimer: null,
  };

  // ===========================================
  // BASLANGIC
  // ===========================================
  async function init() {
    // Paralel olarak auth kontrolu ve baglanti kontrolu yap
    var authOk = await checkAuth();

    if (!authOk) {
      // Token var ama gecersiz olabilir, refresh dene
      authOk = await refreshAuthToken();
    }

    checkConnection(); // async, sonucu beklemiyoruz

    if (authOk) {
      showMainSection();
      await updatePageInfo();
      await loadLastScan();
    } else {
      showAuthSection();
    }
  }

  // ===========================================
  // AUTH ISLEMLERI
  // ===========================================

  // Storage'dan token kontrol et
  async function checkAuth() {
    try {
      var data = await chrome.storage.local.get('authToken');
      return !!data.authToken;
    } catch (err) {
      console.warn('[Popup] Auth kontrol hatasi:', err.message);
      return false;
    }
  }

  // Email + password ile Supabase Auth login
  async function loginWithEmail(email, password) {
    var response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: email, password: password }),
    });

    if (!response.ok) {
      var data = await response.json();
      throw new Error(data.msg || data.error_description || data.message || 'Giris basarisiz');
    }

    var data = await response.json();
    // access_token'i kaydet
    await chrome.storage.local.set({
      authToken: data.access_token,
      refreshToken: data.refresh_token,
      userEmail: email,
    });
    return data;
  }

  // Token yenileme fonksiyonu
  async function refreshAuthToken() {
    try {
      var data = await chrome.storage.local.get('refreshToken');
      if (!data.refreshToken) return false;

      var response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: data.refreshToken }),
      });

      if (!response.ok) return false;

      var result = await response.json();
      await chrome.storage.local.set({
        authToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      return true;
    } catch (err) {
      console.warn('[Popup] Token yenileme hatasi:', err.message);
      return false;
    }
  }

  // Login butonuna tiklandiginda
  async function handleLoginSubmit() {
    if (state.isLoggingIn) return;

    var email = el.loginEmail.value.trim();
    var password = el.loginPassword.value;

    // Validasyon
    if (!email) {
      showLoginError('Lutfen e-posta adresinizi girin.');
      return;
    }
    if (!password) {
      showLoginError('Lutfen sifrenizi girin.');
      return;
    }

    state.isLoggingIn = true;
    setLoginLoading(true);
    hideLoginError();

    try {
      await loginWithEmail(email, password);
      showToast('Giris basarili!', 'success');
      showMainSection();
      await updatePageInfo();
      checkConnection();
    } catch (err) {
      showLoginError(err.message || 'Giris basarisiz. Lutfen bilgilerinizi kontrol edin.');
    } finally {
      state.isLoggingIn = false;
      setLoginLoading(false);
    }
  }

  // Login loading durumu
  function setLoginLoading(loading) {
    el.btnLogin.disabled = loading;
    el.btnLoginText.textContent = loading ? 'Giris yapiliyor...' : 'Giris Yap';
    if (loading) {
      el.loginSpinner.classList.remove('hidden');
    } else {
      el.loginSpinner.classList.add('hidden');
    }
  }

  // Login hata mesaji goster
  function showLoginError(message) {
    el.loginError.textContent = message;
    el.loginError.classList.remove('hidden');
  }

  // Login hata mesajini gizle
  function hideLoginError() {
    el.loginError.textContent = '';
    el.loginError.classList.add('hidden');
  }

  // Cikis yap (token sil)
  async function handleLogout() {
    try {
      await chrome.storage.local.remove(['authToken', 'refreshToken', 'userEmail']);
      state.scannedPosts = [];
      showAuthSection();
      showToast('Cikis yapildi.', 'info');
    } catch (err) {
      showToast('Cikis yapilamadi: ' + err.message, 'error');
    }
  }

  // UI: Auth bolumunu goster
  function showAuthSection() {
    el.authSection.classList.remove('hidden');
    el.mainSection.classList.add('hidden');
    // Formu temizle
    if (el.loginEmail) el.loginEmail.value = '';
    if (el.loginPassword) el.loginPassword.value = '';
    hideLoginError();
  }

  // UI: Ana bolumu goster
  function showMainSection() {
    el.authSection.classList.add('hidden');
    el.mainSection.classList.remove('hidden');
  }

  // ===========================================
  // BAGLANTI KONTROLU
  // ===========================================
  async function checkConnection() {
    updateConnectionStatus('checking');

    try {
      var response = await chrome.runtime.sendMessage({ action: 'CHECK_CONNECTION' });
      if (response && response.success && response.connected) {
        updateConnectionStatus('online');
      } else {
        updateConnectionStatus('offline');
      }
    } catch (err) {
      updateConnectionStatus('offline');
    }
  }

  // Baglanti durumu gostergesini guncelle
  function updateConnectionStatus(status) {
    // Tum siniflari kaldir
    el.connectionDot.classList.remove('connection-checking', 'connection-online', 'connection-offline');

    if (status === 'online') {
      el.connectionDot.classList.add('connection-online');
      el.connectionDot.title = 'Sunucuya bagli';
      el.connectionText.textContent = 'Sunucuya bagli';
    } else if (status === 'offline') {
      el.connectionDot.classList.add('connection-offline');
      el.connectionDot.title = 'Sunucuya ulasilamiyor';
      el.connectionText.textContent = 'Sunucuya ulasilamiyor';
    } else {
      el.connectionDot.classList.add('connection-checking');
      el.connectionDot.title = 'Baglanti kontrol ediliyor...';
      el.connectionText.textContent = 'Baglanti kontrol ediliyor...';
    }
  }

  // ===========================================
  // SAYFA TIPI TESPITI
  // ===========================================

  // Aktif tab bilgisini al
  async function getActiveTab() {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (err) {
      return null;
    }
  }

  // URL'den sayfa tipini tespit et
  function detectPageType(url) {
    if (!url || !url.includes('linkedin.com')) {
      return { label: 'Desteklenmeyen Sayfa', badge: 'badge-unsupported', supported: false };
    }

    for (var i = 0; i < PAGE_TYPES.length; i++) {
      if (PAGE_TYPES[i].test(url)) {
        return { label: PAGE_TYPES[i].label, badge: PAGE_TYPES[i].badge, supported: true };
      }
    }

    return { label: 'Desteklenmeyen Sayfa', badge: 'badge-unsupported', supported: false };
  }

  // Sayfa bilgisini guncelle
  async function updatePageInfo() {
    var tab = await getActiveTab();
    if (!tab || !tab.url) {
      setPageBadge('Sekme bulunamadi', 'badge-unknown', false);
      return;
    }

    state.currentPageUrl = tab.url;
    state.currentPageType = detectPageType(tab.url);
    setPageBadge(state.currentPageType.label, state.currentPageType.badge, state.currentPageType.supported);
  }

  // Badge UI'i ayarla
  function setPageBadge(label, badgeClass, supported) {
    // Onceki badge siniflarini temizle
    el.pageTypeBadge.className = 'badge';
    el.pageTypeBadge.classList.add(badgeClass);
    el.pageTypeBadge.textContent = label;

    // Desteklenmeyen sayfada tara butonu pasif
    el.btnScan.disabled = !supported;
  }

  // ===========================================
  // SAYFAYI TARA
  // ===========================================
  async function handleScan() {
    if (state.isScanning) return;

    state.isScanning = true;
    setScanLoading(true);

    try {
      var tab = await getActiveTab();
      if (!tab || !tab.id) {
        throw new Error('Aktif sekme bulunamadi.');
      }

      // Sayfa tipini kontrol et
      var pageType = detectPageType(tab.url);
      if (!pageType.supported) {
        throw new Error('Bu sayfa tipi desteklenmiyor.');
      }

      // Content script'e tarama mesaji gonder
      var response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_POSTS' });

      if (response && response.success) {
        state.scannedPosts = response.posts || [];
        renderPosts(state.scannedPosts);

        // Scan metriklerini goster
        displayScanMetrics(response.meta || null);

        // Son tarama bilgisini kaydet
        var scanInfo = {
          postCount: state.scannedPosts.length,
          pageUrl: tab.url,
          pageType: pageType.label,
          timestamp: Date.now(),
        };
        await chrome.storage.local.set({ lastScan: JSON.stringify(scanInfo) });
        updateLastScanDisplay(Date.now(), scanInfo.postCount);

        if (state.scannedPosts.length > 0) {
          showToast(state.scannedPosts.length + ' post bulundu!', 'success');
        } else {
          showToast('Bu sayfada post bulunamadi.', 'info');
        }
      } else {
        var errMsg = (response && response.error) ? response.error : 'Tarama yanitinda hata.';
        throw new Error(errMsg);
      }
    } catch (err) {
      // Content script yuklu degilse ozel mesaj
      var message = err.message;
      if (message.includes('Receiving end does not exist') || message.includes('Could not establish connection')) {
        message = 'LinkedIn sayfasini yeniden yukleyip tekrar deneyin.';
      }
      showToast('Tarama hatasi: ' + message, 'error');
    } finally {
      state.isScanning = false;
      setScanLoading(false);
    }
  }

  // Tara butonu loading durumu
  function setScanLoading(loading) {
    el.btnScan.disabled = loading;
    el.btnScanText.textContent = loading ? 'Taraniyor...' : 'Sayfayi Tara';
    if (loading) {
      el.scanSpinner.classList.remove('hidden');
    } else {
      el.scanSpinner.classList.add('hidden');
      // Sayfa desteklenmiyorsa buton pasif kalsin
      if (state.currentPageType && !state.currentPageType.supported) {
        el.btnScan.disabled = true;
      }
    }
  }

  // ===========================================
  // SCAN METRIKLERINI GOSTER
  // ===========================================
  function displayScanMetrics(meta) {
    if (!meta) {
      el.scanMetrics.style.display = 'none';
      el.failDetails.style.display = 'none';
      return;
    }

    // Metrikleri doldur
    el.metricTotal.textContent = meta.total || 0;
    el.metricParsed.textContent = meta.parsed || 0;
    el.metricFailed.textContent = meta.failed || 0;
    el.scanMetrics.style.display = 'flex';

    // Confidence gostergesi
    var conf = meta.avgAuthorNameConfidence || 0;
    var confEl = el.metricConfidence;
    if (conf >= 2.5) {
      confEl.textContent = '\u25CF Guvenilir';
      confEl.style.color = '#22c55e';
    } else if (conf >= 1.5) {
      confEl.textContent = '\u25CF Orta';
      confEl.style.color = '#eab308';
    } else {
      confEl.textContent = '\u25CF Dusuk';
      confEl.style.color = '#ef4444';
    }

    // Hatali post detaylari
    var failReasons = meta.failReasons || [];
    if (meta.failed > 0 && failReasons.length > 0) {
      el.failDetails.style.display = 'block';
      el.failReasonsList.innerHTML = '';
      el.failReasonsList.style.display = 'none';
      el.btnToggleFails.classList.remove('expanded');
      el.btnToggleFailsText.textContent = 'Hata detaylarini goster (' + failReasons.length + ')';

      // Hata nedenlerini grupla (ayni neden birden fazla olabilir)
      var reasonCounts = {};
      failReasons.forEach(function (reason) {
        var key = reason || 'Bilinmeyen hata';
        reasonCounts[key] = (reasonCounts[key] || 0) + 1;
      });

      Object.keys(reasonCounts).forEach(function (reason) {
        var li = document.createElement('li');
        li.className = 'fail-reason-item';
        var countText = reasonCounts[reason] > 1 ? ' (' + reasonCounts[reason] + 'x)' : '';
        li.textContent = reason + countText;
        el.failReasonsList.appendChild(li);
      });
    } else {
      el.failDetails.style.display = 'none';
    }
  }

  // ===========================================
  // POSTLARI RENDER ET
  // ===========================================
  function renderPosts(posts) {
    // Bos durum ile post kartini toggle et
    if (!posts || posts.length === 0) {
      el.postsCard.classList.add('hidden');
      el.emptyState.classList.remove('hidden');
      el.postCount.textContent = '0';
      return;
    }

    el.emptyState.classList.add('hidden');
    el.postsCard.classList.remove('hidden');
    el.postCount.textContent = posts.length.toString();
    el.postList.innerHTML = '';

    // Import butonunu aktif et
    el.btnImport.disabled = false;

    posts.forEach(function (post, index) {
      var div = document.createElement('div');
      div.className = 'post-item';

      // Yazar adinin bas harfleri
      var authorName = post.authorName || 'Bilinmeyen';
      var initials = getInitials(authorName);

      // Icerik on izlemesi (ilk 100 karakter)
      var content = post.content || '';
      var preview = content.substring(0, 100);
      if (content.length > 100) preview += '...';

      // Yazar unvani
      var authorTitle = post.authorTitle || '';

      // Istatistikler
      var likes = formatNumber(post.engagementLikes || post.likeCount || 0);
      var comments = formatNumber(post.engagementComments || post.commentCount || 0);
      var shares = formatNumber(post.engagementShares || post.shareCount || 0);

      // Hashtag'ler (varsa)
      var hashtagsHtml = '';
      if (post.hashtags && post.hashtags.length > 0) {
        var tags = post.hashtags.slice(0, 3); // Ilk 3 hashtag
        hashtagsHtml = '<div class="post-hashtags">';
        tags.forEach(function (tag) {
          hashtagsHtml += '<span class="post-hashtag">#' + escapeHtml(tag) + '</span>';
        });
        if (post.hashtags.length > 3) {
          hashtagsHtml += '<span class="post-hashtag-more">+' + (post.hashtags.length - 3) + '</span>';
        }
        hashtagsHtml += '</div>';
      }

      // Sirket bilgisi (varsa)
      var companyHtml = '';
      if (post.authorCompany) {
        companyHtml = '<div class="post-author-company">' + escapeHtml(post.authorCompany) + '</div>';
      }

      div.innerHTML =
        '<div class="post-author-row">' +
          '<div class="post-author-avatar">' + escapeHtml(initials) + '</div>' +
          '<span class="post-author-name">' + escapeHtml(authorName) + '</span>' +
        '</div>' +
        (authorTitle ? '<div class="post-author-title">' + escapeHtml(authorTitle) + '</div>' : '') +
        companyHtml +
        (preview ? '<div class="post-content-preview">' + escapeHtml(preview) + '</div>' : '') +
        hashtagsHtml +
        '<div class="post-stats-row">' +
          '<span class="post-stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-6 0v1"/><path d="M18 8h-5a2 2 0 0 0-2 2v6.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10a2 2 0 0 0-2-2z"/></svg>' +
            likes +
          '</span>' +
          '<span class="post-stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            comments +
          '</span>' +
          '<span class="post-stat">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
            shares +
          '</span>' +
        '</div>';

      el.postList.appendChild(div);
    });
  }

  // ===========================================
  // POSTLARI ICE AKTAR
  // ===========================================
  async function handleImport() {
    if (state.isImporting || state.scannedPosts.length === 0) return;

    state.isImporting = true;
    setImportLoading(true);
    showProgress(0, 'Postlar sunucuya gonderiliyor...');

    try {
      var tab = await getActiveTab();
      var pageUrl = (tab && tab.url) ? tab.url : '';
      var pageType = detectPageType(pageUrl);

      // Progress simulasyonu - gercek API cagrisini beklerken
      showProgress(20, 'Veriler hazirlaniyor...');

      // Background service worker'a mesaj gonder
      var response = await chrome.runtime.sendMessage({
        action: 'IMPORT_POSTS',
        posts: state.scannedPosts,
        pageUrl: pageUrl,
        source: 'chrome_extension',
      });

      showProgress(80, 'Sunucu yaniti isleniyor...');

      if (response && response.success) {
        var count = response.importedCount || state.scannedPosts.length;
        showProgress(100, 'Tamamlandi!');

        // Basarili mesaj ve temizlik
        showToast(count + ' post basariyla ice aktarildi!', 'success');
        state.scannedPosts = [];
        renderPosts([]);
        displayScanMetrics(null);

        // Son tarama bilgisini guncelle
        updateLastScanDisplay(Date.now(), count);
      } else {
        var errMsg = (response && response.error) ? response.error : 'Bilinmeyen bir hata olustu.';
        throw new Error(errMsg);
      }
    } catch (err) {
      showProgress(0, '');
      showToast('Aktarim hatasi: ' + err.message, 'error');
    } finally {
      state.isImporting = false;
      setImportLoading(false);

      // Progress'i 2 sn sonra gizle
      setTimeout(function () {
        el.progressContainer.classList.add('hidden');
      }, 2000);
    }
  }

  // Import butonu loading durumu
  function setImportLoading(loading) {
    el.btnImport.disabled = loading || state.scannedPosts.length === 0;
    el.btnImportText.textContent = loading ? 'Aktariliyor...' : 'Tumunu Ice Aktar';
    if (loading) {
      el.importSpinner.classList.remove('hidden');
    } else {
      el.importSpinner.classList.add('hidden');
    }
  }

  // Progress bar guncelle
  function showProgress(percent, text) {
    el.progressContainer.classList.remove('hidden');
    el.progressFill.style.width = percent + '%';
    el.progressText.textContent = text;
  }

  // ===========================================
  // SON TARAMA BILGISI
  // ===========================================
  async function loadLastScan() {
    try {
      var data = await chrome.storage.local.get('lastScan');
      if (data.lastScan) {
        var info = JSON.parse(data.lastScan);
        if (info.timestamp) {
          updateLastScanDisplay(info.timestamp, info.postCount);
        }
      }
    } catch (err) {
      // Sessizce atla
    }
  }

  function updateLastScanDisplay(timestamp, postCount) {
    var now = Date.now();
    // lastScan objesini de guncelle
    try {
      var scanData = JSON.stringify({ timestamp: timestamp, postCount: postCount });
      chrome.storage.local.set({ lastScan: scanData });
    } catch (e) {
      // Sessizce atla
    }

    var diffMs = now - timestamp;
    var diffMin = Math.floor(diffMs / 60000);
    var diffHour = Math.floor(diffMs / 3600000);

    var timeText;
    if (diffMin < 1) {
      timeText = 'az once';
    } else if (diffMin < 60) {
      timeText = diffMin + ' dk once';
    } else if (diffHour < 24) {
      timeText = diffHour + ' saat once';
    } else {
      var date = new Date(timestamp);
      timeText = date.toLocaleDateString('tr-TR');
    }

    el.lastScanTime.textContent = 'Son tarama: ' + timeText + (postCount != null ? ' (' + postCount + ' post)' : '');
  }

  // ===========================================
  // TOAST BILDIRIM
  // ===========================================
  function showToast(message, type) {
    // Onceki timer'i temizle
    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }

    // Ikon sec
    var icons = {
      success: '\u2713',  // checkmark
      error: '\u2717',    // cross
      info: '\u2139',     // info
    };

    // Tip sinifini ayarla
    el.toast.className = 'toast toast-' + (type || 'info');
    el.toastIcon.textContent = icons[type] || icons.info;
    el.toastMessage.textContent = message;

    // Goster
    // Kisa bir gecikme ile animasyonu tetikle
    requestAnimationFrame(function () {
      el.toast.classList.add('toast-visible');
    });

    // Otomatik gizle
    state.toastTimer = setTimeout(function () {
      el.toast.classList.remove('toast-visible');
    }, TOAST_DURATION);
  }

  // ===========================================
  // YARDIMCI FONKSIYONLAR
  // ===========================================

  // HTML escape - XSS onleme
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // Isim bas harflerini al
  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  // Sayi formatlama (1200 -> 1.2K)
  function formatNumber(num) {
    num = parseInt(num, 10) || 0;
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  }

  // ===========================================
  // EVENT LISTENER'LAR
  // ===========================================

  // Login butonu
  el.btnLogin.addEventListener('click', handleLoginSubmit);

  // Email input'ta Enter tusu ile password'a gecis
  el.loginEmail.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      el.loginPassword.focus();
    }
  });

  // Password input'ta Enter tusu ile login
  el.loginPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      handleLoginSubmit();
    }
  });

  // Cikis yap
  el.btnLogout.addEventListener('click', handleLogout);

  // Sayfayi tara
  el.btnScan.addEventListener('click', handleScan);

  // Postlari ice aktar
  el.btnImport.addEventListener('click', handleImport);

  // Hata detaylari toggle
  el.btnToggleFails.addEventListener('click', function () {
    var isExpanded = el.btnToggleFails.classList.contains('expanded');
    if (isExpanded) {
      el.btnToggleFails.classList.remove('expanded');
      el.failReasonsList.style.display = 'none';
      el.btnToggleFailsText.textContent = el.btnToggleFailsText.textContent.replace('Gizle', 'Goster');
    } else {
      el.btnToggleFails.classList.add('expanded');
      el.failReasonsList.style.display = 'flex';
      el.btnToggleFailsText.textContent = el.btnToggleFailsText.textContent.replace('Goster', 'Gizle');
    }
  });

  // Ayarlar linki (simdilik bos)
  $('btn-settings').addEventListener('click', function (e) {
    e.preventDefault();
    showToast('Ayarlar sayfasi henuz hazir degil.', 'info');
  });

  // ===========================================
  // BASLA
  // ===========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
