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
