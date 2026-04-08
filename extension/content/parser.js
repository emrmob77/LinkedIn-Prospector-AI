// ============================================
// LinkedIn Prospector AI - LinkedIn DOM Parser
// LinkedIn SDUI (Server-Driven UI) uyumlu versiyon
// Nisan 2026 - Obfuscated class'lar yerine stabil
// attribute secicileri kullanir
//
// Guncelleme: Parser dayanikliligi arttirildi
// - Fallback selector zincirleri eklendi
// - Hashtag ve mention cikarimi eklendi
// - authorCompany cikarimi guclendirildi
// - Profile picture cikarimi iyilestirildi
// - Debug modu eklendi
// ============================================

// Global namespace - content.js tarafindan kullanilir
var LinkedInParser = (function () {
  'use strict';

  // Log prefix
  var LOG = '[LinkedIn Prospector AI]';

  // Debug modu — console'da "LinkedInParser.setDebug(true)" ile aktif edilir
  var DEBUG_MODE = false;

  function debug() {
    if (!DEBUG_MODE) return;
    var args = [LOG + ' [DEBUG]'];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    console.log.apply(console, args);
  }

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
    // Fallback selector zinciri — LinkedIn DOM degisince biri calisir
    var selectorChain = [
      // SDUI: role="listitem" — en stabil
      'div[role="listitem"]',
      // SDUI: data-testid bazli post container
      '[data-testid="main-feed-activity-card"]',
      '[data-testid*="feed-activity"]',
      // Lazy-column child strategy icin asagida ozel islem var
    ];

    for (var s = 0; s < selectorChain.length; s++) {
      try {
        var elements = document.querySelectorAll(selectorChain[s]);
        if (elements && elements.length > 0) {
          debug('Post container bulundu:', selectorChain[s], '(' + elements.length + ' adet)');
          return elements;
        }
      } catch (e) {
        // Gecersiz selektoru atla
      }
    }

    // Lazy-column icindeki direkt cocuklar
    var lazyColumnSelectors = [
      'div[data-testid="lazy-column"]',
      '[role="main"] > div > div',
    ];
    for (var lc = 0; lc < lazyColumnSelectors.length; lc++) {
      try {
        var lazyColumn = document.querySelector(lazyColumnSelectors[lc]);
        if (lazyColumn && lazyColumn.children && lazyColumn.children.length > 0) {
          debug('Fallback: lazy-column children (' + lazyColumn.children.length + ' adet)');
          return lazyColumn.children;
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    // Eski LinkedIn yapisi icin selektorler
    var oldSelectors = [
      'div.feed-shared-update-v2',
      '[data-urn*="activity"]',
      '.occludable-update',
      '[data-id*="urn:li:activity"]',
      '.scaffold-finite-scroll__content > div',
    ];
    for (var i = 0; i < oldSelectors.length; i++) {
      try {
        var elements = document.querySelectorAll(oldSelectors[i]);
        if (elements && elements.length > 0) {
          debug('Eski selektoru bulundu:', oldSelectors[i], '(' + elements.length + ' adet)');
          return elements;
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    debug('Hicbir post container secicisi eslesmedi');
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
        debug('Post parse hatasi (index ' + i + '):', err.message);
        // Bir post parse edilemezse digerleri engellenmez
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
    if (!container) return null;

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

    // --- Yazar unvanindan sirket bilgisi (gelismis cikarim) ---
    var authorCompany = extractAuthorCompany(container, authorLink, authorTitle, authorHref);

    // --- Zaman bilgisi ---
    var publishedAt = extractTimestamp(container);

    // --- Engagement sayilari ---
    var engagement = extractEngagement(container);

    // --- Gorseller ---
    var images = extractImages(container);

    // --- Post URL ---
    var postUrl = extractPostUrl(container);

    // --- Hashtag'ler ---
    var hashtags = extractHashtags(container, content);

    // --- Mention'lar ---
    var mentions = extractMentions(container);

    var result = {
      content: (content || '').trim(),
      authorName: (authorName || '').trim(),
      authorTitle: (authorTitle || '').trim(),
      authorCompany: (authorCompany || '').trim(),
      authorLinkedinUrl: cleanUrl(authorHref),
      authorProfilePicture: authorImage || null,
      authorType: authorType,
      linkedinPostUrl: postUrl,
      engagementLikes: engagement.likes,
      engagementComments: engagement.comments,
      engagementShares: engagement.shares,
      publishedAt: publishedAt || '',
      images: images,
      hashtags: hashtags,
      mentions: mentions,
    };

    debug('Post parse edildi:', result.authorName, '|', (result.content || '').substring(0, 60) + '...');

    return result;
  }

  // ============================================================
  //  YAZAR BILGILERI CIKARMA
  // ============================================================

  /**
   * Post container icindeki yazar profil linkini bulur.
   * Oncelik sirasi: /in/ veya /company/ iceren ilk <a> tagi.
   * Fallback: aria-label ile yazar linki.
   */
  function findAuthorLink(container) {
    if (!container) return null;

    // Birincil: /in/ ve /company/ linkleri
    var links = container.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
    if (links && links.length > 0) {
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

    // Fallback: aria-label icinde "profil" veya "profile" gecen linkler
    var ariaLinks = container.querySelectorAll('a[aria-label*="profil"], a[aria-label*="profile"], a[aria-label*="Profil"], a[aria-label*="Profile"]');
    if (ariaLinks && ariaLinks.length > 0) {
      return ariaLinks[0];
    }

    // Fallback: role="link" olan ve yazar bilgisi tasiyabilecek elementler
    var roleLinks = container.querySelectorAll('[role="link"][href*="/in/"], [role="link"][href*="/company/"]');
    if (roleLinks && roleLinks.length > 0) {
      return roleLinks[0];
    }

    return null;
  }

  /**
   * Yazar adini cikarir.
   * SDUI'da: author link'inin parent container'i icindeki ilk anlamli <p> tag'inin textContent'i
   * Fallback: aria-label, img alt, eski DOM secicileri
   */
  function extractAuthorName(container, authorLink) {
    if (!container) return '';

    // Yontem 1: Author link'inin icindeki veya yakinindaki p tag'i
    if (authorLink) {
      // Author link icindeki p tag'larina bak
      var pTags = authorLink.querySelectorAll('p');
      for (var i = 0; i < pTags.length; i++) {
        var text = (pTags[i].textContent || '').trim();
        if (text.length > 1 && text.length < 100) {
          if (!isHelperText(text)) {
            return text;
          }
        }
      }

      // Author link'in aria-label'indan
      var ariaLabel = authorLink.getAttribute('aria-label') || '';
      if (ariaLabel && ariaLabel.length > 1 && ariaLabel.length < 100 && !isHelperText(ariaLabel)) {
        // "Emrah'in profilini goruntule" -> "Emrah"
        var ariaName = extractNameFromAriaLabel(ariaLabel);
        if (ariaName) return ariaName;
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
    var profileImgSelectors = [
      'img[alt*="profilini"]',
      'img[alt*="profile"]',
      'img[alt*="irketini"]',
      'img[alt*="company"]',
      'img[alt*="Profil"]',
      'img[alt*="Profile"]',
    ];
    for (var pi = 0; pi < profileImgSelectors.length; pi++) {
      try {
        var profileImg = container.querySelector(profileImgSelectors[pi]);
        if (profileImg) {
          var alt = profileImg.getAttribute('alt') || '';
          var extracted = extractNameFromAltText(alt);
          if (extracted) return extracted;
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 3: Eski LinkedIn DOM yapisi (sirket/profil sayfalari)
    var oldSelectors = [
      '.update-components-actor__title .hoverable-link-text span[dir="ltr"] span[aria-hidden="true"] span',
      '.update-components-actor__title .hoverable-link-text span[dir="ltr"] span[aria-hidden="true"]',
      '.update-components-actor__title .hoverable-link-text',
      '.update-components-actor__name .visually-hidden',
      '.feed-shared-actor__name .visually-hidden',
      '.feed-shared-actor__name span[aria-hidden="true"]',
      '.update-components-actor__title span[aria-hidden="true"]',
      '[data-control-name="actor"] span[aria-hidden="true"]',
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

    // Yontem 4: data-testid bazli yazar adi
    var testIdSelectors = [
      '[data-testid="actor-name"]',
      '[data-testid*="author-name"]',
      '[data-testid*="actor"] p:first-child',
    ];
    for (var ti = 0; ti < testIdSelectors.length; ti++) {
      try {
        var tiEl = container.querySelector(testIdSelectors[ti]);
        if (tiEl) {
          var tiText = (tiEl.textContent || '').trim();
          if (tiText && tiText.length > 1 && tiText.length < 100 && !isHelperText(tiText)) {
            return tiText;
          }
        }
      } catch (e) {
        // Devam et
      }
    }

    return '';
  }

  /**
   * Yazar profil resmini cikarir.
   * Birden fazla strateji ile profil resmi URL'si bulunur.
   */
  function extractAuthorImage(container) {
    if (!container) return null;

    // Strateji 1: Turkce LinkedIn alt text'ler
    var trSelectors = [
      'img[alt*="profilini g"]',
      'img[alt*="irketini g"]',
      'img[alt*="irketi g"]',
      'img[alt*="Profilini"]',
    ];
    for (var t = 0; t < trSelectors.length; t++) {
      try {
        var img = container.querySelector(trSelectors[t]);
        if (img) {
          var src = getImageSrc(img);
          if (src) return src;
        }
      } catch (e) {
        // Devam et
      }
    }

    // Strateji 2: Ingilizce LinkedIn alt text'ler
    var enSelectors = [
      'img[alt*="profile picture"]',
      'img[alt*="profile photo"]',
      'img[alt*="Profile"]',
      'img[alt*="profile"]',
      'img[alt*="company logo"]',
      'img[alt*="Company"]',
    ];
    for (var e = 0; e < enSelectors.length; e++) {
      try {
        var enImg = container.querySelector(enSelectors[e]);
        if (enImg) {
          var enSrc = getImageSrc(enImg);
          if (enSrc) return enSrc;
        }
      } catch (ex) {
        // Devam et
      }
    }

    // Strateji 3: URL pattern bazli — profile-displayphoto veya company-logo
    var urlPatternSelectors = [
      'img[src*="profile-displayphoto"]',
      'img[src*="company-logo"]',
      'img[data-delayed-url*="profile-displayphoto"]',
      'img[data-delayed-url*="company-logo"]',
    ];
    for (var u = 0; u < urlPatternSelectors.length; u++) {
      try {
        var urlImg = container.querySelector(urlPatternSelectors[u]);
        if (urlImg) {
          var urlSrc = getImageSrc(urlImg);
          if (urlSrc) return urlSrc;
        }
      } catch (ex2) {
        // Devam et
      }
    }

    // Strateji 4: data-testid bazli profil resmi
    var testIdSelectors = [
      '[data-testid="actor-image"] img',
      '[data-testid*="profile-photo"] img',
      '[data-testid*="avatar"] img',
    ];
    for (var ti = 0; ti < testIdSelectors.length; ti++) {
      try {
        var tiImg = container.querySelector(testIdSelectors[ti]);
        if (tiImg) {
          var tiSrc = getImageSrc(tiImg);
          if (tiSrc) return tiSrc;
        }
      } catch (ex3) {
        // Devam et
      }
    }

    // Strateji 5: Container icindeki ilk kucuk profil boyutlu img
    // (Post gorselleri genellikle buyuk olur, profil resimleri kucuk)
    try {
      var allImgs = container.querySelectorAll('img[src]');
      for (var a = 0; a < Math.min(allImgs.length, 5); a++) {
        var aSrc = allImgs[a].getAttribute('src') || '';
        if (aSrc.includes('profile-displayphoto') || aSrc.includes('company-logo')) {
          return aSrc;
        }
      }
    } catch (ex4) {
      // Devam et
    }

    return null;
  }

  /**
   * Img elementinden src veya data-delayed-url alir.
   */
  function getImageSrc(imgEl) {
    if (!imgEl) return null;
    var src = imgEl.getAttribute('src') || '';
    // data: URL'leri ve placeholder'lari atla
    if (src && !src.startsWith('data:') && !src.includes('spacer') && !src.includes('ghost')) {
      return src;
    }
    // Lazy-loaded img icin data-delayed-url
    var delayed = imgEl.getAttribute('data-delayed-url') || '';
    if (delayed && !delayed.startsWith('data:')) {
      return delayed;
    }
    return null;
  }

  /**
   * Yazar title/role bilgisini cikarir (Person icin).
   * SDUI'da: Author link altinda yazar adindan sonraki p elementi
   */
  function extractAuthorTitle(container, authorLink) {
    if (!container) return '';

    if (authorLink) {
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
    }

    // Eski LinkedIn fallback selektorleri
    var oldSelectors = [
      '.update-components-actor__description .visually-hidden',
      '.feed-shared-actor__description .visually-hidden',
      '.update-components-actor__description span[aria-hidden="true"]',
      '.feed-shared-actor__description span[aria-hidden="true"]',
      '[data-testid="actor-description"]',
      '[data-testid*="author-title"]',
    ];
    for (var k = 0; k < oldSelectors.length; k++) {
      try {
        var oldEl = container.querySelector(oldSelectors[k]);
        if (oldEl) {
          var oldText = (oldEl.textContent || '').trim();
          if (oldText) return oldText;
        }
      } catch (e) {
        // Devam et
      }
    }

    return '';
  }

  // ============================================================
  //  SIRKET BILGISI CIKARMA (Gelismis)
  // ============================================================

  /**
   * Yazar sirket bilgisini birden fazla kaynaktan cikarir.
   * Oncelik sirasi:
   * 1. Yazar URL'sinden (/company/ ise direkt sirket sayfasi)
   * 2. Post container icindeki sirket linki
   * 3. data-testid bazli sirket alani
   * 4. Yazar title/role metninden parse
   * 5. Sayfa URL'sinden (eger sirket sayfasindaysak)
   */
  function extractAuthorCompany(container, authorLink, authorTitle, authorHref) {
    if (!container) return '';

    // Yontem 1: Yazar URL'si /company/ ise, bu bir sirket hesabi
    // Sirket adini direkt author name'den aliriz (zaten sirket adi)
    // Bu durumda authorCompany = authorName olacak, bunu caller'a birakiriz

    // Yontem 2: Author link'inin yakininda sirket bilgisi iceren link
    if (authorLink) {
      // Author'un parent container'indaki /company/ linkleri
      var authorSection = authorLink.closest('div') || authorLink.parentElement;
      if (authorSection) {
        var companyLinks = authorSection.querySelectorAll('a[href*="/company/"]');
        for (var c = 0; c < companyLinks.length; c++) {
          // Yazar linkinin kendisi degilse, bu sirket linki olabilir
          var compHref = companyLinks[c].getAttribute('href') || '';
          if (compHref !== authorHref && /\/company\/[^/]+/.test(compHref)) {
            var compText = (companyLinks[c].textContent || '').trim();
            if (compText && compText.length > 1 && compText.length < 100 && !isHelperText(compText)) {
              debug('Sirket linki bulundu:', compText);
              return compText;
            }
          }
        }
      }

      // Yontem 2b: Author link icindeki ust bolumde sirket adi
      // LinkedIn bazen yazar bilgisi altinda sirket adini ayri bir satir olarak gosterir
      var parentContainer = authorLink.parentElement;
      if (parentContainer && parentContainer.parentElement) {
        var grandParent = parentContainer.parentElement;
        var allCompanyLinks = grandParent.querySelectorAll('a[href*="/company/"]');
        for (var gc = 0; gc < allCompanyLinks.length; gc++) {
          var gcHref = allCompanyLinks[gc].getAttribute('href') || '';
          if (gcHref !== authorHref && /\/company\/[^/]+/.test(gcHref)) {
            var gcText = (allCompanyLinks[gc].textContent || '').trim();
            if (gcText && gcText.length > 1 && gcText.length < 100 && !isHelperText(gcText)) {
              return gcText;
            }
          }
        }
      }
    }

    // Yontem 3: data-testid bazli sirket alani
    var testIdSelectors = [
      '[data-testid="actor-company"]',
      '[data-testid*="company-name"]',
      '[data-testid*="organization"]',
    ];
    for (var ti = 0; ti < testIdSelectors.length; ti++) {
      try {
        var tiEl = container.querySelector(testIdSelectors[ti]);
        if (tiEl) {
          var tiText = (tiEl.textContent || '').trim();
          if (tiText && tiText.length > 1) return tiText;
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 4: Eski LinkedIn DOM — sirket bilgisi icin
    var oldCompanySelectors = [
      '.update-components-actor__meta-link',
      '.feed-shared-actor__sub-description a',
      '.update-components-actor__description a[href*="/company/"]',
    ];
    for (var oc = 0; oc < oldCompanySelectors.length; oc++) {
      try {
        var ocEl = container.querySelector(oldCompanySelectors[oc]);
        if (ocEl) {
          var ocText = (ocEl.textContent || '').trim();
          if (ocText && ocText.length > 1 && ocText.length < 100) return ocText;
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 5: Yazar title metninden sirket cikarimi (en son cunku en az guvenilir)
    var fromTitle = extractCompanyFromTitle(authorTitle);
    if (fromTitle) return fromTitle;

    // Yontem 6: Sayfa URL'sinden (sirket sayfasindaysak tum postlar o sirketin)
    var pageUrl = window.location.href;
    var companyPageMatch = pageUrl.match(/\/company\/([^/]+)/);
    if (companyPageMatch) {
      // Sayfa basligindaki sirket adini dene
      var companySlug = companyPageMatch[1];
      // Slug'i insana okunur hale getir (tire -> bosluk, capitalize)
      var readableName = companySlug.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      // Sayfadaki gercek sirket adini bulmaya calis
      try {
        var pageCompanyName = document.querySelector('h1, [data-testid="organization-name"]');
        if (pageCompanyName) {
          var pcnText = (pageCompanyName.textContent || '').trim();
          if (pcnText && pcnText.length > 1 && pcnText.length < 100) return pcnText;
        }
      } catch (e) {
        // Devam et
      }
      return readableName;
    }

    return '';
  }

  /**
   * Yazar unvanindan sirket adini cikarir.
   * "Software Engineer at Google" -> "Google"
   * "CTO - Acme Corp" -> "Acme Corp"
   * "DeFacto sirketinde Kurumsal Satis Muduru" -> "DeFacto"
   * "Kurucu Ortak, ABC Teknoloji" -> "ABC Teknoloji"
   */
  function extractCompanyFromTitle(title) {
    if (!title) return '';
    title = title.trim();

    // Turkce: "X sirketinde Y" veya "X şirketinde Y"
    var trMatch = title.match(/^(.+?)\s+(?:şirketinde|sirketinde)\s+/i);
    if (trMatch) return trMatch[1].trim();

    // Turkce: "Y, X" veya "Y · X" (ikinci kisim sirket olabilir)
    // Ama sadece kisa ve anlamli metinler icin

    // " at " ayiricisi (en yaygin Ingilizce pattern)
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

    // " · " (middle dot) ayiricisi — LinkedIn SDUI'da sik kullanilir
    var dotMatch = title.match(/\s+[·•]\s+(.+)$/);
    if (dotMatch) return dotMatch[1].trim();

    // Turkce: "Pozisyon, Sirket" pattern'i (virgul ayiricisi)
    // Sadece 2 parcali ve ikinci parca kisa ise
    var commaMatch = title.match(/^[^,]+,\s+(.+)$/);
    if (commaMatch) {
      var afterComma = commaMatch[1].trim();
      // Ikinci parca cok uzun degilse ve pozisyon gibi gorunmuyorsa sirket olabilir
      if (afterComma.length > 1 && afterComma.length < 60 && !isJobTitle(afterComma)) {
        return afterComma;
      }
    }

    return '';
  }

  /**
   * Metnin bir is unvani olup olmadigini kontrol eder.
   * extractCompanyFromTitle'da virgul sonrasi parcayi filtrelemek icin.
   */
  function isJobTitle(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    return /\b(engineer|developer|manager|director|ceo|cto|cfo|coo|founder|co-founder|kurucu|mudur|müdür|baskan|başkan|yonetici|yönetici|specialist|uzman|analyst|analist|consultant|danışman|designer|tasarımcı)\b/i.test(lower);
  }

  // ============================================================
  //  POST ICERIK CIKARMA
  // ============================================================

  /**
   * Post icerik metnini cikarir.
   * SDUI'da: data-testid="expandable-text-box" icindeki span
   * Fallback: birden fazla CSS selector zinciri
   */
  function extractPostContent(container) {
    if (!container) return '';

    // Selector zinciri — onceki calisan bulununca doner
    var contentSelectors = [
      // SDUI birincil
      'span[data-testid="expandable-text-box"]',
      '[data-testid="main-feed-activity-card__commentary"]',
      '[data-testid*="commentary"]',
      // SDUI alternatif
      '[data-testid="feed-shared-text"]',
      '[data-testid*="shared-text"]',
      // Eski LinkedIn secicileri
      '.feed-shared-update-v2__description .break-words',
      '.update-components-text .break-words',
      '.feed-shared-text .break-words',
      '.update-components-text',
      'div[dir="ltr"].feed-shared-update-v2__commentary',
      '.feed-shared-inline-show-more-text',
      // Genel fallback
      '[data-testid*="text-box"]',
      '.update-components-text__text-view',
    ];

    for (var i = 0; i < contentSelectors.length; i++) {
      try {
        var el = container.querySelector(contentSelectors[i]);
        if (el) {
          var text = (el.textContent || '').trim();
          if (text && text.length > 0) {
            debug('Icerik selektoru:', contentSelectors[i]);
            return text;
          }
        }
      } catch (e) {
        // Gecersiz selektoru atla
      }
    }

    return '';
  }

  // ============================================================
  //  HASHTAG VE MENTION CIKARMA
  // ============================================================

  /**
   * Post icerisindeki hashtag'leri cikarir.
   * Hem DOM'dan (linkler) hem de metin iceriginden bulur.
   */
  function extractHashtags(container, content) {
    if (!container) return [];

    var hashtags = [];
    var seen = {};

    // Yontem 1: DOM'daki hashtag linkleri
    var hashtagLinkSelectors = [
      'a[href*="/feed/hashtag/"]',
      'a[href*="keywords=%23"]',
      'a[href*="hashtag"]',
    ];
    for (var s = 0; s < hashtagLinkSelectors.length; s++) {
      try {
        var links = container.querySelectorAll(hashtagLinkSelectors[s]);
        for (var l = 0; l < links.length; l++) {
          var linkText = (links[l].textContent || '').trim();
          // # isareti varsa kaldir, yoksa ekle
          var tag = linkText.replace(/^#/, '').trim();
          if (tag && !seen[tag.toLowerCase()]) {
            seen[tag.toLowerCase()] = true;
            hashtags.push(tag);
          }
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 2: Icerik metninden regex ile hashtag cikarimi
    if (content) {
      var hashRegex = /#([a-zA-Z0-9\u00C0-\u024F\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc_]+)/g;
      var match;
      while ((match = hashRegex.exec(content)) !== null) {
        var tag = match[1];
        if (tag && !seen[tag.toLowerCase()]) {
          seen[tag.toLowerCase()] = true;
          hashtags.push(tag);
        }
      }
    }

    return hashtags;
  }

  /**
   * Post icerisindeki mention'lari (@ ile etiketlenmis kisiler/sirketler) cikarir.
   */
  function extractMentions(container) {
    if (!container) return [];

    var mentions = [];
    var seen = {};

    // Yontem 1: Post icerigi icerisindeki profil/sirket linkleri
    // (author linki haric — o zaten yazar)
    // SDUI'da mention'lar post icerigi icerisindeki a[href*="/in/"] veya a[href*="/company/"] olarak gelir
    var contentArea = container.querySelector('span[data-testid="expandable-text-box"]') ||
                      container.querySelector('[data-testid*="commentary"]') ||
                      container.querySelector('.feed-shared-update-v2__description') ||
                      container.querySelector('.update-components-text');

    if (contentArea) {
      var mentionLinks = contentArea.querySelectorAll('a[href*="/in/"], a[href*="/company/"]');
      for (var m = 0; m < mentionLinks.length; m++) {
        var href = mentionLinks[m].getAttribute('href') || '';
        var name = (mentionLinks[m].textContent || '').trim();
        var cleanHref = cleanUrl(href);

        if (name && cleanHref && !seen[cleanHref]) {
          seen[cleanHref] = true;
          mentions.push({
            name: name,
            linkedinUrl: cleanHref,
            type: href.includes('/company/') ? 'Company' : 'Person',
          });
        }
      }
    }

    // Yontem 2: data-attribute bazli mention'lar
    try {
      var mentionEls = container.querySelectorAll('[data-testid*="mention"], [data-entity-type="MINI_PROFILE"], [data-entity-type="MINI_COMPANY"]');
      for (var me = 0; me < mentionEls.length; me++) {
        var meName = (mentionEls[me].textContent || '').trim();
        var meLink = mentionEls[me].closest('a');
        var meHref = meLink ? cleanUrl(meLink.getAttribute('href') || '') : '';

        if (meName && !seen[meName.toLowerCase()]) {
          seen[meName.toLowerCase()] = true;
          mentions.push({
            name: meName,
            linkedinUrl: meHref,
            type: (meHref && meHref.includes('/company/')) ? 'Company' : 'Person',
          });
        }
      }
    } catch (e) {
      // Devam et
    }

    return mentions;
  }

  // ============================================================
  //  ZAMAN BILGISI CIKARMA
  // ============================================================

  /**
   * Zaman bilgisini cikarir.
   * SDUI'da: globe-americas-small SVG'sinin parent p'sinde
   * Format: "3 hafta", "3 gun", "3 ay", "4 yil", "2h", "1w" vb.
   * Fallback: time elementi, aria-label, data-testid
   */
  function extractTimestamp(container) {
    if (!container) return '';

    // Yontem 1: data-testid bazli zaman alani
    var testIdSelectors = [
      '[data-testid="actor-subDescription"]',
      '[data-testid*="timestamp"]',
      '[data-testid*="post-time"]',
      '[data-testid*="published"]',
    ];
    for (var ti = 0; ti < testIdSelectors.length; ti++) {
      try {
        var tiEl = container.querySelector(testIdSelectors[ti]);
        if (tiEl) {
          var tiText = (tiEl.textContent || '').trim().replace(/[•·]/g, '').trim();
          if (tiText && isTimeText(tiText)) {
            var tiIso = relativeTimeToISO(tiText);
            return tiIso || tiText;
          }
          // Iceride zaman metni aranabilir
          var timeFromInner = findTimeTextInElement(tiEl);
          if (timeFromInner) {
            var tiIso2 = relativeTimeToISO(timeFromInner);
            return tiIso2 || timeFromInner;
          }
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 2: Globe SVG'sini bul — zamani gosterir
    var globeSelectors = [
      'svg#globe-americas-small',
      'use[href*="globe-americas"]',
      'use[href*="globe"]',
      'svg[data-testid*="globe"]',
      'li-icon[type="globe-americas-small"]',
    ];

    var globeSvg = null;
    for (var gs = 0; gs < globeSelectors.length; gs++) {
      try {
        globeSvg = container.querySelector(globeSelectors[gs]);
        if (globeSvg) break;
      } catch (e) {
        // Devam et
      }
    }

    if (globeSvg) {
      // SVG'nin parent p veya span'ini bul
      var parent = globeSvg;
      for (var i = 0; i < 6; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        if (parent.tagName === 'P' || parent.tagName === 'SPAN' || parent.tagName === 'DIV') {
          var timeText = (parent.textContent || '').trim();
          // "3 hafta •" veya "3 gun •" gibi metinlerden zamani cikar
          var cleaned = timeText.replace(/[•·]/g, '').trim();
          if (cleaned && isTimeText(cleaned)) {
            var iso = relativeTimeToISO(cleaned);
            return iso || cleaned;
          }
          // Zaman pattern'ini iceren metin ara
          var timeMatch = cleaned.match(/(\d+)\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|saniye|sn|dk|sa|h|d|w|mo|y|min|hour|day|week|month|year)s?/i);
          if (timeMatch) {
            var extracted = timeMatch[0].trim();
            var isoEx = relativeTimeToISO(extracted);
            return isoEx || extracted;
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
        parent = parent.parentElement;
      }
    }

    // Yontem 3: Zaman metni icin genel arama — p tag'leri arasinda "X hafta", "X gun" vb.
    var allPs = container.querySelectorAll('p, span.visually-hidden');
    for (var j = 0; j < allPs.length; j++) {
      var pText = (allPs[j].textContent || '').trim();
      // "3 hafta •" veya "2 gun •" formatinda mi?
      var cleanedP = pText.replace(/[•·]/g, '').trim();
      if (/^\d+\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|h|d|w|mo|y)/i.test(cleanedP)) {
        var isoP = relativeTimeToISO(cleanedP);
        return isoP || cleanedP;
      }
    }

    // Yontem 4: <time> elementi (eski LinkedIn)
    var timeEl = container.querySelector('time[datetime]');
    if (timeEl) {
      return timeEl.getAttribute('datetime') || '';
    }

    // Yontem 5: Eski LinkedIn fallback
    var oldSelectors = [
      '.update-components-actor__sub-description .visually-hidden',
      '.feed-shared-actor__sub-description .visually-hidden',
      '.update-components-actor__sub-description span[aria-hidden="true"]',
    ];
    for (var os = 0; os < oldSelectors.length; os++) {
      try {
        var oldEl = container.querySelector(oldSelectors[os]);
        if (oldEl) {
          var oldText = (oldEl.textContent || '').replace(/\s+/g, ' ').trim();
          if (oldText) {
            var isoOld = relativeTimeToISO(oldText);
            return isoOld || oldText;
          }
        }
      } catch (e) {
        // Devam et
      }
    }

    // Yontem 6: aria-label'da zaman bilgisi
    try {
      var ariaEls = container.querySelectorAll('[aria-label]');
      for (var ae = 0; ae < Math.min(ariaEls.length, 20); ae++) {
        var ariaText = (ariaEls[ae].getAttribute('aria-label') || '').toLowerCase();
        var ariaTimeMatch = ariaText.match(/(\d+)\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|h|d|w|mo|y|hour|day|week|month|year)s?\s*(ago|once|önce)?/i);
        if (ariaTimeMatch) {
          var ariaExtracted = ariaTimeMatch[0].trim();
          var ariaIso = relativeTimeToISO(ariaExtracted);
          return ariaIso || ariaExtracted;
        }
      }
    } catch (e) {
      // Devam et
    }

    return '';
  }

  /**
   * Element icerisindeki zaman metnini bulur.
   */
  function findTimeTextInElement(element) {
    if (!element) return null;
    var text = (element.textContent || '').trim().replace(/[•·]/g, '').trim();
    var match = text.match(/(\d+)\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|saniye|sn|dk|sa|h|d|w|mo|y|min|hour|day|week|month|year)s?/i);
    if (match) return match[0].trim();
    return null;
  }

  /**
   * Relative zaman metnini ISO tarihine cevirir.
   * Turkce ve Ingilizce destekler.
   * Ornekler: "3 hafta", "2 gun", "3 ay", "4 yil", "2h", "3d", "1w"
   */
  function relativeTimeToISO(text) {
    if (!text) return null;
    text = text.toLowerCase().replace(/[•·]/g, '').replace(/\s*(ago|once|önce)\s*/i, '').trim();

    var now = new Date();
    var match;

    // "Simdi" / "Just now"
    if (/^(simdi|şimdi|just\s*now|now)$/i.test(text)) {
      return now.toISOString();
    }

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
    var allSpans = container.querySelectorAll('span');
    for (var s = 0; s < allSpans.length; s++) {
      var spanText = (allSpans[s].textContent || '').trim().toLowerCase();
      // Sadece engagement metni iceren kisa span'lar
      if (spanText.length < 50 && /\d/.test(spanText)) {
        if (/tepki|reaction|begeni|like|yorum|comment|yeniden|repost|share|paylasim/.test(spanText)) {
          engagementTexts.push(spanText);
        }
      }
    }

    // Yontem 3: data-testid bazli engagement alanlari
    var engagementTestIds = [
      '[data-testid*="social-counts"]',
      '[data-testid*="reaction-count"]',
      '[data-testid*="comment-count"]',
      '[data-testid*="repost-count"]',
      '[data-testid*="share-count"]',
    ];
    for (var et = 0; et < engagementTestIds.length; et++) {
      try {
        var etEls = container.querySelectorAll(engagementTestIds[et]);
        for (var ete = 0; ete < etEls.length; ete++) {
          var etText = (etEls[ete].textContent || '').trim().toLowerCase();
          if (etText && /\d/.test(etText)) {
            engagementTexts.push(etText);
          }
        }
      } catch (e) {
        // Devam et
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
    var postImageUrlPatterns = ['feedshare-shrink', 'article-cover_image', 'mediaUploadImage', 'feedshare_'];

    // Birincil: SDUI post gorselleri (alt text bazli)
    var imgSelectors = [
      'img[alt="Resmi görüntüle"]',     // Turkce
      'img[alt="Resmi goruntule"]',      // Turkce (ASCII)
      'img[alt="View image"]',           // Ingilizce
      'img[alt*="Resmi"]',              // Turkce genel
      'img[alt*="resmi"]',              // Turkce kucuk harf
      'img[alt*="Image"]',              // Ingilizce genel
      'img[alt*="image"]',              // Ingilizce kucuk harf
      'img[alt*="photo"]',              // Ingilizce foto
      'img[alt*="Foto"]',               // Turkce foto
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

    // data-testid bazli gorsel arama
    var testIdImgSelectors = [
      '[data-testid*="feed-image"] img',
      '[data-testid*="shared-image"] img',
      '[data-testid*="media-image"] img',
      '[data-testid*="carousel"] img',
    ];
    for (var ti = 0; ti < testIdImgSelectors.length; ti++) {
      try {
        var tiImgs = container.querySelectorAll(testIdImgSelectors[ti]);
        for (var tii = 0; tii < tiImgs.length; tii++) {
          addImage(tiImgs[tii], images, seenSrcs);
        }
      } catch (e) {
        // Devam et
      }
    }

    // URL pattern bazli arama — feedshare-shrink, article-cover vb.
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
        '.feed-shared-image img',
        '.feed-shared-carousel__image img',
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
    if (src && !src.startsWith('data:') && !src.includes('hashtagicon') && !src.includes('spacer') && !src.includes('ghost') && !seenSrcs[src]) {
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

      // data-activity-urn attribute
      var activityUrn = container.querySelector('[data-activity-urn]');
      if (activityUrn) urnSources.push(activityUrn.getAttribute('data-activity-urn'));

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

    // Yontem 3: data-testid'de activity ID
    try {
      var testIdEls = container.querySelectorAll('[data-testid]');
      for (var td = 0; td < testIdEls.length; td++) {
        var testIdVal = testIdEls[td].getAttribute('data-testid') || '';
        var tdMatch = testIdVal.match(/(?:activity|share|ugcPost)[:\-](\d{10,})/);
        if (tdMatch) {
          return 'https://www.linkedin.com/feed/update/urn:li:activity:' + tdMatch[1] + '/';
        }
      }
    } catch (e) {
      // Devam et
    }

    // Yontem 4: Pulse/article linkleri (article paylasimi icin)
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

    // Yontem 5: Container icerisindeki activity/feed linklerini tara
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

    // Yontem 6: Fallback — yazar profil sayfasi (en azindan bir link olsun)
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
   * aria-label metninden yazar adini cikarir.
   * "Emrah'in profilini goruntule" -> "Emrah"
   * "View John's profile" -> "John"
   */
  function extractNameFromAriaLabel(ariaLabel) {
    if (!ariaLabel) return null;

    // Turkce: "X'in profilini goruntule" veya "X'nın profilini..."
    var trMatch = ariaLabel.match(/^(.+?)(?:'|'|&#39;)?(?:n[iı]n?\s|'s?\s)/i);
    if (trMatch) return trMatch[1].trim();

    // Ingilizce: "View X's profile" veya "X's profile"
    var enMatch = ariaLabel.match(/(?:View\s+)?(.+?)(?:'s?\s+profile)/i);
    if (enMatch) return enMatch[1].trim();

    // "Visit X" pattern
    var visitMatch = ariaLabel.match(/(?:Visit|Ziyaret)\s+(.+?)(?:'s?\s|$)/i);
    if (visitMatch) return visitMatch[1].trim();

    return null;
  }

  /**
   * img alt text'inden yazar adini cikarir.
   * "Emrah'in profilini goruntule" -> "Emrah"
   * "View Emrah's profile" -> "Emrah"
   */
  function extractNameFromAltText(alt) {
    if (!alt) return null;

    // Turkce: "X'in profilini goruntule"
    var trMatch = alt.match(/^(.+?)(?:'|&#39;|')?(?:n[iı]n?\s|s\s|'s\s)/i);
    if (trMatch) return trMatch[1].trim();

    // Ingilizce: "View X's profile"
    var enMatch = alt.match(/(?:View\s+)?(.+?)(?:'s?\s+profile)/i);
    if (enMatch) return enMatch[1].trim();

    return null;
  }

  /**
   * Metnin yardimci/helper metin olup olmadigini kontrol eder.
   * Profil goruntuleme linki, "takip et" gibi metinleri filtreler.
   */
  function isHelperText(text) {
    if (!text) return false;
    var lower = text.toLowerCase();
    return /profilini\s*g|profili\s*g|view\s*profile|takip\s*et|follow|connect|ba[gğ]lan|mesaj\s*gonder|send\s*message|daha\s*fazla|more$/i.test(lower);
  }

  /**
   * Metnin zaman metni olup olmadigini kontrol eder.
   * Daha genis pattern destegiyle.
   */
  function isTimeText(text) {
    if (!text) return false;
    var cleaned = text.replace(/[•·]/g, '').trim();
    return /^\d+\s*(hafta|gün|gun|ay|yıl|yil|saat|dakika|saniye|sn|dk|sa|h|d|w|mo|y|min|hour|day|week|month|year)s?\s*(ago|once|önce)?\s*$/i.test(cleaned) ||
           /^(simdi|şimdi|just\s*now|now)$/i.test(cleaned);
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

  // ============================================================
  //  DEBUG MODU
  // ============================================================

  /**
   * Debug modunu acip kapatir.
   * Konsol'da: LinkedInParser.setDebug(true)
   */
  function setDebug(enabled) {
    DEBUG_MODE = !!enabled;
    console.log(LOG + ' Debug modu:', DEBUG_MODE ? 'ACIK' : 'KAPALI');
    return DEBUG_MODE;
  }

  /**
   * Mevcut parser durumunu raporlar (debug icin).
   * Konsol'da: LinkedInParser.diagnose()
   */
  function diagnose() {
    var report = {
      pageType: detectPageType(),
      url: window.location.href,
      postElements: 0,
      parsedPosts: 0,
      errors: [],
    };

    try {
      var elements = findPostElements();
      report.postElements = elements ? elements.length : 0;
    } catch (e) {
      report.errors.push('findPostElements hatasi: ' + e.message);
    }

    try {
      var posts = parsePostCards();
      report.parsedPosts = posts.length;

      // Her post icin hangi alanlarin bos oldugunu raporla
      var fieldStats = {
        authorName: 0, authorTitle: 0, authorCompany: 0,
        content: 0, publishedAt: 0, linkedinPostUrl: 0,
        authorProfilePicture: 0, hashtags: 0, mentions: 0,
      };
      for (var i = 0; i < posts.length; i++) {
        if (posts[i].authorName) fieldStats.authorName++;
        if (posts[i].authorTitle) fieldStats.authorTitle++;
        if (posts[i].authorCompany) fieldStats.authorCompany++;
        if (posts[i].content) fieldStats.content++;
        if (posts[i].publishedAt) fieldStats.publishedAt++;
        if (posts[i].linkedinPostUrl) fieldStats.linkedinPostUrl++;
        if (posts[i].authorProfilePicture) fieldStats.authorProfilePicture++;
        if (posts[i].hashtags && posts[i].hashtags.length > 0) fieldStats.hashtags++;
        if (posts[i].mentions && posts[i].mentions.length > 0) fieldStats.mentions++;
      }
      report.fieldStats = fieldStats;
    } catch (e) {
      report.errors.push('parsePostCards hatasi: ' + e.message);
    }

    console.log(LOG + ' Teshis Raporu:', JSON.stringify(report, null, 2));
    return report;
  }

  // ---- Public API ----
  return {
    detectPageType: detectPageType,
    parsePostCards: parsePostCards,
    parsePostsFromPage: parsePostsFromPage,
    parsePostElement: parsePostElement,
    getPostCount: getPostCount,
    extractEngagementCount: extractEngagementCount,
    // Yeni API'ler
    setDebug: setDebug,
    diagnose: diagnose,
  };
})();
