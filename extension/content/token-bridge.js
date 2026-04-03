// ============================================
// LinkedIn Prospector AI - Token Bridge
// Web app'teki extension-token sayfasindan
// token'i otomatik olarak extension storage'a kaydeder
// ============================================

(function () {
  'use strict';

  function tryExtractToken() {
    var el = document.getElementById('extension-token-data');
    if (!el) return null;
    return el.getAttribute('data-token') || null;
  }

  function saveTokenAndNotify(token) {
    chrome.storage.local.set({ authToken: token }, function () {
      // Sayfaya basarili mesaji goster
      var el = document.getElementById('extension-token-data');
      if (el) {
        var parent = el.parentElement;
        if (parent) {
          var notice = document.createElement('div');
          notice.style.cssText = 'margin-top:12px;padding:12px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;text-align:center;color:#166534;font-weight:500;';
          notice.textContent = '✓ Token otomatik olarak Extension\'a kaydedildi! Bu sekmeyi kapatabilirsiniz.';
          parent.appendChild(notice);
        }
      }
      console.debug('[TokenBridge] Token basariyla extension storage\'a kaydedildi.');
    });
  }

  // React hydration'i bekle - DOM'un hazir olmasini kontrol et
  var attempts = 0;
  var maxAttempts = 20; // 10 saniye

  function pollForToken() {
    var token = tryExtractToken();
    if (token) {
      saveTokenAndNotify(token);
      return;
    }

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(pollForToken, 500);
    } else {
      console.debug('[TokenBridge] Token bulunamadi, sayfa tam yuklenmemis olabilir.');
    }
  }

  // Sayfa yuklendiginde basla
  pollForToken();
})();
