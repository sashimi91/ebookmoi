(function () {
  let book, rendition;
  let isFullScreen = false;
  let isInternalDark = false;
  let currentFontSize = 100;
  let currentFontFamily = "";

  // 1. Áp dụng Theme (Màu nền, màu chữ, Font chữ, Cỡ chữ & Line-height)
  window.applyEpubTheme = function (isDark) {
    isInternalDark = isDark;
    const container = document.getElementById("epub-container");

    if (container) {
      container.style.backgroundColor = isDark ? "#121212" : "#ffffff";
      container.style.color = isDark ? "#e0e0e0" : "#333333";
    }

    const iframe = document.querySelector("#epub-viewer iframe");
    if (iframe && iframe.contentDocument) {
      const doc = iframe.contentDocument;
      let styleEl = doc.getElementById("epub-override-css");
      if (!styleEl) {
        styleEl = doc.createElement("style");
        styleEl.id = "epub-override-css";
        doc.head.appendChild(styleEl);
      }

      const fontStyle = currentFontFamily ? `font-family: ${currentFontFamily} !important;` : "";

      styleEl.textContent = `
        body, p, div, span, a, li, h1, h2, h3, h4, h5, h6 {
          background-color: ${isDark ? "#121212 !important" : "#ffffff !important"};
          color: ${isDark ? "#e0e0e0 !important" : "#222222 !important"};
          line-height: 1.6 !important;
          font-size: ${currentFontSize}% !important;
          ${fontStyle}
        }
      `;
    }
  };

// 2. Chuyển chương thông minh (Làm sạch tiền tố ../ và hỗ trợ Anchor)
function goToChapter(href) {
  if (!href || !rendition) return;

  // Thử chuyển trang trực tiếp với đường dẫn gốc
  rendition.display(href).catch(function () {
    var parts = href.split('#');
    var rawPath = decodeURIComponent(parts[0]);
    var anchor = parts[1] ? '#' + parts[1] : '';

    // Bóc tách làm sạch các tiền tố ../ hoặc ./ ở đầu đường dẫn
    var cleanPath = rawPath.replace(/^(\.\.\/|\.\/)+/, '');
    var fileName = rawPath.split('/').pop();

    if (book && book.spine && book.spine.spineItems) {
      var matchedItem = book.spine.spineItems.find(function (item) {
        return item.href.endsWith(cleanPath) ||
               cleanPath.endsWith(item.href) ||
               item.href.endsWith(fileName);
      });

      if (matchedItem) {
        rendition.display(matchedItem.href + anchor);
      }
    }
  });
}

  // 3. Toàn màn hình CSS
  function toggleFullscreen(active) {
    isFullScreen = active;
    const container = document.getElementById("epub-container");
    const viewer = document.getElementById("epub-viewer");
    const fsBtn = document.getElementById("fs-btn");
    const iconFS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    const iconExitFS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

    if (!container || !viewer) return;

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
      if (fsBtn) fsBtn.innerHTML = iconExitFS + " <span>Thu nhỏ</span>";
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
      if (fsBtn) fsBtn.innerHTML = iconFS + " <span>Toàn màn hình</span>";
      document.body.style.overflow = "";
    }
    window.applyEpubTheme(isInternalDark);
    setTimeout(function () {
      if (rendition) rendition.resize("100%", "100%");
    }, 100);
  }

  // Xử lý phím ESC
  function exitFullScreenHandler(e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && isFullScreen) {
      toggleFullscreen(false);
    }
  }

  document.addEventListener('keydown', exitFullScreenHandler);

  // 4. Khởi tạo chính
  window.initEpubReader = function (epubUrl) {
    if (!epubUrl) return;

    book = ePub(epubUrl);
    rendition = book.renderTo("epub-viewer", {
      width: "100%",
      height: "100%",
      spread: "none"
    });

    rendition.display();

    // Hook gán style nội dung
    rendition.hooks.content.register(function (contents) {
      contents.addStylesheetRules({
        'body, p, div, span, a, li, h1, h2, h3, h4, h5, h6': {
          'line-height': '1.6 !important'
        }
      });
      window.applyEpubTheme(isInternalDark);
    });

    rendition.on('keydown', exitFullScreenHandler);

    // Khởi tạo Locations để tính Vị trí & % Tiến trình
    book.ready.then(function () {
      return book.locations.generate(1000);
    }).then(function () {
      if (rendition.location) {
        updateProgress(rendition.location);
      }
    });

    // Tạo Mục lục đa cấp (Nested TOC)
    book.loaded.navigation.then(function (toc) {
      var select = document.getElementById("toc-select");
      if (!select) return;

      select.innerHTML = "";
      var defaultOption = document.createElement("option");
      defaultOption.text = "-- Chọn chương --";
      defaultOption.value = "";
      select.appendChild(defaultOption);

      function renderTocItems(items, level) {
        if (!items) return;
        items.forEach(function (chapter) {
          if (!chapter.href) return;

          var option = document.createElement("option");
          option.text = "— ".repeat(level) + chapter.label.trim();
          option.value = chapter.href;
          select.appendChild(option);

          var subItems = chapter.subitems || chapter.children;
          if (subItems && subItems.length > 0) {
            renderTocItems(subItems, level + 1);
          }
        });
      }

      renderTocItems(toc.toc, 0);
    });

    // Hàm cập nhật Tiến trình, Vị trí & Đồng bộ Menu
    function updateProgress(location) {
      if (!location || !location.start) return;

      // Đồng bộ Menu Chọn chương
      var select = document.getElementById("toc-select");
      if (select && location.start.href) {
        var cleanHref = decodeURIComponent(location.start.href.split('#')[0]);
        for (var i = 0; i < select.options.length; i++) {
          var optValue = decodeURIComponent(select.options[i].value.split('#')[0]);
          if (optValue && (cleanHref.endsWith(optValue) || optValue.endsWith(cleanHref))) {
            select.selectedIndex = i;
            break;
          }
        }
      }

      // Cập nhật % Tiến trình, Vị trí & Thanh Slider
      if (book.locations && book.locations.length() > 0) {
        var cfi = location.start.cfi;
        var percentage = book.locations.percentageFromCfi(cfi);
        var currentLoc = book.locations.locationFromCfi(cfi);
        var totalLoc = book.locations.length();
        var pctVal = Math.round((percentage || 0) * 100);

        var progressText = document.getElementById("progress-text");
        if (progressText) progressText.innerText = "Tiến trình: " + pctVal + "%";

        var locationText = document.getElementById("location-text");
        if (locationText) locationText.innerText = "Vị trí: " + currentLoc + " / " + totalLoc;

        var progressBar = document.getElementById("progress-bar");
        if (progressBar) progressBar.value = pctVal;
      }
    }

    // Sự kiện lật trang
    rendition.on("relocated", function (location) {
      updateProgress(location);
    });

    // Lấy DOM Elements
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const fsBtn = document.getElementById("fs-btn");
    const themeBtn = document.getElementById("theme-btn");
    const tocSelect = document.getElementById("toc-select");
    const fontSelect = document.getElementById("font-select");
    const fontMinus = document.getElementById("font-minus");
    const fontPlus = document.getElementById("font-plus");
    const fontSizeVal = document.getElementById("font-size-val");
    const progressBar = document.getElementById("progress-bar");


    if (prevBtn) prevBtn.onclick = function () { rendition.prev(); };
    if (nextBtn) nextBtn.onclick = function () { rendition.next(); };
    if (fsBtn) fsBtn.onclick = function () { toggleFullscreen(!isFullScreen); };
    if (themeBtn) themeBtn.onclick = function () { window.applyEpubTheme(!isInternalDark); };

    // Chọn chương
    if (tocSelect) {
      tocSelect.onchange = function (e) {
        if (e.target.value) {
          goToChapter(e.target.value);
          e.target.blur();
        }
      };
    }

    // Chọn Font chữ
    if (fontSelect) {
      fontSelect.onchange = function (e) {
        currentFontFamily = e.target.value;
        window.applyEpubTheme(isInternalDark);
      };
    }

    // Giảm cỡ chữ (A-)
    if (fontMinus) {
      fontMinus.onclick = function () {
        if (currentFontSize > 60) {
          currentFontSize -= 10;
          if (fontSizeVal) fontSizeVal.innerText = currentFontSize + "%";
          window.applyEpubTheme(isInternalDark);
        }
      };
    }

    // Tăng cỡ chữ (A+)
    if (fontPlus) {
      fontPlus.onclick = function () {
        if (currentFontSize < 200) {
          currentFontSize += 10;
          if (fontSizeVal) fontSizeVal.innerText = currentFontSize + "%";
          window.applyEpubTheme(isInternalDark);
        }
      };
    }

    // Kéo thanh Slider Tiến trình
    if (progressBar) {
      progressBar.onchange = function (e) {
        var pct = e.target.value / 100;
        if (book.locations && book.locations.length() > 0) {
          var cfi = book.locations.cfiFromPercentage(pct);
          if (cfi) rendition.display(cfi);
        }
      };
    }
  };
})();
