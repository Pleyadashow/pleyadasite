(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header state on scroll */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile hamburger menu */
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
  if (menuToggle && mobileMenu) {
    const closeMenu = () => {
      menuToggle.classList.remove("is-active");
      menuToggle.setAttribute("aria-expanded", "false");
      mobileMenu.classList.remove("is-open");
      mobileMenu.setAttribute("aria-hidden", "true");
      mobileMenuBackdrop?.classList.remove("is-open");
      document.body.style.overflow = "";
      mobileMenu.querySelectorAll(".mobile-submenu.is-open").forEach((sm) => sm.classList.remove("is-open"));
      mobileMenu.querySelectorAll('.mobile-menu-caret[aria-expanded="true"]').forEach((c) => c.setAttribute("aria-expanded", "false"));
    };
    const openMenu = () => {
      menuToggle.classList.add("is-active");
      menuToggle.setAttribute("aria-expanded", "true");
      mobileMenu.classList.add("is-open");
      mobileMenu.setAttribute("aria-hidden", "false");
      mobileMenuBackdrop?.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };
    menuToggle.addEventListener("click", () => {
      if (mobileMenu.classList.contains("is-open")) closeMenu(); else openMenu();
    });
    mobileMenuBackdrop?.addEventListener("click", closeMenu);
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

    /* Accordion submenus (e.g. "Тематичні вечірки" — its own link + a
       separate ▾ caret that expands/collapses the nested list) */
    mobileMenu.querySelectorAll(".mobile-menu-caret").forEach((caret) => {
      const submenu = document.getElementById(caret.getAttribute("aria-controls"));
      if (!submenu) return;
      caret.addEventListener("click", () => {
        const isOpen = submenu.classList.toggle("is-open");
        caret.setAttribute("aria-expanded", String(isOpen));
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 880 && mobileMenu.classList.contains("is-open")) closeMenu();
    });
  }

  /* Desktop nav dropdown (e.g. "Тематичні вечірки"): opens instantly on
     hover/focus of the whole trigger+panel container, and closes after a
     short delay so a diagonal mouse path from the trigger into the panel
     has time to land — without the delay, mouseleave could fire mid-transit
     and yank the panel away before the click ever registers. The caret
     click is the equivalent for touch/keyboard. */
  document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
    const caret = dropdown.querySelector(".nav-dropdown-caret");
    const menu = dropdown.querySelector(".nav-dropdown-menu");
    if (!caret || !menu) return;
    let closeTimer = null;

    const open = () => {
      clearTimeout(closeTimer);
      menu.classList.add("is-open");
      caret.setAttribute("aria-expanded", "true");
    };
    const closeNow = () => {
      clearTimeout(closeTimer);
      menu.classList.remove("is-open");
      caret.setAttribute("aria-expanded", "false");
    };
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(closeNow, 150);
    };

    dropdown.addEventListener("mouseenter", open);
    dropdown.addEventListener("mouseleave", scheduleClose);
    dropdown.addEventListener("focusin", open);
    dropdown.addEventListener("focusout", (e) => {
      if (!dropdown.contains(e.relatedTarget)) scheduleClose();
    });
    caret.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.classList.contains("is-open")) closeNow(); else open();
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) closeNow();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNow();
    });
  });

  /* Back-to-top button visibility */
  const backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    const onScrollTop = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
    };
    onScrollTop();
    window.addEventListener("scroll", onScrollTop, { passive: true });
  }

  /* Parallax: hero media moves slower than content */
  const heroMedia = document.querySelector("[data-parallax]");
  if (heroMedia && !reduceMotion) {
    let ticking = false;
    const speed = 0.35;
    const update = () => {
      const y = window.scrollY;
      heroMedia.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* Reveal-on-scroll */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }
  }

  /* Autoplay/pause looping videos only while in view (saves battery/data) */
  const videos = document.querySelectorAll(".video-item video");
  if (videos.length && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    videos.forEach((v) => vio.observe(v));
  }

  /* Click-to-play local video previews (paperove-shou.html): poster shows
     immediately, the actual file only loads once the user presses play. */
  const videoPreviews = document.querySelectorAll(".video-preview");
  videoPreviews.forEach((preview) => {
    const video = preview.querySelector("video");
    const playBtn = preview.querySelector(".video-play-btn");
    if (!video || !playBtn) return;

    // With preload="none", play() called before any data is buffered fires
    // an immediate "pause" while the browser fetches — it doesn't resume on
    // its own once ready, so re-attempt once "canplay" confirms it can.
    const attemptPlay = () => { if (video.paused) video.play().catch(() => {}); };
    video.addEventListener("canplay", attemptPlay);

    playBtn.addEventListener("click", () => {
      preview.classList.add("is-playing");
      video.setAttribute("controls", "");
      attemptPlay();
    });

    // Videos with an audio track (theme-party pages) start muted regardless
    // of the source file — this button is the only way to turn sound on.
    const unmuteBtn = preview.querySelector(".video-unmute-btn");
    if (unmuteBtn) {
      unmuteBtn.addEventListener("click", () => {
        video.muted = !video.muted;
        unmuteBtn.setAttribute("aria-pressed", String(!video.muted));
        unmuteBtn.setAttribute("aria-label", video.muted ? "Увімкнути звук" : "Вимкнути звук");
      });
    }
  });

  /* Show more / collapse for "Моменти зі свят" (mirrors the mobile-menu
     accordion: grid-template-rows 0fr/1fr transition on .moments-more,
     driven by an .is-open class toggle) */
  const momentsMoreBtn = document.getElementById("moments-more-btn");
  const momentsMore = document.getElementById("moments-more");
  const momentsGrid = document.querySelector(".moments-grid");
  if (momentsMoreBtn && momentsMore && momentsGrid) {
    momentsMoreBtn.addEventListener("click", () => {
      const isOpen = momentsMore.classList.toggle("is-open");
      momentsGrid.classList.toggle("is-expanded", isOpen);
      momentsMoreBtn.textContent = isOpen ? "Згорнути" : "Показати більше";
      momentsMoreBtn.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* Show more / collapse for the photo gallery */
  const galleryGrid = document.querySelector(".gallery-grid");
  const galleryMoreBtn = document.getElementById("gallery-more-btn");
  if (galleryGrid && galleryMoreBtn) {
    galleryMoreBtn.addEventListener("click", () => {
      const expanded = galleryGrid.classList.toggle("is-expanded");
      galleryMoreBtn.textContent = expanded ? "Згорнути" : "Дивитись більше фото";
      galleryMoreBtn.setAttribute("aria-expanded", String(expanded));
    });
  }

  /* Lightbox for the gallery */
  const lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    const lightboxImg = lightbox.querySelector("img");
    const items = Array.from(document.querySelectorAll(".gallery-item"));
    let currentIndex = 0;

    const openAt = (index) => {
      currentIndex = (index + items.length) % items.length;
      const btn = items[currentIndex];
      lightboxImg.src = btn.dataset.full;
      lightboxImg.alt = btn.querySelector("img").alt;
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    items.forEach((btn, index) => {
      btn.addEventListener("click", () => openAt(index));
    });
    lightbox.querySelector(".lightbox-close").addEventListener("click", close);
    lightbox.querySelector(".lightbox-prev").addEventListener("click", () => openAt(currentIndex - 1));
    lightbox.querySelector(".lightbox-next").addEventListener("click", () => openAt(currentIndex + 1));
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") openAt(currentIndex + 1);
      if (e.key === "ArrowLeft") openAt(currentIndex - 1);
    });
  }
})();
