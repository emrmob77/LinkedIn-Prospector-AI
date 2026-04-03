// ============================================
// LinkedIn Prospector AI - LinkedIn DOM Parser
// LinkedIn SDUI (Server-Driven UI) uyumlu versiyon
// Nisan 2026 - Obfuscated class'lar yerine stabil
// attribute secicileri kullanir
// ============================================

// Global namespace - content.js tarafindan kullanilir
var LinkedInParser = (function () {
  'use strict';

  // Log prefix
  var LOG = '[LinkedIn Prospector AI]';

  // ---- Sayfa Tipini URL'ye Gore Belirle ----
  function detectPageType(url) {
    url = url || window.location.href;

    // Arama sonuclari - /search/results/content, /search/results/all, vb.
    if (/\/search\/results\//.test(url)) {
      return 'search';
    }
    // Sirket sayfasi
    if (/\/company\/[^/]+/.test(url)) {
      return 'company_page';
    }
    // Kullanici profili (recent-activity dahil)
    if (/\/in\/[^/]+/.test(url)) {
      return 'profile';
    }
    // Ana sayfa feed
    if (/\/feed\b/.test(url)) {
      return 'feed';
    }
    return 'unknown';
  }

  // ---- Sayfadaki Post Kartlarini Bul ----
  // LinkedIn SDUI'da her post bir role="listitem" div icinde
  function findPostElements() {
    // Birincil: role="listitem" — SDUI'nin standart post container'i
    var elements = document.querySelectorAll('div[role="listitem"]');
    if (elements && elements.length > 0) {
      console.debug(LOG + ' Post container bulundu: div[role="listitem"] (' + elements.length + ' adet)');
      return elements;
    }

    // Fallback 1: lazy-column icindeki direkt cocuklar
    var lazyColumn = document.querySelector('div[data-testid="lazy-column"]');
    if (lazyColumn) {
      elements = lazyColumn.children;
      if (elements && elements.length > 0) {
        console.debug(LOG + ' Fallback: lazy-column children (' + elements.length + ' adet)');
        return elements;
      }
    }

    // Fallback 2: Eski LinkedIn yapisi icin — deprecated ama yine de dene
    var oldSelectors = [
      'div.feed-shared-update-v2',
      '[data-urn*="activity"]',
      '.occludable-update'
    ];
    for (var i = 0; i < oldSelectors.length; i++) {
      try {
        elements = document.querySelectorAll(oldSelectors[i]);
        if (elements && elements.length > 0) {
          console.debug(LOG + ' Eski selektoru bulundu: ' + oldSelectors[i] + ' (' + elements.length + ' adet)');
          return elements;
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    console.debug(LOG + ' Hicbir post container secicisi eslesmedi');
    return [];
  }

  // ---- Sayfadaki Tum Post Kartlarini Parse Et ----
  function parsePostCards() {
    var postElements = findPostElements();
    var posts = [];
    var seenKeys = {}; // Tekrar onleme

    for (var i = 0; i < postElements.length; i++) {
      try {
        var post = parsePostElement(postElements[i]);
        if (post) {
          // Duplicate kontrolu
          var key = post.linkedinPostUrl || post.authorName + '::' + (post.content || '').substring(0, 100);
          if (!seenKeys[key]) {
            seenKeys[key] = true;
            posts.push(post);
          }
        }
      } catch (err) {
        console.debug(LOG + ' Post parse hatasi:', err.message);
      }
    }

    console.debug(LOG + ' ' + posts.length + '/' + postElements.length + ' post basariyla parse edildi.');
    return posts;
  }

  // ---- Eski API uyumlulugu ----
  function parsePostsFromPage(pageType) {
    return parsePostCards();
  }

  // ---- Sayfadaki Post Sayisini Dondur ----
  function getPostCount() {
    var elements = findPostElements();
    return elements ? elements.length : 0;
  }

  // ---- Tek Bir Post Elementini Parse Et ----
  function parsePostElement(container) {
    // --- Yazar link'ini bul ---
    var authorLink = findAuthorLink(container);
    var authorHref = authorLink ? (authorLink.getAttribute('href') || '') : '';

    // --- Yazar tipi ---
    var authorType = detectAuthorType(authorHref);

    // --- Yazar adi ---
    var authorName = extractAuthorName(container, authorLink);

    // --- Post icerigi ---
    var content = extractPostContent(container);

    // Icerik ve yazar yoksa bu postu atla (reklam, bos kart vb.)
    if (!content && !authorName) {
      return null;
    }

    // --- Yazar profil resmi ---
    var authorImage = extractAuthorImage(container);

    // --- Yazar title/role (sadece Person icin anlamli) ---
    var authorTitle = extractAuthorTitle(container, authorLink);

    // --- Yazar unvanindan sirket bilgisi ---
    var authorCompany = extractCompanyFromTitle(authorTitle);

    // --- Zaman bilgisi ---
    var publishedAt = extractTimestamp(container);

    // --- Engagement sayilari ---
    var engagement = extractEngagement(container);

    // --- Gorseller ---
    var images = extractImages(container);

    // --- Post URL ---
    var postUrl = extractPostUrl(container);

    return {
      content: (content || '').trim(),
      authorName: (authorName || '').trim(),
      authorTitle: (authorTitle || '').trim(),
      authorCompany: authorCompany,
      authorLinkedinUrl: cleanUrl(authorHref),
      authorProfilePicture: authorImage || null,
      authorType: authorType,
      linkedinPostUrl: postUrl,
      engagementLikes: engagement.likes,
      engagementComments: engagement.comments,
      engagementShares: engagement.shares,
      publishedAt: publishedAt || '',
      images: images,
    };
  }

  // ============================================================
  //  YAZAR BILGILERI CIKARMA
  // ============================================================

  /**
   * Post container icindeki yazar profil linkini bulur.
   * Oncelik sirasi: /in/ veya /company/ iceren ilk <a> tagi.
   */
  function findAuthorLink(container) {
    if (!container) return null;

    // Hem kisi hem sirket linklerini tek sorguda bul
    // Ilk eslesen genellikle yazarin profil linki olur
    var links = container.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
    if (!links || links.length === 0) return null;

    // Ilk anlamli linki sec — cok kisa href'leri atla
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      // /in/somebody veya /company/something formatinda olmali
      if (/\/(in|company)\/[^/]+/.test(href)) {
        return links[i];
      }
    }

    return links[0];
  }

  /**
   * Yazar adini cikarir.
   * SDUI'da: author link'inin parent container'i icindeki ilk anlamli <p> tag'inin textContent'i
   */
  function extractAuthorName(container, authorLink) {
    if (!container) return '';

    // Yontem 1: Author link'inin icindeki veya yakinindaki p tag'i
    if (authorLink) {
      // Author link icindeki p tag'larina bak
      var pTags = authorLink.querySelectorAll('p');
      for (var i = 0; i < pTags.length; i++) {
        var text = (pTags[i].textContent || '').trim();
        // Bos degilse ve cok kisa degilse (sadece emoji, vb.) yazar adi olabilir
        if (text.length > 1 && text.length < 100) {
          // "profilini goruntule" gibi alt text'leri atla
          if (!isHelperText(text)) {
            return text;
          }
        }
      }

      // Author link'in direkt textContent'i
      var linkText = getDirectTextContent(authorLink);
      if (linkText && linkText.length > 1 && linkText.length < 100 && !isHelperText(linkText)) {
        return linkText;
      }

      // Author link'in parent div'indeki ilk p
      var parentDiv = authorLink.parentElement;
      if (parentDiv) {
        pTags = parentDiv.querySelectorAll('p');
        for (var j = 0; j < pTags.length; j++) {
          var pText = (pTags[j].textContent || '').trim();
          if (pText.length > 1 && pText.length < 100 && !isHelperText(pText)) {
            return pText;
          }
        }
      }
    }

    // Yontem 2: Profil resmi img'inin alt attribute'undan
    var profileImg = container.querySelector('img[alt*="profilini"]') ||
                     container.querySelector('img[alt*="profile"]') ||
                     container.querySelector('img[alt*="irketini"]') ||
                     container.querySelector('img[alt*="company"]');
    if (profileImg) {
      var alt = profileImg.getAttribute('alt') || '';
      // "Emrah'in profilini goruntule" -> "Emrah"
      var nameMatch = alt.match(/^(.+?)(?:'|&#39;|\')?(?:n[iı]n?\s|s\s|'s\s)/i);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
      // Ingilizce: "View Emrah's profile"
      var enMatch = alt.match(/(?:View\s+)?(.+?)(?:'s?\s+profile)/i);
      if (enMatch) {
        return enMatch[1].trim();
      }
    }

    // Yontem 3: Eski LinkedIn DOM yapisi (sirket/profil sayfalari)
    var oldSelectors = [
      '.update-components-actor__title .hoverable-link-text span[dir="ltr"] span[aria-hidden="true"] span',
      '.update-components-actor__title .hoverable-link-text',
      '.update-components-actor__name .visually-hidden',
      '.feed-shared-actor__name .visually-hidden',
      '.feed-shared-actor__name span[aria-hidden="true"]',
    ];
    for (var k = 0; k < oldSelectors.length; k++) {
      try {
        var oldEl = container.querySelector(oldSelectors[k]);
        if (oldEl) {
          var oldText = (oldEl.textContent || '').trim();
          if (oldText && oldText.length > 1 && oldText.length < 100) return oldText;
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    return '';
  }

  /**
   * Yazar profil resmini cikarir.
   * SDUI'da: "profilini goruntule" veya "Sirketi goruntule" alt text'li img
   */
  function extractAuthorImage(container) {
    if (!container) return null;

    // Turkce LinkedIn
    var img = container.querySelector('img[alt*="profilini g"]') ||
              container.querySelector('img[alt*="irketini g"]') ||
              container.querySelector('img[alt*="irketi g"]');

    // Ingilizce LinkedIn
    if (!img) {
      img = container.querySelector('img[alt*="profile"]') ||
            container.querySelector('img[alt*="company"]');
    }

    // Fallback: Container icindeki ilk kucuk (profil boyutlu) img
    if (!img) {
      var allImgs = container.querySelectorAll('img[src*="profile-displayphoto"], img[src*="company-logo"]');
      if (allImgs.length > 0) {
        img = allImgs[0];
      }
    }

    return img ? (img.getAttribute('src') || null) : null;
  }

  /**
   * Yazar title/role bilgisini cikarir (Person icin).
   * SDUI'da: Author link altinda yazar adindan sonraki p elementi
   */
  function extractAuthorTitle(container, authorLink) {
    if (!container || !authorLink) return '';

    // Author link icindeki p tag'lari — ikincisi genellikle title
    var pTags = authorLink.querySelectorAll('p');
    if (pTags.length >= 2) {
      var titleText = (pTags[1].textContent || '').trim();
      if (titleText && !isHelperText(titleText) && !isTimeText(titleText)) {
        return titleText;
      }
    }

    // Parent div icindeki p'ler — yazar adindan sonraki
    var parentDiv = authorLink.parentElement;
    if (parentDiv) {
      var allPs = parentDiv.querySelectorAll('p');
      var foundAuthorName = false;
      for (var i = 0; i < allPs.length; i++) {
        var txt = (allPs[i].textContent || '').trim();
        if (!foundAuthorName && txt.length > 1) {
          foundAuthorName = true; // Ilk anlamli p = yazar adi
          continue;
        }
        if (foundAuthorName && txt.length > 1 && !isHelperText(txt) && !isTimeText(txt)) {
          return txt;
        }
      }
    }

    // Eski LinkedIn fallback
    var oldTitle = container.querySelector('.update-components-actor__description .visually-hidden, .feed-shared-actor__description .visually-hidden');
    if (oldTitle) {
      var oldText = (oldTitle.textContent || '').trim();
      if (oldText) return oldText;
    }

    return '';
  }

  // ============================================================
  //  POST ICERIK CIKARMA
  // ============================================================

  /**
   * Post icerik metnini cikarir.
   * SDUI'da: data-testid="expandable-text-box" icindeki span
   */
  function extractPostContent(container) {
    if (!container) return '';

    // Birincil: SDUI expandable text box
    var textBox = container.querySelector('span[data-testid="expandable-text-box"]');
    if (textBox) {
      var text = (textBox.textContent || '').trim();
      if (text) return text;
    }

    // Fallback: data-testid="main-feed-activity-card__commentary" veya benzeri
    var commentary = container.querySelector('[data-testid*="commentary"]');
    if (commentary) {
      var comText = (commentary.textContent || '').trim();
      if (comText) return comText;
    }

    // Fallback: Eski LinkedIn secicileri
    var oldSelectors = [
      '.feed-shared-update-v2__description .break-words',
      '.update-components-text .break-words',
      '.feed-shared-text .break-words',
      '.update-components-text',
      'div[dir="ltr"].feed-shared-update-v2__commentary'
    ];
    for (var i = 0; i < oldSelectors.length; i++) {
      try {
        var el = container.querySelector(oldSelectors[i]);
        if (el) {
          var elText = (el.textContent || '').trim();
          if (elText) return elText;
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    return '';
  }

  // ============================================================
  //  ZAMAN BILGISI CIKARMA
  // ============================================================

  /**
   * Zaman bilgisini cikarir.
   * SDUI'da: globe-americas-small SVG'sinin parent p'sinde
   * Format: "3 hafta", "3 gun", "3 ay", "4 yil", "2h", "1w" vb.
   */
  function extractTimestamp(container) {
    if (!container) return '';

    // Yontem 1: Globe SVG'sini bul — zamani gosterir
    // LinkedIn globe ikonu: use[href*="globe"], svg#globe-americas-small, veya
    // svg icinde globe path'i
    var globeSvg = container.querySelector('svg#globe-americas-small') ||
                   container.querySelector('use[href*="globe-americas"]');

    if (globeSvg) {
      // SVG'nin parent p veya span'ini bul
      var parent = globeSvg;
      for (var i = 0; i < 5; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        if (parent.tagName === 'P' || parent.tagName === 'SPAN') {
          var timeText = (parent.textContent || '').trim();
          // "3 hafta •" veya "3 gun •" gibi metinlerden zamani cikar
          var cleaned = timeText.replace(/[•·]/g, '').trim();
          if (cleaned) {
            var iso = relativeTimeToISO(cleaned);
            return iso || cleaned;
          }
        }
      }

      // Daha genis arama: globe SVG'sinin ust container'indaki metin
      parent = globeSvg.parentElement;
      while (parent && parent !== container) {
        var siblingP = parent.previousElementSibling || parent.nextElementSibling;
        if (siblingP) {
          var sibText = (siblingP.textContent || '').trim().replace(/[•·]/g, '').trim();
          if (sibText && isTimeText(sibText)) {
            var isoSib = relativeTimeToISO(sibText);
            return isoSib || sibText;
          }
        }
        // Ayni seviyedeki text node'lari kontrol et
        if (parent.parentElement) {
          var parentText = (parent.parentElement.textContent || '').trim();
          var timeMatch = parentText.match(/(\d+)\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|saniye|sn|dk|sa|h|d|w|mo|y|min|hour|day|week|month|year)s?/i);
          if (timeMatch) {
            var extracted = timeMatch[0].trim();
            var isoEx = relativeTimeToISO(extracted);
            return isoEx || extracted;
          }
        }
        parent = parent.parentElement;
      }
    }

    // Yontem 2: Zaman metni icin genel arama — p tag'leri arasinda "X hafta", "X gun" vb.
    var allPs = container.querySelectorAll('p');
    for (var j = 0; j < allPs.length; j++) {
      var pText = (allPs[j].textContent || '').trim();
      // "3 hafta •" veya "2 gun •" formatinda mi?
      if (/^\d+\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|h|d|w|mo|y)/i.test(pText.replace(/[•·]/g, '').trim())) {
        var cleanedP = pText.replace(/[•·]/g, '').trim();
        var isoP = relativeTimeToISO(cleanedP);
        return isoP || cleanedP;
      }
    }

    // Yontem 3: <time> elementi (eski LinkedIn)
    var timeEl = container.querySelector('time[datetime]');
    if (timeEl) {
      return timeEl.getAttribute('datetime') || '';
    }

    // Yontem 4: Eski LinkedIn fallback
    var oldTs = container.querySelector('.update-components-actor__sub-description .visually-hidden');
    if (oldTs) {
      var oldText = (oldTs.textContent || '').replace(/\s+/g, ' ').trim();
      if (oldText) {
        var isoOld = relativeTimeToISO(oldText);
        return isoOld || oldText;
      }
    }

    return '';
  }

  /**
   * Relative zaman metnini ISO tarihine cevirir.
   * Turkce ve Ingilizce destekler.
   * Ornekler: "3 hafta", "2 gun", "3 ay", "4 yil", "2h", "3d", "1w"
   */
  function relativeTimeToISO(text) {
    if (!text) return null;
    text = text.toLowerCase().replace(/[•·]/g, '').trim();

    var now = new Date();
    var match;

    // Saniye / seconds
    match = text.match(/(\d+)\s*(?:saniye|sn|sec(?:ond)?s?)/);
    if (match) {
      now.setSeconds(now.getSeconds() - parseInt(match[1], 10));
      return now.toISOString();
    }

    // Dakika / minutes
    match = text.match(/(\d+)\s*(?:dakika|dk|m(?:in)?(?:ute)?s?)/);
    if (match) {
      now.setMinutes(now.getMinutes() - parseInt(match[1], 10));
      return now.toISOString();
    }

    // Saat / hours
    match = text.match(/(\d+)\s*(?:saat|sa|h(?:r|our)?s?)/);
    if (match) {
      now.setHours(now.getHours() - parseInt(match[1], 10));
      return now.toISOString();
    }

    // Gun / days
    match = text.match(/(\d+)\s*(?:gün|gun|g|d(?:ay)?s?)/);
    if (match) {
      now.setDate(now.getDate() - parseInt(match[1], 10));
      return now.toISOString();
    }

    // Hafta / weeks
    match = text.match(/(\d+)\s*(?:hafta|w(?:eek)?s?)/);
    if (match) {
      now.setDate(now.getDate() - (parseInt(match[1], 10) * 7));
      return now.toISOString();
    }

    // Ay / months
    match = text.match(/(\d+)\s*(?:ay|mo(?:nth)?s?)/);
    if (match) {
      now.setMonth(now.getMonth() - parseInt(match[1], 10));
      return now.toISOString();
    }

    // Yil / years
    match = text.match(/(\d+)\s*(?:yıl|yil|y(?:r|ear)?s?)/);
    if (match) {
      now.setFullYear(now.getFullYear() - parseInt(match[1], 10));
      return now.toISOString();
    }

    return null;
  }

  // ============================================================
  //  ENGAGEMENT SAYILARI CIKARMA
  // ============================================================

  /**
   * Tum engagement metriklerini cikarir.
   * SDUI'da engagement sayilari span'lar icinde:
   * "8 tepki", "4 yorum", "1 yeniden yayinlama"
   * Turkce ve Ingilizce destekler.
   */
  function extractEngagement(container) {
    var result = { likes: 0, comments: 0, shares: 0 };
    if (!container) return result;

    // Tum engagement metin kaynaklarini topla
    var engagementTexts = [];

    // Yontem 1: aria-label icinde engagement bilgisi olan butonlar
    var buttons = container.querySelectorAll('button[aria-label]');
    for (var b = 0; b < buttons.length; b++) {
      var ariaLabel = (buttons[b].getAttribute('aria-label') || '').toLowerCase();
      if (/tepki|reaction|begeni|like|yorum|comment|yeniden|repost|share|paylasim/.test(ariaLabel)) {
        engagementTexts.push(ariaLabel);
      }
    }

    // Yontem 2: Span'lar icindeki engagement metinleri
    // Obfuscated class (ee8731ab vb.) degisebilir, bu yuzden metin bazli arama yap
    var allSpans = container.querySelectorAll('span');
    for (var s = 0; s < allSpans.length; s++) {
      var spanText = (allSpans[s].textContent || '').trim().toLowerCase();
      // Sadece engagement metni iceren kisa span'lar (cok uzun metinleri atla)
      if (spanText.length < 50 && /\d/.test(spanText)) {
        if (/tepki|reaction|begeni|like|yorum|comment|yeniden|repost|share|paylasim/.test(spanText)) {
          engagementTexts.push(spanText);
        }
      }
    }

    // Toplanan metinlerden sayilari cikar
    for (var i = 0; i < engagementTexts.length; i++) {
      var txt = engagementTexts[i];
      var num = extractNumber(txt);
      if (num <= 0) continue;

      if (/tepki|reaction|begeni|like/i.test(txt)) {
        result.likes = Math.max(result.likes, num);
      } else if (/yorum|comment/i.test(txt)) {
        result.comments = Math.max(result.comments, num);
      } else if (/yeniden|repost|share|paylasim/i.test(txt)) {
        result.shares = Math.max(result.shares, num);
      }
    }

    // Fallback: Eski LinkedIn secicileri
    if (result.likes === 0 && result.comments === 0 && result.shares === 0) {
      result.likes = extractEngagementCount(
        queryOld(container, '.social-details-social-counts__reactions-count')
      );
      result.comments = extractEngagementCount(
        extractCommentCountTextOld(container)
      );
      result.shares = extractEngagementCount(
        extractShareCountTextOld(container)
      );
    }

    return result;
  }

  /**
   * Metinden sayi cikarir.
   * "8 tepki" -> 8, "1.2K reactions" -> 1200, "54 tepki" -> 54
   */
  function extractNumber(text) {
    if (!text) return 0;
    var match = text.match(/([\d][\d.,]*)\s*([km])?/i);
    if (!match) return 0;

    var numStr = match[1].replace(/,/g, '').replace(/\./g, '');
    var suffix = (match[2] || '').toLowerCase();

    // Eger noktali sayi ise (1.2K gibi) farkli isle
    if (match[1].includes('.') && suffix) {
      numStr = match[1].replace(/,/g, '');
    }

    var num = parseFloat(numStr);
    if (isNaN(num)) return 0;

    if (suffix === 'k') return Math.round(num * 1000);
    if (suffix === 'm') return Math.round(num * 1000000);
    return Math.round(num);
  }

  // Eski API uyumlulugu icin
  function extractEngagementCount(text) {
    return extractNumber(text);
  }

  // ============================================================
  //  GORSEL CIKARMA
  // ============================================================

  /**
   * Post icerisindeki gorselleri toplar.
   * SDUI'da: img[alt="Resmi goruntule"] — media.licdn.com URL'li
   * Turkce ve Ingilizce destekler.
   */
  function extractImages(container) {
    if (!container) return [];

    var images = [];
    var seenSrcs = {};

    // Post gorselleri icin URL pattern'leri — bu pattern'ler kesinlikle post gorseli
    var postImageUrlPatterns = ['feedshare-shrink', 'article-cover_image', 'mediaUploadImage'];

    // Birincil: SDUI post gorselleri (alt text bazli)
    var imgSelectors = [
      'img[alt="Resmi görüntüle"]',     // Turkce
      'img[alt="Resmi goruntule"]',      // Turkce (ASCII)
      'img[alt="View image"]',           // Ingilizce
      'img[alt*="Resmi"]',              // Turkce genel (case-sensitive)
      'img[alt*="resmi"]',              // Turkce kucuk harf
      'img[alt*="Image"]',              // Ingilizce genel
      'img[alt*="image"]',              // Ingilizce kucuk harf
    ];

    for (var s = 0; s < imgSelectors.length; s++) {
      try {
        var imgs = container.querySelectorAll(imgSelectors[s]);
        for (var i = 0; i < imgs.length; i++) {
          addImage(imgs[i], images, seenSrcs);
        }
      } catch (e) {
        // Gecersiz selektoru atla
      }
    }

    // URL pattern bazli arama — feedshare-shrink, article-cover vb.
    // Bu gorseller kesinlikle post icerigi
    var allImgsForPattern = container.querySelectorAll('img[src]');
    for (var p = 0; p < allImgsForPattern.length; p++) {
      var pSrc = allImgsForPattern[p].getAttribute('src') || '';
      for (var pi = 0; pi < postImageUrlPatterns.length; pi++) {
        if (pSrc.includes(postImageUrlPatterns[pi])) {
          addImage(allImgsForPattern[p], images, seenSrcs);
          break;
        }
      }
    }

    // Fallback: media.licdn.com URL'li tum img'ler (profil resimleri haric)
    if (images.length === 0) {
      var allImgs = container.querySelectorAll('img[src*="media.licdn.com"]');
      for (var j = 0; j < allImgs.length; j++) {
        var src = allImgs[j].getAttribute('src') || '';
        // Profil resimleri ve cok kucuk ikonlari atla
        if (src.includes('profile-displayphoto') || src.includes('company-logo')) continue;
        if (src.includes('shrink_100_100') || src.includes('shrink_40_40')) continue;
        addImage(allImgs[j], images, seenSrcs);
      }
    }

    // Eski LinkedIn fallback
    if (images.length === 0) {
      var oldSelectors = [
        '.feed-shared-image__container img',
        '.update-components-image img',
        '.feed-shared-image img'
      ];
      for (var k = 0; k < oldSelectors.length; k++) {
        try {
          var oldImgs = container.querySelectorAll(oldSelectors[k]);
          for (var m = 0; m < oldImgs.length; m++) {
            addImage(oldImgs[m], images, seenSrcs);
          }
        } catch (e) {
          // Sessizce devam et
        }
      }
    }

    return images;
  }

  /**
   * Gorsel URL'sini listeye ekler (duplicate ve gecersiz kontrolu ile).
   */
  function addImage(imgEl, images, seenSrcs) {
    var src = imgEl.getAttribute('src') || imgEl.getAttribute('data-delayed-url') || '';
    if (src && !src.startsWith('data:') && !src.includes('hashtagicon') && !seenSrcs[src]) {
      seenSrcs[src] = true;
      images.push(src);
    }
  }

  // ============================================================
  //  POST URL CIKARMA
  // ============================================================

  /**
   * Post URL'sini cikarir.
   * SDUI'da direkt post URL bulmak zor — componentkey veya href'lerden cikarilir.
   */
  function extractPostUrl(container) {
    if (!container) return '';

    // Yontem 1: componentkey attribute'larindan shareId veya ugcPostId cikar (en hizli)
    // innerHTML yerine querySelectorAll kullanarak performansi artiriyoruz.
    // LinkedIn SDUI'da shareId, translation componentkey'lerinde bulunur:
    // Ornek: "translation_translatable-commentary-FeTranslationUrn(...shareId=7436864923177021440...)"
    try {
      var allCkElements = container.querySelectorAll('[componentkey]');
      for (var ck_i = 0; ck_i < allCkElements.length; ck_i++) {
        var ckVal = allCkElements[ck_i].getAttribute('componentkey') || '';

        // ShareId pattern'i — en guvenilir kaynak
        var shareIdMatch = ckVal.match(/shareId=(\d{10,})/);
        if (shareIdMatch) {
          return 'https://www.linkedin.com/feed/update/urn:li:share:' + shareIdMatch[1] + '/';
        }

        // UgcPostUrn pattern'i
        var ugcMatch = ckVal.match(/ugcPostUrn=UgcPostUrn[^)]*ugcPostId=(\d{10,})/);
        if (ugcMatch) {
          return 'https://www.linkedin.com/feed/update/urn:li:ugcPost:' + ugcMatch[1] + '/';
        }

        // activity pattern'i componentkey icinde
        var actCkMatch = ckVal.match(/activity[:\-](\d{10,})/);
        if (actCkMatch) {
          return 'https://www.linkedin.com/feed/update/urn:li:activity:' + actCkMatch[1] + '/';
        }
      }
    } catch (e) {
      // Sessizce devam et
    }

    // Yontem 2: data-urn attribute (container veya parent/child elementlerde)
    try {
      var urnSources = [
        container.getAttribute('data-urn'),
        container.getAttribute('data-id'),
      ];
      // Eski DOM'da data-urn parent'ta olabilir
      if (container.parentElement) {
        urnSources.push(container.parentElement.getAttribute('data-urn'));
      }
      // Veya child element'te
      var urnEl = container.querySelector('[data-urn]');
      if (urnEl) urnSources.push(urnEl.getAttribute('data-urn'));

      for (var u = 0; u < urnSources.length; u++) {
        var urn = urnSources[u] || '';
        var activityMatch2 = urn.match(/(?:activity|ugcPost|share):(\d+)/);
        if (activityMatch2) {
          return 'https://www.linkedin.com/feed/update/' + urn + '/';
        }
      }
    } catch (e) {
      // Sessizce devam et
    }

    // Yontem 3: Pulse/article linkleri (article paylasimi icin)
    try {
      var articleLinks = container.querySelectorAll('a[href*="/pulse/"]');
      for (var j = 0; j < articleLinks.length; j++) {
        var articleHref = articleLinks[j].getAttribute('href') || '';
        if (articleHref.includes('/pulse/')) {
          return cleanUrl(articleHref);
        }
      }
    } catch (e) {
      // Sessizce devam et
    }

    // Yontem 4: Container icerisindeki activity/feed linklerini tara
    try {
      var allLinks = container.querySelectorAll('a[href*="activity"], a[href*="/feed/update/"]');
      for (var i = 0; i < allLinks.length; i++) {
        var href = allLinks[i].getAttribute('href') || '';
        if (href.includes('/feed/update/') || href.includes('activity:')) {
          return cleanUrl(href);
        }
      }
    } catch (e) {
      // Sessizce devam et
    }

    // Yontem 5: Fallback — yazar profil sayfasi (en azindan bir link olsun)
    try {
      var authorFallbackLink = container.querySelector('a[href*="/in/"], a[href*="/company/"]');
      if (authorFallbackLink) {
        var authorFallbackHref = authorFallbackLink.getAttribute('href') || '';
        if (/\/(in|company)\/[^/]+/.test(authorFallbackHref)) {
          return cleanUrl(authorFallbackHref);
        }
      }
    } catch (e) {
      // Sessizce devam et
    }

    return '';
  }

  // ============================================================
  //  YARDIMCI FONKSIYONLAR
  // ============================================================

  /**
   * Yazar tipini URL'den tespit eder.
   */
  function detectAuthorType(url) {
    if (!url) return 'Person';
    if (url.includes('/company/')) return 'Company';
    return 'Person';
  }

  /**
   * Yazar unvanindan sirket adini cikarir.
   * "Software Engineer at Google" -> "Google"
   * "CTO - Acme Corp" -> "Acme Corp"
   * "DeFacto sirketinde Kurumsal Satis Muduru" -> "DeFacto"
   */
  function extractCompanyFromTitle(title) {
    if (!title) return '';
    title = title.trim();

    // Turkce: "X sirketinde Y" veya "X şirketinde Y"
    var trMatch = title.match(/^(.+?)\s+(?:şirketinde|sirketinde)\s+/i);
    if (trMatch) return trMatch[1].trim();

    // " at " ayiricisi
    var atMatch = title.match(/\bat\s+(.+)$/i);
    if (atMatch) return atMatch[1].trim();

    // " - " ayiricisi
    var dashMatch = title.match(/\s+-\s+(.+)$/);
    if (dashMatch) return dashMatch[1].trim();

    // " | " ayiricisi
    var pipeMatch = title.match(/\s+\|\s+(.+)$/);
    if (pipeMatch) return pipeMatch[1].trim();

    // " @ " ayiricisi
    var atSignMatch = title.match(/\s+@\s+(.+)$/);
    if (atSignMatch) return atSignMatch[1].trim();

    return '';
  }

  /**
   * Metnin yardimci/helper metin olup olmadigini kontrol eder.
   * Profil goruntuleme linki, "takip et" gibi metinleri filtreler.
   */
  function isHelperText(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    return /profilini\s*g|profili\s*g|view\s*profile|takip\s*et|follow|connect|ba[gğ]lan/i.test(lower);
  }

  /**
   * Metnin zaman metni olup olmadigini kontrol eder.
   */
  function isTimeText(text) {
    if (!text) return false;
    var cleaned = text.replace(/[•·]/g, '').trim();
    return /^\d+\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|sn|dk|sa|h|d|w|mo|y|min|hour|day|week|month|year)s?\s*$/i.test(cleaned);
  }

  /**
   * Bir elementin direkt (child node'lar haric) metin icerigini dondurur.
   */
  function getDirectTextContent(element) {
    if (!element) return '';
    var text = '';
    for (var i = 0; i < element.childNodes.length; i++) {
      if (element.childNodes[i].nodeType === Node.TEXT_NODE) {
        text += element.childNodes[i].textContent;
      }
    }
    return text.trim();
  }

  /**
   * URL'yi temizler — tracking parametrelerini kaldirir,
   * relative URL'leri absolute yapar.
   */
  function cleanUrl(url) {
    if (!url) return '';
    try {
      var urlObj = new URL(url, 'https://www.linkedin.com');
      var cleanPath = urlObj.origin + urlObj.pathname;
      // Sondaki slash'i normalize et
      if (!cleanPath.endsWith('/')) {
        cleanPath += '/';
      }
      return cleanPath;
    } catch (e) {
      return url;
    }
  }

  /**
   * Eski LinkedIn DOM icin basit querySelector wrapper.
   */
  function queryOld(container, selector) {
    try {
      var el = container.querySelector(selector);
      return el ? (el.textContent || '').trim() : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * Eski LinkedIn: Yorum sayisi metnini cikarir.
   */
  function extractCommentCountTextOld(container) {
    try {
      var buttons = container.querySelectorAll('button, a');
      for (var i = 0; i < buttons.length; i++) {
        var btnText = (buttons[i].textContent || '').toLowerCase();
        if ((btnText.includes('comment') || btnText.includes('yorum')) && /\d/.test(btnText)) {
          return btnText;
        }
        var ariaLabel = (buttons[i].getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('comment') && /\d/.test(ariaLabel)) {
          return ariaLabel;
        }
      }
    } catch (e) {
      // Sessizce devam et
    }
    return '';
  }

  /**
   * Eski LinkedIn: Paylasim/Repost sayisi metnini cikarir.
   */
  function extractShareCountTextOld(container) {
    try {
      var buttons = container.querySelectorAll('button, a');
      for (var i = 0; i < buttons.length; i++) {
        var btnText = (buttons[i].textContent || '').toLowerCase();
        if ((btnText.includes('repost') || btnText.includes('share') || btnText.includes('paylasim') || btnText.includes('yeniden')) && /\d/.test(btnText)) {
          return btnText;
        }
        var ariaLabel = (buttons[i].getAttribute('aria-label') || '').toLowerCase();
        if ((ariaLabel.includes('repost') || ariaLabel.includes('share')) && /\d/.test(ariaLabel)) {
          return ariaLabel;
        }
      }
    } catch (e) {
      // Sessizce devam et
    }
    return '';
  }

  // ---- Public API ----
  return {
    detectPageType: detectPageType,
    parsePostCards: parsePostCards,
    parsePostsFromPage: parsePostsFromPage,
    parsePostElement: parsePostElement,
    getPostCount: getPostCount,
    extractEngagementCount: extractEngagementCount,
  };
})();
