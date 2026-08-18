/* ============================================================
   ALHAH INDUSTRIES — Scroll Motion Layer (behavior)
   Adds scroll reveals, stagger, parallax and cursor tilt on top
   of the existing markup. Content, order and hover styling are
   left untouched — this only toggles classes / transforms.
   ============================================================ */
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var isMobile = window.matchMedia("(max-width: 768px)").matches;

    // ---------------- Animated mesh background ----------------
    function injectMesh() {
        if (document.getElementById("saMeshBg") || !document.body) return null;
        var mesh = document.createElement("div");
        mesh.id = "saMeshBg";
        mesh.setAttribute("aria-hidden", "true");
        document.body.insertBefore(mesh, document.body.firstChild);
        return mesh;
    }
    var meshEl = injectMesh();

    // ---------------- Identify top-level sections ----------------
    var SKIP_CLASSES = ["whatsapp-float-left", "whatsapp-simple-popup", "back-to-top"];
    function isSkippable(el) {
        if (!(el instanceof HTMLElement)) return true;
        if (el.id === "spinner" || el.id === "saMeshBg") return true;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return true;
        if (el.classList.contains("sticky-top")) return true; // navbar stays static
        if (el.classList.contains("bg-primary") && el.classList.contains("text-white")) return true; // topbar
        for (var i = 0; i < SKIP_CLASSES.length; i++) {
            if (el.classList.contains(SKIP_CLASSES[i])) return true;
        }
        return false;
    }

    var sections = [];
    if (document.body) {
        Array.prototype.forEach.call(document.body.children, function (el) {
            if (isSkippable(el)) return;
            el.classList.add("sa-section");
            sections.push(el);
        });
    }

    // ---------------- Stagger direct grid children ----------------
    var COL_RE = /(^|\s)col(-\S+)?(\s|$)/;
    function tagStagger(section) {
        var rows = section.querySelectorAll(".row");
        rows.forEach(function (row) {
            var i = 0;
            Array.prototype.forEach.call(row.children, function (child) {
                if (child.className && COL_RE.test(child.className)) {
                    child.classList.add("sa-child");
                    child.style.setProperty("--sa-i", Math.min(i, 8));
                    i++;
                }
            });
        });
    }
    sections.forEach(tagStagger);

    // Keep anchor/back-to-top jumps clear of the sticky navbar
    function updateScrollPadding() {
        var nav = document.querySelector(".sticky-top");
        var h = nav ? nav.getBoundingClientRect().height : 0;
        document.documentElement.style.scrollPaddingTop = (h + 16) + "px";
    }
    updateScrollPadding();
    window.addEventListener("resize", updateScrollPadding);

    // ---------------- Reveal on scroll (both directions) ----------------
    if (reduceMotion || !("IntersectionObserver" in window)) {
        sections.forEach(function (s) { s.classList.add("sa-in-view"); });
    } else {
        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    entry.target.classList.toggle("sa-in-view", entry.isIntersecting);
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
        );
        sections.forEach(function (s) { io.observe(s); });
    }

    if (reduceMotion) return; // no parallax / tilt beyond this point

    // ---------------- Parallax: hero carousel + mesh drift ----------------
    var parallaxTargets = [];
    document.querySelectorAll("#header-carousel .carousel-item img").forEach(function (img) {
        img.classList.add("sa-parallax");
        parallaxTargets.push({ el: img, rate: isMobile ? 0.05 : 0.15 });
    });

    var ticking = false;
    function updateParallax() {
        parallaxTargets.forEach(function (t) {
            var rect = t.el.parentElement.getBoundingClientRect();
            var centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
            var y = centerOffset * t.rate * -1;
            t.el.style.transform = "translate3d(0," + y.toFixed(1) + "px,0) scale(1.12)";
        });
        if (meshEl) {
            var y2 = window.scrollY * 0.04;
            meshEl.style.transform = "translate3d(0," + y2.toFixed(1) + "px,0)";
        }
        ticking = false;
    }
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    if (parallaxTargets.length || meshEl) {
        window.addEventListener("scroll", onScroll, { passive: true });
        updateParallax();
    }

    // ---------------- Cursor tilt on cards ----------------
    if (isFinePointer) {
        var tiltCards = document.querySelectorAll(".product-card, .why-card");
        tiltCards.forEach(function (card) {
            var raf = null;
            card.addEventListener("mousemove", function (e) {
                var rect = card.getBoundingClientRect();
                var px = (e.clientX - rect.left) / rect.width - 0.5;
                var py = (e.clientY - rect.top) / rect.height - 0.5;
                if (raf) window.cancelAnimationFrame(raf);
                raf = window.requestAnimationFrame(function () {
                    var rotY = px * 8;
                    var rotX = py * -8;
                    card.style.transform =
                        "translateY(-6px) perspective(900px) rotateX(" + rotX.toFixed(2) +
                        "deg) rotateY(" + rotY.toFixed(2) + "deg)";
                });
            });
            card.addEventListener("mouseleave", function () {
                if (raf) window.cancelAnimationFrame(raf);
                card.style.transform = "";
            });
        });
    }
})();
