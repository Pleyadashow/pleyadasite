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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 640 && mobileMenu.classList.contains("is-open")) closeMenu();
    });
  }

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

  /* TikTok embed script: inject only once the feed nears the viewport */
  const tiktokFeed = document.querySelector("[data-tiktok-lazy]");
  if (tiktokFeed) {
    const loadTikTokEmbed = () => {
      if (document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) return;
      /* TikTok's embed player reads its UI language from navigator.language
         (it ignores any blockquote attribute) — override it only for the
         duration of the embed script's DOM work, then restore it. Using
         navigator.language instead of the page URL keeps this invisible to
         GA4 pageview tracking and the canonical tag, since neither reacts
         to navigator.language changes. */
      let restored = false;
      let languageOverridden = false;
      try {
        Object.defineProperty(window.navigator, "language", { value: "uk-UA", configurable: true });
        languageOverridden = true;
      } catch (e) { /* some browsers may refuse; TikTok just falls back to the real browser language */ }

      const restoreLanguage = () => {
        if (restored) return;
        restored = true;
        observer.disconnect();
        clearTimeout(safetyTimer);
        if (languageOverridden) delete window.navigator.language;
      };

      const items = tiktokFeed.querySelectorAll(".tiktok-feed-item");
      const observer = new MutationObserver(() => {
        const converted = tiktokFeed.querySelectorAll(".tiktok-feed-item iframe").length;
        if (converted >= items.length) restoreLanguage();
      });
      observer.observe(tiktokFeed, { childList: true, subtree: true });
      // Safety net only, in case some card never finishes converting (blocked script, deleted video, etc.)
      const safetyTimer = setTimeout(restoreLanguage, 20000);

      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    };
    if ("IntersectionObserver" in window) {
      const tio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadTikTokEmbed();
            tio.disconnect();
          }
        });
      }, { rootMargin: "300px 0px" });
      tio.observe(tiktokFeed);
    } else {
      loadTikTokEmbed();
    }
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
  });

  /* TikTok feed prev/next scroll buttons */
  const tiktokPrev = document.querySelector(".tiktok-feed-prev");
  const tiktokNext = document.querySelector(".tiktok-feed-next");
  if (tiktokFeed && (tiktokPrev || tiktokNext)) {
    const scrollByCard = (dir) => {
      const card = tiktokFeed.querySelector(".tiktok-feed-item");
      const step = card ? card.getBoundingClientRect().width + 16 : 340;
      tiktokFeed.scrollBy({ left: dir * step, behavior: "smooth" });
    };
    tiktokPrev?.addEventListener("click", () => scrollByCard(-1));
    tiktokNext?.addEventListener("click", () => scrollByCard(1));
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
