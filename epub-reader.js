function initEpubReader(encodedUrl) {
  var bookUrl = atob(encodedUrl);

  var bookmarkKey = "epub_pos_" + btoa(window.location.pathname + encodedUrl.slice(-20)).replace(/=/g, '');

  var savedCfi = null;
  try {
    savedCfi = localStorage.getItem(bookmarkKey);
  } catch (e) {
    console.warn("Không thể truy cập localStorage:", e);
  }

  var isInternalDark = false;

  var book = ePub(bookUrl);
  var rendition = book.renderTo("epub-viewer", {
    width: "100%",
    height: "100%",
    spread: "always"
  });

  window.currentRendition = rendition;
  
  // Đồng bộ ô Mục lục khi trang thay đổi
rendition.on('relocated', function(location) {
  const tocSelect = document.getElementById('toc-select');
  if (!tocSelect || !location.start) return;

  const currentHref = location.start.href;

  for (let i = 0; i < tocSelect.options.length; i++) {
    const option = tocSelect.options[i];
    if (option.value && currentHref.includes(option.value)) {
      tocSelect.value = option.value;
      break;
    }
  }
});

  function applyThemeToDoc(doc, isDark) {
    if (!doc) return;
    var target = doc.head || doc.body || doc.documentElement;
    if (!target) return;
    
    var styleEl = doc.getElementById("epub-override-css");
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "epub-override-css";
      target.appendChild(styleEl);
    } else {
      target.appendChild(styleEl);
    }

    if (isDark) {
      styleEl.textContent = 
        "html, body { background-color: #1e1e1e !important; color: #e2e8f0 !important; line-height: 1.6 !important; }" +
        "html *, body * { color: #e2e8f0 !important; background-color: #1e1e1e !important; line-height: 1.6 !important; }" +
        "a, a * { color: #60a5fa !important; }" +
        "img { opacity: 0.85; }";
    } else {
      styleEl.textContent = 
        "html, body { background-color: #ffffff !important; color: #000000 !important; line-height: 1.6 !important; }" +
        "html *, body * { color: #000000 !important; background-color: #ffffff !important; line-height: 1.6 !important; }";
    }
  }

  window.applyEpubTheme = function(isDark) {
    if (typeof isDark !== "boolean") isDark = isInternalDark;

    var container = document.getElementById("epub-container");
    var viewer = document.getElementById("epub-viewer");
    var controls = document.getElementById("epub-controls");
    var progressText = document.getElementById("progress-text");
    var pageDisplay = document.getElementById("page-display");
    
    var fontSelect = document.getElementById("font-select");
    var tocSelect = document.getElementById("toc-select");
    var zoomIn = document.getElementById("zoom-in");
    var zoomOut = document.getElementById("zoom-out");
    var prevBtn = document.getElementById("prev-btn");
    var nextBtn = document.getElementById("next-btn");

    var bgColor = isDark ? "#1e1e1e" : "#ffffff";
    var controlBg = isDark ? "#2d2d2d" : "#f8fafc";
    var borderColor = isDark ? "#3f3f46" : "#e2e8f0";
    var textColor = isDark ? "#e2e8f0" : "#334155";
    var inputBg = isDark ? "#3f3f46" : "#ffffff";
    var inputBorder = isDark ? "#52525b" : "#cbd5e1";

    if (container) {
      container.style.backgroundColor = bgColor;
      container.style.borderColor = borderColor;
    }
    if (viewer) {
      viewer.style.backgroundColor = bgColor;
      viewer.style.borderColor = borderColor;
    }
    if (controls) {
      controls.style.backgroundColor = controlBg;
      controls.style.borderColor = borderColor;
      controls.style.color = textColor;
    }

    if (progressText) progressText.style.color = isDark ? "#94a3b8" : "#475569";
    if (pageDisplay) pageDisplay.style.color = isDark ? "#94a3b8" : "#475569";

    [fontSelect, tocSelect, zoomIn, zoomOut, prevBtn, nextBtn].forEach(function(el) {
      if (el) {
        el.style.backgroundColor = inputBg;
        el.style.color = textColor;
        el.style.borderColor = inputBorder;
      }
    });

    if (rendition && rendition.getContents) {
      try {
        rendition.getContents().forEach(function(content) {
          var doc = content.document || (content.window && content.window.document);
          if (doc) applyThemeToDoc(doc, isDark);
        });
      } catch(e) {}
    }

    var iframes = document.querySelectorAll("#epub-viewer iframe");
    iframes.forEach(function(iframe) {
      try {
        var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (doc) applyThemeToDoc(doc, isDark);
      } catch(e) {}
    });
  };

  var themeBtn = document.getElementById("reader-theme-btn");
  var themeIcon = document.getElementById("theme-btn-icon");
  var themeText = document.getElementById("theme-btn-text");

  var iconMoon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var iconSun = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  themeBtn.addEventListener("click", function() {
    isInternalDark = !isInternalDark;
    if (isInternalDark) {
      themeIcon.innerHTML = iconSun;
      themeText.innerText = "Chế độ sáng";
      themeBtn.style.backgroundColor = "#3f3f46";
      themeBtn.style.color = "#f8fafc";
      themeBtn.style.borderColor = "#52525b";
    } else {
      themeIcon.innerHTML = iconMoon;
      themeText.innerText = "Chế độ tối";
      themeBtn.style.backgroundColor = "#ffffff";
      themeBtn.style.color = "#334155";
      themeBtn.style.borderColor = "#cbd5e1";
    }
    window.applyEpubTheme(isInternalDark);
  });

  function handleKeyPress(e) {
    if (e.key === "ArrowLeft" || e.keyCode === 37) {
      rendition.prev();
    } else if (e.key === "ArrowRight" || e.keyCode === 39) {
      rendition.next();
    }
  }
  document.addEventListener("keydown", handleKeyPress);

  rendition.hooks.content.register(function(contents) {
    contents.addStylesheet("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap");

    var doc = contents.document || (contents.window && contents.window.document);
    if (!doc) return;

    applyThemeToDoc(doc, isInternalDark);

    doc.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
    doc.addEventListener('copy', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, true);
    doc.addEventListener('keydown', function(e) {
      if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); e.stopPropagation(); return false; }
      if (e.ctrlKey && ['u', 'U', 'c', 'C', 's', 'S', 'p', 'P'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); return false; }
      handleKeyPress(e);
    }, true);
  });

  book.ready.then(function() {
    return book.locations.generate(1000);
  }).then(function() {
    var loc = rendition.currentLocation();
    if (loc && loc.start) updateProgress(loc);
  });

  function updateProgress(location) {
    if (book.locations && book.locations.total && location && location.start) {
      var percent = book.locations.percentageFromCfi(location.start.cfi);
      var percentage = Math.round(percent * 100);
      document.getElementById("progress-bar").style.width = percentage + "%";
      document.getElementById("progress-text").innerText = "Tiến trình: " + percentage + "%";
      document.getElementById("page-display").innerText = "Vị trí: " + location.start.location + " / " + book.locations.total;
    }
  }

  rendition.on("relocated", function(location) {
    updateProgress(location);
    window.applyEpubTheme(isInternalDark);

    if (location && location.start && location.start.cfi) {
      try { localStorage.setItem(bookmarkKey, location.start.cfi); } catch (err) {}
    }
  });

  var startPromise = savedCfi ? rendition.display(savedCfi) : rendition.display();

  startPromise.then(function() {
    rendition.themes.font("'Be Vietnam Pro', sans-serif");
    window.applyEpubTheme(isInternalDark);
  }).catch(function(error) {
    rendition.display().then(function() {
      rendition.themes.font("'Be Vietnam Pro', sans-serif");
      window.applyEpubTheme(isInternalDark);
    });
  });

  book.loaded.navigation.then(function(toc) {
    var select = document.getElementById("toc-select");
    select.innerHTML = "";
    var defaultOption = document.createElement("option");
    defaultOption.text = "-- Chọn chương --";
    defaultOption.value = "";
    select.appendChild(defaultOption);

    function renderTocItems(items, level) {
      items.forEach(function(chapter) {
        var option = document.createElement("option");
        option.text = "— ".repeat(level) + chapter.label.trim();
        option.value = chapter.href;
        select.appendChild(option);
        if (chapter.subitems && chapter.subitems.length > 0) renderTocItems(chapter.subitems, level + 1);
      });
    }
    renderTocItems(toc.toc, 0);

    select.addEventListener("change", function(e) {
      if (e.target.value) rendition.display(e.target.value);
    });
  });

  var currentFontSize = 100;
  document.getElementById("zoom-in").addEventListener("click", function() {
    currentFontSize = Math.min(currentFontSize + 10, 200);
    rendition.themes.fontSize(currentFontSize + "%");
    document.getElementById("font-size-display").innerText = currentFontSize + "%";
  });
  document.getElementById("zoom-out").addEventListener("click", function() {
    currentFontSize = Math.max(currentFontSize - 10, 70);
    rendition.themes.fontSize(currentFontSize + "%");
    document.getElementById("font-size-display").innerText = currentFontSize + "%";
  });

  document.getElementById("font-select").addEventListener("change", function(e) {
    rendition.themes.font(e.target.value);
  });

  var container = document.getElementById("epub-container");
  var fsBtn = document.getElementById("fullscreen-btn");
  var viewer = document.getElementById("epub-viewer");
  var iconFS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  var iconExitFS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
  var isFullScreen = false;

  function toggleFullscreen(active) {
    isFullScreen = active;
    if (active) {
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100vw";
      container.style.height = "100dvh";
      container.style.zIndex = "999999";
      container.style.borderRadius = "0";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.padding = "0 0 10px 0";
      viewer.style.flex = "1";
      viewer.style.height = "auto";
      viewer.style.minHeight = "0";
      fsBtn.innerHTML = iconExitFS + " <span>Thu nhỏ</span>";
      document.body.style.overflow = "hidden";
    } else {
      container.style.position = "";
      container.style.top = "";
      container.style.left = "";
      container.style.width = "";
      container.style.height = "";
      container.style.zIndex = "";
      container.style.borderRadius = "8px";
      container.style.display = "";
      container.style.flexDirection = "";
      container.style.padding = "0 0 10px 0";
      viewer.style.flex = "";
      viewer.style.height = "600px";
      viewer.style.minHeight = "";
      fsBtn.innerHTML = iconFS + " <span>Toàn màn hình</span>";
      document.body.style.overflow = "";
    }
    window.applyEpubTheme(isInternalDark);
    setTimeout(function() { rendition.resize("100%", "100%"); }, 100);
  }

  fsBtn.addEventListener("click", function() { toggleFullscreen(!isFullScreen); });

  var resizeTimer;
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { rendition.resize("100%", "100%"); }, 150);
  });

  document.getElementById("prev-btn").addEventListener("click", function() { rendition.prev(); });
  document.getElementById("next-btn").addEventListener("click", function() { rendition.next(); });

  document.getElementById('toc-select')?.addEventListener('change', function(e) {
  if (e.target.value && typeof rendition !== 'undefined') {
    rendition.display(e.target.value);
  }
});
}
