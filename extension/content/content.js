// ============================================
// LinkedIn Prospector AI - Content Script
// LinkedIn sayfalarinda calisan ana script
// ============================================

(function () {
  'use strict';

  var LOG_PREFIX = '[LinkedIn Prospector AI]';

  // Mevcut sayfa durumu
  var state = {
    pageType: 'unknown',
    postCount: 0,
    isObserving: false,
    observer: null,
    lastScanTime: 0,
    // Yeni post tespit edildikten sonra scan arasinda minimum bekleme (ms)
    DEBOUNCE_MS: 1500,
  };

  // ---- Sayfa Tipini Belirle ----
  function detectPageType() {
    if (typeof LinkedInParser !== 'undefined') {
      return LinkedInParser.detectPageType(window.location.href);
    }
    // Fallback - parser yuklenmediyse basit kontrol
    var url = window.location.href;
    if (url.includes('/search/results/')) return 'search';
    if (/\/company\/[^/]+\/posts/.test(url)) return 'company_page';
    if (/\/in\/[^/]+\/recent-activity/.test(url)) return 'profile';
    if (/\/in\/[^/]+\/?(\?|#|$)/.test(url)) return 'profile';
    if (url.includes('/feed')) return 'feed';
    return 'unknown';
  }

  // ---- Mesaj Dinleyicisi ----
  // Popup ve background'dan gelen komutlari dinle
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    // Post tarama komutu
    if (message.action === 'SCAN_POSTS') {
      handleScanPosts()
        .then(function (result) {
          sendResponse(result);
        })
        .catch(function (err) {
          console.debug(LOG_PREFIX, 'SCAN_POSTS hatasi:', err.message);
          sendResponse({
            success: false,
            error: err.message || 'Post tarama sirasinda bilinmeyen bir hata olustu',
          });
        });
      return true; // Async yanit icin gerekli
    }

    // Sayfa tipi sorgulama
    if (message.action === 'GET_PAGE_INFO') {
      var pageType = detectPageType();
      var postCount = 0;
      try {
        if (typeof LinkedInParser !== 'undefined') {
          postCount = LinkedInParser.getPostCount();
        }
      } catch (e) {
        // Post sayisi alinamazsa 0 kalir
      }
      sendResponse({
        success: true,
        pageType: pageType,
        postCount: postCount,
        url: window.location.href,
      });
      return false;
    }

    // Geriye uyumluluk: eski GET_PAGE_TYPE mesaji
    if (message.action === 'GET_PAGE_TYPE') {
      sendResponse({ success: true, pageType: detectPageType() });
      return false;
    }

    // Scroll ve daha fazla post yukleme komutu
    if (message.action === 'SCROLL_FOR_MORE') {
      handleScrollForMore()
        .then(function (result) {
          sendResponse(result);
        })
        .catch(function (err) {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  });

  // ---- Post Tarama Isleyicisi ----
  async function handleScanPosts() {
    var pageType = detectPageType();

    if (pageType === 'unknown') {
      return {
        success: false,
        error: 'Bu LinkedIn sayfasi desteklenmiyor. Desteklenen sayfalar: Feed, Arama Sonuclari, Sirket ve Profil sayfalari.',
      };
    }

    // Parser modulunu kontrol et
    if (typeof LinkedInParser === 'undefined') {
      return {
        success: false,
        error: 'Parser modulu yuklenemedi. Sayfayi yenilemeyi deneyin.',
      };
    }

    try {
      var posts = LinkedInParser.parsePostCards();
      state.postCount = posts.length;
      state.lastScanTime = Date.now();

      console.debug(LOG_PREFIX, 'Tarama tamamlandi:', posts.length, 'post bulundu. Sayfa tipi:', pageType);

      return {
        success: true,
        posts: posts,
        pageType: pageType,
        postCount: posts.length,
        url: window.location.href,
      };
    } catch (err) {
      console.debug(LOG_PREFIX, 'Parse hatasi:', err);
      return {
        success: false,
        error: 'Postlar parse edilirken hata olustu: ' + (err.message || 'Bilinmeyen hata'),
      };
    }
  }

  // ---- Daha Fazla Post Yuklemek Icin Scroll ----
  async function handleScrollForMore() {
    var initialCount = typeof LinkedInParser !== 'undefined' ? LinkedInParser.getPostCount() : 0;

    // Sayfanin altina scroll et
    window.scrollTo(0, document.body.scrollHeight);

    // LinkedIn'in yeni icerikleri yuklemesini bekle
    return new Promise(function (resolve) {
      var attempts = 0;
      var maxAttempts = 10;
      var checkInterval = setInterval(function () {
        attempts++;
        var currentCount = typeof LinkedInParser !== 'undefined' ? LinkedInParser.getPostCount() : 0;

        if (currentCount > initialCount || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve({
            success: true,
            previousCount: initialCount,
            currentCount: currentCount,
            newPostsLoaded: currentCount - initialCount,
          });
        }
      }, 500);
    });
  }

  // ---- MutationObserver: Yeni Yuklenenleri Algilar ----
  // LinkedIn infinite scroll / lazy loading ile yeni postlar yuklendiginde
  // popup'a bildirim gonderir.
  function startObserver() {
    if (state.isObserving || state.observer) return;

    // Gozlemlenecek ana konteyner - genellikle feed veya arama sonuclari alani
    var targetNode = document.querySelector('main') || document.body;

    var debounceTimer = null;

    state.observer = new MutationObserver(function (mutations) {
      // Yeni eklenen node'lar arasinda post container var mi kontrol et
      var hasNewPost = false;

      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;

        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Post container selektorlerini kontrol et
          if (isPostElement(node)) {
            hasNewPost = true;
            break;
          }
        }
        if (hasNewPost) break;
      }

      if (!hasNewPost) return;

      // Debounce: cok sik bildirim gonderme
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var newCount = typeof LinkedInParser !== 'undefined' ? LinkedInParser.getPostCount() : 0;
        if (newCount !== state.postCount) {
          console.debug(LOG_PREFIX, 'Yeni postlar algilandi:', newCount - state.postCount, 'yeni post');
          state.postCount = newCount;

          // Background'a bildirim gonder (popup aciksa oraya da ulasir)
          try {
            chrome.runtime.sendMessage({
              action: 'NEW_POSTS_DETECTED',
              postCount: newCount,
              pageType: state.pageType,
            });
          } catch (e) {
            // Extension context gecersiz olabilir (sayfa yenilenirken vb.)
            console.debug(LOG_PREFIX, 'Bildirim gonderilemedi:', e.message);
          }
        }
      }, state.DEBOUNCE_MS);
    });

    state.observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });

    state.isObserving = true;
    console.debug(LOG_PREFIX, 'MutationObserver baslatildi');
  }

  // ---- Element'in Post Olup Olmadigini Kontrol Et ----
  function isPostElement(node) {
    if (!node || !node.matches) return false;

    try {
      // SDUI post container selektorleri
      if (node.matches('div[role="listitem"], [data-testid="main-feed-activity-card"], [data-testid*="feed-activity"]')) {
        return true;
      }
      // Eski LinkedIn post container selektorleri
      if (node.matches('.feed-shared-update-v2, [data-urn*="activity"], .occludable-update, [data-id*="urn:li:activity"]')) {
        return true;
      }
      // Iceride post container var mi (hem SDUI hem eski)
      if (node.querySelector && node.querySelector('div[role="listitem"], .feed-shared-update-v2, [data-urn*="activity"], [data-testid*="feed-activity"]')) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  // ---- Observer'i Durdur ----
  function stopObserver() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
      state.isObserving = false;
      console.debug(LOG_PREFIX, 'MutationObserver durduruldu');
    }
  }

  // ---- URL Degisikligini Dinle (SPA navigation) ----
  // LinkedIn bir SPA oldugu icin sayfa gecislerini yakala
  function watchUrlChanges() {
    var lastUrl = window.location.href;

    // popstate eventi ile geri/ileri navigasyonunu yakala
    window.addEventListener('popstate', function () {
      onUrlChanged(lastUrl, window.location.href);
      lastUrl = window.location.href;
    });

    // pushState ve replaceState'i intercept et
    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(history, arguments);
      onUrlChanged(lastUrl, window.location.href);
      lastUrl = window.location.href;
    };

    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);
      onUrlChanged(lastUrl, window.location.href);
      lastUrl = window.location.href;
    };
  }

  // ---- URL Degistiginde Cagrilir ----
  function onUrlChanged(oldUrl, newUrl) {
    if (oldUrl === newUrl) return;

    console.debug(LOG_PREFIX, 'Sayfa degisti:', newUrl);

    // Yeni sayfa tipini belirle
    state.pageType = detectPageType();
    state.postCount = 0;

    // Observer'i yeniden baslat
    stopObserver();

    // Kisa bir gecikme ile yeni sayfa icerigi yuklenene kadar bekle
    setTimeout(function () {
      startObserver();
      // Background'a sayfa degisikligi bildir
      try {
        chrome.runtime.sendMessage({
          action: 'PAGE_CHANGED',
          pageType: state.pageType,
          url: newUrl,
        });
      } catch (e) {
        console.debug(LOG_PREFIX, 'Sayfa degisiklik bildirimi gonderilemedi');
      }
    }, 1000);
  }

  // ---- Sayfa Yuklendiginde Baslat ----
  function init() {
    state.pageType = detectPageType();

    console.debug(LOG_PREFIX, 'Content script yuklendi. Sayfa tipi:', state.pageType, '| URL:', window.location.href);

    // Desteklenen sayfa tiplerinde observer'i baslat
    if (state.pageType !== 'unknown') {
      // Sayfanin tam yuklenmesini bekle
      setTimeout(function () {
        startObserver();
      }, 2000);
    }

    // SPA navigasyonunu izle
    watchUrlChanges();
  }

  // Baslatma
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
